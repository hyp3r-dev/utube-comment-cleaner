export interface YouTubeComment {
	id: string;
	textDisplay: string;
	textOriginal: string;
	authorDisplayName: string;
	authorProfileImageUrl: string;
	authorChannelUrl: string;
	likeCount: number;
	publishedAt: string;
	updatedAt: string;
	videoId: string;
	videoTitle?: string;
	videoPrivacyStatus?: 'public' | 'private' | 'unlisted' | 'unknown';
	moderationStatus?: 'published' | 'heldForReview' | 'likelySpam' | 'rejected' | 'unknown';
	canRate: boolean;
	viewerRating: string;
	parentId?: string;
	// API-enriched data
	isEnriched?: boolean;
	totalReplyCount?: number;
	// Externally deleted flag (detected when merging new takeout)
	isExternallyDeleted?: boolean;
	// Flag for comments that couldn't be enriched (not found in YouTube API)
	isUnenrichable?: boolean;
}

export interface CommentFilters {
	videoPrivacy: ('public' | 'private' | 'unlisted' | 'unknown')[];
	moderationStatus: ('published' | 'heldForReview' | 'likelySpam' | 'rejected' | 'unknown')[];
	minCharacters: number;
	maxCharacters: number;
	minLikes: number;
	maxLikes: number;
}

export type SortField = 'likeCount' | 'publishedAt' | 'textLength';
export type SortOrder = 'asc' | 'desc';

export interface CommentStore {
	comments: YouTubeComment[];
	selectedIds: Set<string>;
	filters: CommentFilters;
	sortField: SortField;
	sortOrder: SortOrder;
	loading: boolean;
	error: string | null;
}
