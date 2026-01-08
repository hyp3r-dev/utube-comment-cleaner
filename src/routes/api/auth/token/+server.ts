// API endpoint to securely retrieve the OAuth token from HTTP-only cookie
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { oauthConfig, privacyLogger, simulationConfig } from '$lib/server/config';
import { isSimulatedToken } from '$lib/server/simulation';

export const GET: RequestHandler = async ({ cookies }) => {
	if (!oauthConfig.isConfigured) {
		return json({ 
			success: false,
			message: 'Developer mode not configured'
		}, { status: 400 });
	}
	
	const token = cookies.get('youtube_access_token');
	const hasRefreshToken = !!cookies.get('youtube_refresh_token') || simulationConfig.enabled;
	
	if (!token) {
		// No access token, but check if we have a refresh token
		if (hasRefreshToken) {
			return json({
				success: false,
				message: 'Access token expired',
				canRefresh: true
			}, { status: 401 });
		}
		
		return json({
			success: false,
			message: 'No token available',
			canRefresh: false
		}, { status: 401 });
	}
	
	// Log differently for simulation mode
	if (simulationConfig.enabled && isSimulatedToken(token)) {
		privacyLogger.info('[SIMULATION] Simulated token retrieved via secure endpoint');
	} else {
		privacyLogger.info('Token retrieved via secure endpoint');
	}
	
	return json({
		success: true,
		access_token: token,
		hasRefreshToken
	});
};

// DELETE endpoint to clear the token (logout)
export const DELETE: RequestHandler = async ({ cookies }) => {
	cookies.delete('youtube_access_token', { path: '/' });
	cookies.delete('youtube_auth_status', { path: '/' });
	
	if (simulationConfig.enabled) {
		privacyLogger.info('[SIMULATION] Simulated OAuth token cleared');
	} else {
		privacyLogger.info('OAuth token cleared');
	}
	
	return json({ success: true });
};
