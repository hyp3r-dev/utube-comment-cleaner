import JSZip from 'jszip';
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
 * CSV header mappings for different languages
 * Google Takeout exports headers in the user's browser language
 */
const CSV_HEADER_MAPPINGS: Record<string, string> = {
	// English
	'comment id': 'commentId',
	'comment-id': 'commentId',
	'channel id': 'channelId',
	'channel-id': 'channelId',
	'comment creation timestamp': 'timestamp',
	'price': 'price',
	'parent comment id': 'parentCommentId',
	'parent comment-id': 'parentCommentId',
	'post id': 'postId',
	'post-id': 'postId',
	'video id': 'videoId',
	'video-id': 'videoId',
	'comment text': 'commentText',
	'top-level comment id': 'topLevelCommentId',
	
	// German (Deutsch)
	'kommentar-id': 'commentId',
	'kanal-id': 'channelId',
	'zeitstempel der erstellung des kommentars': 'timestamp',
	'preis': 'price',
	'übergeordnete kommentar-id': 'parentCommentId',
	'beitrags-id': 'postId',
	// 'video-id' is same as English, already mapped above
	'kommentartext': 'commentText',
	'kommentar-id der obersten ebene': 'topLevelCommentId',
	
	// French (Français)
	'id du commentaire': 'commentId',
	'id de la chaîne': 'channelId',
	'horodatage de création du commentaire': 'timestamp',
	'prix': 'price',
	'id du commentaire parent': 'parentCommentId',
	'id de la publication': 'postId',
	'id de la vidéo': 'videoId',
	'texte du commentaire': 'commentText',
	'id du commentaire de premier niveau': 'topLevelCommentId',
	
	// Spanish (Español)
	'id del comentario': 'commentId',
	'id del canal': 'channelId',
	'marca de tiempo de creación del comentario': 'timestamp',
	'precio': 'price',
	'id del comentario principal': 'parentCommentId',
	'id de la publicación': 'postId',
	'id del vídeo': 'videoId',
	'texto del comentario': 'commentText',
	'id del comentario de nivel superior': 'topLevelCommentId',
	
	// Italian (Italiano)
	'id commento': 'commentId',
	'id canale': 'channelId',
	'timestamp creazione commento': 'timestamp',
	'prezzo': 'price',
	'id commento principale': 'parentCommentId',
	'id post': 'postId',
	'id video': 'videoId',
	'testo commento': 'commentText',
	'id commento di primo livello': 'topLevelCommentId',
	
	// Portuguese (Português)
	'id do comentário': 'commentId',
	'id do canal': 'channelId',
	'carimbo de data/hora de criação do comentário': 'timestamp',
	'preço': 'price',
	'id do comentário principal': 'parentCommentId',
	'id da postagem': 'postId',
	'id do vídeo': 'videoId',
	'texto do comentário': 'commentText',
	'id do comentário de nível superior': 'topLevelCommentId',
	
	// Dutch (Nederlands)
	'reactie-id': 'commentId',
	'kanaal-id': 'channelId',
	'tijdstempel van het aanmaken van de reactie': 'timestamp',
	'id van bovenliggende reactie': 'parentCommentId',
	'bericht-id': 'postId',
	'reactietekst': 'commentText',
	'id van reactie op het hoogste niveau': 'topLevelCommentId',
	
	// Japanese (日本語)
	'コメント id': 'commentId',
	'チャンネル id': 'channelId',
	'コメントの作成日時': 'timestamp',
	'価格': 'price',
	'親コメント id': 'parentCommentId',
	'投稿 id': 'postId',
	'動画 id': 'videoId',
	'コメントのテキスト': 'commentText',
	'トップレベル コメント id': 'topLevelCommentId',
};

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
 * Parse a CSV row, handling quoted fields and embedded commas
 */
function parseCSVRow(row: string): string[] {
	const result: string[] = [];
	let current = '';
	let inQuotes = false;
	let i = 0;
	
	while (i < row.length) {
		const char = row[i];
		
		if (char === '"') {
			if (inQuotes && row[i + 1] === '"') {
				// Escaped quote inside quoted field
				current += '"';
				i += 2;
				continue;
			}
			inQuotes = !inQuotes;
		} else if (char === ',' && !inQuotes) {
			result.push(current);
			current = '';
		} else {
			current += char;
		}
		i++;
	}
	
	// Add the last field
	result.push(current);
	
	return result;
}

/**
 * Normalize header name to standard field name using mappings
 */
function normalizeHeader(header: string): string {
	const normalized = header.toLowerCase().trim();
	return CSV_HEADER_MAPPINGS[normalized] || normalized;
}

/**
 * Parse the comment text field which may contain JSON-like structure
 * Examples: 
 * - {"text":"Actual comment content"}
 * - [{"text":"First line"},{"text":"\n"},{"text":"Second line"}]
 * - {"text":"Line 1"},{"text":"\n"},{"text":"Line 2"}
 * 
 * Handles edge cases:
 * - Actual newline characters in JSON (which break standard parsing)
 * - Escaped quotes within text values
 */
