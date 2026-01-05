import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { YouTubeComment, CommentLabel } from '$lib/types/comment';

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

/**
 * Search comments in IndexedDB by text query
 * Returns matching comment IDs for efficient filtering
 */
export async function searchCommentsInDB(query: string): Promise<Set<string>> {
	const database = await getDB();
	const now = Date.now();
	const cutoff = now - getTTL_MS();
	const lowerQuery = query.toLowerCase();
	const matchingIds = new Set<string>();

	const all = await database.getAll('comments');
	
	for (const item of all) {
		// Skip expired items
		if (item.timestamp < cutoff) continue;
		
		const comment = item.data;
		// Search in comment text and video title
		const matchesText = comment.textOriginal.toLowerCase().includes(lowerQuery);
		const matchesVideo = comment.videoTitle?.toLowerCase().includes(lowerQuery);
		
		if (matchesText || matchesVideo) {
			matchingIds.add(comment.id);
		}
	}
	
	return matchingIds;
}

/**
 * Load comments with pagination and filtering
 * This allows working with large datasets without loading everything into memory
 */
export interface CommentQueryOptions {
	// Pagination
	limit?: number;
	offset?: number;
	
	// Filters
	labels?: CommentLabel[];
	minCharacters?: number;
	maxCharacters?: number;
	minLikes?: number;
	maxLikes?: number;
	videoPrivacy?: ('public' | 'private' | 'unlisted' | 'unknown')[];
	moderationStatus?: ('published' | 'heldForReview' | 'likelySpam' | 'rejected' | 'unknown')[];
	searchQuery?: string;
	showOnlyWithErrors?: boolean;
	
	// Sorting
	sortBy?: 'likeCount' | 'publishedAt' | 'textLength';
	sortOrder?: 'asc' | 'desc';
}

export async function queryComments(options: CommentQueryOptions = {}): Promise<{
	comments: YouTubeComment[];
	total: number;
	hasMore: boolean;
}> {
	const database = await getDB();
	const now = Date.now();
	const cutoff = now - getTTL_MS();
	
	// Get all comments (we need to filter and count)
	const all = await database.getAll('comments');
	
	// Filter comments
	let filtered = all
		.filter(item => item.timestamp >= cutoff)
		.map(item => item.data)
		.filter(comment => {
			// Label filter
			if (options.labels && options.labels.length > 0) {
				const commentLabels = comment.labels || [];
				const hasMatchingLabel = options.labels.some(label => commentLabels.includes(label));
				if (!hasMatchingLabel) return false;
			}
			
			// Character length filter
			if (options.minCharacters !== undefined || options.maxCharacters !== undefined) {
				const textLength = comment.textOriginal.length;
				if (options.minCharacters !== undefined && textLength < options.minCharacters) return false;
				if (options.maxCharacters !== undefined && textLength > options.maxCharacters) return false;
			}
			
			// Like count filter
			if (options.minLikes !== undefined || options.maxLikes !== undefined) {
				if (options.minLikes !== undefined && comment.likeCount < options.minLikes) return false;
				if (options.maxLikes !== undefined && comment.likeCount > options.maxLikes) return false;
			}
			
			// Video privacy filter
			if (options.videoPrivacy && options.videoPrivacy.length > 0) {
				const privacyStatus = comment.videoPrivacyStatus || 'unknown';
				if (!options.videoPrivacy.includes(privacyStatus)) return false;
			}
			
			// Moderation status filter
			if (options.moderationStatus && options.moderationStatus.length > 0) {
				const modStatus = comment.moderationStatus || 'unknown';
				if (!options.moderationStatus.includes(modStatus)) return false;
			}
			
			// Search query filter
			if (options.searchQuery) {
				const query = options.searchQuery.toLowerCase();
				const matchesText = comment.textOriginal.toLowerCase().includes(query);
				const matchesVideo = comment.videoTitle?.toLowerCase().includes(query);
				if (!matchesText && !matchesVideo) return false;
			}
			
			// Show only comments with delete errors
			if (options.showOnlyWithErrors && !comment.lastDeleteError) return false;
			
			return true;
		});
	
	const total = filtered.length;
	
	// Sort comments
	if (options.sortBy) {
		filtered = filtered.sort((a, b) => {
			let comparison = 0;
			
			switch (options.sortBy) {
				case 'likeCount':
					comparison = a.likeCount - b.likeCount;
					break;
				case 'publishedAt':
					comparison = new Date(a.publishedAt).getTime() - new Date(b.publishedAt).getTime();
					break;
				case 'textLength':
					comparison = a.textOriginal.length - b.textOriginal.length;
					break;
			}
			
			return options.sortOrder === 'desc' ? -comparison : comparison;
		});
	}
	
	// Apply pagination
	const offset = options.offset || 0;
	const limit = options.limit || filtered.length;
	const paginatedComments = filtered.slice(offset, offset + limit);
	const hasMore = offset + limit < total;
	
	return {
		comments: paginatedComments,
		total,
		hasMore
	};
}

