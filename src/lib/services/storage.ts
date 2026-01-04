import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { YouTubeComment } from '$lib/types/comment';

const DB_NAME = 'commentslash-db';
const DB_VERSION = 1;
const STORE_NAME = 'comments';

// Configuration loaded from localStorage (set by server config)
// Default to 30 days retention and 14 days stale warning
const getRetentionDays = (): number => {
	if (typeof window !== 'undefined') {
		const stored = localStorage.getItem('commentslash_retention_days');
		if (stored) return parseInt(stored, 10);
	}
	return 30; // Default: 30 days
};

const getStaleWarningDays = (): number => {
	if (typeof window !== 'undefined') {
		const stored = localStorage.getItem('commentslash_stale_warning_days');
		if (stored) return parseInt(stored, 10);
	}
	return 14; // Default: 14 days
};

// Get TTL in milliseconds
const getTTL_MS = (): number => getRetentionDays() * 24 * 60 * 60 * 1000;

// Export config getters for UI access
export const storageConfig = {
	get retentionDays(): number {
		return getRetentionDays();
	},
	get staleWarningDays(): number {
		return getStaleWarningDays();
	},
	get ttlMs(): number {
		return getTTL_MS();
	}
};

interface CommentSlashDB extends DBSchema {
	comments: {
		key: string;
		value: {
			data: YouTubeComment;
			timestamp: number;
		};
		indexes: {
			'by-timestamp': number;
		};
	};
	metadata: {
		key: string;
		value: {
			key: string;
			value: unknown;
			timestamp: number;
		};
	};
}

let db: IDBPDatabase<CommentSlashDB> | null = null;

async function getDB(): Promise<IDBPDatabase<CommentSlashDB>> {
	if (db) return db;

	db = await openDB<CommentSlashDB>(DB_NAME, DB_VERSION, {
		upgrade(database) {
			// Comments store
			if (!database.objectStoreNames.contains('comments')) {
				const commentStore = database.createObjectStore('comments', { keyPath: 'data.id' });
				commentStore.createIndex('by-timestamp', 'timestamp');
			}

			// Metadata store
			if (!database.objectStoreNames.contains('metadata')) {
				database.createObjectStore('metadata', { keyPath: 'key' });
			}
		}
	});

	return db;
}

export async function cleanExpiredData(): Promise<void> {
	const database = await getDB();
	const now = Date.now();
	const cutoff = now - getTTL_MS();

	// Clean expired comments
	const tx = database.transaction('comments', 'readwrite');
	const index = tx.store.index('by-timestamp');
	let cursor = await index.openCursor();

	while (cursor) {
		if (cursor.value.timestamp < cutoff) {
			await cursor.delete();
		}
		cursor = await cursor.continue();
	}

	await tx.done;

	// Clean expired metadata (except quota which should be preserved)
	const metaTx = database.transaction('metadata', 'readwrite');
	const metaCursor = await metaTx.store.openCursor();

	let metaCur = metaCursor;
	while (metaCur) {
		// Don't delete quota metadata
		if (metaCur.value.key !== 'quota' && metaCur.value.timestamp < cutoff) {
			await metaCur.delete();
		}
		metaCur = await metaCur.continue();
	}

	await metaTx.done;
}

export async function saveComments(comments: YouTubeComment[]): Promise<void> {
	const database = await getDB();
	const tx = database.transaction('comments', 'readwrite');
	const timestamp = Date.now();

	for (const comment of comments) {
		await tx.store.put({ data: comment, timestamp });
	}

	await tx.done;
}

export async function loadComments(): Promise<YouTubeComment[]> {
	const database = await getDB();
	const now = Date.now();
	const cutoff = now - getTTL_MS();

	const all = await database.getAll('comments');
	
	// Filter out expired and return just the data
	return all
		.filter(item => item.timestamp >= cutoff)
		.map(item => item.data);
}

export async function deleteComment(commentId: string): Promise<void> {
	const database = await getDB();
	await database.delete('comments', commentId);
}

