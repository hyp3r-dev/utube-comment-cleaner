import type { YouTubeComment } from '$lib/types/comment';
import { quotaStore, QUOTA_COSTS } from '$lib/stores/quota';

const YOUTUBE_API_BASE = 'https://www.googleapis.com/youtube/v3';

// Custom error types for better error handling
export class YouTubeAPIError extends Error {
	code: number;
	reason?: string;
	
	constructor(message: string, code: number, reason?: string) {
		super(message);
		this.name = 'YouTubeAPIError';
		this.code = code;
		this.reason = reason;
	}
}

export class TokenExpiredError extends YouTubeAPIError {
	constructor(message = 'Your access token has expired. Please generate a new one from the OAuth Playground.') {
		super(message, 401, 'tokenExpired');
	}
}

export class InsufficientScopesError extends YouTubeAPIError {
	constructor(message = 'Your access token does not have the required permissions. Please ensure you authorized with the "youtube.force-ssl" scope.') {
		super(message, 403, 'insufficientScopes');
	}
}

export class NoChannelError extends YouTubeAPIError {
	constructor(message = 'No YouTube channel is associated with this Google account. Please create a YouTube channel first.') {
		super(message, 403, 'youtubeSignupRequired');
	}
}

export class QuotaExceededError extends YouTubeAPIError {
	constructor(message = 'YouTube API quota has been exceeded. Please try again tomorrow when the quota resets.') {
		super(message, 403, 'quotaExceeded');
	}
}

interface YouTubeCommentThread {
	id: string;
	snippet: {
		topLevelComment: {
			id: string;
			snippet: {
				textDisplay: string;
				textOriginal: string;
				authorDisplayName: string;
				authorProfileImageUrl: string;
				authorChannelUrl: string;
				likeCount: number;
				publishedAt: string;
				updatedAt: string;
				videoId: string;
				canRate: boolean;
				viewerRating: string;
				moderationStatus?: string;
			};
		};
	};
}

interface YouTubeCommentListResponse {
	items: YouTubeCommentThread[];
	nextPageToken?: string;
	pageInfo: {
		totalResults: number;
		resultsPerPage: number;
	};
}

interface YouTubeVideoResponse {
	items: {
		id: string;
		snippet: {
			title: string;
		};
		status: {
			privacyStatus: string;
		};
	}[];
}

interface YouTubeErrorResponse {
	error: {
		code: number;
		message: string;
		errors?: {
			message: string;
			domain: string;
			reason: string;
		}[];
	};
}

export interface TokenValidationResult {
	valid: boolean;
	channelId?: string;
	channelTitle?: string;
	error?: string;
	errorType?: 'expired' | 'insufficientScopes' | 'noChannel' | 'quotaExceeded' | 'unknown';
}

export class YouTubeService {
	private accessToken: string;
	private rateLimitDelay = 100; // ms between requests
	private channelId: string | null = null;

	constructor(accessToken: string) {
		this.accessToken = accessToken;
	}

	private async delay(ms: number): Promise<void> {
		return new Promise(resolve => setTimeout(resolve, ms));
	}

	/**
	 * Parse YouTube API error response and throw appropriate error
	 */
	private parseAndThrowError(errorData: YouTubeErrorResponse): never {
		const code = errorData.error.code;
		const reason = errorData.error.errors?.[0]?.reason;
		const message = errorData.error.message;
		
		// Check for specific error reasons first (most specific matches)
		if (reason === 'youtubeSignupRequired') {
			throw new NoChannelError();
		}
		
		if (reason === 'quotaExceeded' || reason === 'dailyLimitExceeded') {
			throw new QuotaExceededError();
		}
		
		if (reason === 'insufficientPermissions' || reason === 'forbidden') {
			throw new InsufficientScopesError();
		}
		
		// Check by HTTP status code (less specific)
		if (code === 401) {
			// Check if it's related to channel issues
			if (message.toLowerCase().includes('signup') || message.toLowerCase().includes('channel')) {
				throw new NoChannelError();
			}
			throw new TokenExpiredError();
		}
		
		// Check message for common patterns
		if (message.toLowerCase().includes('quota')) {
			throw new QuotaExceededError();
		}
		
		if (message.toLowerCase().includes('unauthorized') || message.toLowerCase().includes('invalid credentials')) {
			throw new TokenExpiredError();
		}
		
		// Generic error
		throw new YouTubeAPIError(message || 'YouTube API request failed', code, reason);
	}

