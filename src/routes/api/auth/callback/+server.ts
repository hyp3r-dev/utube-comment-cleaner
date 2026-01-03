// OAuth callback - handles the redirect from Google after user consents
import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { oauthConfig, privacyLogger } from '$lib/server/config';
import { addQuotaUsage } from '$lib/server/quota';

const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';

interface TokenResponse {
	access_token: string;
	expires_in: number;
	refresh_token?: string;
	scope: string;
	token_type: string;
	id_token?: string;
}

interface TokenError {
	error: string;
	error_description: string;
}

export const GET: RequestHandler = async ({ url, cookies }) => {
	if (!oauthConfig.isConfigured) {
		privacyLogger.warn('OAuth callback attempted but developer mode is not configured');
		return new Response('Developer OAuth mode is not configured', { status: 400 });
	}
	
	// Check for errors from Google
	const error = url.searchParams.get('error');
	if (error) {
		const errorDesc = url.searchParams.get('error_description') || 'Unknown error';
		privacyLogger.error(`OAuth error: ${error} - ${errorDesc}`);
		return redirect(302, `/?auth_error=${encodeURIComponent(error)}`);
	}
	
	// Get the authorization code
	const code = url.searchParams.get('code');
	const state = url.searchParams.get('state');
	
	if (!code || !state) {
		privacyLogger.error('OAuth callback missing code or state');
		return redirect(302, '/?auth_error=missing_params');
	}
	
	// Verify state to prevent CSRF
	const storedState = cookies.get('oauth_state');
	if (!storedState || storedState !== state) {
		privacyLogger.error('OAuth state mismatch - possible CSRF attack');
		return redirect(302, '/?auth_error=invalid_state');
	}
	
	// Clear the state cookie
	cookies.delete('oauth_state', { path: '/' });
	
	try {
		// Exchange authorization code for tokens
		const tokenResponse = await fetch(GOOGLE_TOKEN_URL, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/x-www-form-urlencoded'
			},
			body: new URLSearchParams({
				client_id: oauthConfig.clientId,
				client_secret: oauthConfig.clientSecret,
				code: code,
				grant_type: 'authorization_code',
				redirect_uri: oauthConfig.redirectUri
			})
		});
		
		if (!tokenResponse.ok) {
			const errorData = await tokenResponse.json() as TokenError;
			privacyLogger.error(`Token exchange failed: ${errorData.error}`);
			return redirect(302, `/?auth_error=${encodeURIComponent(errorData.error)}`);
		}
		
		const tokens = await tokenResponse.json() as TokenResponse;
		
		privacyLogger.info('OAuth token exchange successful');
		
		// Store the token in an HTTP-only cookie for security
		// The client will use this cookie when making API requests
		// This prevents XSS attacks from accessing the token
		cookies.set('youtube_access_token', tokens.access_token, {
			path: '/',
			httpOnly: true,
			secure: url.protocol === 'https:',
			sameSite: 'lax',
			maxAge: tokens.expires_in // Expire with the token
		});
		
		// Set a non-sensitive flag cookie that client can read to know auth succeeded
		cookies.set('youtube_auth_status', 'connected', {
			path: '/',
			httpOnly: false,
			secure: url.protocol === 'https:',
			sameSite: 'lax',
			maxAge: tokens.expires_in
		});
		
		return redirect(302, '/?auth_success=true');
	} catch (e) {
		const errorMessage = e instanceof Error ? e.message : 'Unknown error';
		privacyLogger.error(`Token exchange exception: ${errorMessage}`);
		return redirect(302, '/?auth_error=token_exchange_failed');
	}
};