function parseCommentTextField(value: string): string {
	if (!value) return '';
	
	const trimmed = value.trim();
	
	// Try to parse as JSON array first
	if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
		try {
			const parsed = JSON.parse(trimmed);
			if (Array.isArray(parsed)) {
				return parsed.map(item => item.text || '').join('');
			}
		} catch {
			// Not valid JSON, try other approaches
		}
	}
	
	// Try to parse as single JSON object (only if not comma-separated)
	if (trimmed.startsWith('{') && trimmed.endsWith('}') && !trimmed.includes('},{')) {
		try {
			const parsed = JSON.parse(trimmed);
			if (parsed.text !== undefined) {
				return parsed.text;
			}
		} catch {
			// Not valid JSON, try as comma-separated objects
		}
	}
	
	// Try to parse as comma-separated JSON objects: {"text":"a"},{"text":"b"}
	if (trimmed.includes('},{')) {
		// First attempt: direct JSON parsing
		try {
			const wrapped = '[' + trimmed + ']';
			const parsed = JSON.parse(wrapped);
			if (Array.isArray(parsed)) {
				return parsed.map(item => item.text || '').join('');
			}
		} catch {
			// JSON parsing failed - might have actual newline/control characters
		}
		
		// Second attempt: fix unescaped control characters and retry
		try {
			// Replace actual newlines/tabs/etc with their escaped versions
			const fixed = trimmed
				.replace(/([^\\])\n/g, '$1\\n')
				.replace(/([^\\])\r/g, '$1\\r')
				.replace(/([^\\])\t/g, '$1\\t')
				.replace(/^\n/g, '\\n')
				.replace(/^\r/g, '\\r')
				.replace(/^\t/g, '\\t');
			const wrapped = '[' + fixed + ']';
			const parsed = JSON.parse(wrapped);
			if (Array.isArray(parsed)) {
				return parsed.map(item => item.text || '').join('');
			}
		} catch {
			// Still failed, try regex extraction as fallback
		}
		
		// Fallback: extract text values using regex
		// This handles severely malformed JSON that can't be parsed normally
		const textMatches: string[] = [];
		const regex = /\{"text":"((?:[^"\\]|\\.)*)"\}/g;
		let match;
		while ((match = regex.exec(trimmed)) !== null) {
			// Unescape the captured text
			const text = match[1]
				.replace(/\\"/g, '"')
				.replace(/\\n/g, '\n')
				.replace(/\\r/g, '\r')
				.replace(/\\t/g, '\t')
				.replace(/\\\\/g, '\\');
			textMatches.push(text);
		}
		
		if (textMatches.length > 0) {
			return textMatches.join('');
		}
	}
	
	return value;
}

/**
 * Parse Google Takeout CSV export
 * Supports multiple languages through header mapping
 */
export function parseTakeoutCSV(csvContent: string): YouTubeComment[] {
	const comments: YouTubeComment[] = [];
	const lines = csvContent.split(/\r?\n/).filter(line => line.trim());
	
	if (lines.length < 2) {
		return comments; // No data rows
	}
	
	// Parse header row
	const headerRow = parseCSVRow(lines[0]);
	const headers = headerRow.map(normalizeHeader);
	
	// Find column indices (normalizeHeader returns camelCase values like 'commentId')
	const commentIdIdx = headers.indexOf('commentId');
	const channelIdIdx = headers.indexOf('channelId');
	const timestampIdx = headers.indexOf('timestamp');
	const videoIdIdx = headers.indexOf('videoId');
	const commentTextIdx = headers.indexOf('commentText');
	const parentCommentIdIdx = headers.indexOf('parentCommentId');
	
	// Parse data rows
	for (let i = 1; i < lines.length; i++) {
		const row = parseCSVRow(lines[i]);
		
		if (row.length < headers.length) continue;
		
		const commentId = commentIdIdx >= 0 ? row[commentIdIdx]?.trim() : '';
		const videoId = videoIdIdx >= 0 ? row[videoIdIdx]?.trim() : '';
		const rawCommentText = commentTextIdx >= 0 ? row[commentTextIdx] : '';
		const commentText = parseCommentTextField(rawCommentText);
		const rawTimestamp = timestampIdx >= 0 ? row[timestampIdx]?.trim() : '';
		// Use the raw timestamp if available, otherwise use empty string (unknown date)
		const timestamp = rawTimestamp || '';
		const parentId = parentCommentIdIdx >= 0 ? row[parentCommentIdIdx]?.trim() : '';
		
		// Skip rows without essential data
		if (!videoId || !commentText) continue;
		
		// Use the actual YouTube comment ID if available, otherwise generate one
		const id = commentId || generateCommentId(commentText, videoId, timestamp);
		
		comments.push({
			id,
			textDisplay: commentText,
			textOriginal: commentText,
			authorDisplayName: 'You',
			authorProfileImageUrl: '',
			authorChannelUrl: '',
			likeCount: 0,
			publishedAt: timestamp,
			updatedAt: timestamp,
			videoId,
			videoTitle: undefined,
			videoPrivacyStatus: 'unknown',
			moderationStatus: 'published',
			canRate: false,
			viewerRating: 'none',
			parentId: parentId || undefined
		});
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
	} else if (lowerFilename.endsWith('.csv')) {
		return parseTakeoutCSV(content);
	}
	
	// Try to auto-detect format
	const trimmed = content.trim();
	if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
		return parseTakeoutJSON(content);
	} else if (trimmed.startsWith('<') || trimmed.startsWith('<!')) {
		return parseTakeoutHTML(content);
	}
	
	// Try CSV as last resort (if it looks like CSV with commas and multiple lines)
	if (trimmed.includes(',') && trimmed.includes('\n')) {
		const csvResult = parseTakeoutCSV(content);
		if (csvResult.length > 0) {
			return csvResult;
		}
	}
	
	throw new Error('Unable to determine file format. Please use a .json, .html, or .csv file from Google Takeout.');
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

