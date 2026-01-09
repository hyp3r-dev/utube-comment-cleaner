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
	}
};

/**
 * Data directory for persistent storage
 * Uses DATA_DIR environment variable or falls back to ./data
 */
const DATA_DIR = process.env.DATA_DIR || './data';
const QUOTA_FILE = join(DATA_DIR, 'quota.json');

/**
 * Reservation tracking - maps session/user ID to their reserved quota
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
	
	const dailyLimit = quotaConfig.dailyLimit;
	const perMinuteLimit = quotaConfig.perMinuteLimit;
	
	const effectiveUsed = quotaUsage.totalUsed + quotaUsage.totalReserved;
	const remaining = Math.max(0, dailyLimit - effectiveUsed);
	
	const deletingUsers = [...connectedUsers.values()].filter(u => u.isDeleting).length;
	
	return {
		used: quotaUsage.totalUsed,
		reserved: quotaUsage.totalReserved,
		remaining,
		dailyLimit,
		perMinuteUsed: currentMinuteUsage.used,
		perMinuteLimit,
		connectedUsers: connectedUsers.size,
		deletingUsers,
		maxParallelDeletions: quotaConfig.maxParallelDeletions,
		percentUsed: Math.round((effectiveUsed / dailyLimit) * 100),
		date: quotaUsage.date,
		timestamp: Date.now()
	};
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

// Run cleanup periodically
setInterval(() => {
	cleanupStaleReservations();
	cleanupInactiveUsers();
}, 60 * 1000); // Every minute
