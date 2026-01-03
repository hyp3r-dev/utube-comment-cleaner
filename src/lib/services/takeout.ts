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
 * YouTube video IDs are exactly 11 characters: [a-zA-Z0-9_-]
 */
function extractVideoId(url: string): string | null {
	if (!url) return null;
	
	// Handle various YouTube URL formats - video IDs are exactly 11 chars
	const patterns = [
		/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
		/youtube\.com\/watch\?.*v=([a-zA-Z0-9_-]{11})/
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
 * Clean comment text by removing video title and metadata
 */
function cleanCommentText(rawText: string, videoTitle?: string): string {
	let text = rawText.trim();
	
	// Remove common metadata patterns
	// Google Takeout often includes "Commented on: Video Title" or similar
	text = text.replace(/^Commented\s+on:?\s*/i, '');
	text = text.replace(/^Comment\s+on:?\s*/i, '');
	
	// Remove video title if present at the start
	if (videoTitle && text.startsWith(videoTitle)) {
		text = text.substring(videoTitle.length).trim();
	}
	
	// Remove timestamp patterns often appended
	text = text.replace(/\s*\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}\s*$/g, '');
	text = text.replace(/\s*\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2}\s*$/g, '');
	
	return text.trim();
}

/**
 * Parse Google Takeout HTML export (my-comments.html)
 * Google Takeout uses a specific structure with outer-cell/content-cell classes
 */
export function parseTakeoutHTML(htmlContent: string): YouTubeComment[] {
	const comments: YouTubeComment[] = [];
	
	// Parse HTML content
	const parser = new DOMParser();
	const doc = parser.parseFromString(htmlContent, 'text/html');
	
	// Google Takeout HTML structure typically uses:
	// - outer-cell containers for each activity
	// - content-cell for the actual content
	// First try the specific Takeout structure
	let commentContainers = doc.querySelectorAll('.outer-cell.mdl-cell');
	
	// Fallback to more generic selectors if specific ones don't match
	if (commentContainers.length === 0) {
		commentContainers = doc.querySelectorAll('.content-cell, [class*="comment"], li');
	}
	
	commentContainers.forEach((container) => {
		// Look for YouTube video link
		const linkElement = container.querySelector('a[href*="youtube.com/watch"], a[href*="youtu.be"]');
		if (!linkElement) return;
		
		const videoUrl = linkElement.getAttribute('href') || '';
		const videoId = extractVideoId(videoUrl);
		if (!videoId) return;
		
		const videoTitle = linkElement.textContent?.trim();
		
		// Try to find the comment text in a content-cell or the container itself
		const contentCell = container.querySelector('.content-cell') || container;
		
		// Get text content but try to isolate just the comment
		// The structure often has the comment as direct text node before/after links
		let commentText = '';
		
		// Try to get text that's not inside anchor tags (which are video titles)
		const walker = document.createTreeWalker(
			contentCell,
			NodeFilter.SHOW_TEXT,
			null
		);
		
		let node;
		while ((node = walker.nextNode())) {
			const parent = node.parentElement;
			if (parent && parent.tagName !== 'A') {
				const text = node.textContent?.trim();
				if (text && text.length > 5) { // Skip very short text fragments
					commentText = text;
					break; // Take the first substantial text block
				}
			}
		}
		
		// If no isolated text found, fall back to cleaning the full text
		if (!commentText) {
			commentText = cleanCommentText(contentCell.textContent || '', videoTitle);
		}
		
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
				videoTitle: videoTitle,
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
