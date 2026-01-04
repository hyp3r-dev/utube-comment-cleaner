/**
 * Shared formatting utilities for text and date handling.
 * These utilities are used across multiple components for consistent formatting.
 */

/**
 * Format a date to a human-readable format.
 * @param dateInput - ISO date string, Date object, or timestamp number
 * @returns Formatted date string like "Jan 1, 2024" or "Unknown date" if invalid
 */
export function formatDate(dateInput: string | number | Date): string {
	if (!dateInput) return 'Unknown date';
	try {
		const date = dateInput instanceof Date ? dateInput : new Date(dateInput);
		if (isNaN(date.getTime())) return 'Unknown date';
		return new Intl.DateTimeFormat('en-US', {
			month: 'short',
			day: 'numeric',
			year: 'numeric'
		}).format(date);
	} catch {
		return 'Unknown date';
	}
}

/**
 * Escape HTML special characters to prevent XSS attacks.
 * Uses manual string replacement for consistent security across all environments.
 * @param text - Raw text that may contain HTML special characters
 * @returns HTML-escaped text safe for innerHTML usage
 */
export function escapeHtml(text: string): string {
	return text
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#039;');
}

/**
 * Truncate text to a maximum length with ellipsis.
 * @param text - Text to truncate
 * @param maxLength - Maximum number of characters before truncation
 * @returns Truncated text with "..." if exceeded, or original text if within limit
 */
export function truncateText(text: string, maxLength: number): string {
	if (text.length <= maxLength) return text;
	return text.slice(0, maxLength) + '...';
}
