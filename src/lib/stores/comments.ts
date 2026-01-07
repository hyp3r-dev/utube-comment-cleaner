import { writable, derived, get } from 'svelte/store';
import type { YouTubeComment, CommentFilters, SortField, SortOrder, CommentLabel } from '$lib/types/comment';

// Authentication store
export const apiKey = writable<string>('');
export const isAuthenticated = writable<boolean>(false);

// Comments data store
export const comments = writable<YouTubeComment[]>([]);
export const selectedIds = writable<Set<string>>(new Set());
// Track selection order (most recently added first)
export const selectionOrder = writable<string[]>([]);

// Loading state
export const isLoading = writable<boolean>(false);
export const loadingProgress = writable<{ loaded: number; total?: number }>({ loaded: 0 });
export const error = writable<string | null>(null);

// Filters
export const filters = writable<CommentFilters>({
	videoPrivacy: ['public', 'private', 'unlisted', 'unknown'],
	moderationStatus: ['published', 'heldForReview', 'likelySpam', 'rejected', 'unknown'],
	minCharacters: 0,
	maxCharacters: 10000,
	minLikes: 0,
	maxLikes: 1000000,
	labels: undefined,
	showOnlyWithErrors: false,
	channelFilter: undefined
});

// Sorting
export const sortField = writable<SortField>('likeCount');
export const sortOrder = writable<SortOrder>('desc');

// Search
export const searchQuery = writable<string>('');

// Search mode: 'all' | 'comments' | 'videos' | 'channels'
export type SearchMode = 'all' | 'comments' | 'videos' | 'channels';
export const searchMode = writable<SearchMode>('all');

