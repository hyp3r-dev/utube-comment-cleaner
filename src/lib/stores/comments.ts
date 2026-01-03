import { writable, derived, get } from 'svelte/store';
import type { YouTubeComment, CommentFilters, SortField, SortOrder } from '$lib/types/comment';

// Authentication store
export const apiKey = writable<string>('');
export const isAuthenticated = writable<boolean>(false);

// Comments data store
export const comments = writable<YouTubeComment[]>([]);
export const selectedIds = writable<Set<string>>(new Set());

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
	maxLikes: 1000000
});

// Sorting
export const sortField = writable<SortField>('likeCount');
export const sortOrder = writable<SortOrder>('desc');

// Search
export const searchQuery = writable<string>('');

// Filtered and sorted comments
export const filteredComments = derived(
	[comments, filters, sortField, sortOrder, searchQuery],
	([$comments, $filters, $sortField, $sortOrder, $searchQuery]) => {
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

			// Search query filter
			if ($searchQuery) {
				const query = $searchQuery.toLowerCase();
				const matchesText = comment.textOriginal.toLowerCase().includes(query);
				const matchesVideo = comment.videoTitle?.toLowerCase().includes(query);
				if (!matchesText && !matchesVideo) return false;
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

// Selected comments
export const selectedComments = derived(
	[comments, selectedIds],
	([$comments, $selectedIds]) => {
		return $comments.filter(c => $selectedIds.has(c.id));
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
	selectedIds.update(ids => {
		const newIds = new Set(ids);
		newIds.add(id);
		return newIds;
	});
}

export function deselectComment(id: string): void {
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
		} else {
			newIds.add(id);
		}
		return newIds;
	});
}

export function selectAllFiltered(): void {
	const filtered = get(filteredComments);
	selectedIds.update(() => new Set(filtered.map(c => c.id)));
}

export function deselectAll(): void {
	selectedIds.set(new Set());
}

export function removeComments(ids: string[]): void {
	comments.update(current => current.filter(c => !ids.includes(c.id)));
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

export function resetFilters(): void {
	filters.set({
		videoPrivacy: ['public', 'private', 'unlisted', 'unknown'],
		moderationStatus: ['published', 'heldForReview', 'likelySpam', 'rejected', 'unknown'],
		minCharacters: 0,
		maxCharacters: 10000,
		minLikes: 0,
		maxLikes: 1000000
	});
	searchQuery.set('');
}

export function logout(): void {
	apiKey.set('');
	isAuthenticated.set(false);
	comments.set([]);
	selectedIds.set(new Set());
	error.set(null);
	resetFilters();
}
