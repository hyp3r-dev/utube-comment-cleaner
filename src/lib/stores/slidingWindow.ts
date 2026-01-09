/**
 * Sliding window store for memory-efficient comment streaming
 * Loads and unloads comments as user scrolls through large datasets
 */

import { writable, derived, get } from 'svelte/store';
import type { YouTubeComment, CommentFilters, SortField, SortOrder } from '$lib/types/comment';
import { queryComments, type CommentQueryOptions, getCommentCount } from '$lib/services/storage';
import { searchMode, type SearchMode } from './comments';

// Sliding window configuration - increased for more reliable scrolling
const WINDOW_SIZE = 500; // Keep 500 comments in memory (increased from 200)
const LOAD_THRESHOLD = 0.3; // Load more when scrolled 30% from edge (lowered from 60% for earlier loading)
const BATCH_SIZE = 200; // Load 200 comments at a time (increased from 100)
const PRELOAD_BUFFER = 100; // Extra buffer when at edges

// Sliding window state
export const windowedComments = writable<YouTubeComment[]>([]);
export const windowStart = writable<number>(0); // Index of first comment in window
export const windowEnd = writable<number>(0); // Index of last comment in window
export const totalAvailable = writable<number>(0); // Total comments matching filters
export const isLoadingWindow = writable<boolean>(false);

// Current scroll position tracking
export const currentScrollIndex = writable<number>(0);

// Current filter/sort state
let currentFilters: CommentFilters | null = null;
let currentSortField: SortField = 'likeCount';
let currentSortOrder: SortOrder = 'desc';
let currentSearchQuery = '';
let currentSearchMode: SearchMode = 'all';

/**
 * Initialize sliding window with first batch of comments
 */
export async function initializeSlidingWindow(
	filters: CommentFilters,
	sortField: SortField,
	sortOrder: SortOrder,
	searchQuery: string
): Promise<void> {
	isLoadingWindow.set(true);
	
	// Store current state (deep copy to avoid reference issues)
	currentFilters = JSON.parse(JSON.stringify(filters));
	currentSortField = sortField;
	currentSortOrder = sortOrder;
	currentSearchQuery = searchQuery;
	currentSearchMode = get(searchMode);
	
	try {
		const options: CommentQueryOptions = {
			limit: WINDOW_SIZE,
			offset: 0,
			labels: filters.labels,
			minCharacters: filters.minCharacters > 0 ? filters.minCharacters : undefined,
			maxCharacters: filters.maxCharacters < 10000 ? filters.maxCharacters : undefined,
			minLikes: filters.minLikes > 0 ? filters.minLikes : undefined,
			maxLikes: filters.maxLikes < 1000000 ? filters.maxLikes : undefined,
			videoPrivacy: filters.videoPrivacy,
			moderationStatus: filters.moderationStatus,
			searchQuery: searchQuery || undefined,
			searchMode: currentSearchMode,
			showOnlyWithErrors: filters.showOnlyWithErrors,
			channelId: filters.channelFilter?.channelId,
			dateRange: filters.dateRange,
			sortBy: sortField,
			sortOrder: sortOrder
		};
		
		const result = await queryComments(options);
		
		windowedComments.set(result.comments);
		windowStart.set(0);
		windowEnd.set(result.comments.length);
		totalAvailable.set(result.total);
		currentScrollIndex.set(0);
	} catch (error) {
		console.error('Failed to initialize sliding window:', error);
		windowedComments.set([]);
		windowStart.set(0);
		windowEnd.set(0);
		totalAvailable.set(0);
	} finally {
		isLoadingWindow.set(false);
	}
}

/**
 * Load more comments when scrolling down
 */
async function loadForward(): Promise<void> {
	const start = get(windowStart);
	const end = get(windowEnd);
	const total = get(totalAvailable);
	const loading = get(isLoadingWindow);
	
	// Don't load if already loading or at end
	if (loading || end >= total) return;
	
	isLoadingWindow.set(true);
	
	try {
		if (!currentFilters) return;
		
		const options: CommentQueryOptions = {
			limit: BATCH_SIZE,
			offset: end,
			labels: currentFilters.labels,
			minCharacters: currentFilters.minCharacters > 0 ? currentFilters.minCharacters : undefined,
			maxCharacters: currentFilters.maxCharacters < 10000 ? currentFilters.maxCharacters : undefined,
			minLikes: currentFilters.minLikes > 0 ? currentFilters.minLikes : undefined,
			maxLikes: currentFilters.maxLikes < 1000000 ? currentFilters.maxLikes : undefined,
			videoPrivacy: currentFilters.videoPrivacy,
			moderationStatus: currentFilters.moderationStatus,
			searchQuery: currentSearchQuery || undefined,
			searchMode: currentSearchMode,
			showOnlyWithErrors: currentFilters.showOnlyWithErrors,
			channelId: currentFilters.channelFilter?.channelId,
			dateRange: currentFilters.dateRange,
			sortBy: currentSortField,
			sortOrder: currentSortOrder
		};
		
		const result = await queryComments(options);
		
		if (result.comments.length > 0) {
			windowedComments.update(current => {
				const newComments = [...current, ...result.comments];
				
				// If window exceeds WINDOW_SIZE, remove from front
				if (newComments.length > WINDOW_SIZE) {
					const excess = newComments.length - WINDOW_SIZE;
					windowStart.update(s => s + excess);
					return newComments.slice(excess);
				}
				
				return newComments;
			});
			
			windowEnd.update(e => e + result.comments.length);
		}
	} catch (error) {
		console.error('Failed to load forward:', error);
	} finally {
		isLoadingWindow.set(false);
	}
}

