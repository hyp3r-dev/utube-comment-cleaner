// OAuth login redirect - redirects user to Google's OAuth consent screen
import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { oauthConfig, privacyLogger } from '$lib/server/config';

const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';

/**
 * Generate a cryptographically secure random string for PKCE code verifier
 * Must be between 43-128 characters, using only unreserved URL characters
 */
function generateCodeVerifier(): string {
	const array = new Uint8Array(32);
	crypto.getRandomValues(array);
	// Convert to base64url encoding (URL-safe base64 without padding)
	return btoa(String.fromCharCode(...array))
		.replace(/\+/g, '-')
		.replace(/\//g, '_')
		.replace(/=/g, '');
}

/**
 * Generate code challenge from verifier using S256 method
 * SHA-256 hash of the verifier, then base64url encoded
 */
async function generateCodeChallenge(verifier: string): Promise<string> {
	const encoder = new TextEncoder();
	const data = encoder.encode(verifier);
	const hash = await crypto.subtle.digest('SHA-256', data);
	// Convert to base64url encoding
	return btoa(String.fromCharCode(...new Uint8Array(hash)))
		.replace(/\+/g, '-')
		.replace(/\//g, '_')
		.replace(/=/g, '');
}

export const GET: RequestHandler = async ({ url }) => {
	if (!oauthConfig.isConfigured) {
		privacyLogger.warn('OAuth login attempted but developer mode is not configured');
		return new Response('Developer OAuth mode is not configured', { status: 400 });
	}
	
	// Generate a random state token for CSRF protection
	const state = crypto.randomUUID();
	
	// Generate PKCE code verifier and challenge for additional security
	// This prevents authorization code interception attacks
	const codeVerifier = generateCodeVerifier();
	const codeChallenge = await generateCodeChallenge(codeVerifier);
	
	// Build the OAuth authorization URL
	const authUrl = new URL(GOOGLE_AUTH_URL);
	authUrl.searchParams.set('client_id', oauthConfig.clientId);
	authUrl.searchParams.set('redirect_uri', oauthConfig.redirectUri);
	authUrl.searchParams.set('response_type', 'code');
	authUrl.searchParams.set('scope', oauthConfig.scopes.join(' '));
	authUrl.searchParams.set('access_type', 'offline'); // Get refresh token
	authUrl.searchParams.set('prompt', 'consent'); // Always show consent screen
	authUrl.searchParams.set('state', state);
	// PKCE parameters - S256 is the recommended method
	authUrl.searchParams.set('code_challenge', codeChallenge);
	authUrl.searchParams.set('code_challenge_method', 'S256');
	
	// Store state and code verifier in secure HTTP-only cookies for verification on callback
	const isSecure = url.protocol === 'https:';
	const securePart = isSecure ? ' Secure;' : '';
	const headers = new Headers();
	// State cookie for CSRF protection
	headers.append('Set-Cookie', `oauth_state=${state}; Path=/; HttpOnly; SameSite=Lax; Max-Age=600;${securePart}`);
	// Code verifier cookie for PKCE - must be sent back during token exchange
	headers.append('Set-Cookie', `oauth_code_verifier=${codeVerifier}; Path=/; HttpOnly; SameSite=Lax; Max-Age=600;${securePart}`);
	headers.set('Location', authUrl.toString());
	
	privacyLogger.info('Initiating OAuth login flow with PKCE');
	
	return new Response(null, {
		status: 302,
		headers
	});
};