/**
 * Stream comments in batches using a callback
 * This is more memory-efficient for very large datasets
 */
export async function streamComments(
	batchSize: number,
	callback: (batch: YouTubeComment[], index: number, total: number) => void | Promise<void>,
	options: Omit<CommentQueryOptions, 'limit' | 'offset'> = {}
): Promise<void> {
	const database = await getDB();
	const now = Date.now();
	const cutoff = now - getTTL_MS();
	
	// Get all comments that match filters
	const result = await queryComments({
		...options,
		limit: undefined, // Get all matching
		offset: 0
	});
	
	const total = result.total;
	
	// Stream in batches
	for (let i = 0; i < total; i += batchSize) {
		const batch = result.comments.slice(i, Math.min(i + batchSize, total));
		await callback(batch, i / batchSize, Math.ceil(total / batchSize));
	}
}

/**
 * Get total count of non-expired comments in IndexedDB
 */
export async function getCommentCount(): Promise<number> {
	const database = await getDB();
	const now = Date.now();
	const cutoff = now - getTTL_MS();

	const all = await database.getAll('comments');
	return all.filter(item => item.timestamp >= cutoff).length;
}

/**
 * Get all comment IDs that match filters (for "Select All Visible")
 * Returns only IDs to minimize memory usage
 */
export async function getFilteredCommentIds(options: Omit<CommentQueryOptions, 'limit' | 'offset'>): Promise<string[]> {
	const database = await getDB();
	const now = Date.now();
	const cutoff = now - getTTL_MS();
	
	// Get all comments
	const all = await database.getAll('comments');
	
	// Filter comments and extract IDs
	const matchingIds = all
		.filter(item => item.timestamp >= cutoff)
		.map(item => item.data)
		.filter(comment => {
			// Label filter
			if (options.labels && options.labels.length > 0) {
				const commentLabels = comment.labels || [];
				const hasMatchingLabel = options.labels.some(label => commentLabels.includes(label));
				if (!hasMatchingLabel) return false;
			}
			
			// Character length filter
			if (options.minCharacters !== undefined || options.maxCharacters !== undefined) {
				const textLength = comment.textOriginal.length;
				if (options.minCharacters !== undefined && textLength < options.minCharacters) return false;
				if (options.maxCharacters !== undefined && textLength > options.maxCharacters) return false;
			}
			
			// Like count filter
			if (options.minLikes !== undefined || options.maxLikes !== undefined) {
				if (options.minLikes !== undefined && comment.likeCount < options.minLikes) return false;
				if (options.maxLikes !== undefined && comment.likeCount > options.maxLikes) return false;
			}
			
			// Video privacy filter
			if (options.videoPrivacy && options.videoPrivacy.length > 0) {
				const privacyStatus = comment.videoPrivacyStatus || 'unknown';
				if (!options.videoPrivacy.includes(privacyStatus)) return false;
			}
			
			// Moderation status filter
			if (options.moderationStatus && options.moderationStatus.length > 0) {
				const modStatus = comment.moderationStatus || 'unknown';
				if (!options.moderationStatus.includes(modStatus)) return false;
			}
			
			// Search query filter
			if (options.searchQuery) {
				const query = options.searchQuery.toLowerCase();
				const matchesText = comment.textOriginal.toLowerCase().includes(query);
				const matchesVideo = comment.videoTitle?.toLowerCase().includes(query);
				if (!matchesText && !matchesVideo) return false;
			}
			
			// Show only comments with delete errors
			if (options.showOnlyWithErrors && !comment.lastDeleteError) return false;
			
			return true;
		})
		.map(comment => comment.id);
	
	return matchingIds;
}

// Run cleanup on import
if (typeof window !== 'undefined') {
	cleanExpiredData().catch(console.error);
}
