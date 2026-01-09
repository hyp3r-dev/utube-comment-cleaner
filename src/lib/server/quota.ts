// Server-side quota tracking for multi-user scenarios
// Tracks all API usage across all users when using developer OAuth mode
// Persists quota data to disk to survive restarts
// Supports real-time broadcasting via Server-Sent Events (SSE)

import { privacyLogger } from './config';
import { env } from '$env/dynamic/private';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';

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
 * Quota configuration from environment variables
 */
export const quotaConfig = {
	/** Daily quota limit (default YouTube API quota) */
	get dailyLimit(): number {
		const value = parseInt(env.YOUTUBE_DAILY_QUOTA_LIMIT || '10000', 10);
		return isNaN(value) ? 10000 : value;
	},
	/** Per-minute quota limit */
	get perMinuteLimit(): number {
		const value = parseInt(env.YOUTUBE_PER_MINUTE_QUOTA_LIMIT || '1800000', 10);
		return isNaN(value) ? 1800000 : value;
	},
	/** Per-user per-minute limit */
	get perUserPerMinuteLimit(): number {
		const value = parseInt(env.YOUTUBE_PER_USER_MINUTE_LIMIT || '180000', 10);
		return isNaN(value) ? 180000 : value;
	},
	/** Reservation chunk size (how much quota is reserved at a time) */
	get reservationChunkSize(): number {
		const value = parseInt(env.QUOTA_RESERVATION_CHUNK_SIZE || '1000', 10);
		return isNaN(value) ? 1000 : value;
	},
	/** Maximum parallel deletions per user */
	get maxParallelDeletions(): number {
		const value = parseInt(env.MAX_PARALLEL_DELETIONS || '5', 10);
		return isNaN(value) ? 5 : Math.min(value, 10); // Cap at 10 for safety
	},
	/** Percentage of quota reserved for small operations (login, enrichment) */
	get smallOperationReservePercent(): number {
		const value = parseInt(env.SMALL_OPERATION_RESERVE_PERCENT || '5', 10);
		return isNaN(value) || value < 0 || value > 50 ? 5 : value;
	}
};

/**
 * Data directory for persistent storage
 * Uses DATA_DIR environment variable or falls back to ./data
 */
const DATA_DIR = process.env.DATA_DIR || './data';
const QUOTA_FILE = join(DATA_DIR, 'quota.json');

/**
 * Deletion session tracking - manages batch-based deletion workflow
 * Each session tracks:
 * - Total quota the user wants to use
 * - How much has been reserved in the current batch
 * - How much has been confirmed used
 * - Whether the session is waiting for batch completion
 */
interface DeletionSession {
	sessionId: string;
	totalPlanned: number;      // Total quota the user wants to use
	totalConfirmed: number;    // Total quota actually confirmed used
	currentBatchSize: number;  // Size of current batch being processed
	currentBatchUsed: number;  // How much of current batch has been used
	maxParallelDeletions: number; // Max parallel deletions for this session
	isWaitingForBatch: boolean; // True while client is processing a batch
	createdAt: number;         // Session creation time
	lastActivity: number;      // Last activity time (for cleanup)
}

/**
 * Reservation tracking - maps session/user ID to their reserved quota
 * @deprecated Use DeletionSession for delete operations
 */
interface QuotaReservation {
	sessionId: string;
	totalPlanned: number;  // Total quota the user plans to use
	reserved: number;      // Currently reserved (active chunk)
	used: number;          // Actually consumed from reservation
	createdAt: number;     // Timestamp for cleanup
}

/**
 * Per-minute usage tracking
 */
interface MinuteUsage {
	minute: string;        // YYYY-MM-DD HH:mm format
	used: number;          // Quota used in this minute
	usersActive: number;   // Number of users making requests
}

/**
 * Connected user tracking
 */
interface ConnectedUser {
	sessionId: string;
	isDeleting: boolean;   // Currently in a deletion operation
	lastActivity: number;  // Timestamp of last activity
}

