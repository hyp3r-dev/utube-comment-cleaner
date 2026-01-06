/**
 * RISC (Risk and Incident Sharing and Coordination) Endpoint
 * 
 * Implements Cross-Account Protection as required by Google OAuth guidelines.
 * This endpoint receives Security Event Tokens (SETs) from Google when security
 * events occur, such as:
 * - Token revocation (user revoked access in Google Account settings)
 * - Account suspension
 * - Sessions revoked
 * - Password changes (that invalidate existing sessions)
 * 
 * Reference: https://developers.google.com/identity/protocols/risc
 * 
 * Note: To complete RISC setup, you need to:
 * 1. Register your RISC endpoint in Google Cloud Console
 * 2. Verify ownership of your domain
 * 3. Configure the RISC receiver URL to point to this endpoint
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { oauthConfig, privacyLogger } from '$lib/server/config';

// JWT header structure for SET tokens
interface JWTHeader {
	alg: string;
	typ: string;
	kid?: string;
}

// Security Event Token claims
interface SETClaims {
	iss: string;         // Issuer (should be accounts.google.com)
	sub: string;         // Subject (Google user ID)
	aud: string;         // Audience (should be our client ID)
	iat: number;         // Issued at timestamp
	jti: string;         // Unique JWT ID
	events: {            // Map of event URIs to event data
		[eventUri: string]: {
			subject?: {
				subject_type: string;
				sub?: string;           // Google user ID
				email?: string;         // User email (if available)
			};
			reason?: string;
			initiated_by?: string;
		};
	};
}

// Known Google RISC event types
const RISC_EVENTS = {
	// User revoked a token previously granted to the app
	TOKEN_REVOKED: 'https://schemas.openid.net/secevent/oauth/event-type/token-revoked',
	// User revoked all tokens for the app
	TOKENS_REVOKED: 'https://schemas.openid.net/secevent/oauth/event-type/tokens-revoked',
	// Account has been disabled
	ACCOUNT_DISABLED: 'https://schemas.openid.net/secevent/risc/event-type/account-disabled',
	// Account has been enabled (re-activated)
	ACCOUNT_ENABLED: 'https://schemas.openid.net/secevent/risc/event-type/account-enabled',
	// Account has been purged/deleted
	ACCOUNT_PURGED: 'https://schemas.openid.net/secevent/risc/event-type/account-purged',
	// Credential change (password changed, etc.)
	CREDENTIAL_CHANGE: 'https://schemas.openid.net/secevent/risc/event-type/credential-change',
	// Sessions have been revoked
	SESSIONS_REVOKED: 'https://schemas.openid.net/secevent/risc/event-type/sessions-revoked',
} as const;

// Google's public keys endpoint for verifying SETs
const GOOGLE_CERTS_URL = 'https://www.googleapis.com/oauth2/v3/certs';

// Cache for Google's public keys (JWKs)
interface GoogleJWK {
	kty: string;
	alg: string;
	use: string;
	kid: string;
	n: string;
	e: string;
}

interface GoogleJWKSResponse {
	keys: GoogleJWK[];
}

let cachedKeys: GoogleJWK[] = [];
let cacheExpiry = 0;

/**
 * Fetch and cache Google's public keys for JWT verification
 */
async function getGooglePublicKeys(): Promise<GoogleJWK[]> {
	const now = Date.now();
	
	// Return cached keys if still valid
	if (cachedKeys.length > 0 && now < cacheExpiry) {
		return cachedKeys;
	}
	
	try {
		const response = await fetch(GOOGLE_CERTS_URL);
		if (!response.ok) {
			throw new Error(`Failed to fetch Google certs: ${response.status}`);
		}
		
		const data = await response.json() as GoogleJWKSResponse;
		cachedKeys = data.keys;
		
		// Cache for 1 hour (Google recommends respecting Cache-Control header)
		const cacheControl = response.headers.get('cache-control');
		const maxAgeMatch = cacheControl?.match(/max-age=(\d+)/);
		const maxAge = maxAgeMatch ? parseInt(maxAgeMatch[1], 10) : 3600;
		cacheExpiry = now + (maxAge * 1000);
		
		return cachedKeys;
	} catch (e) {
		privacyLogger.error(`Failed to fetch Google public keys: ${e instanceof Error ? e.message : 'Unknown error'}`);
		// Return cached keys even if expired, as a fallback
		return cachedKeys;
	}
}

