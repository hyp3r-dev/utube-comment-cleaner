import type { YouTubeComment } from '$lib/types/comment';
import { quotaStore, QUOTA_COSTS } from '$lib/stores/quota';

const YOUTUBE_API_BASE = 'https://www.googleapis.com/youtube/v3';

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

export class YouTubeService {
	private apiKey: string;
	private rateLimitDelay = 100; // ms between requests

	constructor(apiKey: string) {
		this.apiKey = apiKey;
	}

	private async delay(ms: number): Promise<void> {
		return new Promise(resolve => setTimeout(resolve, ms));
	}

	private async fetchWithRateLimit<T>(url: string): Promise<T> {
		await this.delay(this.rateLimitDelay);
		const response = await fetch(url);
		
		if (!response.ok) {
			const error = await response.json();
			throw new Error(error.error?.message || 'YouTube API request failed');
		}
		
		return response.json();
	}

	async validateApiKey(): Promise<boolean> {
		try {
			const url = `${YOUTUBE_API_BASE}/channels?part=id&mine=true`;
			const response = await fetch(url, {
				headers: {
					'Authorization': `Bearer ${this.apiKey}`
				}
			});
			return response.ok;
		} catch {
			return false;
		}
	}

	async fetchAllComments(
		onProgress?: (loaded: number, total?: number) => void
	): Promise<YouTubeComment[]> {
		const comments: YouTubeComment[] = [];
		let pageToken: string | undefined;
		let totalLoaded = 0;

		do {
			const url = new URL(`${YOUTUBE_API_BASE}/commentThreads`);
			url.searchParams.set('part', 'snippet');
			url.searchParams.set('allThreadsRelatedToChannelId', 'mine');
			url.searchParams.set('maxResults', '100'); // Maximum batch size
			url.searchParams.set('moderationStatus', 'published');
			if (pageToken) {
				url.searchParams.set('pageToken', pageToken);
			}

			const response = await fetch(url.toString(), {
				headers: {
					'Authorization': `Bearer ${this.apiKey}`
				}
			});

			// Track quota usage for commentThreads list
			quotaStore.addUsage(QUOTA_COSTS.commentThreadsList);

			if (!response.ok) {
				const error = await response.json();
				
				// Try alternative endpoint for user's own comments
				if (error.error?.code === 403 || error.error?.code === 400) {
					return this.fetchMyComments(onProgress);
				}
				
				throw new Error(error.error?.message || 'Failed to fetch comments');
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
		// First, get the user's channel ID
		const channelUrl = new URL(`${YOUTUBE_API_BASE}/channels`);
		channelUrl.searchParams.set('part', 'id');
		channelUrl.searchParams.set('mine', 'true');

		const channelResponse = await fetch(channelUrl.toString(), {
			headers: {
				'Authorization': `Bearer ${this.apiKey}`
			}
		});

		// Track quota usage for channels list
		quotaStore.addUsage(QUOTA_COSTS.channelsList);

		if (!channelResponse.ok) {
			const error = await channelResponse.json();
			throw new Error(error.error?.message || 'Failed to fetch channel info');
		}

		const channelData = await channelResponse.json();
		if (!channelData.items || channelData.items.length === 0) {
			throw new Error('No channel found for this account');
		}

		const channelId = channelData.items[0].id;
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
					'Authorization': `Bearer ${this.apiKey}`
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
					'Authorization': `Bearer ${this.apiKey}`
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
					'Authorization': `Bearer ${this.apiKey}`
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
						'Authorization': `Bearer ${this.apiKey}`
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