/**
 * Quota usage record
 */
interface QuotaUsage {
	date: string;         // YYYY-MM-DD format
	totalUsed: number;    // Total quota used today (actually consumed)
	totalReserved: number; // Total quota reserved (pending operations)
	lastReset: number;    // Timestamp of last reset
}

// In-memory state
let quotaUsage: QuotaUsage = loadQuotaFromDisk();
const reservations = new Map<string, QuotaReservation>();
const deletionSessions = new Map<string, DeletionSession>();
const connectedUsers = new Map<string, ConnectedUser>();
let currentMinuteUsage: MinuteUsage = { minute: getCurrentMinute(), used: 0, usersActive: 0 };

// SSE subscribers for real-time updates
type SSESubscriber = (data: QuotaStatusUpdate) => void;
const sseSubscribers = new Set<SSESubscriber>();

/**
 * Quota status update interface for SSE broadcasting
 */
export interface QuotaStatusUpdate {
	used: number;
	reserved: number;
	remaining: number;
	dailyLimit: number;
	perMinuteUsed: number;
	perMinuteLimit: number;
	connectedUsers: number;
	deletingUsers: number;
	maxParallelDeletions: number;
	percentUsed: number;
	smallOperationReserve: number; // Quota reserved for small operations (login, enrichment)
	availableForDeletion: number;  // Quota available for deletion operations
	date: string;
	timestamp: number;
}

/**
 * Get today's date in YYYY-MM-DD format (Pacific Time)
 * YouTube API quota resets at midnight Pacific Time
 */
function getPacificDateKey(): string {
	return new Intl.DateTimeFormat('en-CA', {
		timeZone: 'America/Los_Angeles'
	}).format(new Date());
}

/**
 * Get current minute in YYYY-MM-DD HH:mm format
 */
function getCurrentMinute(): string {
	const now = new Date();
	return `${now.toISOString().slice(0, 16)}`;
}

/**
 * Load quota data from disk
 */
function loadQuotaFromDisk(): QuotaUsage {
	try {
		if (existsSync(QUOTA_FILE)) {
			const data = readFileSync(QUOTA_FILE, 'utf-8');
			const loaded = JSON.parse(data) as QuotaUsage;
			privacyLogger.info(`Loaded quota from disk: ${loaded.totalUsed}/${quotaConfig.dailyLimit} used on ${loaded.date}`);
			return {
				...loaded,
				totalReserved: 0  // Reservations don't persist across restarts
			};
		}
	} catch (e) {
		privacyLogger.error(`Failed to load quota from disk: ${e instanceof Error ? e.message : 'Unknown error'}`);
	}
	
	// Return default quota
	return {
		date: getPacificDateKey(),
		totalUsed: 0,
		totalReserved: 0,
		lastReset: Date.now()
	};
}

/**
 * Save quota data to disk
 */
function saveQuotaToDisk(): void {
	try {
		// Ensure data directory exists
		const dir = dirname(QUOTA_FILE);
		if (!existsSync(dir)) {
			mkdirSync(dir, { recursive: true });
		}
		
		// Save only persistent data (not reservations)
		const toSave = {
			date: quotaUsage.date,
			totalUsed: quotaUsage.totalUsed,
			lastReset: quotaUsage.lastReset
		};
		
		writeFileSync(QUOTA_FILE, JSON.stringify(toSave, null, 2), 'utf-8');
	} catch (e) {
		privacyLogger.error(`Failed to save quota to disk: ${e instanceof Error ? e.message : 'Unknown error'}`);
	}
}

/**
 * Reset quota if it's a new day (Pacific Time)
 */
function checkDayReset(): void {
	const today = getPacificDateKey();
	if (quotaUsage.date !== today) {
		privacyLogger.info(`Quota reset for new day (Pacific Time): ${today}`);
		quotaUsage = {
			date: today,
			totalUsed: 0,
			totalReserved: 0,
			lastReset: Date.now()
		};
		// Clear all reservations on day change
		reservations.clear();
		saveQuotaToDisk();
		broadcastQuotaUpdate();
	}
}