	private async fetchWithRateLimit<T>(url: string): Promise<T> {
		await this.delay(this.rateLimitDelay);
		const response = await fetch(url);
		
		if (!response.ok) {
			const error = await response.json() as YouTubeErrorResponse;
			this.parseAndThrowError(error);
		}
		
		return response.json();
	}

	/**
	 * Validate the access token and return detailed information
	 */
	async validateToken(): Promise<TokenValidationResult> {
		try {
			const url = new URL(`${YOUTUBE_API_BASE}/channels`);
			url.searchParams.set('part', 'snippet');
			url.searchParams.set('mine', 'true');

			const response = await fetch(url.toString(), {
				headers: {
					'Authorization': `Bearer ${this.accessToken}`
				}
			});

			if (!response.ok) {
				const errorData = await response.json() as YouTubeErrorResponse;
				const code = errorData.error.code;
				const reason = errorData.error.errors?.[0]?.reason;
				
				// Check specific reasons first (most important)
				if (reason === 'youtubeSignupRequired') {
					return {
						valid: false,
						error: 'No YouTube channel is associated with this Google account. Please visit YouTube.com and create a channel first, then try again.',
						errorType: 'noChannel'
					};
				}
				
				if (reason === 'quotaExceeded' || reason === 'dailyLimitExceeded') {
					return {
						valid: false,
						error: 'YouTube API quota exceeded. Please try again tomorrow.',
						errorType: 'quotaExceeded'
					};
				}
				
				if (reason === 'insufficientPermissions' || reason === 'forbidden') {
					return {
						valid: false,
						error: 'Your access token does not have the required permissions. Make sure to authorize with the "youtube.force-ssl" scope.',
						errorType: 'insufficientScopes'
					};
				}
				
				// Check by HTTP status code (less specific)
				if (code === 401) {
					return {
						valid: false,
						error: 'Your access token has expired or is invalid. Please generate a new token from the OAuth Playground.',
						errorType: 'expired'
					};
				}
				
				return {
					valid: false,
					error: errorData.error.message || 'Failed to validate access token',
					errorType: 'unknown'
				};
			}

			const data = await response.json();
			
			if (!data.items || data.items.length === 0) {
				return {
					valid: false,
					error: 'No YouTube channel found for this account. Please create a YouTube channel first.',
					errorType: 'noChannel'
				};
			}

			const channel = data.items[0];
			this.channelId = channel.id;
			
			return {
				valid: true,
				channelId: channel.id,
				channelTitle: channel.snippet?.title
			};
		} catch (e) {
			return {
				valid: false,
				error: e instanceof Error ? e.message : 'Failed to validate access token. Please check your internet connection.',
				errorType: 'unknown'
			};
		}
	}

	/**
	 * @deprecated Use validateToken() instead for better error information
	 */
	async validateApiKey(): Promise<boolean> {
		const result = await this.validateToken();
		return result.valid;
	}

	private async fetchMyChannelId(): Promise<string> {
		// Use cached channel ID if available
		if (this.channelId) {
			return this.channelId;
		}

		const channelUrl = new URL(`${YOUTUBE_API_BASE}/channels`);
		channelUrl.searchParams.set('part', 'id');
		channelUrl.searchParams.set('mine', 'true');

		const channelResponse = await fetch(channelUrl.toString(), {
			headers: {
				'Authorization': `Bearer ${this.accessToken}`
			}
		});

		// Track quota usage for channels list
		quotaStore.addUsage(QUOTA_COSTS.channelsList);

		if (!channelResponse.ok) {
			const error = await channelResponse.json() as YouTubeErrorResponse;
			this.parseAndThrowError(error);
		}

		const channelData = await channelResponse.json();
		if (!channelData.items || channelData.items.length === 0) {
			throw new NoChannelError();
		}

		this.channelId = channelData.items[0].id;
		return this.channelId as string;
	}

