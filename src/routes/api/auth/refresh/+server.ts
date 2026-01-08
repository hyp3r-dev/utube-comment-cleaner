// Token refresh endpoint - exchanges refresh token for new access token
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { oauthConfig, privacyLogger, simulationConfig } from '$lib/server/config';
import { SIMULATED_ACCESS_TOKEN } from '$lib/server/simulation';

const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';

// Refresh token expiry in seconds (30 days)
const REFRESH_TOKEN_EXPIRY_SECONDS = 30 * 24 * 60 * 60;

interface TokenResponse {
	access_token: string;
	expires_in: number;
	scope: string;
	token_type: string;
}

interface TokenError {
	error: string;
	error_description: string;
}

export const POST: RequestHandler = async ({ cookies, url }) => {
	if (!oauthConfig.isConfigured) {
		return json({ 
			success: false,
			message: 'OAuth not configured'
		}, { status: 400 });
	}
	
	// In simulation mode, just refresh the simulated token
	if (simulationConfig.enabled) {
		privacyLogger.info('[SIMULATION] Refreshing simulated token');
		
		const isSecure = url.protocol === 'https:';
		
		cookies.set('youtube_access_token', SIMULATED_ACCESS_TOKEN, {
			path: '/',
			httpOnly: true,
			secure: isSecure,
			sameSite: 'lax',
			maxAge: 3600
		});
		
		cookies.set('youtube_auth_status', 'connected', {
			path: '/',
			httpOnly: false,
			secure: isSecure,
			sameSite: 'lax',
			maxAge: REFRESH_TOKEN_EXPIRY_SECONDS
		});
		
		return json({
			success: true,
			message: 'Token refreshed successfully',
			access_token: SIMULATED_ACCESS_TOKEN,
			expiresIn: 3600
		});
	}
	
	// Get the refresh token from cookie
	const refreshToken = cookies.get('youtube_refresh_token');
	
	if (!refreshToken) {
		privacyLogger.info('Token refresh attempted but no refresh token available');
		return json({
			success: false,
			message: 'No refresh token available',
			requiresReauth: true
		}, { status: 401 });
	}
	
	try {
		// Exchange refresh token for new access token
		const tokenResponse = await fetch(GOOGLE_TOKEN_URL, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/x-www-form-urlencoded'
			},
			body: new URLSearchParams({
				client_id: oauthConfig.clientId,
				client_secret: oauthConfig.clientSecret,
				refresh_token: refreshToken,
				grant_type: 'refresh_token'
			})
		});
		
		if (!tokenResponse.ok) {
			const errorData = await tokenResponse.json() as TokenError;
			privacyLogger.error(`Token refresh failed: ${errorData.error}`);
			
			// If refresh token is invalid/revoked, clear it
			if (errorData.error === 'invalid_grant') {
				cookies.delete('youtube_refresh_token', { path: '/' });
				cookies.delete('youtube_access_token', { path: '/' });
				cookies.delete('youtube_auth_status', { path: '/' });
				
				return json({
					success: false,
					message: 'Refresh token is invalid or expired. Please sign in again.',
					requiresReauth: true
				}, { status: 401 });
			}
			
			return json({
				success: false,
				message: errorData.error_description || errorData.error
			}, { status: 400 });
		}
		
		const tokens = await tokenResponse.json() as TokenResponse;
		
		privacyLogger.info('Token refresh successful');
		
		const isSecure = url.protocol === 'https:';
		
		// Update the access token cookie
		cookies.set('youtube_access_token', tokens.access_token, {
			path: '/',
			httpOnly: true,
			secure: isSecure,
			sameSite: 'lax',
			maxAge: tokens.expires_in
		});
		
		// Refresh the auth status cookie expiry
		cookies.set('youtube_auth_status', 'connected', {
			path: '/',
			httpOnly: false,
			secure: isSecure,
			sameSite: 'lax',
			maxAge: REFRESH_TOKEN_EXPIRY_SECONDS
		});
		
		// Return the access token directly to avoid a second API call
		return json({
			success: true,
			message: 'Token refreshed successfully',
			access_token: tokens.access_token,
			expiresIn: tokens.expires_in
		});
	} catch (e) {
		const errorMessage = e instanceof Error ? e.message : 'Unknown error';
		privacyLogger.error(`Token refresh exception: ${errorMessage}`);
		
		return json({
			success: false,
			message: 'Failed to refresh token'
		}, { status: 500 });
	}
};