/**
 * Check and reset per-minute tracking if needed
 */
function checkMinuteReset(): void {
	const currentMin = getCurrentMinute();
	if (currentMinuteUsage.minute !== currentMin) {
		currentMinuteUsage = {
			minute: currentMin,
			used: 0,
			usersActive: 0
		};
	}
}

/**
 * Clean up expired reservations (older than 5 minutes without updates)
 */
function cleanupStaleReservations(): void {
	const now = Date.now();
	const maxAge = 5 * 60 * 1000; // 5 minutes
	
	for (const [sessionId, reservation] of reservations) {
		if (now - reservation.createdAt > maxAge) {
			// Release unused reservation
			const unused = reservation.reserved - reservation.used;
			if (unused > 0) {
				quotaUsage.totalReserved = Math.max(0, quotaUsage.totalReserved - unused);
				privacyLogger.info(`Cleaned up stale reservation for session ${sessionId.slice(0, 8)}...: released ${unused} units`);
			}
			reservations.delete(sessionId);
		}
	}
}

/**
 * Clean up inactive users (no activity for 2 minutes)
 */
function cleanupInactiveUsers(): void {
	const now = Date.now();
	const maxInactive = 2 * 60 * 1000; // 2 minutes
	
	for (const [sessionId, user] of connectedUsers) {
		if (now - user.lastActivity > maxInactive) {
			connectedUsers.delete(sessionId);
			// Also clean up any reservations
			if (reservations.has(sessionId)) {
				const reservation = reservations.get(sessionId)!;
				const unused = reservation.reserved - reservation.used;
				if (unused > 0) {
					quotaUsage.totalReserved = Math.max(0, quotaUsage.totalReserved - unused);
				}
				reservations.delete(sessionId);
			}
		}
	}
}

/**
 * Broadcast quota update to all SSE subscribers
 */
function broadcastQuotaUpdate(): void {
	const status = getQuotaStatus();
	for (const subscriber of sseSubscribers) {
		try {
			subscriber(status);
		} catch (e) {
			// Remove failed subscribers
			sseSubscribers.delete(subscriber);
		}
	}
}

/**
 * Subscribe to quota updates
 */
export function subscribeToQuotaUpdates(callback: SSESubscriber): () => void {
	sseSubscribers.add(callback);
	// Return unsubscribe function
	return () => {
		sseSubscribers.delete(callback);
	};
}

/**
 * Register a connected user
 */
export function registerUser(sessionId: string): void {
	connectedUsers.set(sessionId, {
		sessionId,
		isDeleting: false,
		lastActivity: Date.now()
	});
	broadcastQuotaUpdate();
}

/**
 * Unregister a user
 */
export function unregisterUser(sessionId: string): void {
	connectedUsers.delete(sessionId);
	// Clean up any reservations
	if (reservations.has(sessionId)) {
		releaseReservation(sessionId);
	}
	broadcastQuotaUpdate();
}

/**
 * Update user activity
 */
export function updateUserActivity(sessionId: string, isDeleting: boolean = false): void {
	const user = connectedUsers.get(sessionId);
	if (user) {
		user.lastActivity = Date.now();
		user.isDeleting = isDeleting;
	} else {
		registerUser(sessionId);
		const newUser = connectedUsers.get(sessionId);
		if (newUser) newUser.isDeleting = isDeleting;
	}
}

/**
 * Create or extend a quota reservation
 * Returns the amount that can be used in this chunk, or 0 if quota is exhausted
 */
