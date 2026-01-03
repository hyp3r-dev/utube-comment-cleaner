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
	 * @deprecated Since v0.1.0 - Use validateToken() instead for better error information.
	 * This method will be removed in a future version.
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

	/**
	 * Delete comments from YouTube
	 * Returns detailed results with success, failed IDs and error messages
	 */
	async deleteComments(
		commentIds: string[], 
		onProgress?: (deleted: number, total: number) => void
	): Promise<{ 
		success: string[]; 
		failed: Array<{ id: string; error: string }>;
	}> {
		const success: string[] = [];
		const failed: Array<{ id: string; error: string }> = [];

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
					// Parse error response
					let errorMessage = `HTTP ${response.status}`;
					try {
						const errorData = await response.json() as YouTubeErrorResponse;
						const reason = errorData.error?.errors?.[0]?.reason;
						if (reason === 'quotaExceeded' || reason === 'dailyLimitExceeded') {
							errorMessage = 'Quota exceeded - try again tomorrow';
						} else if (reason === 'commentNotFound' || response.status === 404) {
							errorMessage = 'Comment not found (may already be deleted)';
						} else if (reason === 'forbidden' || response.status === 403) {
							errorMessage = 'Permission denied - cannot delete this comment';
						} else if (response.status === 401) {
							errorMessage = 'Token expired - please reconnect';
						} else {
							errorMessage = errorData.error?.message || errorMessage;
						}
					} catch {
						// Ignore JSON parse errors
					}
					failed.push({ id: commentId, error: errorMessage });
				}
			} catch (e) {
				const errorMessage = e instanceof Error ? e.message : 'Network error';
				failed.push({ id: commentId, error: errorMessage });
			}

			onProgress?.(i + 1, commentIds.length);
			await this.delay(this.rateLimitDelay * 2); // Extra delay for delete operations
		}

		return { success, failed };
	}

	/**
	 * Enrich comments with data from YouTube API using comments.list
	 * Batches requests in groups of 50 (API limit)
	 * Returns enriched comments and list of missing comment IDs (deleted/unavailable)
	 * Now supports real-time updates via onBatchComplete callback
	 */
	async enrichComments(
		comments: YouTubeComment[],
		onProgress?: (enriched: number, total: number) => void,
		onBatchComplete?: (enrichedBatch: Map<string, Partial<YouTubeComment>>) => void
	): Promise<{ enriched: YouTubeComment[]; missing: string[] }> {
		const enrichedComments: YouTubeComment[] = [];
		const missingIds: string[] = [];
		const commentIds = comments.map(c => c.id);
		const commentMap = new Map(comments.map(c => [c.id, c]));
		
		const batchSize = 50;
		let processed = 0;
		
		for (let i = 0; i < commentIds.length; i += batchSize) {
			const batch = commentIds.slice(i, i + batchSize);
			const batchUpdates = new Map<string, Partial<YouTubeComment>>();
			
			try {
				const url = new URL(`${YOUTUBE_API_BASE}/comments`);
				url.searchParams.set('part', 'snippet');
				url.searchParams.set('id', batch.join(','));
				url.searchParams.set('textFormat', 'plainText');
				
				const response = await fetch(url.toString(), {
					headers: {
						'Authorization': `Bearer ${this.accessToken}`
					}
				});
				
				// Track quota usage
				quotaStore.addUsage(QUOTA_COSTS.commentsList);
				
				if (!response.ok) {
					const errorData = await response.json() as YouTubeErrorResponse;
					this.parseAndThrowError(errorData);
				}
				
				const data = await response.json();
				const returnedIds = new Set<string>();
				
				// Process returned comments
				for (const item of data.items || []) {
					const id = item.id;
					returnedIds.add(id);
					const original = commentMap.get(id);
					
					if (original) {
						const enrichedData: Partial<YouTubeComment> = {
							textDisplay: item.snippet?.textDisplay || original.textDisplay,
							textOriginal: item.snippet?.textOriginal || original.textOriginal,
							likeCount: item.snippet?.likeCount ?? original.likeCount,
							publishedAt: item.snippet?.publishedAt || original.publishedAt,
							updatedAt: item.snippet?.updatedAt || original.updatedAt,
							authorDisplayName: item.snippet?.authorDisplayName || original.authorDisplayName,
							authorProfileImageUrl: item.snippet?.authorProfileImageUrl || original.authorProfileImageUrl,
							authorChannelUrl: item.snippet?.authorChannelUrl || original.authorChannelUrl,
							canRate: item.snippet?.canRate ?? original.canRate,
							viewerRating: item.snippet?.viewerRating || original.viewerRating,
							isEnriched: true
						};
						
						// Add to batch updates for real-time callback
						batchUpdates.set(id, enrichedData);
						
						// Merge API data with existing comment
						enrichedComments.push({
							...original,
							...enrichedData
						});
					}
				}
				
				// Mark comments not returned as missing (deleted/unavailable)
				for (const id of batch) {
					if (!returnedIds.has(id)) {
						missingIds.push(id);
						// Keep original comment but don't mark as enriched
						const original = commentMap.get(id);
						if (original) {
							enrichedComments.push(original);
						}
					}
				}
				
				// Fire real-time update callback
				if (onBatchComplete && batchUpdates.size > 0) {
					onBatchComplete(batchUpdates);
				}
				
			} catch (e) {
				// If batch fails, keep originals without enrichment
				for (const id of batch) {
					const original = commentMap.get(id);
					if (original) {
						enrichedComments.push(original);
					}
				}
				
				// Re-throw if it's a critical error
				if (e instanceof QuotaExceededError || e instanceof TokenExpiredError) {
					throw e;
				}
			}
			
			processed += batch.length;
			onProgress?.(processed, commentIds.length);
			
			// Rate limit between batches
			await this.delay(this.rateLimitDelay);
		}
		
		return { enriched: enrichedComments, missing: missingIds };
	}

	/**
	 * Fetch video details for comments to get video titles and reply counts
	 * Uses commentThreads.list to get reply counts for top-level comments
	 */
	async fetchCommentThreadDetails(
		comments: YouTubeComment[],
		onProgress?: (processed: number, total: number) => void
	): Promise<YouTubeComment[]> {
		// Filter to only top-level comments (no parentId)
		const topLevelComments = comments.filter(c => !c.parentId);
		const replyComments = comments.filter(c => c.parentId);
		
		const enrichedComments: Map<string, YouTubeComment> = new Map();
		const batchSize = 50;
		let processed = 0;
		
		// Process top-level comments to get reply counts
		for (let i = 0; i < topLevelComments.length; i += batchSize) {
			const batch = topLevelComments.slice(i, i + batchSize);
			const ids = batch.map(c => c.id);
			
			try {
				const url = new URL(`${YOUTUBE_API_BASE}/commentThreads`);
				url.searchParams.set('part', 'snippet,replies');
				url.searchParams.set('id', ids.join(','));
				
				const response = await fetch(url.toString(), {
					headers: {
						'Authorization': `Bearer ${this.accessToken}`
					}
				});
				
				quotaStore.addUsage(QUOTA_COSTS.commentThreadsList);
				
				if (response.ok) {
					const data = await response.json();
					
					for (const item of data.items || []) {
						const commentId = item.snippet?.topLevelComment?.id;
						const original = batch.find(c => c.id === commentId);
						
						if (original) {
							enrichedComments.set(commentId, {
								...original,
								totalReplyCount: item.snippet?.totalReplyCount || 0
							});
						}
					}
				}
				
				// Add any that weren't returned
				for (const comment of batch) {
					if (!enrichedComments.has(comment.id)) {
						enrichedComments.set(comment.id, comment);
					}
				}
				
			} catch (e) {
				// On error, keep originals
				for (const comment of batch) {
					if (!enrichedComments.has(comment.id)) {
						enrichedComments.set(comment.id, comment);
					}
				}
				
				if (e instanceof QuotaExceededError || e instanceof TokenExpiredError) {
					throw e;
				}
			}
			
			processed += batch.length;
			onProgress?.(processed, topLevelComments.length + replyComments.length);
			
			await this.delay(this.rateLimitDelay);
		}
		
		// Add reply comments as-is
		for (const comment of replyComments) {
			enrichedComments.set(comment.id, comment);
		}
		
		return Array.from(enrichedComments.values());
	}
}