// Filtered and sorted comments
export const filteredComments = derived(
	[comments, filters, sortField, sortOrder, searchQuery, searchMode],
	([$comments, $filters, $sortField, $sortOrder, $searchQuery, $searchMode]) => {
		let result = $comments.filter(comment => {
			// Video privacy filter
			const privacyStatus = comment.videoPrivacyStatus || 'unknown';
			if (!$filters.videoPrivacy.includes(privacyStatus)) return false;

			// Moderation status filter
			const modStatus = comment.moderationStatus || 'unknown';
			if (!$filters.moderationStatus.includes(modStatus)) return false;

			// Character length filter
			const textLength = comment.textOriginal.length;
			if (textLength < $filters.minCharacters || textLength > $filters.maxCharacters) return false;

			// Like count filter
			if (comment.likeCount < $filters.minLikes || comment.likeCount > $filters.maxLikes) return false;

			// Label filter - if labels are specified, only show comments with those labels
			if ($filters.labels && $filters.labels.length > 0) {
				const commentLabels = comment.labels || [];
				const hasMatchingLabel = $filters.labels.some(label => commentLabels.includes(label));
				if (!hasMatchingLabel) return false;
			}

			// Show only comments with delete errors
			if ($filters.showOnlyWithErrors && !comment.lastDeleteError) return false;

			// Channel filter - filter by channel ID
			if ($filters.channelFilter) {
				if (comment.videoChannelId !== $filters.channelFilter.channelId) return false;
			}

			// Search query filter with mode support
			if ($searchQuery) {
				const query = $searchQuery.toLowerCase();
				
				switch ($searchMode) {
					case 'comments':
						// Only search in comment text
						if (!comment.textOriginal.toLowerCase().includes(query)) return false;
						break;
					case 'videos':
						// Only search in video titles
						if (!comment.videoTitle?.toLowerCase().includes(query)) return false;
						break;
					case 'channels':
						// Only search in channel names
						if (!comment.videoChannelTitle?.toLowerCase().includes(query)) return false;
						break;
					case 'all':
					default:
						// Search in all fields
						const matchesText = comment.textOriginal.toLowerCase().includes(query);
						const matchesVideo = comment.videoTitle?.toLowerCase().includes(query);
						const matchesChannel = comment.videoChannelTitle?.toLowerCase().includes(query);
						if (!matchesText && !matchesVideo && !matchesChannel) return false;
						break;
				}
			}

			return true;
		});

		// Sort
		result = [...result].sort((a, b) => {
			let comparison = 0;
			
			switch ($sortField) {
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

			return $sortOrder === 'desc' ? -comparison : comparison;
		});

		return result;
	}
);

// Selected comments - ordered by selection time (most recent first)
export const selectedComments = derived(
	[comments, selectedIds, selectionOrder],
	([$comments, $selectedIds, $selectionOrder]) => {
		// Create a map for quick comment lookup
		const commentMap = new Map($comments.map(c => [c.id, c]));
		
		// Return comments in selection order (most recent first)
		return $selectionOrder
			.filter(id => $selectedIds.has(id))
			.map(id => commentMap.get(id))
			.filter((c): c is YouTubeComment => c !== undefined);
	}
);

// Statistics
export const stats = derived(comments, ($comments) => ({
	total: $comments.length,
	totalLikes: $comments.reduce((sum, c) => sum + c.likeCount, 0),
	avgLength: $comments.length > 0 
		? Math.round($comments.reduce((sum, c) => sum + c.textOriginal.length, 0) / $comments.length)
		: 0,
	publicVideos: $comments.filter(c => c.videoPrivacyStatus === 'public').length,
	privateVideos: $comments.filter(c => c.videoPrivacyStatus === 'private').length
}));

// Actions
export function selectComment(id: string): void {
	// Add to selection order first (most recent at the beginning)
	selectionOrder.update(order => {
		// Remove if already exists (will re-add at beginning)
		const filtered = order.filter(i => i !== id);
		return [id, ...filtered];
	});
	selectedIds.update(ids => {
		const newIds = new Set(ids);
		newIds.add(id);
		return newIds;
	});
}

export function deselectComment(id: string): void {
	selectionOrder.update(order => order.filter(i => i !== id));
	selectedIds.update(ids => {
		const newIds = new Set(ids);
		newIds.delete(id);
		return newIds;
	});
}

export function toggleComment(id: string): void {
	selectedIds.update(ids => {
		const newIds = new Set(ids);
		if (newIds.has(id)) {
			newIds.delete(id);
			selectionOrder.update(order => order.filter(i => i !== id));
		} else {
			newIds.add(id);
			// Add to beginning of selection order
			selectionOrder.update(order => [id, ...order.filter(i => i !== id)]);
		}
		return newIds;
	});
}

export function selectAllFiltered(): void {
	const filtered = get(filteredComments);
	const currentIds = get(selectedIds);
	const currentOrder = get(selectionOrder);
	
	// Add only new IDs to the selection (ADD to queue, don't replace)
	const newIds = filtered.filter(c => !currentIds.has(c.id)).map(c => c.id);
	
	// Update selection order: new IDs at the beginning, existing order preserved
	selectionOrder.set([...newIds, ...currentOrder]);
	
	// Update selectedIds by adding new IDs
	selectedIds.update(ids => {
		const updated = new Set(ids);
		filtered.forEach(c => updated.add(c.id));
		return updated;
	});
}

export function deselectAll(): void {
	selectedIds.set(new Set());
	selectionOrder.set([]);
}

export function removeComments(ids: string[]): void {
	comments.update(current => current.filter(c => !ids.includes(c.id)));
	selectionOrder.update(order => order.filter(id => !ids.includes(id)));
	selectedIds.update(current => {
		const newIds = new Set(current);
		ids.forEach(id => newIds.delete(id));
		return newIds;
	});
}

// Update a single comment in place (for real-time enrichment)
export function updateComment(id: string, updates: Partial<YouTubeComment>): void {
	comments.update(current => 
		current.map(c => c.id === id ? { ...c, ...updates } : c)
	);
}

// Update multiple comments in place (for batch enrichment)
export function updateComments(updatedComments: Map<string, Partial<YouTubeComment>>): void {
	comments.update(current => 
		current.map(c => {
			const updates = updatedComments.get(c.id);
			return updates ? { ...c, ...updates } : c;
		})
	);
}

// Add a label to a comment
export function addLabelToComment(id: string, label: CommentLabel): void {
	comments.update(current =>
		current.map(c => {
			if (c.id !== id) return c;
			const existingLabels = c.labels || [];
			if (existingLabels.includes(label)) return c;
			return { ...c, labels: [...existingLabels, label] };
		})
	);
}

// Remove a label from a comment
export function removeLabelFromComment(id: string, label: CommentLabel): void {
	comments.update(current =>
		current.map(c => {
			if (c.id !== id) return c;
			const existingLabels = c.labels || [];
			return { ...c, labels: existingLabels.filter(l => l !== label) };
		})
	);
}

// Set delete error on a comment
export function setDeleteError(id: string, errorMessage: string): void {
	comments.update(current =>
		current.map(c => {
			if (c.id !== id) return c;
			const existingLabels = c.labels || [];
			const newLabels = existingLabels.includes('api_error') 
				? existingLabels 
				: [...existingLabels, 'api_error' as CommentLabel];
			return {
				...c,
				labels: newLabels,
				lastDeleteError: errorMessage,
				lastDeleteAttempt: new Date().toISOString()
			};
		})
	);
}

// Clear delete error from a comment
export function clearDeleteError(id: string): void {
	comments.update(current =>
		current.map(c => {
			if (c.id !== id) return c;
			const existingLabels = (c.labels || []).filter(l => l !== 'api_error');
			return {
				...c,
				labels: existingLabels.length > 0 ? existingLabels : undefined,
				lastDeleteError: undefined,
				lastDeleteAttempt: undefined
			};
		})
	);
}

// Move a comment to the bottom of the selection queue
export function moveToBottomOfQueue(id: string): void {
	selectionOrder.update(order => {
		// Remove the id from its current position
		const filtered = order.filter(i => i !== id);
		// Add it to the end (bottom of queue)
		return [...filtered, id];
	});
}

// Move multiple comments to the bottom of the selection queue
export function moveToBottomOfQueueBatch(ids: string[]): void {
	selectionOrder.update(order => {
		const idsSet = new Set(ids);
		// Remove all the ids from their current positions
		const filtered = order.filter(i => !idsSet.has(i));
		// Add them to the end (bottom of queue) in their relative order
		const toMove = order.filter(i => idsSet.has(i));
		return [...filtered, ...toMove];
	});
}

export function resetFilters(): void {
	filters.set({
		videoPrivacy: ['public', 'private', 'unlisted', 'unknown'],
		moderationStatus: ['published', 'heldForReview', 'likelySpam', 'rejected', 'unknown'],
		minCharacters: 0,
		maxCharacters: 10000,
		minLikes: 0,
		maxLikes: 1000000,
		labels: undefined,
		showOnlyWithErrors: false,
		channelFilter: undefined
	});
	searchQuery.set('');
	searchMode.set('all');
}

// Set channel filter
export function setChannelFilter(channelId: string, channelTitle: string): void {
	filters.update(f => ({ ...f, channelFilter: { channelId, channelTitle } }));
}

// Clear channel filter
export function clearChannelFilter(): void {
	filters.update(f => ({ ...f, channelFilter: undefined }));
}

export function logout(): void {
	apiKey.set('');
	isAuthenticated.set(false);
	comments.set([]);
	selectedIds.set(new Set());
	selectionOrder.set([]);
	error.set(null);
	resetFilters();
}
