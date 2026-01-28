// Server-side configuration for OAuth and privacy settings
// Client ID and Secret can be set via environment variables

import { env } from '$env/dynamic/private';

/**
 * Simulation mode configuration
 * When enabled, the app simulates Google OAuth and YouTube API
 * without making real API calls. Useful for testing and development.
 */
export const simulationConfig = {
	get enabled(): boolean {
		return env.ENABLE_SIMULATION_MODE === 'true';
	},
	
	// Simulated delay to mimic network latency (ms)
	get networkDelay(): number {
		const value = parseInt(env.SIMULATION_NETWORK_DELAY || '500', 10);
		return isNaN(value) ? 500 : value;
	},
	
	// Simulate token exchange failure then success (for testing error recovery)
	get simulateTokenExchangeError(): boolean {
		return env.SIMULATION_TOKEN_EXCHANGE_ERROR === 'true';
	}
};

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
		// In simulation mode, OAuth is always "configured"
		if (simulationConfig.enabled) return true;
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
 * Contact configuration
 * Required for YouTube API ToS compliance (III.A.2i)
 * Provides contact information for users
 */
export const contactConfig = {
	// Primary contact email - falls back to impressum email if not set
	get email(): string {
		return env.CONTACT_EMAIL || env.IMPRESSUM_EMAIL || '';
	}
};

/**
 * Impressum (legal notice) configuration
 * Required in some jurisdictions (e.g., Germany)
 */
export const impressumConfig = {
	get enabled(): boolean {
		return env.ENABLE_IMPRESSUM === 'true';
	},

	get serviceName(): string {
		return env.IMPRESSUM_SERVICE_NAME || 'CommentSlash';
	},

	get representativeName(): string {
		return env.IMPRESSUM_REPRESENTATIVE_NAME || '';
	},

	get addressLine1(): string {
		return env.IMPRESSUM_ADDRESS_LINE1 || '';
	},

	get addressLine2(): string {
		return env.IMPRESSUM_ADDRESS_LINE2 || '';
	},

	get city(): string {
		return env.IMPRESSUM_CITY || '';
	},

	get postalCode(): string {
		return env.IMPRESSUM_POSTAL_CODE || '';
	},

	get country(): string {
		return env.IMPRESSUM_COUNTRY || '';
	},

	get email(): string {
		return env.IMPRESSUM_EMAIL || '';
	},

	get phone(): string {
		return env.IMPRESSUM_PHONE || '';
	}
};

/**
 * Data retention configuration
 * Controls how long local data is stored
 */
export const dataRetentionConfig = {
	get retentionDays(): number {
		const value = parseInt(env.LOCAL_DATA_RETENTION_DAYS || '30', 10);
		return isNaN(value) ? 30 : value;
	},
	
	get staleWarningDays(): number {
		const value = parseInt(env.STALE_DATA_WARNING_DAYS || '14', 10);
		return isNaN(value) ? 14 : value;
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
