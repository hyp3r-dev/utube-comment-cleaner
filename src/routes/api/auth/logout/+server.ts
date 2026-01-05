// OAuth logout - clears the authentication cookies
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { privacyLogger } from '$lib/server/config';

export const POST: RequestHandler = async ({ cookies }) => {
privacyLogger.info('User logging out');

// Clear the access token cookie
cookies.delete('youtube_access_token', { path: '/' });

// Clear the auth status cookie
cookies.delete('youtube_auth_status', { path: '/' });

// Clear the OAuth state cookie if it exists
cookies.delete('oauth_state', { path: '/' });

return json({ success: true });
};
