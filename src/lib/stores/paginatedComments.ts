/**
 * Optimized comment store with pagination and streaming support
 * This allows working with large datasets without loading everything into memory
 */

import { writable, derived, get } from 'svelte/store';
import type { YouTubeComment, CommentFilters, SortField, SortOrder } from '$lib/types/comment';
import { queryComments, type CommentQueryOptions } from '$lib/services/storage';

// Pagination state
export const PAGE_SIZE = 100; // Number of comments to load per page
export const currentPage = writable<number>(0);
export const totalComments = writable<number>(0);
export const hasMorePages = writable<boolean>(false);

// Loaded comments (paginated)
export const paginatedComments = writable<YouTubeComment[]>([]);

// Loading state for pagination
export const isPaginationLoading = writable<boolean>(false);

/**
 * Load a page of comments from IndexedDB with filters applied
 */
export async function loadCommentPage(
	page: number,
	filters: CommentFilters,
	sortField: SortField,
	sortOrder: SortOrder,
	searchQuery: string,
	append: boolean = false
): Promise<void> {
	isPaginationLoading.set(true);
	
	try {
		const options: CommentQueryOptions = {
			limit: PAGE_SIZE,
			offset: page * PAGE_SIZE,
			labels: filters.labels,
			minCharacters: filters.minCharacters > 0 ? filters.minCharacters : undefined,
			maxCharacters: filters.maxCharacters < 10000 ? filters.maxCharacters : undefined,
			minLikes: filters.minLikes > 0 ? filters.minLikes : undefined,
			maxLikes: filters.maxLikes < 1000000 ? filters.maxLikes : undefined,
			videoPrivacy: filters.videoPrivacy,
			moderationStatus: filters.moderationStatus,
			searchQuery: searchQuery || undefined,
			showOnlyWithErrors: filters.showOnlyWithErrors,
			sortBy: sortField,
			sortOrder: sortOrder
		};
		
		const result = await queryComments(options);
		
		if (append) {
			paginatedComments.update(current => [...current, ...result.comments]);
		} else {
			paginatedComments.set(result.comments);
		}
		
		totalComments.set(result.total);
		hasMorePages.set(result.hasMore);
		currentPage.set(page);
	} catch (error) {
		console.error('Failed to load comment page:', error);
	} finally {
		isPaginationLoading.set(false);
	}
}

/**
 * Load the next page of comments
 */
export async function loadNextPage(
	filters: CommentFilters,
	sortField: SortField,
	sortOrder: SortOrder,
	searchQuery: string
): Promise<void> {
	const nextPage = get(currentPage) + 1;
	await loadCommentPage(nextPage, filters, sortField, sortOrder, searchQuery, true);
}

/**
 * Reset pagination and load first page
 */
export async function resetAndLoadFirstPage(
	filters: CommentFilters,
	sortField: SortField,
	sortOrder: SortOrder,
	searchQuery: string
): Promise<void> {
	currentPage.set(0);
	await loadCommentPage(0, filters, sortField, sortOrder, searchQuery, false);
}

/**
 * Clear pagination state
 */
export function clearPagination(): void {
	paginatedComments.set([]);
	currentPage.set(0);
	totalComments.set(0);
	hasMorePages.set(false);
	isPaginationLoading.set(false);
}