	async fetchAllComments(
		onProgress?: (loaded: number, total?: number) => void
	): Promise<YouTubeComment[]> {
		// First, get the user's channel ID
		const channelId = await this.fetchMyChannelId();

		const comments: YouTubeComment[] = [];
		let pageToken: string | undefined;
		let totalLoaded = 0;

		do {
			const url = new URL(`${YOUTUBE_API_BASE}/commentThreads`);
			url.searchParams.set('part', 'snippet');
			url.searchParams.set('allThreadsRelatedToChannelId', channelId);
			url.searchParams.set('maxResults', '100'); // Maximum batch size
			url.searchParams.set('moderationStatus', 'published');
			if (pageToken) {
				url.searchParams.set('pageToken', pageToken);
			}

			const response = await fetch(url.toString(), {
				headers: {
					'Authorization': `Bearer ${this.accessToken}`
				}
			});

			// Track quota usage for commentThreads list
			quotaStore.addUsage(QUOTA_COSTS.commentThreadsList);

			if (!response.ok) {
				const errorData = await response.json() as YouTubeErrorResponse;
				
				// Try alternative endpoint for user's own comments on 403/400
				if (errorData.error?.code === 403 || errorData.error?.code === 400) {
					return this.fetchMyComments(onProgress);
				}
				
				this.parseAndThrowError(errorData);
			}

			const data: YouTubeCommentListResponse = await response.json();
			
			const newComments = data.items.map(item => this.mapCommentThread(item));
			comments.push(...newComments);
			totalLoaded += newComments.length;
			
			onProgress?.(totalLoaded, data.pageInfo.totalResults);
			
			pageToken = data.nextPageToken;
			
			// Small delay to respect rate limits
			await this.delay(this.rateLimitDelay);
		} while (pageToken);

		// Batch fetch video details for all unique videos
		const videoIds = [...new Set(comments.map(c => c.videoId))];
		const videoDetails = await this.fetchVideoDetailsBatch(videoIds);
		
		// Merge video details into comments
		return comments.map(comment => ({
			...comment,
			videoTitle: videoDetails[comment.videoId]?.title,
			videoPrivacyStatus: videoDetails[comment.videoId]?.privacyStatus || 'unknown'
		}));
	}

	private async fetchMyComments(
		onProgress?: (loaded: number, total?: number) => void
	): Promise<YouTubeComment[]> {
		// Get the user's channel ID
		const channelId = await this.fetchMyChannelId();
		const comments: YouTubeComment[] = [];
		let pageToken: string | undefined;
		let totalLoaded = 0;

		// Fetch user's comment activity via activities endpoint
		do {
			// Use activities to find videos the user commented on, then get those comments
			const activitiesUrl = new URL(`${YOUTUBE_API_BASE}/activities`);
			activitiesUrl.searchParams.set('part', 'snippet,contentDetails');
			activitiesUrl.searchParams.set('channelId', channelId);
			activitiesUrl.searchParams.set('maxResults', '50');
			if (pageToken) {
				activitiesUrl.searchParams.set('pageToken', pageToken);
			}

			const response = await fetch(activitiesUrl.toString(), {
				headers: {
					'Authorization': `Bearer ${this.accessToken}`
				}
			});

			// Track quota usage for activities list
			quotaStore.addUsage(QUOTA_COSTS.activitiesList);

			if (!response.ok) {
				// If activities doesn't work, just return what we have
				break;
			}

			const data = await response.json();
			
			// Extract video IDs from activities that might have comments
			const videoIds = data.items
				?.filter((item: { snippet?: { type?: string } }) => item.snippet?.type === 'comment')
				?.map((item: { contentDetails?: { comment?: { videoId?: string } } }) => item.contentDetails?.comment?.videoId)
				?.filter(Boolean) || [];

			if (videoIds.length > 0) {
				// Fetch comments for these videos
				for (const videoId of videoIds) {
					const videoComments = await this.fetchCommentsForVideo(videoId, channelId);
					comments.push(...videoComments);
					totalLoaded += videoComments.length;
					onProgress?.(totalLoaded);
				}
			}

			pageToken = data.nextPageToken;
			await this.delay(this.rateLimitDelay);
		} while (pageToken);

		// Batch fetch video details
		const videoIds = [...new Set(comments.map(c => c.videoId))];
		const videoDetails = await this.fetchVideoDetailsBatch(videoIds);
		
		return comments.map(comment => ({
			...comment,
			videoTitle: videoDetails[comment.videoId]?.title,
			videoPrivacyStatus: videoDetails[comment.videoId]?.privacyStatus || 'unknown'
		}));
	}

