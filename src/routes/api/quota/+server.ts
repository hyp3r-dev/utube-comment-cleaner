// API endpoint for quota tracking
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { 
	getQuotaStatus, 
	addQuotaUsage, 
	hasEnoughQuota,
	reserveQuota,
	confirmQuotaUsage,
	releaseReservation,
	registerUser,
	unregisterUser,
	updateUserActivity,
	calculateParallelDeletions,
	startDeletionSession,
	reportBatchComplete,
	endDeletionSession,
	getDeletionSessionStatus,
	quotaConfig,
	QUOTA_COSTS
} from '$lib/server/quota';
import { oauthConfig, privacyLogger } from '$lib/server/config';

// GET - Get current quota status
export const GET: RequestHandler = async ({ url, cookies }) => {
	// Only return quota info if Google Login mode is enabled
	if (!oauthConfig.isConfigured) {
		return json({ 
			googleLoginEnabled: false,
			message: 'Google Login not configured - quota tracking is client-side only'
		});
	}
	
	// Get or create session ID for user tracking
	let sessionId = cookies.get('quota_session');
	if (!sessionId) {
		sessionId = crypto.randomUUID();
		cookies.set('quota_session', sessionId, {
			path: '/',
			httpOnly: true,
			sameSite: 'strict',
			maxAge: 60 * 60 * 24 // 24 hours
		});
	}
	
	// Register/update user activity
	registerUser(sessionId);
	
	const quotaStatus = getQuotaStatus();
	
	return json({
		googleLoginEnabled: true,
		quota: quotaStatus,
		config: {
			reservationChunkSize: quotaConfig.reservationChunkSize,
			maxParallelDeletions: calculateParallelDeletions(sessionId),
			deleteCost: QUOTA_COSTS.commentsDelete,
			smallOperationReservePercent: quotaConfig.smallOperationReservePercent
		}
	});
};

// POST - Record quota usage or manage reservations/deletion sessions
export const POST: RequestHandler = async ({ request, cookies }) => {
	if (!oauthConfig.isConfigured) {
		return json({ 
			success: false,
			message: 'Google Login not configured'
		}, { status: 400 });
	}
	
	// Get session ID
	const sessionId = cookies.get('quota_session');
	if (!sessionId) {
		return json({ 
			success: false, 
			message: 'No session - please refresh the page'
		}, { status: 401 });
	}
	
	try {
		const body = await request.json();
		const action = body.action || 'usage';
		
		switch (action) {
			// New batch-based deletion workflow
			case 'start_deletion': {
				// Start a new deletion session
				const totalPlanned = typeof body.totalPlanned === 'number' ? body.totalPlanned : 0;
				
				if (totalPlanned <= 0) {
					return json({ success: false, message: 'Invalid totalPlanned' }, { status: 400 });
				}
				
				const result = startDeletionSession(sessionId, totalPlanned);
				
				if (!result.success) {
					return json({ 
						success: false, 
						message: result.message || 'Cannot start deletion session',
						quota: getQuotaStatus()
					}, { status: 429 });
				}
				
				return json({
					success: true,
					batchSize: result.batchSize,
					maxParallelDeletions: result.maxParallelDeletions,
					quota: getQuotaStatus()
				});
			}
			
			case 'report_batch': {
				// Report batch completion and request next batch
				const successCount = typeof body.successCount === 'number' ? body.successCount : 0;
				const failedCount = typeof body.failedCount === 'number' ? body.failedCount : 0;
				
				const result = reportBatchComplete(sessionId, successCount, failedCount);
				
				return json({
					success: result.success,
					quotaUsed: result.quotaUsed,
					nextBatchSize: result.nextBatchSize,
					maxParallelDeletions: result.maxParallelDeletions,
					shouldContinue: result.shouldContinue,
					message: result.message,
					quota: getQuotaStatus()
				});
			}
			
			case 'end_deletion': {
				// End deletion session (cancel or complete)
				endDeletionSession(sessionId);
				
				return json({
					success: true,
					quota: getQuotaStatus()
				});
			}
			
			case 'get_deletion_status': {
				// Get current deletion session status
				const status = getDeletionSessionStatus(sessionId);
				
				return json({
					success: true,
					session: status,
					quota: getQuotaStatus()
				});
			}
			
			// Legacy reservation flow (kept for backward compatibility)
			case 'reserve': {
				// Reserve quota for a planned operation
				const totalPlanned = typeof body.totalPlanned === 'number' ? body.totalPlanned : 0;
				
				if (totalPlanned <= 0) {
					return json({ success: false, message: 'Invalid totalPlanned' }, { status: 400 });
				}
				
				const result = reserveQuota(sessionId, totalPlanned);
				
				if (!result.success) {
					return json({ 
						success: false, 
						message: result.message || 'Quota exhausted',
						quota: getQuotaStatus()
					}, { status: 429 });
				}
				
				return json({
					success: true,
					chunkSize: result.chunkSize,
					quota: getQuotaStatus(),
					maxParallelDeletions: calculateParallelDeletions(sessionId)
				});
			}
			
			case 'confirm': {
				// Confirm actual quota usage after operation completes
				const actualUsed = typeof body.actualUsed === 'number' ? body.actualUsed : 0;
				
				if (actualUsed > 0) {
					confirmQuotaUsage(sessionId, actualUsed);
				}
				
				return json({
					success: true,
					quota: getQuotaStatus()
				});
			}
			
			case 'release': {
				// Release any remaining reservation
				releaseReservation(sessionId);
				// Also end any deletion session
				endDeletionSession(sessionId);
				
				return json({
					success: true,
					quota: getQuotaStatus()
				});
			}
			
			case 'usage':
			default: {
				// Direct quota usage for read operations only (small costs like list operations)
				// Delete operations MUST go through the deletion session flow
				const cost = typeof body.cost === 'number' ? body.cost : 0;
				
				if (cost <= 0) {
					return json({ success: false, message: 'Invalid cost' }, { status: 400 });
				}
				
				// Reject large costs - these must go through deletion session flow
				// Delete operations cost 50 units each, so anything >= 50 requires a session
				const MAX_DIRECT_COST = 10; // Allow batched list operations
				if (cost > MAX_DIRECT_COST) {
					privacyLogger.warn(`Direct quota usage rejected: ${cost} exceeds max direct cost of ${MAX_DIRECT_COST}`);
					return json({ 
						success: false, 
						message: 'Large operations must use the deletion session flow',
						quota: getQuotaStatus()
					}, { status: 400 });
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
			}
		}
	} catch (e) {
		const message = e instanceof Error ? e.message : 'Unknown error';
		privacyLogger.error(`Quota update error: ${message}`);
		return json({ success: false, message }, { status: 500 });
	}
};

// DELETE - Unregister user (on page unload)
export const DELETE: RequestHandler = async ({ cookies }) => {
	const sessionId = cookies.get('quota_session');
	
	if (sessionId) {
		// End any active deletion session
		endDeletionSession(sessionId);
		unregisterUser(sessionId);
	}
	
	return json({ success: true });
};
