// OAuth login redirect - redirects user to Google's OAuth consent screen
import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { oauthConfig, privacyLogger } from '$lib/server/config';

const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';

export const GET: RequestHandler = async ({ url }) => {
	if (!oauthConfig.isConfigured) {
		privacyLogger.warn('OAuth login attempted but developer mode is not configured');
		return new Response('Developer OAuth mode is not configured', { status: 400 });
	}
	
	// Generate a random state token for CSRF protection
	const state = crypto.randomUUID();
	
	// Build the OAuth authorization URL
	const authUrl = new URL(GOOGLE_AUTH_URL);
	authUrl.searchParams.set('client_id', oauthConfig.clientId);
	authUrl.searchParams.set('redirect_uri', oauthConfig.redirectUri);
	authUrl.searchParams.set('response_type', 'code');
	authUrl.searchParams.set('scope', oauthConfig.scopes.join(' '));
	authUrl.searchParams.set('access_type', 'offline'); // Get refresh token
	authUrl.searchParams.set('prompt', 'consent'); // Always show consent screen
	authUrl.searchParams.set('state', state);
	
	// Store state in a cookie for verification on callback
	const headers = new Headers();
	headers.set('Set-Cookie', `oauth_state=${state}; Path=/; HttpOnly; SameSite=Lax; Max-Age=600`);
	headers.set('Location', authUrl.toString());
	
	privacyLogger.info('Initiating OAuth login flow');
	
	return new Response(null, {
		status: 302,
		headers
	});
};