/**
 * Read file content as ArrayBuffer (for ZIP files)
 */
export function readFileAsArrayBuffer(file: File): Promise<ArrayBuffer> {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onload = () => resolve(reader.result as ArrayBuffer);
		reader.onerror = () => reject(new Error('Failed to read file'));
		reader.readAsArrayBuffer(file);
	});
}

/**
 * Check if a file path is likely a comments file
 * Handles localized folder names across multiple languages
 */
function isCommentsFile(filepath: string): boolean {
	const lower = filepath.toLowerCase();
	const filename = lower.split('/').pop() || '';
	
	// Check for supported file extensions
	const supportedExtensions = ['.csv', '.json', '.html', '.htm'];
	if (!supportedExtensions.some(ext => filename.endsWith(ext))) {
		return false;
	}
	
	// Common comment-related folder/file name patterns across languages
	const commentPatterns = [
		'comment', 'kommentar', 'comentario', 'commento', 'comentário',
		'reactie', 'コメント', '评论', 'commentaire'
	];
	
	// Check if the path contains any comment-related term
	return commentPatterns.some(pattern => lower.includes(pattern));
}

/**
 * Extract and parse comments from a ZIP file
 * Handles Google Takeout ZIP exports with localized folder names
 */
export async function parseZipFile(
	file: File, 
	onProgress?: (progress: { loaded: number; total: number }) => void
): Promise<YouTubeComment[]> {
	const allComments: YouTubeComment[] = [];
	const seenIds = new Set<string>();
	
	const arrayBuffer = await readFileAsArrayBuffer(file);
	const zip = await JSZip.loadAsync(arrayBuffer);
	
	// Find all comment-related files in the ZIP
	const commentFiles: string[] = [];
	zip.forEach((relativePath, _zipEntry) => {
		if (isCommentsFile(relativePath)) {
			commentFiles.push(relativePath);
		}
	});
	
	if (commentFiles.length === 0) {
		throw new Error('No comment files found in the ZIP archive. Make sure you are uploading a Google Takeout export that includes YouTube comments.');
	}
	
	const total = commentFiles.length;
	let loaded = 0;
	
	// Process each comment file
	for (const filepath of commentFiles) {
		const zipEntry = zip.file(filepath);
		if (!zipEntry) continue;
		
		try {
			const content = await zipEntry.async('string');
			const filename = filepath.split('/').pop() || filepath;
			const comments = parseTakeoutFile(content, filename);
			
			// Add unique comments (deduplicate by ID)
			for (const comment of comments) {
				if (!seenIds.has(comment.id)) {
					seenIds.add(comment.id);
					allComments.push(comment);
				}
			}
		} catch (e) {
			console.warn(`Failed to parse ${filepath}:`, e);
			// Continue with other files
		}
		
		loaded++;
		if (onProgress) {
			onProgress({ loaded, total });
		}
	}
	
	return allComments;
}

/**
 * Parse multiple files and combine the results
 * Deduplicates comments by ID
 */
export async function parseMultipleFiles(
	files: FileList | File[],
	onProgress?: (progress: { loaded: number; total: number }) => void
): Promise<YouTubeComment[]> {
	const allComments: YouTubeComment[] = [];
	const seenIds = new Set<string>();
	const fileArray = Array.from(files);
	
	const total = fileArray.length;
	let loaded = 0;
	
	for (const file of fileArray) {
		let comments: YouTubeComment[] = [];
		
		if (file.name.toLowerCase().endsWith('.zip')) {
			// Handle ZIP files
			comments = await parseZipFile(file, (zipProgress) => {
				// Report sub-progress for ZIP files
				if (onProgress) {
					const fileProgress = loaded / total;
					const zipContribution = (1 / total) * (zipProgress.loaded / zipProgress.total);
					onProgress({ 
						loaded: fileProgress + zipContribution, 
						total: 1 
					});
				}
			});
		} else {
			// Handle individual files
			const content = await readFileAsText(file);
			comments = parseTakeoutFile(content, file.name);
		}
		
		// Add unique comments
		for (const comment of comments) {
			if (!seenIds.has(comment.id)) {
				seenIds.add(comment.id);
				allComments.push(comment);
			}
		}
		
		loaded++;
		if (onProgress) {
			onProgress({ loaded, total });
		}
	}
	
	return allComments;
}