/**
 * Load more comments when scrolling up
 */
async function loadBackward(): Promise<void> {
	const start = get(windowStart);
	const loading = get(isLoadingWindow);
	
	// Don't load if already loading or at beginning
	if (loading || start <= 0) return;
	
	isLoadingWindow.set(true);
	
	try {
		if (!currentFilters) return;
		
		// Load BATCH_SIZE comments before current window
		const newStart = Math.max(0, start - BATCH_SIZE);
		const actualBatchSize = start - newStart;
		
		const options: CommentQueryOptions = {
			limit: actualBatchSize,
			offset: newStart,
			labels: currentFilters.labels,
			minCharacters: currentFilters.minCharacters > 0 ? currentFilters.minCharacters : undefined,
			maxCharacters: currentFilters.maxCharacters < 10000 ? currentFilters.maxCharacters : undefined,
			minLikes: currentFilters.minLikes > 0 ? currentFilters.minLikes : undefined,
			maxLikes: currentFilters.maxLikes < 1000000 ? currentFilters.maxLikes : undefined,
			videoPrivacy: currentFilters.videoPrivacy,
			moderationStatus: currentFilters.moderationStatus,
			searchQuery: currentSearchQuery || undefined,
			searchMode: currentSearchMode,
			showOnlyWithErrors: currentFilters.showOnlyWithErrors,
			channelId: currentFilters.channelFilter?.channelId,
			dateRange: currentFilters.dateRange,
			sortBy: currentSortField,
			sortOrder: currentSortOrder
		};
		
		const result = await queryComments(options);
		
		if (result.comments.length > 0) {
			windowedComments.update(current => {
				const newComments = [...result.comments, ...current];
				
				// If window exceeds WINDOW_SIZE, remove from end
				if (newComments.length > WINDOW_SIZE) {
					const excess = newComments.length - WINDOW_SIZE;
					windowEnd.update(e => e - excess);
					return newComments.slice(0, WINDOW_SIZE);
				}
				
				return newComments;
			});
			
			windowStart.set(newStart);
		}
	} catch (error) {
		console.error('Failed to load backward:', error);
	} finally {
		isLoadingWindow.set(false);
	}
}

/**
 * Handle scroll position change and trigger loading if needed
 * @param scrollIndex - Current index of the comment being viewed (relative to window)
 */
export async function handleScrollPosition(scrollIndex: number): Promise<void> {
	const comments = get(windowedComments);
	const total = get(totalAvailable);
	const start = get(windowStart);
	const end = get(windowEnd);
	const loading = get(isLoadingWindow);
	
	if (comments.length === 0 || loading) return;
	
	currentScrollIndex.set(scrollIndex);
	
	// Calculate how close we are to the edges of the window
	const distanceFromStart = scrollIndex;
	const distanceFromEnd = comments.length - scrollIndex;
	
	// More aggressive loading thresholds based on window size
	const earlyLoadThreshold = Math.max(PRELOAD_BUFFER, Math.floor(comments.length * LOAD_THRESHOLD));
	
	// Check if we need to load forward (scrolling down / near bottom of window)
	const needsForward = distanceFromEnd < earlyLoadThreshold && end < total;
	
	// Check if we need to load backward (scrolling up / near top of window)
	const needsBackward = distanceFromStart < earlyLoadThreshold && start > 0;
	
	// Load both directions if needed (user might scroll either way)
	if (needsForward) {
		await loadForward();
	}
	
	if (needsBackward) {
		await loadBackward();
	}
}

/**
 * Reset when filters/sort changes
 */
export async function reloadSlidingWindow(
	filters: CommentFilters,
	sortField: SortField,
	sortOrder: SortOrder,
	searchQuery: string
): Promise<void> {
	// Check if filters actually changed
	const filtersChanged = JSON.stringify(currentFilters) !== JSON.stringify(filters);
	const sortChanged = currentSortField !== sortField || currentSortOrder !== sortOrder;
	const searchChanged = currentSearchQuery !== searchQuery;
	const searchModeChanged = currentSearchMode !== get(searchMode);
	
	if (filtersChanged || sortChanged || searchChanged || searchModeChanged) {
		await initializeSlidingWindow(filters, sortField, sortOrder, searchQuery);
	}
}

/**
 * Force reload the sliding window without checking if filters changed
 * Use this when underlying data has changed (e.g., comments deleted)
 */
export async function forceReloadSlidingWindow(): Promise<void> {
	if (currentFilters) {
		await initializeSlidingWindow(currentFilters, currentSortField, currentSortOrder, currentSearchQuery);
	}
}

/**
 * Clear sliding window
 */
export function clearSlidingWindow(): void {
	windowedComments.set([]);
	windowStart.set(0);
	windowEnd.set(0);
	totalAvailable.set(0);
	currentScrollIndex.set(0);
	isLoadingWindow.set(false);
	currentFilters = null;
}
