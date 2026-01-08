// OAuth logout - clears the authentication cookies
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { privacyLogger } from '$lib/server/config';

interface LogoutRequest {
	mode?: 'full' | 'soft';
}

export const POST: RequestHandler = async ({ cookies, request }) => {
	// Parse the request body for logout mode
	let logoutMode: 'full' | 'soft' = 'full';
	
	try {
		const body = await request.json() as LogoutRequest;
		if (body.mode === 'soft') {
			logoutMode = 'soft';
		}
	} catch {
		// No body or invalid JSON - default to full logout
	}
	
	if (logoutMode === 'soft') {
		// Soft logout: Only clear the current session (access token)
		// Keep refresh token so user can quickly re-login
		privacyLogger.info('User performing soft logout (keeping refresh token)');
		
		// Clear only the access token cookie
		cookies.delete('youtube_access_token', { path: '/' });
		
		// Update auth status to indicate logged out but can re-login quickly
		cookies.delete('youtube_auth_status', { path: '/' });
		
		// Keep the refresh token cookie
		
		return json({ 
			success: true,
			mode: 'soft',
			message: 'Session ended. You can quickly re-login using your stored credentials.'
		});
	} else {
		// Full logout: Clear all auth cookies including refresh token
		privacyLogger.info('User performing full logout (clearing all auth data)');
		
		// Clear the access token cookie
		cookies.delete('youtube_access_token', { path: '/' });
		
		// Clear the refresh token cookie
		cookies.delete('youtube_refresh_token', { path: '/' });
		
		// Clear the auth status cookie
		cookies.delete('youtube_auth_status', { path: '/' });
		
		// Clear the OAuth state cookie if it exists
		cookies.delete('oauth_state', { path: '/' });
		
		return json({ 
			success: true,
			mode: 'full',
			message: 'Fully logged out. All authentication data has been cleared.'
		});
	}
};