export function reserveQuota(sessionId: string, totalPlanned: number): {
	success: boolean;
	chunkSize: number;
	message?: string;
} {
	checkDayReset();
	cleanupStaleReservations();
	
	const dailyLimit = quotaConfig.dailyLimit;
	const chunkSize = quotaConfig.reservationChunkSize;
	
	// Calculate available quota (daily limit - used - reserved by others)
	const otherReservations = [...reservations.entries()]
		.filter(([id]) => id !== sessionId)
		.reduce((sum, [, r]) => sum + (r.reserved - r.used), 0);
	
	const available = dailyLimit - quotaUsage.totalUsed - otherReservations;
	
	if (available <= 0) {
		return {
			success: false,
			chunkSize: 0,
			message: 'Daily quota exhausted'
		};
	}
	
	// Calculate how much to reserve for this chunk
	let existingReservation = reservations.get(sessionId);
	const alreadyReserved = existingReservation ? (existingReservation.reserved - existingReservation.used) : 0;
	
	// If user already has enough reserved, just continue
	if (alreadyReserved >= chunkSize) {
		return {
			success: true,
			chunkSize: Math.min(alreadyReserved, totalPlanned - (existingReservation?.used || 0))
		};
	}
	
	// Reserve a new chunk
	const toReserve = Math.min(chunkSize, available, totalPlanned);
	
	if (existingReservation) {
		existingReservation.reserved += toReserve - alreadyReserved;
		existingReservation.totalPlanned = totalPlanned;
		existingReservation.createdAt = Date.now();
	} else {
		reservations.set(sessionId, {
			sessionId,
			totalPlanned,
			reserved: toReserve,
			used: 0,
			createdAt: Date.now()
		});
	}
	
	quotaUsage.totalReserved += toReserve - alreadyReserved;
	
	updateUserActivity(sessionId, true);
	broadcastQuotaUpdate();
	
	privacyLogger.info(`Reserved ${toReserve} quota for session ${sessionId.slice(0, 8)}... (total reserved: ${quotaUsage.totalReserved})`);
	
	return {
		success: true,
		chunkSize: toReserve
	};
}

/**
 * Confirm quota usage from a reservation
 * Call this after actually consuming the quota
 * Returns how much was actually confirmed (may be less if no valid reservation)
 */
export function confirmQuotaUsage(sessionId: string, actualUsed: number): number {
	checkDayReset();
	checkMinuteReset();
	
	const reservation = reservations.get(sessionId);
	
	if (reservation) {
		// Convert reserved to used
		// Client can only confirm up to what they have reserved (prevents abuse)
		const confirmed = Math.min(actualUsed, reservation.reserved - reservation.used);
		reservation.used += confirmed;
		
		// Move from reserved to used in global tracking
		quotaUsage.totalReserved = Math.max(0, quotaUsage.totalReserved - confirmed);
		quotaUsage.totalUsed += confirmed;
		
		// Track per-minute usage
		currentMinuteUsage.used += confirmed;
		
		saveQuotaToDisk();
		broadcastQuotaUpdate();
		
		privacyLogger.info(`Confirmed ${confirmed} quota usage (total used: ${quotaUsage.totalUsed}/${quotaConfig.dailyLimit})`);
		return confirmed;
	} else {
		// No reservation - reject the confirmation
		// Clients must reserve before they can confirm usage
		privacyLogger.warn(`Quota confirm rejected: no reservation for session ${sessionId.slice(0, 8)}...`);
		return 0;
	}
}

/**
 * Release remaining reservation (when operation completes or is cancelled)
 */
export function releaseReservation(sessionId: string): void {
	const reservation = reservations.get(sessionId);
	
	if (reservation) {
		const unused = reservation.reserved - reservation.used;
		if (unused > 0) {
			quotaUsage.totalReserved = Math.max(0, quotaUsage.totalReserved - unused);
			privacyLogger.info(`Released ${unused} unused quota for session ${sessionId.slice(0, 8)}...`);
		}
		reservations.delete(sessionId);
	}
	
	// Mark user as not deleting
	const user = connectedUsers.get(sessionId);
	if (user) {
		user.isDeleting = false;
	}
	
	broadcastQuotaUpdate();
}

/**
 * Add quota usage (legacy function for backward compatibility)
 */
