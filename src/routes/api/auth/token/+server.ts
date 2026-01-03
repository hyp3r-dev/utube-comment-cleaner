// API endpoint to securely retrieve the OAuth token from HTTP-only cookie
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { oauthConfig, privacyLogger } from '$lib/server/config';

export const GET: RequestHandler = async ({ cookies }) => {
	if (!oauthConfig.isConfigured) {
		return json({ 
			success: false,
			message: 'Developer mode not configured'
		}, { status: 400 });
	}
	
	const token = cookies.get('youtube_access_token');
	
	if (!token) {
		return json({
			success: false,
			message: 'No token available'
		}, { status: 401 });
	}
	
	privacyLogger.info('Token retrieved via secure endpoint');
	
	return json({
		success: true,
		access_token: token
	});
};

// POST endpoint to clear the token (logout)
export const DELETE: RequestHandler = async ({ cookies }) => {
	cookies.delete('youtube_access_token', { path: '/' });
	cookies.delete('youtube_auth_status', { path: '/' });
	
	privacyLogger.info('OAuth token cleared');
	
	return json({ success: true });
};
