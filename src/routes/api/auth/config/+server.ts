// API endpoint to check if Google Login mode is configured
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { oauthConfig } from '$lib/server/config';

export const GET: RequestHandler = async () => {
	return json({
		googleLoginEnabled: oauthConfig.isConfigured,
		// Never expose the actual credentials, just whether they're configured
		hasClientId: !!oauthConfig.clientId,
		hasClientSecret: !!oauthConfig.clientSecret,
		hasRedirectUri: !!oauthConfig.redirectUri
	});
};
