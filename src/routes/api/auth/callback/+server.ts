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
		
		// Redirect back to the app with the access token
		// The token is passed via URL fragment so it's not sent to the server on page load
		// This is more secure as it stays client-side only
		const redirectUrl = new URL('/', url.origin);
		const tokenData = {
			access_token: tokens.access_token,
			expires_in: tokens.expires_in
		};
		
		// Set the token data as a short-lived cookie that the client will read and clear
		cookies.set('oauth_token', JSON.stringify(tokenData), {
			path: '/',
			httpOnly: false, // Client needs to read this
			secure: url.protocol === 'https:',
			sameSite: 'lax',
			maxAge: 60 // Very short-lived - client should read immediately and clear
		});
		
		return redirect(302, '/?auth_success=true');
	} catch (e) {
		const errorMessage = e instanceof Error ? e.message : 'Unknown error';
		privacyLogger.error(`Token exchange exception: ${errorMessage}`);
		return redirect(302, '/?auth_error=token_exchange_failed');
	}
};
