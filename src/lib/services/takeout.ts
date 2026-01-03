import type { YouTubeComment } from '$lib/types/comment';

/**
 * Google Takeout comment structure (from my-comments.html or JSON export)
 */
interface TakeoutComment {
	// HTML export structure (parsed)
	commentText?: string;
	videoUrl?: string;
	videoTitle?: string;
	timestamp?: string;
	
	// JSON export structure
	comment?: string;
	videoId?: string;
	publishedAt?: string;
	likeCount?: number;
}

/**
 * Extract video ID from YouTube URL
 */
function extractVideoId(url: string): string | null {
	if (!url) return null;
	
	// Handle various YouTube URL formats
	const patterns = [
		/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\s?#]+)/,
		/youtube\.com\/watch\?.*v=([^&\s]+)/
	];
	
	for (const pattern of patterns) {
		const match = url.match(pattern);
		if (match) return match[1];
	}
	
	return null;
}

/**
 * Generate a unique comment ID from content
 */
function generateCommentId(text: string, videoId: string, timestamp: string): string {
	const combined = `${text}-${videoId}-${timestamp}`;
	let hash = 0;
	for (let i = 0; i < combined.length; i++) {
		const char = combined.charCodeAt(i);
		hash = ((hash << 5) - hash) + char;
		hash = hash & hash; // Convert to 32-bit integer
	}
	return `takeout_${Math.abs(hash).toString(36)}`;
}

/**
 * Parse Google Takeout HTML export (my-comments.html)
 */
export function parseTakeoutHTML(htmlContent: string): YouTubeComment[] {
	const comments: YouTubeComment[] = [];
	
	// Parse HTML content
	const parser = new DOMParser();
	const doc = parser.parseFromString(htmlContent, 'text/html');
	
	// Find all comment entries - Takeout typically uses specific class names or structure
	// The structure varies but usually contains divs with comment text and video links
	const commentContainers = doc.querySelectorAll('.content-cell, .outer-cell, [class*="comment"], li');
	
	commentContainers.forEach((container) => {
		const textElement = container.querySelector('a[href*="youtube.com/watch"], a[href*="youtu.be"]');
		if (!textElement) return;
		
		const videoUrl = textElement.getAttribute('href') || '';
		const videoId = extractVideoId(videoUrl);
		if (!videoId) return;
		
		// Get the comment text - usually in adjacent element or parent
		const commentText = container.textContent?.trim() || '';
		
		// Try to extract timestamp
		const timeElement = container.querySelector('time, .timestamp, [class*="date"]');
		const timestamp = timeElement?.getAttribute('datetime') || 
						  timeElement?.textContent?.trim() || 
						  new Date().toISOString();
		
		if (commentText && videoId) {
			comments.push({
				id: generateCommentId(commentText, videoId, timestamp),
				textDisplay: commentText,
				textOriginal: commentText,
				authorDisplayName: 'You',
				authorProfileImageUrl: '',
				authorChannelUrl: '',
				likeCount: 0,
				publishedAt: timestamp,
				updatedAt: timestamp,
				videoId,
				videoTitle: textElement.textContent?.trim(),
				videoPrivacyStatus: 'unknown',
				moderationStatus: 'published',
				canRate: false,
				viewerRating: 'none'
			});
		}
	});
	
	return comments;
}

/**
 * Parse Google Takeout JSON export
 */
export function parseTakeoutJSON(jsonContent: string): YouTubeComment[] {
	const comments: YouTubeComment[] = [];
	
	try {
		const data = JSON.parse(jsonContent);
		
		// Handle different JSON structures from Takeout
		const commentArray = Array.isArray(data) ? data : 
							 data.comments ? data.comments :
							 data.items ? data.items : [];
		
		for (const item of commentArray) {
			const videoUrl = item.videoUrl || item.video_url || '';
			const videoId = item.videoId || item.video_id || extractVideoId(videoUrl);
			
			if (!videoId) continue;
			
			const commentText = item.comment || item.commentText || item.text || item.textOriginal || '';
			const timestamp = item.publishedAt || item.published_at || item.timestamp || item.time || new Date().toISOString();
			
			if (commentText) {
				comments.push({
					id: item.commentId || item.comment_id || item.id || generateCommentId(commentText, videoId, timestamp),
					textDisplay: commentText,
					textOriginal: commentText,
					authorDisplayName: 'You',
					authorProfileImageUrl: '',
					authorChannelUrl: '',
					likeCount: item.likeCount || item.like_count || 0,
					publishedAt: timestamp,
					updatedAt: timestamp,
					videoId,
					videoTitle: item.videoTitle || item.video_title,
					videoPrivacyStatus: 'unknown',
					moderationStatus: 'published',
					canRate: false,
					viewerRating: 'none'
				});
			}
		}
	} catch (e) {
		console.error('Failed to parse Takeout JSON:', e);
	}
	
	return comments;
}

/**
 * Parse Google Takeout file (auto-detect format)
 */
export function parseTakeoutFile(content: string, filename: string): YouTubeComment[] {
	const lowerFilename = filename.toLowerCase();
	
	if (lowerFilename.endsWith('.json')) {
		return parseTakeoutJSON(content);
	} else if (lowerFilename.endsWith('.html') || lowerFilename.endsWith('.htm')) {
		return parseTakeoutHTML(content);
	}
	
	// Try to auto-detect format
	const trimmed = content.trim();
	if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
		return parseTakeoutJSON(content);
	} else if (trimmed.startsWith('<') || trimmed.startsWith('<!')) {
		return parseTakeoutHTML(content);
	}
	
	throw new Error('Unable to determine file format. Please use a .json or .html file from Google Takeout.');
}

/**
 * Read file content as text
 */
export function readFileAsText(file: File): Promise<string> {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onload = () => resolve(reader.result as string);
		reader.onerror = () => reject(new Error('Failed to read file'));
		reader.readAsText(file);
	});
}