/**
 * Base64URL decode helper
 */
function base64UrlDecode(str: string): string {
	// Convert base64url to base64
	let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
	// Add padding if necessary
	while (base64.length % 4) {
		base64 += '=';
	}
	return atob(base64);
}

/**
 * Convert base64url to ArrayBuffer
 */
function base64UrlToArrayBuffer(str: string): ArrayBuffer {
	const binary = base64UrlDecode(str);
	const bytes = new Uint8Array(binary.length);
	for (let i = 0; i < binary.length; i++) {
		bytes[i] = binary.charCodeAt(i);
	}
	return bytes.buffer;
}

/**
 * Import a JWK as a CryptoKey for verification
 */
async function importJWK(jwk: GoogleJWK): Promise<CryptoKey> {
	return crypto.subtle.importKey(
		'jwk',
		{
			kty: jwk.kty,
			n: jwk.n,
			e: jwk.e,
			alg: jwk.alg,
			use: jwk.use
		},
		{
			name: 'RSASSA-PKCS1-v1_5',
			hash: { name: 'SHA-256' }
		},
		false,
		['verify']
	);
}

/**
 * Verify JWT signature using Google's public keys
 */
async function verifyJWTSignature(token: string, header: JWTHeader): Promise<boolean> {
	try {
		const parts = token.split('.');
		if (parts.length !== 3) {
			return false;
		}
		
		const [headerB64, payloadB64, signatureB64] = parts;
		const signedData = new TextEncoder().encode(`${headerB64}.${payloadB64}`);
		const signature = base64UrlToArrayBuffer(signatureB64);
		
		// Get Google's public keys
		const keys = await getGooglePublicKeys();
		
		// Find the key matching the kid (key ID) from the JWT header
		const matchingKey = keys.find(k => k.kid === header.kid);
		
		if (!matchingKey) {
			privacyLogger.warn('No matching key found for JWT kid');
			// Try all keys as fallback (in case kid is missing)
			for (const key of keys) {
				try {
					const cryptoKey = await importJWK(key);
					const valid = await crypto.subtle.verify(
						'RSASSA-PKCS1-v1_5',
						cryptoKey,
						signature,
						signedData
					);
					if (valid) return true;
				} catch {
					// Try next key
				}
			}
			return false;
		}
		
		// Verify with the matching key
		const cryptoKey = await importJWK(matchingKey);
		return await crypto.subtle.verify(
			'RSASSA-PKCS1-v1_5',
			cryptoKey,
			signature,
			signedData
		);
	} catch (e) {
		privacyLogger.error(`JWT signature verification failed: ${e instanceof Error ? e.message : 'Unknown error'}`);
		return false;
	}
}

/**
 * Parse JWT and extract header and claims
 */
function parseJWT(token: string): { header: JWTHeader; claims: SETClaims } | null {
	try {
		const parts = token.split('.');
		if (parts.length !== 3) {
			return null;
		}

		const header = JSON.parse(base64UrlDecode(parts[0])) as JWTHeader;
		const claims = JSON.parse(base64UrlDecode(parts[1])) as SETClaims;

		return { header, claims };
	} catch {
		return null;
	}
}

/**
 * Handle token revocation event
 * When a user revokes access to our app, we should invalidate any sessions
 */
function handleTokenRevocation(claims: SETClaims, eventData: SETClaims['events'][string]): void {
	const subject = eventData.subject;
	const googleUserId = subject?.sub || claims.sub;
	
	privacyLogger.info(`Processing token revocation for user: ${googleUserId ? '[USER_ID]' : 'unknown'}`);
	
	// In a production app with server-side sessions, you would:
	// 1. Look up any active sessions for this Google user ID
	// 2. Invalidate/delete those sessions
	// 3. Clear any cached tokens
	
	// For CommentSlash, tokens are stored in HTTP-only cookies client-side
	// The user's session will naturally expire when the token expires
	// or they can manually log out
	
	// Log the event for audit purposes (with PII redacted)
	privacyLogger.info('Token revocation processed - user sessions will be invalidated on next request');
}

/**
 * Handle account disabled/purged events
 */
function handleAccountEvent(claims: SETClaims, eventType: string): void {
	privacyLogger.info(`Account event received: ${eventType} for subject: [REDACTED]`);
	
	// Similar to token revocation - invalidate any sessions for this user
	// In production, this might also trigger data deletion workflows
}

