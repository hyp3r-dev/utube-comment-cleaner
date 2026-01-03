// API endpoint for quota tracking
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getQuotaStatus, addQuotaUsage, hasEnoughQuota } from '$lib/server/quota';
import { oauthConfig, privacyLogger } from '$lib/server/config';

// GET - Get current quota status
export const GET: RequestHandler = async () => {
	// Only return quota info if Google Login mode is enabled
	if (!oauthConfig.isConfigured) {
		return json({ 
			googleLoginEnabled: false,
			message: 'Google Login not configured - quota tracking is client-side only'
		});
	}
	
	return json({
		googleLoginEnabled: true,
		quota: getQuotaStatus()
	});
};

// POST - Record quota usage
export const POST: RequestHandler = async ({ request }) => {
	if (!oauthConfig.isConfigured) {
		return json({ 
			success: false,
			message: 'Google Login not configured'
		}, { status: 400 });
	}
	
	try {
		const body = await request.json();
		const cost = typeof body.cost === 'number' ? body.cost : 0;
		
		if (cost <= 0) {
			return json({ success: false, message: 'Invalid cost' }, { status: 400 });
		}
		
		if (!hasEnoughQuota(cost)) {
			privacyLogger.warn(`Quota limit would be exceeded: requested ${cost}`);
			return json({ 
				success: false, 
				message: 'Quota limit exceeded',
				quota: getQuotaStatus()
			}, { status: 429 });
		}
		
		addQuotaUsage(cost);
		
		return json({
			success: true,
			quota: getQuotaStatus()
		});
	} catch (e) {
		const message = e instanceof Error ? e.message : 'Unknown error';
		privacyLogger.error(`Quota update error: ${message}`);
		return json({ success: false, message }, { status: 500 });
	}
};
