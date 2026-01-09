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
	reserved: number;         // Quota reserved by users (pending operations)
	dailyLimit: number;
	perMinuteLimit: number;
	perMinuteUsed: number;
	connectedUsers: number;   // Number of connected users
	deletingUsers: number;    // Number of users currently deleting
	maxParallelDeletions: number; // Max parallel API calls for this user
	lastResetDate: string;
	lastUpdated: number;
	isServerManaged: boolean; // True if server-side quota tracking is enabled
}

// Server-side quota configuration
export interface ServerQuotaConfig {
	reservationChunkSize: number;
	maxParallelDeletions: number;
	deleteCost: number;
}

// Quota store
const createQuotaStore = () => {
	const initialState: QuotaState = {
		used: 0,
		reserved: 0,
		dailyLimit: DEFAULT_DAILY_QUOTA,
		perMinuteLimit: 1800000,
		perMinuteUsed: 0,
		connectedUsers: 0,
		deletingUsers: 0,
		maxParallelDeletions: 5,
		lastResetDate: getPacificDateKey(),
		lastUpdated: Date.now(),
		isServerManaged: false
	};
	
	const { subscribe, set, update } = writable<QuotaState>(initialState);
	
	// SSE connection for real-time updates
	let eventSource: EventSource | null = null;
	let serverConfig: ServerQuotaConfig | null = null;
	
	// Load saved quota data (local fallback)
	const load = async () => {
		const saved = await loadMetadata<QuotaState>('quota');
		if (saved) {
			const currentDateKey = getPacificDateKey();
			// Reset if it's a new day (Pacific Time)
			if (saved.lastResetDate !== currentDateKey) {
				update(state => ({
					...state,
					used: 0,
					reserved: 0,
					lastResetDate: currentDateKey,
					lastUpdated: Date.now()
				}));
			} else {
				update(state => ({
					...state,
					used: saved.used,
					dailyLimit: saved.dailyLimit,
					lastResetDate: saved.lastResetDate,
					lastUpdated: saved.lastUpdated
				}));
			}
		}
		
		// Try to connect to server-side quota tracking
		await syncWithServer();
	};
	
	// Sync with server-side quota (if enabled)
	const syncWithServer = async () => {
		try {
			const response = await fetch('/api/quota');
			if (!response.ok) return;
			
			const data = await response.json();
			
			if (data.googleLoginEnabled && data.quota) {
				const serverQuota = data.quota;
				serverConfig = data.config || null;
				
				update(state => ({
					...state,
					used: serverQuota.used,
					reserved: serverQuota.reserved || 0,
					dailyLimit: serverQuota.dailyLimit,
					perMinuteLimit: serverQuota.perMinuteLimit || state.perMinuteLimit,
					perMinuteUsed: serverQuota.perMinuteUsed || 0,
					connectedUsers: serverQuota.connectedUsers || 0,
					deletingUsers: serverQuota.deletingUsers || 0,
					maxParallelDeletions: serverConfig?.maxParallelDeletions || state.maxParallelDeletions,
					lastResetDate: serverQuota.date,
					lastUpdated: Date.now(),
					isServerManaged: true
				}));
				
				// Connect to SSE for real-time updates
				connectSSE();
			}
		} catch (e) {
			console.debug('Server quota not available, using local tracking');
		}
	};
	
	// Connect to SSE for real-time quota updates
	const connectSSE = () => {
		if (eventSource) {
			eventSource.close();
		}
		
		try {
			eventSource = new EventSource('/api/quota/stream');
			
			eventSource.onmessage = (event) => {
				try {
					const serverQuota = JSON.parse(event.data);
					
					update(state => ({
						...state,
						used: serverQuota.used,
						reserved: serverQuota.reserved || 0,
						dailyLimit: serverQuota.dailyLimit,
						perMinuteUsed: serverQuota.perMinuteUsed || 0,
						connectedUsers: serverQuota.connectedUsers || 0,
						deletingUsers: serverQuota.deletingUsers || 0,
						maxParallelDeletions: serverQuota.maxParallelDeletions || state.maxParallelDeletions,
						lastResetDate: serverQuota.date,
						lastUpdated: Date.now()
					}));
				} catch (e) {
					console.error('Failed to parse SSE quota update:', e);
				}
			};
			
			eventSource.onerror = () => {
				// Reconnect after a delay
				eventSource?.close();
				eventSource = null;
				setTimeout(connectSSE, 5000);
			};
		} catch (e) {
			console.debug('SSE not available:', e);
		}
	};
	
	// Disconnect SSE
	const disconnectSSE = () => {
		if (eventSource) {
			eventSource.close();
			eventSource = null;
		}
	};
	
	// Save quota data (local storage)
	const save = async () => {
		const state = get({ subscribe });
		await saveMetadata('quota', {
			used: state.used,
			dailyLimit: state.dailyLimit,
			lastResetDate: state.lastResetDate,
			lastUpdated: state.lastUpdated
		});
	};
	
	// Add quota usage (local + server)
	const addUsage = async (units: number) => {
		const state = get({ subscribe });
		
		// Update locally first for immediate UI feedback
		update(s => {
			const currentDateKey = getPacificDateKey();
			if (s.lastResetDate !== currentDateKey) {
				return {
					...s,
					used: units,
					reserved: 0,
					lastResetDate: currentDateKey,
					lastUpdated: Date.now()
				};
			}
			return {
				...s,
				used: s.used + units,
				lastUpdated: Date.now()
			};
		});
		
		// Report to server if server-managed
		if (state.isServerManaged) {
			try {
				await fetch('/api/quota', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ action: 'usage', cost: units })
				});
			} catch (e) {
				console.error('Failed to report quota usage to server:', e);
			}
		}
		
		save();
	};
	
	// Reserve quota for a planned operation (server-side only)
	const reserve = async (totalPlanned: number): Promise<{
		success: boolean;
		chunkSize: number;
		maxParallelDeletions: number;
		message?: string;
	}> => {
		const state = get({ subscribe });
		
		if (!state.isServerManaged) {
			// Local mode - no reservation, return full amount if available
			const available = state.dailyLimit - state.used;
			const canDelete = Math.floor(available / QUOTA_COSTS.commentsDelete);
			return {
				success: canDelete > 0,
				chunkSize: Math.min(totalPlanned, canDelete * QUOTA_COSTS.commentsDelete),
				maxParallelDeletions: state.maxParallelDeletions,
				message: canDelete > 0 ? undefined : 'Quota exhausted'
			};
		}
		
		try {
			const response = await fetch('/api/quota', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ action: 'reserve', totalPlanned })
			});
			
			const data = await response.json();
			
			if (data.success) {
				return {
					success: true,
					chunkSize: data.chunkSize,
					maxParallelDeletions: data.maxParallelDeletions || state.maxParallelDeletions
				};
			}
			
			return {
				success: false,
				chunkSize: 0,
				maxParallelDeletions: state.maxParallelDeletions,
				message: data.message || 'Reservation failed'
			};
		} catch (e) {
			console.error('Failed to reserve quota:', e);
			return {
				success: false,
				chunkSize: 0,
				maxParallelDeletions: state.maxParallelDeletions,
				message: 'Network error'
			};
		}
	};
	
	// Confirm actual quota usage from reservation
	const confirmUsage = async (actualUsed: number): Promise<void> => {
		const state = get({ subscribe });
		
		if (!state.isServerManaged) {
			// Local mode - just add usage
			addUsage(actualUsed);
			return;
		}
		
		// Update locally first for immediate UI feedback
		update(s => ({
			...s,
			used: s.used + actualUsed,
			lastUpdated: Date.now()
		}));
		
		try {
			await fetch('/api/quota', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ action: 'confirm', actualUsed })
			});
		} catch (e) {
			console.error('Failed to confirm quota usage:', e);
		}
		
		// Save to local storage for persistence
		save();
	};
	
	// Release reservation (when operation completes or is cancelled)
	const releaseReservation = async (): Promise<void> => {
		const state = get({ subscribe });
		
		if (!state.isServerManaged) return;
		
		try {
			await fetch('/api/quota', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ action: 'release' })
			});
		} catch (e) {
			console.error('Failed to release reservation:', e);
		}
	};
	
	// Reset quota (for testing or manual reset)
	const reset = () => {
		update(state => ({
			...state,
			used: 0,
			reserved: 0,
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
	
	// Get server config
	const getServerConfig = (): ServerQuotaConfig | null => serverConfig;
	
	return {
		subscribe,
		load,
		addUsage,
		reserve,
		confirmUsage,
		releaseReservation,
		reset,
		setDailyLimit,
		syncWithServer,
		disconnectSSE,
		getServerConfig
	};
};

export const quotaStore = createQuotaStore();

// Pending quota (for previewing what an action will cost)
export const pendingQuota = writable<number>(0);

// Derived store for quota percentage (now includes reserved)
export const quotaPercentage = derived(
	[quotaStore, pendingQuota],
	([$quota, $pending]) => {
		const usedPercentage = ($quota.used / $quota.dailyLimit) * 100;
		const reservedPercentage = ($quota.reserved / $quota.dailyLimit) * 100;
		const pendingPercentage = ($pending / $quota.dailyLimit) * 100;
		return {
			used: Math.min(usedPercentage, 100),
			reserved: Math.min(reservedPercentage, 100 - usedPercentage),
			pending: Math.min(pendingPercentage, 100 - usedPercentage - reservedPercentage),
			total: Math.min(usedPercentage + reservedPercentage + pendingPercentage, 100)
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

// Helper to calculate how many comments can be deleted with remaining quota
export function calculateMaxDeletableComments(quotaState: QuotaState): number {
	// Account for both used and reserved quota
	const effectiveUsed = quotaState.used + quotaState.reserved;
	const remainingQuota = Math.max(0, quotaState.dailyLimit - effectiveUsed);
	return Math.floor(remainingQuota / QUOTA_COSTS.commentsDelete);
}

// Derived store for quota remaining (now accounts for reserved)
export const quotaRemaining = derived(
	quotaStore,
	($quota) => {
		// Account for both used and reserved quota
		const effectiveUsed = $quota.used + $quota.reserved;
		const remaining = Math.max(0, $quota.dailyLimit - effectiveUsed);
		const maxDeletable = Math.floor(remaining / QUOTA_COSTS.commentsDelete);
		const isExhausted = remaining < QUOTA_COSTS.commentsDelete;
		return {
			units: remaining,
			maxDeletableComments: maxDeletable,
			isExhausted,
			connectedUsers: $quota.connectedUsers,
			deletingUsers: $quota.deletingUsers,
			maxParallelDeletions: $quota.maxParallelDeletions
		};
	}
);

// Initialize quota store on module load
if (typeof window !== 'undefined') {
	quotaStore.load().catch(console.error);
	
	// Clean up on page unload
	window.addEventListener('beforeunload', () => {
		quotaStore.disconnectSSE();
		// Try to release any reservations using sendBeacon with proper content type
		// Note: sendBeacon doesn't support custom headers, so we use Blob with JSON content type
		const blob = new Blob([JSON.stringify({ action: 'release' })], { type: 'application/json' });
		navigator.sendBeacon('/api/quota', blob);
	});
}