export async function deleteComments(commentIds: string[]): Promise<void> {
	const database = await getDB();
	const tx = database.transaction('comments', 'readwrite');

	for (const id of commentIds) {
		await tx.store.delete(id);
	}

	await tx.done;
}

export async function clearAllComments(): Promise<void> {
	const database = await getDB();
	await database.clear('comments');
}

export async function saveMetadata(key: string, value: unknown): Promise<void> {
	const database = await getDB();
	await database.put('metadata', { key, value, timestamp: Date.now() });
}

export async function loadMetadata<T>(key: string): Promise<T | null> {
	const database = await getDB();
	const result = await database.get('metadata', key);
	
	if (!result) return null;
	
	// Quota should never expire
	if (key === 'quota') {
		return result.value as T;
	}
	
	const now = Date.now();
	if (result.timestamp < now - getTTL_MS()) {
		await database.delete('metadata', key);
		return null;
	}
	
	return result.value as T;
}

export async function clearAllData(): Promise<void> {
	const database = await getDB();
	await database.clear('comments');
	await database.clear('metadata');
}

/**
 * Clear all comment data but preserve quota information
 * Used for re-importing data without losing quota tracking
 */
export async function clearCommentsOnly(): Promise<void> {
	const database = await getDB();
	
	// Save quota before clearing
	const quota = await database.get('metadata', 'quota');
	
	// Clear both stores
	await database.clear('comments');
	await database.clear('metadata');
	
	// Restore quota if it existed
	if (quota) {
		await database.put('metadata', quota);
	}
}

/**
 * Save the last takeout import date
 */
export async function saveLastTakeoutImport(): Promise<void> {
	await saveMetadata('lastTakeoutImport', Date.now());
}

/**
 * Load the last takeout import date
 */
export async function loadLastTakeoutImport(): Promise<number | null> {
	return loadMetadata<number>('lastTakeoutImport');
}

/**
 * Check if takeout data is stale (older than configured stale warning days)
 */
export async function isTakeoutStale(daysThreshold?: number): Promise<boolean> {
	const threshold = daysThreshold ?? getStaleWarningDays();
	const lastImport = await loadLastTakeoutImport();
	if (!lastImport) return false;
	
	const now = Date.now();
	const thresholdMs = threshold * 24 * 60 * 60 * 1000;
	return (now - lastImport) > thresholdMs;
}

/**
 * Get data lifetime info (for UI display)
 */
export interface DataLifetimeInfo {
	createdAt: number | null;
	expiresAt: number | null;
	daysUntilExpiry: number;
	daysRemaining: number;
	isExpiringSoon: boolean;
}

export async function getDataLifetimeInfo(): Promise<DataLifetimeInfo> {
	const lastImport = await loadLastTakeoutImport();
	
	if (!lastImport) {
		return {
			createdAt: null,
			expiresAt: null,
			daysUntilExpiry: 0,
			daysRemaining: 0,
			isExpiringSoon: false
		};
	}
	
	const now = Date.now();
	const ttl = getTTL_MS();
	const expiresAt = lastImport + ttl;
	const msRemaining = expiresAt - now;
	const daysRemaining = Math.max(0, Math.ceil(msRemaining / (24 * 60 * 60 * 1000)));
	const isExpiringSoon = daysRemaining <= 7;
	
	return {
		createdAt: lastImport,
		expiresAt,
		daysUntilExpiry: getRetentionDays(),
		daysRemaining,
		isExpiringSoon
	};
}

/**
 * Refresh the timestamp of the data (extend its lifetime)
 */
export async function refreshDataLifetime(): Promise<void> {
	const database = await getDB();
	const timestamp = Date.now();
	
	// Update all comment timestamps
	const tx = database.transaction('comments', 'readwrite');
	let cursor = await tx.store.openCursor();
	
	while (cursor) {
		const updated = { ...cursor.value, timestamp };
		await cursor.update(updated);
		cursor = await cursor.continue();
	}
	
	await tx.done;
	
	// Update takeout import timestamp
	await saveLastTakeoutImport();
}

// Run cleanup on import
if (typeof window !== 'undefined') {
	cleanExpiredData().catch(console.error);
}