export function addQuotaUsage(cost: number): void {
	checkDayReset();
	checkMinuteReset();
	
	quotaUsage.totalUsed += cost;
	currentMinuteUsage.used += cost;
	
	privacyLogger.info(`Quota used: +${cost} (total: ${quotaUsage.totalUsed}/${quotaConfig.dailyLimit})`);
	
	saveQuotaToDisk();
	broadcastQuotaUpdate();
}

/**
 * Get current quota status
 */
export function getQuotaStatus(): QuotaStatusUpdate {
	checkDayReset();
	checkMinuteReset();
	cleanupInactiveUsers();
	cleanupStaleDeletionSessions();
	
	const dailyLimit = quotaConfig.dailyLimit;
	const perMinuteLimit = quotaConfig.perMinuteLimit;
	const smallOpReservePercent = quotaConfig.smallOperationReservePercent;
	
	// Calculate the small operation reserve (5% by default)
	const smallOperationReserve = Math.floor(dailyLimit * (smallOpReservePercent / 100));
	
	// Calculate effective used including reservations from deletion sessions
	const sessionReserved = calculateTotalSessionReserved();
	const effectiveUsed = quotaUsage.totalUsed + quotaUsage.totalReserved + sessionReserved;
	const remaining = Math.max(0, dailyLimit - effectiveUsed);
	
	// Available for deletion is remaining minus the small operation reserve
	const availableForDeletion = Math.max(0, remaining - smallOperationReserve);
	
	const deletingUsers = [...connectedUsers.values()].filter(u => u.isDeleting).length;
	
	return {
		used: quotaUsage.totalUsed,
		reserved: quotaUsage.totalReserved + sessionReserved,
		remaining,
		dailyLimit,
		perMinuteUsed: currentMinuteUsage.used,
		perMinuteLimit,
		connectedUsers: connectedUsers.size,
		deletingUsers,
		maxParallelDeletions: quotaConfig.maxParallelDeletions,
		percentUsed: Math.round((effectiveUsed / dailyLimit) * 100),
		smallOperationReserve,
		availableForDeletion,
		date: quotaUsage.date,
		timestamp: Date.now()
	};
}

/**
 * Calculate total quota reserved by all active deletion sessions
 */
function calculateTotalSessionReserved(): number {
	let total = 0;
	for (const session of deletionSessions.values()) {
		// For each session, the reserved amount is the current batch size minus what's been used
		const batchRemaining = session.currentBatchSize - session.currentBatchUsed;
		total += Math.max(0, batchRemaining);
	}
	return total;
}

/**
 * Clean up stale deletion sessions (older than 5 minutes without activity)
 */
function cleanupStaleDeletionSessions(): void {
	const now = Date.now();
	const maxAge = 5 * 60 * 1000; // 5 minutes
	
	for (const [sessionId, session] of deletionSessions) {
		if (now - session.lastActivity > maxAge) {
			// Release the session
			const unused = session.currentBatchSize - session.currentBatchUsed;
			if (unused > 0) {
				privacyLogger.info(`Cleaned up stale deletion session for ${sessionId.slice(0, 8)}...: released ${unused} units`);
			}
			deletionSessions.delete(sessionId);
			
			// Also mark user as not deleting
			const user = connectedUsers.get(sessionId);
			if (user) {
				user.isDeleting = false;
			}
		}
	}
}

/**
 * Check if there's enough quota for an operation
 */
export function hasEnoughQuota(cost: number): boolean {
	checkDayReset();
	const effectiveUsed = quotaUsage.totalUsed + quotaUsage.totalReserved;
	return (effectiveUsed + cost) <= quotaConfig.dailyLimit;
}

/**
 * Check if per-minute quota allows more requests
 */
export function hasPerMinuteQuota(cost: number): boolean {
	checkMinuteReset();
	return (currentMinuteUsage.used + cost) <= quotaConfig.perMinuteLimit;
}

/**
 * Calculate how many parallel deletions a user can make based on current load
 */
