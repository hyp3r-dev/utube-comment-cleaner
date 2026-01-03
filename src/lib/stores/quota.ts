import { writable, derived, get } from 'svelte/store';
import { saveMetadata, loadMetadata } from '$lib/services/storage';

// YouTube API Quota costs (approximate)
export const QUOTA_COSTS = {
	// Read operations
	commentThreadsList: 1,      // List comment threads
	channelsList: 1,            // List channels (for getting user's channel)
	videosList: 1,              // List videos (for getting video details)
	activitiesList: 1,          // List activities
	
	// Write operations
	commentsDelete: 50,         // Delete a comment
} as const;

// Default daily quota limit for YouTube Data API
export const DEFAULT_DAILY_QUOTA = 10000;

// Pacific Time zone offset (UTC-8 or UTC-7 for DST)
function getPacificMidnight(): Date {
	const now = new Date();
	
	// Create a date in Pacific Time
	const pacificTimeStr = now.toLocaleString('en-US', { timeZone: 'America/Los_Angeles' });
	const pacificDate = new Date(pacificTimeStr);
	
	// Get tomorrow's midnight in Pacific Time
	const tomorrow = new Date(pacificDate);
	tomorrow.setDate(tomorrow.getDate() + 1);
	tomorrow.setHours(0, 0, 0, 0);
	
	// Convert back to local time
	const tomorrowPacificStr = tomorrow.toLocaleString('en-US', { timeZone: 'America/Los_Angeles' });
	const tomorrowPacific = new Date(tomorrowPacificStr);
	
	// Calculate the difference
	const pacificMidnight = new Date(now.getTime() + (tomorrowPacific.getTime() - pacificDate.getTime()));
	
	return pacificMidnight;
}

// Get the current date in Pacific Time as YYYY-MM-DD
function getPacificDateKey(): string {
	const now = new Date();
	const pacificTimeStr = now.toLocaleDateString('en-CA', { timeZone: 'America/Los_Angeles' });
	return pacificTimeStr;
}

export interface QuotaState {
	used: number;
	dailyLimit: number;
	lastResetDate: string;
	lastUpdated: number;
}

// Quota store
const createQuotaStore = () => {
	const initialState: QuotaState = {
		used: 0,
		dailyLimit: DEFAULT_DAILY_QUOTA,
		lastResetDate: getPacificDateKey(),
		lastUpdated: Date.now()
	};
	
	const { subscribe, set, update } = writable<QuotaState>(initialState);
	
	// Load saved quota data
	const load = async () => {
		const saved = await loadMetadata<QuotaState>('quota');
		if (saved) {
			const currentDateKey = getPacificDateKey();
			// Reset if it's a new day (Pacific Time)
			if (saved.lastResetDate !== currentDateKey) {
				set({
					used: 0,
					dailyLimit: saved.dailyLimit,
					lastResetDate: currentDateKey,
					lastUpdated: Date.now()
				});
			} else {
				set(saved);
			}
		}
	};
	
	// Save quota data
	const save = async () => {
		const state = get({ subscribe });
		await saveMetadata('quota', state);
	};
	
	// Add quota usage
	const addUsage = (units: number) => {
		update(state => {
			const currentDateKey = getPacificDateKey();
			// Reset if it's a new day
			if (state.lastResetDate !== currentDateKey) {
				return {
					used: units,
					dailyLimit: state.dailyLimit,
					lastResetDate: currentDateKey,
					lastUpdated: Date.now()
				};
			}
			return {
				...state,
				used: state.used + units,
				lastUpdated: Date.now()
			};
		});
		// Save after updating
		save();
	};
	
	// Reset quota (for testing or manual reset)
	const reset = () => {
		update(state => ({
			...state,
			used: 0,
			lastResetDate: getPacificDateKey(),
			lastUpdated: Date.now()
		}));
		save();
	};
	
	// Set daily limit (for custom limits)
	const setDailyLimit = (limit: number) => {
		update(state => ({
			...state,
			dailyLimit: limit,
			lastUpdated: Date.now()
		}));
		save();
	};
	
	return {
		subscribe,
		load,
		addUsage,
		reset,
		setDailyLimit
	};
};

export const quotaStore = createQuotaStore();

// Pending quota (for previewing what an action will cost)
export const pendingQuota = writable<number>(0);

// Derived store for quota percentage
export const quotaPercentage = derived(
	[quotaStore, pendingQuota],
	([$quota, $pending]) => {
		const usedPercentage = ($quota.used / $quota.dailyLimit) * 100;
		const pendingPercentage = ($pending / $quota.dailyLimit) * 100;
		return {
			used: Math.min(usedPercentage, 100),
			pending: Math.min(usedPercentage + pendingPercentage, 100) - usedPercentage,
			total: Math.min(usedPercentage + pendingPercentage, 100)
		};
	}
);

// Derived store for time until reset
export const timeUntilReset = derived(
	quotaStore,
	() => {
		const now = new Date();
		const resetTime = getPacificMidnight();
		const diffMs = resetTime.getTime() - now.getTime();
		
		if (diffMs <= 0) {
			return { hours: 0, minutes: 0, seconds: 0, formatted: 'Resetting...' };
		}
		
		const hours = Math.floor(diffMs / (1000 * 60 * 60));
		const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
		const seconds = Math.floor((diffMs % (1000 * 60)) / 1000);
		
		let formatted = '';
		if (hours > 0) {
			formatted = `${hours}h ${minutes}m`;
		} else if (minutes > 0) {
			formatted = `${minutes}m ${seconds}s`;
		} else {
			formatted = `${seconds}s`;
		}
		
		return { hours, minutes, seconds, formatted };
	}
);

// Helper to calculate quota cost for fetching comments
export function calculateFetchQuotaCost(estimatedPages: number = 1): number {
	// Each page of comments costs 1 unit
	// Plus 1 unit for channel info
	// Plus video details (batched, ~1 unit per 50 videos)
	return 1 + estimatedPages + Math.ceil(estimatedPages * 10 / 50);
}

// Helper to calculate quota cost for deleting comments
export function calculateDeleteQuotaCost(commentCount: number): number {
	return commentCount * QUOTA_COSTS.commentsDelete;
}

// Initialize quota store on module load
if (typeof window !== 'undefined') {
	quotaStore.load().catch(console.error);
}
