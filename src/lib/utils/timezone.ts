/**
 * Timezone utilities for Pacific Time calculations
 * YouTube API quota resets at midnight Pacific Time
 */

// Constants for quota calculations
export const VIDEOS_PER_PAGE = 10;
export const VIDEOS_PER_BATCH_REQUEST = 50;

/**
 * Get the current date key in Pacific Time (YYYY-MM-DD format)
 * Used for tracking daily quota reset
 */
export function getPacificDateKey(): string {
	return new Intl.DateTimeFormat('en-CA', {
		timeZone: 'America/Los_Angeles'
	}).format(new Date());
}

/**
 * Get time remaining until Pacific Time midnight
 * Returns an object with hours, minutes, seconds, and formatted string
 */
export function getTimeUntilPacificMidnight(): {
	hours: number;
	minutes: number;
	seconds: number;
	formatted: string;
	totalMs: number;
} {
	const now = new Date();
	
	// Get current Pacific Time components
	const pacificFormatter = new Intl.DateTimeFormat('en-US', {
		timeZone: 'America/Los_Angeles',
		year: 'numeric',
		month: '2-digit',
		day: '2-digit',
		hour: '2-digit',
		minute: '2-digit',
		second: '2-digit',
		hour12: false
	});
	
	const pacificParts = pacificFormatter.formatToParts(now);
	const getPart = (type: string) => pacificParts.find(p => p.type === type)?.value || '0';
	
	const pacificHour = parseInt(getPart('hour'), 10);
	const pacificMinute = parseInt(getPart('minute'), 10);
	const pacificSecond = parseInt(getPart('second'), 10);
	
	// Calculate time remaining until midnight in Pacific Time
	const hoursRemaining = 23 - pacificHour;
	const minutesRemaining = 59 - pacificMinute;
	const secondsRemaining = 60 - pacificSecond;
	
	// Adjust for overflow
	let hours = hoursRemaining;
	let minutes = minutesRemaining;
	let seconds = secondsRemaining;
	
	if (seconds === 60) {
		seconds = 0;
		minutes += 1;
	}
	if (minutes === 60) {
		minutes = 0;
		hours += 1;
	}
	if (hours === 24) {
		hours = 0;
	}
	
	const totalMs = (hours * 60 * 60 + minutes * 60 + seconds) * 1000;
	
	// Format the time string
	let formatted = '';
	if (hours > 0) {
		formatted = `${hours}h ${minutes}m`;
	} else if (minutes > 0) {
		formatted = `${minutes}m ${seconds}s`;
	} else {
		formatted = `${seconds}s`;
	}
	
	return { hours, minutes, seconds, formatted, totalMs };
}

/**
 * Check if the given date key is the current Pacific Time day
 */
export function isCurrentPacificDay(dateKey: string): boolean {
	return dateKey === getPacificDateKey();
}
