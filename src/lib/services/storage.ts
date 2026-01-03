import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { YouTubeComment } from '$lib/types/comment';

const DB_NAME = 'commentslash-db';
const DB_VERSION = 1;
const STORE_NAME = 'comments';
const TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

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
	const cutoff = now - TTL_MS;

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

	// Clean expired metadata
	const metaTx = database.transaction('metadata', 'readwrite');
	const metaCursor = await metaTx.store.openCursor();

	let metaCur = metaCursor;
	while (metaCur) {
		if (metaCur.value.timestamp < cutoff) {
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
	const cutoff = now - TTL_MS;

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
	
	const now = Date.now();
	if (result.timestamp < now - TTL_MS) {
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

// Run cleanup on import
if (typeof window !== 'undefined') {
	cleanExpiredData().catch(console.error);
}