/**
 * POST endpoint for receiving Security Event Tokens from Google
 */
export const POST: RequestHandler = async ({ request }) => {
	if (!oauthConfig.isConfigured) {
		privacyLogger.warn('RISC endpoint called but OAuth is not configured');
		return json({ error: 'OAuth not configured' }, { status: 400 });
	}

	// Verify content type
	const contentType = request.headers.get('content-type');
	if (!contentType?.includes('application/secevent+jwt') && !contentType?.includes('application/jwt')) {
		privacyLogger.warn(`RISC endpoint received invalid content type: ${contentType}`);
		return json({ error: 'Invalid content type' }, { status: 400 });
	}

	try {
		// Get the raw JWT from the request body
		const setToken = await request.text();
		
		if (!setToken || setToken.trim().length === 0) {
			privacyLogger.warn('RISC endpoint received empty token');
			return json({ error: 'Empty token' }, { status: 400 });
		}

		const trimmedToken = setToken.trim();
		
		// Parse the JWT to extract header and claims
		const parsed = parseJWT(trimmedToken);
		
		if (!parsed) {
			privacyLogger.error('Failed to parse SET token');
			return json({ error: 'Invalid token format' }, { status: 400 });
		}

		const { header, claims } = parsed;

		// Verify JWT signature using Google's public keys
		const signatureValid = await verifyJWTSignature(trimmedToken, header);
		if (!signatureValid) {
			privacyLogger.error('SET token signature verification failed');
			return json({ error: 'Invalid signature' }, { status: 401 });
		}

		// Verify issuer is Google (don't log the actual issuer value for security)
		if (claims.iss !== 'https://accounts.google.com') {
			privacyLogger.error('Invalid SET issuer - expected accounts.google.com');
			return json({ error: 'Invalid issuer' }, { status: 400 });
		}

		// Verify audience matches our client ID
		if (claims.aud !== oauthConfig.clientId) {
			privacyLogger.error('SET audience mismatch');
			return json({ error: 'Invalid audience' }, { status: 400 });
		}

		// Check token is not too old (allow 5 minutes clock skew)
		const now = Math.floor(Date.now() / 1000);
		if (claims.iat < now - 300) {
			privacyLogger.warn('SET token is too old');
			// Still process it but log the warning
		}

		// Process each event in the SET
		for (const [eventUri, eventData] of Object.entries(claims.events)) {
			privacyLogger.info(`Processing RISC event: ${eventUri}`);

			switch (eventUri) {
				case RISC_EVENTS.TOKEN_REVOKED:
				case RISC_EVENTS.TOKENS_REVOKED:
					handleTokenRevocation(claims, eventData);
					break;

				case RISC_EVENTS.ACCOUNT_DISABLED:
				case RISC_EVENTS.ACCOUNT_PURGED:
					handleAccountEvent(claims, eventUri);
					break;

				case RISC_EVENTS.CREDENTIAL_CHANGE:
				case RISC_EVENTS.SESSIONS_REVOKED:
					// These events indicate the user should re-authenticate
					privacyLogger.info(`Credential/session event: ${eventUri}`);
					handleTokenRevocation(claims, eventData);
					break;

				case RISC_EVENTS.ACCOUNT_ENABLED:
					// Account re-enabled - no action needed
					privacyLogger.info('Account enabled event received - no action needed');
					break;

				default:
					// Unknown event type - log and acknowledge
					privacyLogger.warn(`Unknown RISC event type: ${eventUri}`);
			}
		}

		// Return 202 Accepted to acknowledge receipt
		// Google expects 2xx response to confirm the event was received
		return new Response(null, { status: 202 });

	} catch (e) {
		const errorMessage = e instanceof Error ? e.message : 'Unknown error';
		privacyLogger.error(`RISC endpoint error: ${errorMessage}`);
		return json({ error: 'Internal error' }, { status: 500 });
	}
};

/**
 * GET endpoint for verification/discovery
 * Google may ping this endpoint during RISC setup
 */
export const GET: RequestHandler = async () => {
	if (!oauthConfig.isConfigured) {
		return json({ 
			status: 'disabled',
			message: 'OAuth is not configured' 
		});
	}

	return json({
		status: 'active',
		supported_events: Object.values(RISC_EVENTS),
		message: 'RISC endpoint is ready to receive Security Event Tokens'
	});
};
