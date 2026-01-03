// Server-side quota tracking for multi-user scenarios
// Tracks all API usage across all users when using developer OAuth mode

import { privacyLogger } from './config';

/**
 * YouTube API quota costs
 * These are the same as client-side but tracked server-wide
 */
export const QUOTA_COSTS = {
	commentsList: 1,      // comments.list
	commentsDelete: 50,   // comments.delete
	videosListPerItem: 1, // videos.list (per video)
	search: 100           // search.list (if ever used)
} as const;

/**
 * Daily quota limit (default YouTube API quota)
 */
const DAILY_QUOTA_LIMIT = 10000;

/**
 * Quota usage record
 */
interface QuotaUsage {
	date: string;         // YYYY-MM-DD format
	totalUsed: number;    // Total quota used today
	lastReset: number;    // Timestamp of last reset
}

/**
 * In-memory quota tracker
 * 
 * NOTE: This is stored in memory and will be lost on server restarts.
 * For production deployments with multiple instances or high availability
 * requirements, consider:
 * - Using a database (e.g., Redis, PostgreSQL)
 * - Using a distributed cache
 * - Using a file-based persistence
 * 
 * For single-instance deployments, this in-memory approach is sufficient
 * since YouTube's quota resets daily anyway.
 */
let quotaUsage: QuotaUsage = {
	date: getToday(),
	totalUsed: 0,
	lastReset: Date.now()
};

/**
 * Get today's date in YYYY-MM-DD format (UTC)
 */
function getToday(): string {
	return new Date().toISOString().split('T')[0];
}

/**
 * Reset quota if it's a new day
 */
function checkDayReset(): void {
	const today = getToday();
	if (quotaUsage.date !== today) {
		privacyLogger.info(`Quota reset for new day: ${today}`);
		quotaUsage = {
			date: today,
			totalUsed: 0,
			lastReset: Date.now()
		};
	}
}

/**
 * Add quota usage
 */
export function addQuotaUsage(cost: number): void {
	checkDayReset();
	quotaUsage.totalUsed += cost;
	privacyLogger.info(`Quota used: +${cost} (total: ${quotaUsage.totalUsed}/${DAILY_QUOTA_LIMIT})`);
}

/**
 * Get current quota status
 */
export function getQuotaStatus(): {
	used: number;
	remaining: number;
	limit: number;
	percentUsed: number;
	date: string;
} {
	checkDayReset();
	return {
		used: quotaUsage.totalUsed,
		remaining: Math.max(0, DAILY_QUOTA_LIMIT - quotaUsage.totalUsed),
		limit: DAILY_QUOTA_LIMIT,
		percentUsed: Math.round((quotaUsage.totalUsed / DAILY_QUOTA_LIMIT) * 100),
		date: quotaUsage.date
	};
}

/**
 * Check if there's enough quota for an operation
 */
export function hasEnoughQuota(cost: number): boolean {
	checkDayReset();
	return (quotaUsage.totalUsed + cost) <= DAILY_QUOTA_LIMIT;
}

/**
 * Estimate quota cost for a batch operation
 */
export function estimateBatchCost(
	operation: 'enrich' | 'delete',
	itemCount: number
): number {
	switch (operation) {
		case 'enrich':
			// comments.list batches 50 at a time
			return Math.ceil(itemCount / 50) * QUOTA_COSTS.commentsList;
		case 'delete':
			return itemCount * QUOTA_COSTS.commentsDelete;
		default:
			return 0;
	}
}