	private async fetchCommentsForVideo(videoId: string, authorChannelId: string): Promise<YouTubeComment[]> {
		const comments: YouTubeComment[] = [];
		let pageToken: string | undefined;

		do {
			const url = new URL(`${YOUTUBE_API_BASE}/commentThreads`);
			url.searchParams.set('part', 'snippet');
			url.searchParams.set('videoId', videoId);
			url.searchParams.set('maxResults', '100');
			if (pageToken) {
				url.searchParams.set('pageToken', pageToken);
			}

			const response = await fetch(url.toString(), {
				headers: {
					'Authorization': `Bearer ${this.accessToken}`
				}
			});

			// Track quota usage for commentThreads list
			quotaStore.addUsage(QUOTA_COSTS.commentThreadsList);

			if (!response.ok) break;

			const data: YouTubeCommentListResponse = await response.json();
			
			// Filter to only include comments from the authorized user
			const userComments = data.items
				.filter(item => {
					const authorUrl = item.snippet.topLevelComment.snippet.authorChannelUrl;
					return authorUrl?.includes(authorChannelId);
				})
				.map(item => this.mapCommentThread(item));

			comments.push(...userComments);
			pageToken = data.nextPageToken;
			await this.delay(this.rateLimitDelay);
		} while (pageToken);

		return comments;
	}

	private async fetchVideoDetailsBatch(
		videoIds: string[]
	): Promise<Record<string, { title: string; privacyStatus: 'public' | 'private' | 'unlisted' | 'unknown' }>> {
		const result: Record<string, { title: string; privacyStatus: 'public' | 'private' | 'unlisted' | 'unknown' }> = {};
		
		// Batch requests in groups of 50 (YouTube API limit)
		const batchSize = 50;
		for (let i = 0; i < videoIds.length; i += batchSize) {
			const batch = videoIds.slice(i, i + batchSize);
			const url = new URL(`${YOUTUBE_API_BASE}/videos`);
			url.searchParams.set('part', 'snippet,status');
			url.searchParams.set('id', batch.join(','));

			const response = await fetch(url.toString(), {
				headers: {
					'Authorization': `Bearer ${this.accessToken}`
				}
			});

			// Track quota usage for videos list
			quotaStore.addUsage(QUOTA_COSTS.videosList);

			if (response.ok) {
				const data: YouTubeVideoResponse = await response.json();
				
				for (const video of data.items) {
					result[video.id] = {
						title: video.snippet.title,
						privacyStatus: this.mapPrivacyStatus(video.status.privacyStatus)
					};
				}
			}

			await this.delay(this.rateLimitDelay);
		}

		return result;
	}

	private mapPrivacyStatus(status: string): 'public' | 'private' | 'unlisted' | 'unknown' {
		switch (status) {
			case 'public': return 'public';
			case 'private': return 'private';
			case 'unlisted': return 'unlisted';
			default: return 'unknown';
		}
	}

	private mapModerationStatus(status?: string): 'published' | 'heldForReview' | 'likelySpam' | 'rejected' | 'unknown' {
		switch (status) {
			case 'published': return 'published';
			case 'heldForReview': return 'heldForReview';
			case 'likelySpam': return 'likelySpam';
			case 'rejected': return 'rejected';
			default: return 'unknown';
		}
	}

	private mapCommentThread(thread: YouTubeCommentThread): YouTubeComment {
		const snippet = thread.snippet.topLevelComment.snippet;
		return {
			id: thread.snippet.topLevelComment.id,
			textDisplay: snippet.textDisplay,
			textOriginal: snippet.textOriginal,
			authorDisplayName: snippet.authorDisplayName,
			authorProfileImageUrl: snippet.authorProfileImageUrl,
			authorChannelUrl: snippet.authorChannelUrl,
			likeCount: snippet.likeCount,
			publishedAt: snippet.publishedAt,
			updatedAt: snippet.updatedAt,
			videoId: snippet.videoId,
			moderationStatus: this.mapModerationStatus(snippet.moderationStatus),
			canRate: snippet.canRate,
			viewerRating: snippet.viewerRating
		};
	}

	async deleteComments(commentIds: string[], onProgress?: (deleted: number, total: number) => void): Promise<{ success: string[]; failed: string[] }> {
		const success: string[] = [];
		const failed: string[] = [];

		for (let i = 0; i < commentIds.length; i++) {
			const commentId = commentIds[i];
			try {
				const url = new URL(`${YOUTUBE_API_BASE}/comments`);
				url.searchParams.set('id', commentId);

				const response = await fetch(url.toString(), {
					method: 'DELETE',
					headers: {
						'Authorization': `Bearer ${this.accessToken}`
					}
				});

				// Track quota usage for delete operation
				quotaStore.addUsage(QUOTA_COSTS.commentsDelete);

				if (response.ok || response.status === 204) {
					success.push(commentId);
				} else {
					failed.push(commentId);
				}
			} catch {
				failed.push(commentId);
			}

			onProgress?.(i + 1, commentIds.length);
			await this.delay(this.rateLimitDelay * 2); // Extra delay for delete operations
		}

		return { success, failed };
	}
}