export function calculateParallelDeletions(sessionId: string): number {
	const maxParallel = quotaConfig.maxParallelDeletions;
	const deletingUsers = [...connectedUsers.values()].filter(u => u.isDeleting).length;
	
	// If no one else is deleting, user gets full parallel capacity
	if (deletingUsers <= 1) {
		return maxParallel;
	}
	
	// Distribute available parallel slots among deleting users
	// This is a simple fair-share approach
	return Math.max(1, Math.floor(maxParallel / deletingUsers));
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

/**
 * Start a new deletion session
 * Returns the first batch size and max parallel deletions allowed
 */
export function startDeletionSession(sessionId: string, totalPlanned: number): {
	success: boolean;
	batchSize: number;
	maxParallelDeletions: number;
	message?: string;
} {
	checkDayReset();
	cleanupStaleDeletionSessions();
	
	// Check if user already has an active session
	if (deletionSessions.has(sessionId)) {
		// Clean up old session first
		endDeletionSession(sessionId);
	}
	
	const dailyLimit = quotaConfig.dailyLimit;
	const chunkSize = quotaConfig.reservationChunkSize;
	const smallOpReserve = Math.floor(dailyLimit * (quotaConfig.smallOperationReservePercent / 100));
	
	// Calculate available quota for deletion (accounting for the 5% reserve for small ops)
	const sessionReserved = calculateTotalSessionReserved();
	const effectiveUsed = quotaUsage.totalUsed + quotaUsage.totalReserved + sessionReserved;
	const availableForDeletion = Math.max(0, dailyLimit - effectiveUsed - smallOpReserve);
	
	if (availableForDeletion <= 0) {
		return {
			success: false,
			batchSize: 0,
			maxParallelDeletions: 0,
			message: 'Daily quota exhausted (reserve maintained for small operations)'
		};
	}
	
	// Calculate the first batch size - limited by chunkSize and available quota
	const firstBatchSize = Math.min(chunkSize, availableForDeletion, totalPlanned);
	
	if (firstBatchSize <= 0) {
		return {
			success: false,
			batchSize: 0,
			maxParallelDeletions: 0,
			message: 'Not enough quota available'
		};
	}
	
	// Calculate parallel deletions based on current load
	const maxParallel = calculateParallelDeletions(sessionId);
	
	// Create the session
	const session: DeletionSession = {
		sessionId,
		totalPlanned,
		totalConfirmed: 0,
		currentBatchSize: firstBatchSize,
		currentBatchUsed: 0,
		maxParallelDeletions: maxParallel,
		isWaitingForBatch: true,
		createdAt: Date.now(),
		lastActivity: Date.now()
	};
	
	deletionSessions.set(sessionId, session);
	
	// Mark user as deleting
	updateUserActivity(sessionId, true);
	
	privacyLogger.info(`Started deletion session for ${sessionId.slice(0, 8)}...: ${totalPlanned} total planned, ${firstBatchSize} first batch, ${maxParallel} parallel`);
	
	broadcastQuotaUpdate();
	
	return {
		success: true,
		batchSize: firstBatchSize,
		maxParallelDeletions: maxParallel
	};
}

/**
 * Report batch completion and request next batch
 * Client must call this after completing each batch
 * Returns the next batch size, or 0 if deletion should stop
 */
export function reportBatchComplete(sessionId: string, successCount: number, failedCount: number): {
	success: boolean;
	quotaUsed: number;
	nextBatchSize: number;
	maxParallelDeletions: number;
	shouldContinue: boolean;
	message?: string;
} {
	checkDayReset();
	checkMinuteReset();
	
	const session = deletionSessions.get(sessionId);
	
	if (!session) {
		return {
			success: false,
			quotaUsed: 0,
			nextBatchSize: 0,
			maxParallelDeletions: 0,
			shouldContinue: false,
			message: 'No active deletion session'
		};
	}
	
	// Calculate actual quota used (only successful deletions cost quota)
	const batchQuotaUsed = successCount * QUOTA_COSTS.commentsDelete;
	
	// Update global quota
	quotaUsage.totalUsed += batchQuotaUsed;
	currentMinuteUsage.used += batchQuotaUsed;
	
	// Update session
	session.currentBatchUsed += batchQuotaUsed;
	session.totalConfirmed += batchQuotaUsed;
	session.lastActivity = Date.now();
	session.isWaitingForBatch = false;
	
	// Save to disk
	saveQuotaToDisk();
	
	privacyLogger.info(`Batch complete for ${sessionId.slice(0, 8)}...: ${successCount} success, ${failedCount} failed, ${batchQuotaUsed} quota used`);
	
	// Check if we should continue
	const remainingPlanned = session.totalPlanned - session.totalConfirmed;
	
	if (remainingPlanned <= 0) {
		// All planned deletions complete
		endDeletionSession(sessionId);
		broadcastQuotaUpdate();
		return {
			success: true,
			quotaUsed: batchQuotaUsed,
			nextBatchSize: 0,
			maxParallelDeletions: 0,
			shouldContinue: false,
			message: 'All deletions complete'
		};
	}
	
	// Calculate next batch
	const dailyLimit = quotaConfig.dailyLimit;
	const chunkSize = quotaConfig.reservationChunkSize;
	const smallOpReserve = Math.floor(dailyLimit * (quotaConfig.smallOperationReservePercent / 100));
	
	const sessionReserved = calculateTotalSessionReserved();
	const effectiveUsed = quotaUsage.totalUsed + quotaUsage.totalReserved + sessionReserved;
	const availableForDeletion = Math.max(0, dailyLimit - effectiveUsed - smallOpReserve);
	
	if (availableForDeletion <= 0) {
		// Quota exhausted
		endDeletionSession(sessionId);
		broadcastQuotaUpdate();
		return {
			success: true,
			quotaUsed: batchQuotaUsed,
			nextBatchSize: 0,
			maxParallelDeletions: 0,
			shouldContinue: false,
			message: 'Quota exhausted'
		};
	}
	
	// Calculate next batch size
	const nextBatchSize = Math.min(chunkSize, availableForDeletion, remainingPlanned);
	const maxParallel = calculateParallelDeletions(sessionId);
	
	// Update session for next batch
	session.currentBatchSize = nextBatchSize;
	session.currentBatchUsed = 0;
	session.maxParallelDeletions = maxParallel;
	session.isWaitingForBatch = true;
	
	broadcastQuotaUpdate();
	
	return {
		success: true,
		quotaUsed: batchQuotaUsed,
		nextBatchSize,
		maxParallelDeletions: maxParallel,
		shouldContinue: true
	};
}

/**
 * End a deletion session (called when all deletions complete or user cancels)
 */
export function endDeletionSession(sessionId: string): void {
	const session = deletionSessions.get(sessionId);
	
	if (session) {
		const unused = session.currentBatchSize - session.currentBatchUsed;
		if (unused > 0) {
			privacyLogger.info(`Ended deletion session for ${sessionId.slice(0, 8)}...: released ${unused} unused units`);
		}
		deletionSessions.delete(sessionId);
	}
	
	// Mark user as not deleting
	const user = connectedUsers.get(sessionId);
	if (user) {
		user.isDeleting = false;
	}
	
	broadcastQuotaUpdate();
}

/**
 * Get the current deletion session status for a user
 */
export function getDeletionSessionStatus(sessionId: string): {
	hasSession: boolean;
	totalPlanned: number;
	totalConfirmed: number;
	currentBatchSize: number;
	maxParallelDeletions: number;
} | null {
	const session = deletionSessions.get(sessionId);
	if (!session) return null;
	
	return {
		hasSession: true,
		totalPlanned: session.totalPlanned,
		totalConfirmed: session.totalConfirmed,
		currentBatchSize: session.currentBatchSize,
		maxParallelDeletions: session.maxParallelDeletions
	};
}

// Run cleanup periodically
setInterval(() => {
	cleanupStaleReservations();
	cleanupInactiveUsers();
	cleanupStaleDeletionSessions();
}, 60 * 1000); // Every minute
