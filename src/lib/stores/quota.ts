import { writable, derived, get } from 'svelte/store';
import { saveMetadata, loadMetadata } from '$lib/services/storage';
import { 
	getPacificDateKey, 
	getTimeUntilPacificMidnight,
	VIDEOS_PER_PAGE,
	VIDEOS_PER_BATCH_REQUEST
} from '$lib/utils/timezone';

// YouTube API Quota costs (approximate)
export const QUOTA_COSTS = {
	// Read operations
	commentThreadsList: 1,      // List comment threads
	channelsList: 1,            // List channels (for getting user's channel)
	videosList: 1,              // List videos (for getting video details)
	activitiesList: 1,          // List activities
	commentsList: 1,            // List comments by ID
	
	// Write operations
	commentsDelete: 50,         // Delete a comment
} as const;

// Default daily quota limit for YouTube Data API
export const DEFAULT_DAILY_QUOTA = 10000;

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
		const timeInfo = getTimeUntilPacificMidnight();
		return {
			hours: timeInfo.hours,
			minutes: timeInfo.minutes,
			seconds: timeInfo.seconds,
			formatted: timeInfo.formatted
		};
	}
);

// Helper to calculate quota cost for fetching comments
export function calculateFetchQuotaCost(estimatedPages: number = 1): number {
	// Each page of comments costs 1 unit
	// Plus 1 unit for channel info
	// Plus video details (batched, ~1 unit per VIDEOS_PER_BATCH_REQUEST videos)
	return 1 + estimatedPages + Math.ceil(estimatedPages * VIDEOS_PER_PAGE / VIDEOS_PER_BATCH_REQUEST);
}

// Helper to calculate quota cost for deleting comments
export function calculateDeleteQuotaCost(commentCount: number): number {
	return commentCount * QUOTA_COSTS.commentsDelete;
}

// Initialize quota store on module load
if (typeof window !== 'undefined') {
	quotaStore.load().catch(console.error);
}
