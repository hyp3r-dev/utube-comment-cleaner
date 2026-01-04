// Server-side configuration for OAuth and privacy settings
// Client ID and Secret can be set via environment variables

import { env } from '$env/dynamic/private';

/**
 * Developer OAuth configuration
 * When both CLIENT_ID and CLIENT_SECRET are set, the app will use
 * Google Sign-In instead of manual access token entry.
 */
export const oauthConfig = {
	// Use getters to ensure env vars are read at runtime, not module load time
	// This is critical for Docker deployments where env vars are set at container start
	get clientId(): string {
		return env.GOOGLE_CLIENT_ID || '';
	},
	get clientSecret(): string {
		return env.GOOGLE_CLIENT_SECRET || '';
	},
	get redirectUri(): string {
		return env.GOOGLE_REDIRECT_URI || '';
	},
	
	get isConfigured(): boolean {
		return !!(this.clientId && this.clientSecret && this.redirectUri);
	},
	
	get scopes(): string[] {
		return [
			'https://www.googleapis.com/auth/youtube.force-ssl',
			'openid',
			'email'
		];
	}
};

/**
 * Legal and compliance configuration
 * Controls whether legal pages and cookie consent are shown
 */
export const legalConfig = {
	// Use getters to ensure env vars are read at runtime, not module load time
	get enableLegal(): boolean {
		return env.ENABLE_LEGAL === 'true';
	},
	
	get enableCookieConsent(): boolean {
		return env.ENABLE_COOKIE_CONSENT === 'true';
	}
};

/**
 * Privacy configuration
 * Controls what user data is logged and how long logs are retained
 */
export const privacyConfig = {
	// Maximum log retention in hours
	logRetentionHours: 8,
	
	// Use getter to ensure env var is read at runtime
	get detailedLogging(): boolean {
		return env.DETAILED_LOGGING === 'true';
	},
	
	// Redact patterns for PII in logs
	redactionPatterns: [
		// Email addresses
		/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
		// Access tokens (Bearer tokens)
		/Bearer\s+[a-zA-Z0-9._-]+/gi,
		// OAuth tokens
		/ya29\.[a-zA-Z0-9._-]+/g,
		// Channel IDs (starts with UC)
		/UC[a-zA-Z0-9_-]{22}/g
	]
};

/**
 * Redact sensitive information from a string
 */
export function redactSensitiveData(text: string): string {
	let redacted = text;
	for (const pattern of privacyConfig.redactionPatterns) {
		redacted = redacted.replace(pattern, '[REDACTED]');
	}
	return redacted;
}

/**
 * Privacy-preserving logger
 * Only logs if detailed logging is enabled, and always redacts PII
 */
export const privacyLogger = {
	info(message: string): void {
		if (privacyConfig.detailedLogging) {
			console.log(`[INFO] ${redactSensitiveData(message)}`);
		}
	},
	
	warn(message: string): void {
		console.warn(`[WARN] ${redactSensitiveData(message)}`);
	},
	
	error(message: string): void {
		console.error(`[ERROR] ${redactSensitiveData(message)}`);
	}
};
