<script lang="ts">
	import { onMount } from 'svelte';
	import Logo from '$lib/components/Logo.svelte';
	import TakeoutGuide from '$lib/components/TakeoutGuide.svelte';
	import FilterPanel from '$lib/components/FilterPanel.svelte';
	import CommentCard from '$lib/components/CommentCard.svelte';
	import VideoGroup from '$lib/components/VideoGroup.svelte';
	import VirtualizedCommentList from '$lib/components/VirtualizedCommentList.svelte';
	import SelectedCommentsPanel from '$lib/components/SelectedCommentsPanel.svelte';
	import LoadingSpinner from '$lib/components/LoadingSpinner.svelte';
	import DeleteConfirmModal from '$lib/components/DeleteConfirmModal.svelte';
	import LogoutConfirmModal from '$lib/components/LogoutConfirmModal.svelte';
	import NavbarStats from '$lib/components/NavbarStats.svelte';
	import YouTubeStatusIcon from '$lib/components/YouTubeStatusIcon.svelte';
	import QuotaProgressBar from '$lib/components/QuotaProgressBar.svelte';
	import ToastContainer from '$lib/components/ToastContainer.svelte';
	import OAuthGuide from '$lib/components/OAuthGuide.svelte';
	import GoogleSignInButton from '$lib/components/GoogleSignInButton.svelte';
	import CookieConsent from '$lib/components/CookieConsent.svelte';
	import StaleDataReminder from '$lib/components/StaleDataReminder.svelte';
	import DataLifetimeIndicator from '$lib/components/DataLifetimeIndicator.svelte';
	import { toasts } from '$lib/stores/toast';
	import { 
		YouTubeService, 
		TokenExpiredError, 
		InsufficientScopesError, 
		NoChannelError, 
		QuotaExceededError,
		YouTubeAPIError 
	} from '$lib/services/youtube';
	import { parseTakeoutFile, readFileAsText, parseZipFile, parseMultipleFiles } from '$lib/services/takeout';
	import { saveComments, deleteComments as deleteFromStorage, clearAllData, clearCommentsOnly, saveLastTakeoutImport, getCommentCount, getFilteredCommentIds, loadComments } from '$lib/services/storage';
	import {
		apiKey,
		isAuthenticated,
		comments,
		selectedComments,
		selectedIds,
		selectionOrder,
		filteredComments,
		isLoading,
		loadingProgress,
		error,
		removeComments,
		deselectAll,
		logout,
		updateComments,
		setDeleteError,
		moveToBottomOfQueueBatch,
		filters,
		sortField,
		sortOrder,
		searchQuery,
		searchMode,
		loadPersistedSlashQueue
	} from '$lib/stores/comments';
	import {
		windowedComments,
		totalAvailable,
		isLoadingWindow,
		initializeSlidingWindow,
		reloadSlidingWindow,
		forceReloadSlidingWindow,
		clearSlidingWindow,
		handleScrollPosition
	} from '$lib/stores/slidingWindow';
	import { quotaRemaining, quotaStore, QUOTA_COSTS } from '$lib/stores/quota';
	import type { YouTubeComment } from '$lib/types/comment';
	import JSZip from 'jszip';

	let inputApiKey = $state('');
	let showDeleteModal = $state(false);
	let showLogoutModal = $state(false);
	let isDeleting = $state(false);
	let deleteProgress = $state<{ deleted: number; total: number } | undefined>();
	let youtubeService: YouTubeService | null = null;
	let fileInput = $state<HTMLInputElement | null>(null);
	let importJsonInput = $state<HTMLInputElement | null>(null);
	let isDragging = $state(false);
	let isEnriching = $state(false);
	let enrichProgress = $state<{ enriched: number; total: number } | undefined>();
	let groupByVideo = $state(true);
	let hideSelectedFromList = $state(true);
	let showCleanLeaveConfirm = $state(false);
	let showWipeConfirm = $state(false);
	let showMobileSidebar = $state(false);
	// State for sidebar peek effect
	let isNearRightEdge = $state(false);
	let isDraggingComment = $state(false);
	// Background deletion state
	let isDeletingInBackground = $state(false);
	let backgroundDeleteProgress = $state<{ deleted: number; total: number; failed: number } | undefined>();
	let deletionCancelRequested = $state(false); // Flag to request cancellation
	
	// Individual delete progress for animated queue feedback
	type DeleteStatus = 'pending' | 'deleting' | 'success' | 'failed';
	let deleteStatuses = $state<Map<string, { status: DeleteStatus; error?: string }>>(new Map());
	let currentDeletingId = $state<string | undefined>();
	
	// Google Login mode state
	let googleLoginEnabled = $state(false);
	let isCheckingAuth = $state(true);
	let oauthLoading = $state(false);
	let hasRefreshToken = $state(false);
	let canQuickRelogin = $state(false); // True when refresh token available and no access token
	let isQuickReloginLoading = $state(false);
	
	// Legal and compliance settings (from server config)
	let enableLegal = $state(false);
	let enableCookieConsent = $state(false);
	let enableImpressum = $state(false);
	


	// Group comments by video ID
	const groupedComments = $derived(() => {
		const groups = new Map<string, { 
			videoId: string; 
			videoTitle?: string; 
			videoChannelId?: string;
			videoChannelTitle?: string;
			comments: YouTubeComment[] 
		}>();
		
		for (const comment of $windowedComments) {
			const existing = groups.get(comment.videoId);
			if (existing) {
				existing.comments.push(comment);
				// Use the latest video title if available
				if (comment.videoTitle && !existing.videoTitle) {
					existing.videoTitle = comment.videoTitle;
				}
				// Use the latest channel info if available
				if (comment.videoChannelId && !existing.videoChannelId) {
					existing.videoChannelId = comment.videoChannelId;
				}
				if (comment.videoChannelTitle && !existing.videoChannelTitle) {
					existing.videoChannelTitle = comment.videoChannelTitle;
				}
			} else {
				groups.set(comment.videoId, {
					videoId: comment.videoId,
					videoTitle: comment.videoTitle,
					videoChannelId: comment.videoChannelId,
					videoChannelTitle: comment.videoChannelTitle,
					comments: [comment]
				});
			}
		}
		
		return Array.from(groups.values());
	});

	// Count enriched, unenriched and unenrichable comments (single pass for efficiency)
	const enrichmentStats = $derived(() => {
		let enriched = 0;
		let unenriched = 0;
		let unenrichable = 0;
		for (const c of $comments) {
			if (c.isEnriched) enriched++;
			else if (c.isUnenrichable) unenrichable++;
			else unenriched++;
		}
		return { enriched, unenriched, unenrichable };
	});
	
	const unenrichedCount = $derived(enrichmentStats().unenriched);
	const enrichedCount = $derived(enrichmentStats().enriched);
	const unenrichableCount = $derived(enrichmentStats().unenrichable);

	// Count visible comments (total available from sliding window minus selected if hidden)
	const visibleCommentsCount = $derived(() => {
		// Use totalAvailable which represents ALL comments matching current filters in IndexedDB
		const total = $totalAvailable;
		if (!hideSelectedFromList) {
			return total;
		}
		// When hiding selected, subtract selected count from total
		return Math.max(0, total - $selectedIds.size);
	});

	// Indicates if the empty state is because all comments are queued (vs no matching filters)
	const allCommentsAreQueued = $derived(hideSelectedFromList && $selectedIds.size > 0 && $totalAvailable > 0);
	
	// Delayed display of "all queued" banner to let animations play out
	let showAllQueuedBanner = $state(false);
	let allQueuedBannerTimeout: ReturnType<typeof setTimeout> | null = null;
	const ALL_QUEUED_BANNER_DELAY_MS = 500; // Wait for animations to complete
	
	$effect(() => {
		const shouldShowBanner = visibleCommentsCount() === 0 && !$isLoadingWindow && allCommentsAreQueued;
		
		if (shouldShowBanner) {
			// Delay showing the banner to let animations play
			if (!allQueuedBannerTimeout) {
				allQueuedBannerTimeout = setTimeout(() => {
					showAllQueuedBanner = true;
					allQueuedBannerTimeout = null;
				}, ALL_QUEUED_BANNER_DELAY_MS);
			}
		} else {
			// Clear timeout and hide banner immediately when conditions change
			if (allQueuedBannerTimeout) {
				clearTimeout(allQueuedBannerTimeout);
				allQueuedBannerTimeout = null;
			}
			showAllQueuedBanner = false;
		}
	});

	// YouTube connection status for the navbar icon
	type ConnectionStatus = 'disconnected' | 'connected' | 'working' | 'error' | 'deleting';
	const youtubeConnectionStatus: ConnectionStatus = $derived.by(() => {
		if (!$apiKey) return 'disconnected';
		if (isEnriching || isDeletingInBackground) return 'working';
		if ($error && $error.includes('token')) return 'error';
		return 'connected';
	});
	
	// Update comments list when windowed comments change
	$effect(() => {
		// Track dependencies - just re-render when these change
		$windowedComments.length;
		$selectedIds.size;
	});

	// Scroll handler for grouped view to trigger sliding window loading
	// Threshold for triggering scroll position updates (items scrolled since last report)
	const SCROLL_INDEX_CHANGE_THRESHOLD = 5;
	let lastReportedScrollIndex = -1;
	function handleGroupedViewScroll(event: Event) {
		const target = event.target as HTMLElement;
		if (!target) return;
		
		const scrollTop = target.scrollTop;
		const scrollHeight = target.scrollHeight;
		const clientHeight = target.clientHeight;
		
		// Guard against division by zero when content isn't scrollable
		const scrollableHeight = scrollHeight - clientHeight;
		if (scrollableHeight <= 0) return;
		
		// Calculate approximate scroll percentage (0.0 to 1.0)
		const scrollPercentage = scrollTop / scrollableHeight;
		
		// Calculate approximate current index within the windowed comments
		// This maps the scroll position to an index in the current window
		const windowLength = $windowedComments.length;
		if (windowLength === 0) return;
		
		// Clamp index to valid range within the window [0, windowLength-1]
		const currentIndex = Math.max(0, Math.min(Math.floor(scrollPercentage * windowLength), windowLength - 1));
		
		// Only trigger loading if we've scrolled significantly to avoid excessive calls
		if (Math.abs(currentIndex - lastReportedScrollIndex) > SCROLL_INDEX_CHANGE_THRESHOLD) {
			handleScrollPosition(currentIndex);
			lastReportedScrollIndex = currentIndex;
		}
	}

	onMount(async () => {
		// Check if Google Login mode is enabled and fetch config
		try {
			const configResponse = await fetch('/api/auth/config');
			if (configResponse.ok) {
				const config = await configResponse.json();
				googleLoginEnabled = config.googleLoginEnabled;
				enableLegal = config.enableLegal;
				enableCookieConsent = config.enableCookieConsent;
				enableImpressum = config.enableImpressum;
				
				// Store data retention config in localStorage for storage service
				if (config.localDataRetentionDays) {
					localStorage.setItem('commentslash_retention_days', String(config.localDataRetentionDays));
				}
				if (config.staleDataWarningDays) {
					localStorage.setItem('commentslash_stale_warning_days', String(config.staleDataWarningDays));
				}
			}
		} catch (e) {
			console.debug('Config check failed (may not be configured):', e);
		}
		isCheckingAuth = false;
		
		// Check for OAuth callback - handle success or error
		const params = new URLSearchParams(window.location.search);
		const authSuccess = params.get('auth_success') === 'true';
		const authError = params.get('auth_error');
		
		// Clean up the URL immediately to prevent re-processing
		if (authSuccess || authError) {
			window.history.replaceState({}, '', '/');
		}
		
		// Track if we successfully connected via OAuth callback
		let connectedViaOAuthCallback = false;
		
		// Process auth success first - if both params exist, prioritize success
		// This prevents showing error message before success message in edge cases
		if (authSuccess) {
			// Fetch the token securely from the server
			try {
				const tokenResponse = await fetch('/api/auth/token');
				if (tokenResponse.ok) {
					const tokenData = await tokenResponse.json();
					if (tokenData.success && tokenData.access_token) {
						inputApiKey = tokenData.access_token;
						hasRefreshToken = tokenData.hasRefreshToken || false;
						await handleConnectToken();
						connectedViaOAuthCallback = true;
						// Don't show duplicate success message - handleConnectToken already shows one
					} else {
						toasts.error('Failed to retrieve access token.');
					}
				} else {
					toasts.error('Failed to complete sign-in. Please try again.');
				}
			} catch (e) {
				console.error('Failed to fetch OAuth token:', e);
				toasts.error('Failed to complete sign-in. Please try again.');
			}
		} else if (authError) {
			// There was an auth error, but the token might still have been saved
			// Try to fetch the token anyway - the server error might have occurred
			// after the token was already saved to cookies
			try {
				const tokenResponse = await fetch('/api/auth/token');
				if (tokenResponse.ok) {
					const tokenData = await tokenResponse.json();
					if (tokenData.success && tokenData.access_token) {
						// Token was actually saved - use it
						inputApiKey = tokenData.access_token;
						hasRefreshToken = tokenData.hasRefreshToken || false;
						await handleConnectToken();
						connectedViaOAuthCallback = true;
						// Don't show error - connection actually succeeded
					} else {
						// No token available - show the original error
						toasts.error(`Sign-in failed: ${authError}`);
					}
				} else {
					// Token endpoint failed - show the original error
					toasts.error(`Sign-in failed: ${authError}`);
				}
			} catch (e) {
				// Network error - show the original error
				console.error('Failed to check for token after auth error:', e);
				toasts.error(`Sign-in failed: ${authError}`);
			}
		}
		
		// Check if we have an existing auth status cookie (Google Login mode)
		// Skip if we already connected via OAuth callback
		if (googleLoginEnabled && !$apiKey && !connectedViaOAuthCallback) {
			const authStatusCookie = document.cookie
				.split('; ')
				.find(row => row.startsWith('youtube_auth_status='));
			
			if (authStatusCookie) {
				// Try to restore the connection from the secure token
				try {
					const tokenResponse = await fetch('/api/auth/token');
					if (tokenResponse.ok) {
						const tokenData = await tokenResponse.json();
						if (tokenData.success && tokenData.access_token) {
							inputApiKey = tokenData.access_token;
							hasRefreshToken = tokenData.hasRefreshToken || false;
							await handleConnectToken();
						} else if (tokenData.canRefresh) {
							// Access token expired but we can refresh
							console.debug('Access token expired, attempting refresh...');
							const refreshed = await attemptTokenRefresh();
							if (refreshed) {
								toasts.info('Session restored automatically.');
							}
						}
					} else if (tokenResponse.status === 401) {
						// Check if we can refresh
						const tokenData = await tokenResponse.json();
						if (tokenData.canRefresh) {
							console.debug('Access token expired, attempting refresh...');
							const refreshed = await attemptTokenRefresh();
							if (refreshed) {
								toasts.info('Session restored automatically.');
							}
						}
					}
				} catch (e) {
					console.debug('Failed to restore OAuth session:', e);
				}
			}
		}
		
		// Check if quick re-login is available (after soft logout)
		// This sets canQuickRelogin to true if we have a refresh token but no access token
		if (googleLoginEnabled && !$apiKey) {
			await checkQuickReloginAvailable();
		}
		
		// Try to check if we have cached comments
		try {
			const cachedCount = await getCommentCount();
			if (cachedCount > 0) {
				// Load all comments into the store for stats and enrichment
				const allComments = await loadComments();
				comments.set(allComments);
				// Load persisted slash queue after comments are loaded
				await loadPersistedSlashQueue();
				// Initialize sliding window with cached comments
				await initializeSlidingWindow($filters, $sortField, $sortOrder, $searchQuery);
				// If we have cached data, mark as authenticated to show the dashboard
				isAuthenticated.set(true);
			}
		} catch (e) {
			console.error('Failed to load cached comments:', e);
		}
	});
	
	// Effect to reload sliding window when filters/sort/search change
	$effect(() => {
		// Only reload if authenticated (has cached data)
		if ($isAuthenticated) {
			reloadSlidingWindow($filters, $sortField, $sortOrder, $searchQuery);
		}
	});
	
	// Separate effect for sidebar peek event listeners (cleanup handled by $effect)
	$effect(() => {
		if (typeof window === 'undefined') return;
		
		// Edge detection for sidebar peek effect
		const EDGE_THRESHOLD = 60; // pixels from right edge
		let listenersAttached = false;
		
		function handleMouseMove(e: MouseEvent) {
			const distanceFromRight = window.innerWidth - e.clientX;
			isNearRightEdge = distanceFromRight < EDGE_THRESHOLD;
		}
		
		function handleDragOver(e: DragEvent) {
			const distanceFromRight = window.innerWidth - e.clientX;
			if (distanceFromRight < EDGE_THRESHOLD * 2) {
				isDraggingComment = true;
			}
		}
		
		function handleDragEnd() {
			isDraggingComment = false;
		}
		
		function handleMouseLeave() {
			isNearRightEdge = false;
		}
		
		function addListeners() {
			if (!listenersAttached) {
				document.addEventListener('mousemove', handleMouseMove);
				document.addEventListener('dragover', handleDragOver);
				document.addEventListener('dragend', handleDragEnd);
				document.addEventListener('drop', handleDragEnd);
				document.documentElement.addEventListener('mouseleave', handleMouseLeave);
				listenersAttached = true;
			}
		}
		
		function removeListeners() {
			if (listenersAttached) {
				document.removeEventListener('mousemove', handleMouseMove);
				document.removeEventListener('dragover', handleDragOver);
				document.removeEventListener('dragend', handleDragEnd);
				document.removeEventListener('drop', handleDragEnd);
				document.documentElement.removeEventListener('mouseleave', handleMouseLeave);
				listenersAttached = false;
				isNearRightEdge = false;
				isDraggingComment = false;
			}
		}
		
		// Only add listeners on mobile/tablet viewport
		const checkViewport = () => {
			if (window.innerWidth <= 1024) {
				addListeners();
			} else {
				removeListeners();
			}
		};
		
		checkViewport();
		window.addEventListener('resize', checkViewport);
		
		return () => {
			removeListeners();
			window.removeEventListener('resize', checkViewport);
		};
	});

	function getErrorMessage(e: unknown): string {
		if (e instanceof TokenExpiredError) {
			return 'Your access token has expired. Please generate a new one from the OAuth Playground.';
		}
		if (e instanceof InsufficientScopesError) {
			return 'Your access token does not have the required permissions. Please authorize with the "youtube.force-ssl" scope in the OAuth Playground.';
		}
		if (e instanceof NoChannelError) {
			return 'No YouTube channel found for this Google account. Please visit YouTube.com and create a channel first.';
		}
		if (e instanceof QuotaExceededError) {
			return 'YouTube API quota exceeded. The quota resets daily at midnight Pacific Time.';
		}
		if (e instanceof YouTubeAPIError) {
			return e.message;
		}
		if (e instanceof Error) {
			return e.message;
		}
		return 'An unexpected error occurred. Please try again.';
	}

	/**
	 * Select all comments that match current filters
	 * Queries IndexedDB to get ALL matching IDs, not just loaded ones
	 */
	async function handleSelectAllFiltered() {
		try {
			// Build query options from current filters
			const options = {
				labels: $filters.labels,
				minCharacters: $filters.minCharacters > 0 ? $filters.minCharacters : undefined,
				maxCharacters: $filters.maxCharacters < 10000 ? $filters.maxCharacters : undefined,
				minLikes: $filters.minLikes > 0 ? $filters.minLikes : undefined,
				maxLikes: $filters.maxLikes < 1000000 ? $filters.maxLikes : undefined,
				videoPrivacy: $filters.videoPrivacy,
				moderationStatus: $filters.moderationStatus,
				searchQuery: $searchQuery || undefined,
				searchMode: $searchMode,
				showOnlyWithErrors: $filters.showOnlyWithErrors,
				channelId: $filters.channelFilter?.channelId,
				dateRange: $filters.dateRange
			};
			
			// Get ALL matching IDs from IndexedDB
			const matchingIds = await getFilteredCommentIds(options);
			
			// Add to selection
			const currentIds = $selectedIds;
			const currentOrder = $selectionOrder;
			
			// Filter out IDs that are already selected
			const newIds = matchingIds.filter(id => !currentIds.has(id));
			
			if (newIds.length > 0) {
				// Update selection order: new IDs at the beginning
				selectionOrder.set([...newIds, ...currentOrder]);
				
				// Update selectedIds
				selectedIds.update(ids => {
					const updated = new Set(ids);
					newIds.forEach(id => updated.add(id));
					return updated;
				});
				
				toasts.success(`Added ${newIds.length} comment(s) to slash queue (${matchingIds.length} total matched)`);
			} else {
				toasts.info(`All ${matchingIds.length} matching comments are already in the queue`);
			}
		} catch (e) {
			console.error('Failed to select all filtered:', e);
			toasts.error('Failed to select comments. Please try again.');
		}
	}

	// Helper to check if data is a valid CommentSlash export
	function isValidCommentSlashExport(data: unknown): data is { comments: YouTubeComment[] } {
		return typeof data === 'object' && data !== null && 
			'comments' in data && Array.isArray((data as { comments: unknown }).comments);
	}

	// Helper to finalize CommentSlash import
	async function finalizeCommentSlashImport(importedComments: YouTubeComment[]): Promise<void> {
		await saveComments(importedComments);
		loadingProgress.set({ loaded: 1, total: 1 });
		
		const allComments = await loadComments();
		comments.set(allComments);
		await initializeSlidingWindow($filters, $sortField, $sortOrder, $searchQuery);
		isAuthenticated.set(true);
	}

	async function handleFileImport(files: FileList | File[]) {
		const fileArray = Array.from(files);
		if (fileArray.length === 0) return;
		
		isLoading.set(true);
		error.set(null);
		loadingProgress.set({ loaded: 0, total: 1 });

		try {
			// Check if it's a single file that might be a CommentSlash export
			if (fileArray.length === 1) {
				const file = fileArray[0];
				
				// Check for CommentSlash JSON export
				if (file.name.endsWith('.json')) {
					const jsonString = await readFileAsText(file);
					const importData = JSON.parse(jsonString);
					
					if (isValidCommentSlashExport(importData)) {
						await finalizeCommentSlashImport(importData.comments);
						return;
					}
				}
				
				// Check for CommentSlash ZIP export (contains comments.json)
				if (file.name.endsWith('.zip')) {
					const zip = await JSZip.loadAsync(file);
					const jsonFile = zip.file('comments.json');
					
					if (jsonFile) {
						const jsonString = await jsonFile.async('string');
						const importData = JSON.parse(jsonString);
						
						if (isValidCommentSlashExport(importData)) {
							await finalizeCommentSlashImport(importData.comments);
							return;
						}
					}
				}
			}
			
			// Fall back to Google Takeout parsing
			const importedComments = await parseMultipleFiles(fileArray, (progress) => {
				loadingProgress.set(progress);
			});
			
			if (importedComments.length === 0) {
				error.set('No comments found in the uploaded file(s). Make sure you uploaded a valid Google Takeout export or CommentSlash export.');
				isLoading.set(false);
				return;
			}

			// Save to IndexedDB
			await saveComments(importedComments);
			await saveLastTakeoutImport();
			loadingProgress.set({ loaded: 1, total: 1 });
			
			// Load all comments into store for stats and enrichment
			const allComments = await loadComments();
			comments.set(allComments);
			
			// Reinitialize sliding window with new data
			await initializeSlidingWindow($filters, $sortField, $sortOrder, $searchQuery);
			
			isAuthenticated.set(true);
		} catch (e) {
			error.set(e instanceof Error ? e.message : 'Failed to parse file(s). Please make sure they are valid exports.');
		} finally {
			isLoading.set(false);
		}
	}

	function handleFileSelect(event: Event) {
		const input = event.target as HTMLInputElement;
		const files = input.files;
		if (files && files.length > 0) {
			handleFileImport(files);
		}
	}

	function handleDrop(event: DragEvent) {
		event.preventDefault();
		isDragging = false;
		const files = event.dataTransfer?.files;
		if (files && files.length > 0) {
			handleFileImport(files);
		}
	}

	function handleDragOver(event: DragEvent) {
		event.preventDefault();
		isDragging = true;
	}

	function handleDragLeave() {
		isDragging = false;
	}

	async function handleConnectToken() {
		if (!inputApiKey.trim()) {
			error.set('Please enter your OAuth access token');
			return;
		}

		isLoading.set(true);
		error.set(null);

		try {
			youtubeService = new YouTubeService(inputApiKey.trim());
			
			// Validate the token
			const validationResult = await youtubeService.validateToken();
			
			if (!validationResult.valid) {
				error.set(validationResult.error || 'Invalid access token');
				isLoading.set(false);
				return;
			}
			
			// Store the token for delete operations
			apiKey.set(inputApiKey.trim());
			error.set(null);
			
			// Show success message
			toasts.success(`Connected to YouTube as "${validationResult.channelTitle}". You can now enrich and delete comments.`);
		} catch (e) {
			error.set(getErrorMessage(e));
		} finally {
			isLoading.set(false);
		}
	}

	async function handleDeleteConfirm() {
		if (!youtubeService || $selectedComments.length === 0) return;
		
		// Close modal immediately and start background deletion
		showDeleteModal = false;
		handleBackgroundDelete();
	}

	async function handleCleanLeave() {
		showCleanLeaveConfirm = false;
		logout();
		await clearAllData();
		inputApiKey = '';
		youtubeService = null;
		toasts.success('All data cleared. Thanks for using CommentSlash!');
	}

	async function handleLogout() {
		// Show confirmation modal instead of immediately logging out
		showLogoutModal = true;
	}
	
	async function handleLogoutConfirm(mode: 'full' | 'soft') {
		showLogoutModal = false;
		
		// Clear only the OAuth token, keep the comments data
		apiKey.set('');
		inputApiKey = '';
		youtubeService = null;
		
		// Clear the OAuth cookie if using Google Login mode
		if (googleLoginEnabled) {
			try {
				// Call the server to clear the auth cookie with the specified mode
				const response = await fetch('/api/auth/logout', { 
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ mode })
				});
				const data = await response.json();
				
				// Update hasRefreshToken and canQuickRelogin based on the logout mode
				// For soft logout, the server keeps the refresh token
				if (data.mode === 'soft') {
					hasRefreshToken = true;
					canQuickRelogin = true; // Enable quick re-login after soft logout
				} else {
					hasRefreshToken = false;
					canQuickRelogin = false;
				}
			} catch (e) {
				console.debug('Logout API call failed:', e);
				// In case of error, assume full logout behavior
				hasRefreshToken = mode === 'soft';
				canQuickRelogin = mode === 'soft';
			}
			// Also clear the local auth status cookie
			document.cookie = 'youtube_auth_status=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/';
		}
		
		if (mode === 'soft') {
			toasts.success('Session ended. Click "Quick Sign In" to reconnect instantly.');
		} else {
			toasts.success('Fully signed out of YouTube. Your comment data is still saved.');
		}
	}
	
	/**
	 * Attempt to refresh the access token using the stored refresh token
	 * Returns true if successful, false otherwise
	 */
	async function attemptTokenRefresh(): Promise<boolean> {
		try {
			const response = await fetch('/api/auth/refresh', { method: 'POST' });
			const data = await response.json();
			
			if (data.success && data.access_token) {
				// Token refreshed, use the access token directly from the response
				inputApiKey = data.access_token;
				hasRefreshToken = true;
				canQuickRelogin = false; // Successfully logged in, no need for quick relogin
				await handleConnectToken();
				return true;
			} else if (data.requiresReauth) {
				// Refresh token is invalid, user needs to re-authenticate
				hasRefreshToken = false;
				canQuickRelogin = false;
			}
			
			return false;
		} catch (e) {
			console.error('Token refresh failed:', e);
			return false;
		}
	}
	
	/**
	 * Handle quick re-login using the stored refresh token
	 * This is used after a soft logout to quickly restore the session
	 */
	async function handleQuickRelogin() {
		isQuickReloginLoading = true;
		try {
			const success = await attemptTokenRefresh();
			if (success) {
				toasts.success('Successfully reconnected to YouTube!');
			} else {
				// Refresh token is invalid, clear the quick relogin state
				canQuickRelogin = false;
				toasts.warning('Session expired. Please sign in with Google again.');
			}
		} catch (e) {
			console.error('Quick re-login failed:', e);
			canQuickRelogin = false;
			toasts.error('Failed to reconnect. Please sign in with Google again.');
		} finally {
			isQuickReloginLoading = false;
		}
	}
	
	/**
	 * Check if quick re-login is available (refresh token exists)
	 */
	async function checkQuickReloginAvailable(): Promise<void> {
		if (!googleLoginEnabled) return;
		
		try {
			const response = await fetch('/api/auth/token');
			
			// Parse JSON only if response has content
			let data: { canRefresh?: boolean } = {};
			try {
				data = await response.json();
			} catch {
				// Response body might not be JSON, ignore
			}
			
			if (response.ok) {
				// We have a valid access token, no need for quick relogin
				canQuickRelogin = false;
			} else if (response.status === 401 && data.canRefresh) {
				// No access token but we have a refresh token
				canQuickRelogin = true;
				hasRefreshToken = true;
			} else {
				canQuickRelogin = false;
			}
		} catch (e) {
			console.debug('Quick relogin check failed:', e);
			canQuickRelogin = false;
		}
	}

	async function handleEnrichComments() {
		if (!youtubeService || $comments.length === 0) return;
		
		// Only enrich comments that haven't been enriched yet and aren't already marked as unenrichable
		const unenrichedComments = $comments.filter(c => !c.isEnriched && !c.isUnenrichable);
		if (unenrichedComments.length === 0) return;
		
		isEnriching = true;
		enrichProgress = { enriched: 0, total: unenrichedComments.length };
		error.set(null);
		
		try {
			const result = await youtubeService.enrichComments(
				unenrichedComments, 
				// Progress callback
				(enriched, total) => {
					enrichProgress = { enriched, total };
				},
				// Real-time batch update callback
				(batchUpdates) => {
					// Update comments in place for immediate UI feedback
					updateComments(batchUpdates);
				}
			);
			
			// Mark missing comments as unenrichable
			if (result.missing.length > 0) {
				const missingUpdates = new Map<string, Partial<YouTubeComment>>();
				result.missing.forEach(id => {
					// Get the existing labels for this comment
					const existingComment = $comments.find(c => c.id === id);
					const existingLabels = existingComment?.labels || [];
					// Add 'unenrichable' label if not already present
					const labels = existingLabels.includes('unenrichable') 
						? existingLabels 
						: [...existingLabels, 'unenrichable' as const];
					missingUpdates.set(id, { 
						isUnenrichable: true,
						labels
					});
				});
				updateComments(missingUpdates);
			}
			
			// Final save to storage after all batches complete
			await saveComments($comments);
			
			if (result.missing.length > 0) {
				toasts.warning(`${result.missing.length} comment(s) could not be enriched (may be deleted or private).`);
			} else {
				toasts.success(`Successfully enriched ${result.enriched.filter(c => c.isEnriched).length} comments!`);
			}
		} catch (e) {
			error.set(getErrorMessage(e));
		} finally {
			isEnriching = false;
			enrichProgress = undefined;
		}
	}

	async function handleExportComments(asZip: boolean = false) {
		if ($comments.length === 0) return;
		
		const exportData = {
			version: 1,
			exportedAt: new Date().toISOString(),
			comments: $comments
		};
		
		const jsonString = JSON.stringify(exportData, null, 2);
		
		if (asZip) {
			const zip = new JSZip();
			zip.file('comments.json', jsonString);
			const blob = await zip.generateAsync({ type: 'blob' });
			downloadBlob(blob, 'commentslash-export.zip');
		} else {
			const blob = new Blob([jsonString], { type: 'application/json' });
			downloadBlob(blob, 'commentslash-export.json');
		}
	}

	function downloadBlob(blob: Blob, filename: string) {
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = filename;
		document.body.appendChild(a);
		a.click();
		document.body.removeChild(a);
		URL.revokeObjectURL(url);
	}

	// Helper function to merge imported comments with existing ones
	async function mergeImportedComments(
		importedComments: YouTubeComment[], 
		isTakeout: boolean = false
	): Promise<{ added: number; skipped: number }> {
		const existingIds = new Set($comments.map(c => c.id));
		const newComments = importedComments.filter(c => !existingIds.has(c.id));
		
		if (newComments.length > 0) {
			const merged = [...$comments, ...newComments];
			comments.set(merged);
			await saveComments(merged);
			if (isTakeout) {
				await saveLastTakeoutImport();
			}
		}
		
		return {
			added: newComments.length,
			skipped: importedComments.length - newComments.length
		};
	}

	// Helper function to show import result toast
	function showImportResultToast(added: number, skipped: number): void {
		if (added > 0) {
			toasts.success(`Import complete: ${added} new comment(s) added, ${skipped} duplicate(s) skipped.`);
		} else {
			toasts.info(`All ${skipped} comment(s) were already in your collection.`);
		}
	}

	async function handleImportJson(event: Event) {
		const input = event.target as HTMLInputElement;
		const files = input.files;
		if (!files || files.length === 0) return;
		
		isLoading.set(true);
		error.set(null);
		
		try {
			const file = files[0];
			
			// Try to detect file type and parse accordingly
			if (file.name.endsWith('.zip')) {
				// For ZIP files, try to detect if it's an in-service export or Google Takeout
				const zip = await JSZip.loadAsync(file);
				const jsonFile = zip.file('comments.json');
				
				if (jsonFile) {
					// Try in-service export format first
					const jsonString = await jsonFile.async('string');
					const importData = JSON.parse(jsonString);
					
					if (importData.comments && Array.isArray(importData.comments)) {
						const result = await mergeImportedComments(importData.comments, false);
						showImportResultToast(result.added, result.skipped);
						isAuthenticated.set(true);
						return;
					}
				}
				
				// No comments.json found or invalid format - try as Google Takeout
				const parsedComments = await parseMultipleFiles([file], (progress) => {
					loadingProgress.set(progress);
				});
				
				if (parsedComments.length === 0) {
					throw new Error('No comments found in the ZIP file. Make sure it contains Google Takeout comment data or a valid CommentSlash export.');
				}
				
				const result = await mergeImportedComments(parsedComments, true);
				showImportResultToast(result.added, result.skipped);
				isAuthenticated.set(true);
			} else if (file.name.endsWith('.json')) {
				// JSON file - try in-service format
				const jsonString = await readFileAsText(file);
				const importData = JSON.parse(jsonString);
				
				if (importData.comments && Array.isArray(importData.comments)) {
					const result = await mergeImportedComments(importData.comments, false);
					showImportResultToast(result.added, result.skipped);
					isAuthenticated.set(true);
				} else {
					throw new Error('Invalid JSON format. Expected a CommentSlash export file with a "comments" array.');
				}
			} else if (file.name.endsWith('.csv')) {
				// CSV file - parse as Google Takeout format
				const parsedComments = await parseMultipleFiles([file], (progress) => {
					loadingProgress.set(progress);
				});
				
				if (parsedComments.length === 0) {
					throw new Error('No comments found in the CSV file.');
				}
				
				const result = await mergeImportedComments(parsedComments, true);
				showImportResultToast(result.added, result.skipped);
				isAuthenticated.set(true);
			} else {
				throw new Error('Unsupported file type. Please use .json, .csv, or .zip files.');
			}
		} catch (e) {
			error.set(e instanceof Error ? e.message : 'Failed to import comments');
		} finally {
			isLoading.set(false);
			input.value = '';
		}
	}

	async function handleMergeTakeout(files: FileList | File[]) {
		const fileArray = Array.from(files);
		if (fileArray.length === 0) return;
		
		isLoading.set(true);
		error.set(null);
		loadingProgress.set({ loaded: 0, total: 1 });
		
		try {
			const newComments = await parseMultipleFiles(fileArray, (progress) => {
				loadingProgress.set(progress);
			});
			
			if (newComments.length === 0) {
				error.set('No comments found in the uploaded file(s).');
				isLoading.set(false);
				return;
			}
			
			// Create sets for comparison
			const newIds = new Set(newComments.map(c => c.id));
			const existingIds = new Set($comments.map(c => c.id));
			
			// Find comments that exist in current data but not in new takeout (externally deleted)
			const externallyDeleted = $comments.filter(c => !newIds.has(c.id) && !c.isExternallyDeleted);
			
			// Mark externally deleted comments
			const updatedComments = $comments.map(c => {
				if (!newIds.has(c.id) && !c.isExternallyDeleted) {
					// Add 'externally_deleted' label
					const existingLabels = c.labels || [];
					const labels = existingLabels.includes('externally_deleted')
						? existingLabels
						: [...existingLabels, 'externally_deleted' as const];
					return { ...c, isExternallyDeleted: true, labels };
				}
				return c;
			});
			
			// Add new comments that don't exist
			const addedComments = newComments.filter(c => !existingIds.has(c.id));
			
			const merged = [...updatedComments, ...addedComments];
			comments.set(merged);
			await saveComments(merged);
			await saveLastTakeoutImport();
			
			if (addedComments.length > 0) {
				toasts.success(`Merge complete: ${addedComments.length} new comment(s) added.`);
			} else {
				toasts.info('No new comments found in the takeout export.');
			}
			
			if (externallyDeleted.length > 0) {
				toasts.warning(`${externallyDeleted.length} comment(s) marked as externally deleted.`);
			}
			
		} catch (e) {
			error.set(e instanceof Error ? e.message : 'Failed to merge takeout data');
		} finally {
			isLoading.set(false);
		}
	}

	async function handleWipeData() {
		showWipeConfirm = false;
		isLoading.set(true);
		error.set(null);
		
		try {
			// Clear comments from storage but preserve quota
			await clearCommentsOnly();
			
			// Reset the stores
			comments.set([]);
			selectedIds.set(new Set());
			isAuthenticated.set(false);
			
			toasts.success('All comment data has been wiped. You can now re-import your files.');
		} catch (e) {
			error.set(e instanceof Error ? e.message : 'Failed to wipe data');
		} finally {
			isLoading.set(false);
		}
	}

	// Handle unenrichable comments - try to delete via API, then remove from database
	async function handleDeleteUnenrichableComments() {
		const unenrichableComments = $comments.filter(c => c.isUnenrichable);
		if (unenrichableComments.length === 0) return;
		
		if (!youtubeService) {
			// No API connection, just remove from local database
			handleRemoveUnenrichableFromDatabase();
			return;
		}
		
		isDeletingInBackground = true;
		backgroundDeleteProgress = { deleted: 0, total: unenrichableComments.length, failed: 0 };
		
		try {
			const commentIds = unenrichableComments.map(c => c.id);
			const result = await youtubeService.deleteComments(commentIds, (deleted, total) => {
				backgroundDeleteProgress = { 
					deleted, 
					total, 
					failed: backgroundDeleteProgress?.failed || 0 
				};
			});
			
			// Remove successfully deleted comments
			if (result.success.length > 0) {
				removeComments(result.success);
				await deleteFromStorage(result.success);
			}
			
			// For failed deletions, they're already not on YouTube, so remove from local DB
			// Extract just the IDs from the failed results
			const failedIds = result.failed.map(f => f.id);
			if (failedIds.length > 0) {
				removeComments(failedIds);
				await deleteFromStorage(failedIds);
			}
			
			await saveComments($comments);
			
			// Force reload sliding window to update totalAvailable count in navbar
			await forceReloadSlidingWindow();
			
			toasts.success(`Removed ${unenrichableComments.length} unenrichable comment(s) from your collection.`);
		} catch (e) {
			error.set(getErrorMessage(e));
		} finally {
			isDeletingInBackground = false;
			backgroundDeleteProgress = undefined;
		}
	}

	// Simply remove unenrichable comments from the local database
	async function handleRemoveUnenrichableFromDatabase() {
		const unenrichableComments = $comments.filter(c => c.isUnenrichable);
		if (unenrichableComments.length === 0) return;
		
		const ids = unenrichableComments.map(c => c.id);
		removeComments(ids);
		await deleteFromStorage(ids);
		await saveComments($comments);
		
		// Force reload sliding window to update totalAvailable count in navbar
		await forceReloadSlidingWindow();
		
		toasts.success(`Removed ${ids.length} unenrichable comment(s) from your collection.`);
	}

	// Remove a single comment from local database (without deleting from YouTube)
	async function handleRemoveFromDatabase(commentId: string) {
		removeComments([commentId]);
		await deleteFromStorage([commentId]);
		await saveComments($comments);
		
		// Force reload sliding window to update totalAvailable count in navbar
		await forceReloadSlidingWindow();
		
		toasts.info('Comment removed from your local database.');
	}

	// Animation timing constants for delete queue
	const ANIMATION_DELAY_MS = 400;
	const CLEANUP_DELAY_MS = 600;
	const PARALLEL_ANIMATION_DELAY_MS = 100; // Shorter delay for parallel deletions

	// Handle cancellation request for deletion
	function handleCancelDelete() {
		if (!isDeletingInBackground) return;
		deletionCancelRequested = true;
		toasts.info('Cancellation requested... finishing current batch.');
	}

	// Background delete for selected comments with animated progress
	// Supports both sequential and parallel deletion modes
	async function handleBackgroundDelete() {
		if (!youtubeService || $selectedComments.length === 0) return;
		
		showDeleteModal = false;
		isDeletingInBackground = true;
		deletionCancelRequested = false; // Reset cancellation flag
		
		// Get ordered list of comment IDs from the queue
		let commentsToDelete = [...$selectedComments];
		
		// Limit deletions based on remaining quota
		const maxDeletable = $quotaRemaining.maxDeletableComments;
		const quotaLimited = commentsToDelete.length > maxDeletable;
		
		if (maxDeletable === 0) {
			// Quota exhausted - don't delete anything
			toasts.warning('Daily quota exhausted. Please wait until the quota resets at midnight Pacific Time.');
			isDeletingInBackground = false;
			return;
		}
		
		if (quotaLimited) {
			// Only delete as many as quota allows
			commentsToDelete = commentsToDelete.slice(0, maxDeletable);
			toasts.info(`Quota allows ${maxDeletable} deletions. Remaining comments will stay in the queue.`);
		}
		
		const totalCount = commentsToDelete.length;
		const totalQuotaNeeded = totalCount * QUOTA_COSTS.commentsDelete;
		
		// Initialize all statuses as pending
		deleteStatuses = new Map();
		for (const comment of commentsToDelete) {
			deleteStatuses.set(comment.id, { status: 'pending' });
		}
		
		backgroundDeleteProgress = { deleted: 0, total: totalCount, failed: 0 };
		
		let successCount = 0;
		let failedCount = 0;
		const successIds: string[] = [];
		const failedItems: { id: string; error: string }[] = [];
		let quotaExceeded = false;
		
		try {
			// Start deletion session with server - this returns the first batch size
			const session = await quotaStore.startDeletionSession(totalQuotaNeeded);
			
			if (!session.success) {
				toasts.warning(session.message || 'Cannot start deletion - quota may be exhausted');
				isDeletingInBackground = false;
				return;
			}
			
			let currentBatchSize = session.batchSize || 0;
			let maxParallel = session.maxParallelDeletions || $quotaRemaining.maxParallelDeletions || 5;
			const useParallel = maxParallel > 1 && totalCount > 1;
			
			// Process deletions in batches, waiting for server confirmation between each batch
			let processedIndex = 0;
			let wasCancelled = false;
			
			while (processedIndex < commentsToDelete.length && !quotaExceeded && !wasCancelled) {
				// Check for cancellation at the start of each batch
				if (deletionCancelRequested) {
					wasCancelled = true;
					break;
				}
				
				// Calculate how many comments to delete in this batch (based on quota units)
				const commentsInBatch = Math.min(
					Math.floor(currentBatchSize / QUOTA_COSTS.commentsDelete),
					commentsToDelete.length - processedIndex
				);
				
				if (commentsInBatch <= 0) {
					// No more quota available
					quotaExceeded = true;
					break;
				}
				
				const batchComments = commentsToDelete.slice(processedIndex, processedIndex + commentsInBatch);
				const batchIds = batchComments.map(c => c.id);
				
				// Track batch results
				let batchSuccess = 0;
				let batchFailed = 0;
				
				if (useParallel && batchIds.length > 1) {
					// Mark batch as deleting
					for (const id of batchIds.slice(0, maxParallel)) {
						deleteStatuses = new Map(deleteStatuses);
						deleteStatuses.set(id, { status: 'deleting' });
					}
					
					// Process batch in parallel
					const result = await youtubeService.deleteCommentsParallel(
						batchIds,
						maxParallel,
						(progress, processed, total) => {
							// Update individual comment status
							deleteStatuses = new Map(deleteStatuses);
							if (progress.success) {
								deleteStatuses.set(progress.id, { status: 'success' });
								successIds.push(progress.id);
								successCount++;
								batchSuccess++;
							} else {
								deleteStatuses.set(progress.id, { status: 'failed', error: progress.error });
								failedItems.push({ id: progress.id, error: progress.error || 'Delete failed' });
								failedCount++;
								batchFailed++;
							}
							
							// Mark next items as deleting
							const nextIndex = processed;
							const nextBatchEnd = Math.min(nextIndex + maxParallel, total);
							for (let i = nextIndex; i < nextBatchEnd; i++) {
								const nextId = batchIds[i];
								if (nextId && deleteStatuses.get(nextId)?.status === 'pending') {
									deleteStatuses = new Map(deleteStatuses);
									deleteStatuses.set(nextId, { status: 'deleting' });
								}
							}
							
							// Update progress
							backgroundDeleteProgress = { 
								deleted: successCount, 
								total: totalCount, 
								failed: failedCount 
							};
						}
					);
					
					if (result.quotaExceeded) {
						quotaExceeded = true;
					}
				} else {
					// Sequential deletion for this batch
					for (const comment of batchComments) {
						if (quotaExceeded || deletionCancelRequested) {
							if (deletionCancelRequested) wasCancelled = true;
							break;
						}
						
						currentDeletingId = comment.id;
						
						// Update status to deleting
						deleteStatuses = new Map(deleteStatuses);
						deleteStatuses.set(comment.id, { status: 'deleting' });
						
						try {
							// Delete single comment
							const result = await youtubeService.deleteComments([comment.id]);
							
							if (result.success.includes(comment.id)) {
								// Success
								deleteStatuses = new Map(deleteStatuses);
								deleteStatuses.set(comment.id, { status: 'success' });
								successIds.push(comment.id);
								successCount++;
								batchSuccess++;
							} else if (result.failed.length > 0) {
								// Failed
								const failedInfo = result.failed.find(f => f.id === comment.id);
								const errorMsg = failedInfo?.error || 'Delete failed';
								deleteStatuses = new Map(deleteStatuses);
								deleteStatuses.set(comment.id, { status: 'failed', error: errorMsg });
								failedItems.push({ id: comment.id, error: errorMsg });
								failedCount++;
								batchFailed++;
								
								if (errorMsg.toLowerCase().includes('quota')) {
									quotaExceeded = true;
								}
							}
						} catch (e) {
							// Error
							const errorMsg = e instanceof Error ? e.message : 'Delete failed';
							deleteStatuses = new Map(deleteStatuses);
							deleteStatuses.set(comment.id, { status: 'failed', error: errorMsg });
							failedItems.push({ id: comment.id, error: errorMsg });
							failedCount++;
							batchFailed++;
							
							if (errorMsg.toLowerCase().includes('quota')) {
								quotaExceeded = true;
							}
						}
						
						// Update progress
						backgroundDeleteProgress = { 
							deleted: successCount, 
							total: totalCount, 
							failed: failedCount 
						};
						
						// Small delay for animation
						await new Promise(resolve => setTimeout(resolve, ANIMATION_DELAY_MS));
					}
				}
				
				processedIndex += commentsInBatch;
				
				// **CRITICAL**: Report batch to server and WAIT for response
				// This ensures quota is properly tracked and server controls pacing
				const batchResult = await quotaStore.reportBatchComplete(batchSuccess, batchFailed);
				
				// Check if we should continue to next batch
				if (processedIndex < commentsToDelete.length && !quotaExceeded && !wasCancelled) {
					if (!batchResult.success || !batchResult.shouldContinue) {
						// Server says stop
						if (batchResult.message?.toLowerCase().includes('quota')) {
							quotaExceeded = true;
						}
						break;
					}
					
					// Update batch parameters for next iteration
					currentBatchSize = batchResult.nextBatchSize;
					maxParallel = batchResult.maxParallelDeletions;
				}
			}
			
			// End the deletion session
			await quotaStore.endDeletionSession();
			
			// After all deletions, clean up after a short delay
			await new Promise(resolve => setTimeout(resolve, CLEANUP_DELAY_MS));
			
			// Remove successfully deleted comments from stores and storage
			if (successIds.length > 0) {
				removeComments(successIds);
				await deleteFromStorage(successIds);
				// Force reload sliding window to refresh the filtered view from database
				await forceReloadSlidingWindow();
			}
			
			// Mark failed comments with their error messages (keep them in the store)
			// and move them to the bottom of the queue so users can review them
			for (const failedItem of failedItems) {
				setDeleteError(failedItem.id, failedItem.error);
			}
			
			// Move all failed comments to the bottom of the queue
			if (failedItems.length > 0) {
				moveToBottomOfQueueBatch(failedItems.map(f => f.id));
				// Persist the error information to storage
				await saveComments($comments);
				// Force reload sliding window to make error filtering work correctly
				await forceReloadSlidingWindow();
			}
			
			if (wasCancelled) {
				const remainingCount = $selectedComments.length;
				toasts.warning(`Deletion cancelled. ${successCount} of ${totalCount} comment(s) were deleted before cancellation. ${remainingCount} remain in queue.`);
			} else if (quotaExceeded) {
				const remainingCount = $selectedComments.length;
				toasts.warning(`Quota exhausted after ${successCount} deletion(s). ${remainingCount} remain in queue for when quota resets.`);
			} else if (failedCount > 0) {
				toasts.warning(`Deleted ${successCount} comment(s). ${failedCount} failed and remain in queue with error details. Click on them to see the error.`);
			} else if (quotaLimited) {
				// Some comments weren't attempted due to quota - they stay in queue
				const remainingCount = $selectedComments.length;
				toasts.success(`Deleted ${successCount} comment(s)! ${remainingCount} remain in queue for when quota resets.`);
			} else {
				toasts.success(`Successfully deleted ${successCount} comment(s)!`);
				// Only deselect all if everything was processed and succeeded
				deselectAll();
			}
		} catch (e) {
			error.set(getErrorMessage(e));
			// End deletion session on error
			await quotaStore.endDeletionSession();
		} finally {
			isDeletingInBackground = false;
			backgroundDeleteProgress = undefined;
			deleteStatuses = new Map();
			currentDeletingId = undefined;
			deletionCancelRequested = false; // Reset cancellation flag
			// Sync quota with server to get authoritative value after deletion
			await quotaStore.syncWithServer();
			// Note: We don't deselect all here anymore - failed comments stay selected
			// so users can review them and decide what to do
		}
	}
</script>

<div class="app">
	<header class="header">
		<div class="container header-content">
			<Logo size={36} />
			
			<!-- Navbar stats - only show when we have comments loaded (even if current filter shows 0) -->
			{#if $comments.length > 0}
				<NavbarStats />
			{/if}
			
			<div class="header-actions">
				{#if $isAuthenticated || $comments.length > 0}
					<QuotaProgressBar />
				{/if}
				
				<!-- Data lifetime indicator - show when we have comments -->
				{#if $comments.length > 0}
					<DataLifetimeIndicator />
				{/if}
				
				<!-- YouTube connection status icon - only show when we have comments -->
				{#if $comments.length > 0}
					<YouTubeStatusIcon 
						status={youtubeConnectionStatus} 
						onConnect={() => {
							if (!$apiKey) {
								// Scroll to connect section or show modal
								document.querySelector('.token-connect-banner')?.scrollIntoView({ behavior: 'smooth' });
							}
						}} 
					/>
				{/if}
				
				<!-- Logout button - only show when connected to YouTube API -->
				{#if $apiKey}
					<button class="btn btn-ghost btn-icon-only" onclick={handleLogout} title="Logout from YouTube">
						<svg width="18" height="18" viewBox="0 0 20 20" fill="currentColor">
							<path fill-rule="evenodd" d="M3 3a1 1 0 00-1 1v12a1 1 0 102 0V4a1 1 0 00-1-1zm10.293 9.293a1 1 0 001.414 1.414l3-3a1 1 0 000-1.414l-3-3a1 1 0 10-1.414 1.414L14.586 9H7a1 1 0 100 2h7.586l-1.293 1.293z" clip-rule="evenodd"/>
						</svg>
					</button>
				{/if}
			</div>
		</div>
	</header>

	<main class="main">
		<div class="container">
			{#if $isLoading}
				<div class="loading-section">
					<LoadingSpinner 
						size={80} 
						message="Fetching your comments..." 
						progress={$loadingProgress}
					/>
				</div>
			{:else if !$isAuthenticated && $comments.length === 0}
				<div class="auth-section">
					<div class="hero animate-slide-up">
						<h1>Welcome to <span class="text-gradient">CommentSlash</span></h1>
						<p class="hero-subtitle">
							Find and manage your YouTube comments with precision. Import your comment history,
							filter by date, and clean up your digital footprint!
						</p>
					</div>

					{#if $error}
						<div class="error-message animate-fade-in">
							<svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
								<path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
							</svg>
							<span>{$error}</span>
						</div>
					{/if}

					<div class="import-section animate-fade-in">
						<h2>Import Your Comment History</h2>
						<p class="import-description">
							Upload your Google Takeout export to view and manage all comments you've ever made on YouTube.
						</p>
						
						<!-- svelte-ignore a11y_no_static_element_interactions -->
						<div 
							class="drop-zone"
							class:dragging={isDragging}
							ondrop={handleDrop}
							ondragover={handleDragOver}
							ondragleave={handleDragLeave}
						>
							<input
								type="file"
								accept=".csv,.zip,.json"
								onchange={handleFileSelect}
								bind:this={fileInput}
								class="file-input"
								multiple
							/>
							<div class="drop-zone-content">
								<div class="drop-icon">📦</div>
								<p class="drop-text">
									Drag & drop your export here
								</p>
								<p class="drop-subtext">Supports Google Takeout (<strong>ZIP</strong> or <strong>CSV</strong>) and CommentSlash exports (<strong>JSON</strong>)</p>
								<button class="btn btn-primary" onclick={() => fileInput?.click()}>
									<svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
										<path fill-rule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM6.293 6.707a1 1 0 010-1.414l3-3a1 1 0 011.414 0l3 3a1 1 0 01-1.414 1.414L11 5.414V13a1 1 0 11-2 0V5.414L7.707 6.707a1 1 0 01-1.414 0z" clip-rule="evenodd" />
									</svg>
									Select File(s)
								</button>
							</div>
						</div>

						<p class="security-note">
							🔒 Your data stays private. Files are processed locally in your browser and never uploaded to any server.
						</p>
					</div>

					<TakeoutGuide />
				</div>
			{:else}
				<div class="dashboard">
					<!-- Stale data reminder -->
					<StaleDataReminder />
					
					{#if $error}
						<div class="error-message mb-4">
							<svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
								<path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
							</svg>
							<span>{$error}</span>
							<button class="dismiss-btn" onclick={() => error.set(null)} aria-label="Dismiss error">
								<svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
									<path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
								</svg>
							</button>
						</div>
					{/if}

					<!-- Token connection for delete operations -->
					{#if !$apiKey}
						<div class="token-connect-banner">
							<div class="banner-content">
								<div class="banner-icon">{canQuickRelogin ? '⚡' : '🔑'}</div>
								<div class="banner-text">
									{#if canQuickRelogin}
										<strong>Reconnect to YouTube</strong>
										<p>Your session is still saved. Click to quickly reconnect without signing in again.</p>
									{:else if googleLoginEnabled}
										<strong>Connect your YouTube account to enrich & delete comments</strong>
										<p>Sign in with your Google account to authorize access</p>
									{:else}
										<strong>Connect your YouTube account to enrich & delete comments</strong>
										<p>Enter your OAuth access token to fetch likes, reply counts, and enable deletion</p>
									{/if}
								</div>
							</div>
							{#if canQuickRelogin}
								<div class="banner-form quick-login-form">
									<button 
										class="btn btn-quick-login" 
										onclick={handleQuickRelogin}
										disabled={isQuickReloginLoading}
									>
										{#if isQuickReloginLoading}
											<div class="loading-spinner"></div>
											<span>Reconnecting...</span>
										{:else}
											<svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
												<path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clip-rule="evenodd" />
											</svg>
											<span>Quick Sign In</span>
										{/if}
									</button>
									<button 
										class="btn btn-ghost btn-sm"
										onclick={() => { canQuickRelogin = false; }}
									>
										Full sign in instead
									</button>
								</div>
							{:else if googleLoginEnabled}
								<div class="banner-form">
									<GoogleSignInButton loading={oauthLoading} />
								</div>
							{:else}
								<div class="banner-form">
									<input
										type="password"
										placeholder="Paste your OAuth access token..."
										bind:value={inputApiKey}
										onkeydown={(e) => e.key === 'Enter' && handleConnectToken()}
									/>
									<button class="btn btn-primary" onclick={handleConnectToken}>
										Connect
									</button>
								</div>
							{/if}
						</div>
						{#if !googleLoginEnabled}
							<OAuthGuide />
						{/if}
					{:else if unenrichedCount > 0}
						<div class="enrich-banner">
							<div class="banner-content">
								<div class="banner-icon">✨</div>
								<div class="banner-text">
									<strong>Enrich comments with YouTube data</strong>
									<p>{unenrichedCount} comment(s) need enrichment to show likes and reply counts</p>
								</div>
							</div>
							{#if isEnriching}
								<div class="enrich-progress">
									<LoadingSpinner size={24} message="" />
									<span>{enrichProgress?.enriched || 0} / {enrichProgress?.total || 0}</span>
								</div>
							{:else}
								<button class="btn btn-primary" onclick={handleEnrichComments}>
									<svg width="18" height="18" viewBox="0 0 20 20" fill="currentColor">
										<path d="M5 2a1 1 0 011 1v1h1a1 1 0 010 2H6v1a1 1 0 01-2 0V6H3a1 1 0 010-2h1V3a1 1 0 011-1zm0 10a1 1 0 011 1v1h1a1 1 0 110 2H6v1a1 1 0 11-2 0v-1H3a1 1 0 110-2h1v-1a1 1 0 011-1zM12 2a1 1 0 01.967.744L14.146 7.2 17.5 9.134a1 1 0 010 1.732l-3.354 1.935-1.18 4.455a1 1 0 01-1.933 0L9.854 12.8 6.5 10.866a1 1 0 010-1.732l3.354-1.935 1.18-4.455A1 1 0 0112 2z"/>
									</svg>
									Enrich Comments
								</button>
							{/if}
						</div>
					{:else if unenrichableCount > 0}
						<div class="unenrichable-banner">
							<div class="banner-content">
								<div class="banner-icon">⚠️</div>
								<div class="banner-text">
									<strong>{unenrichableCount} comment(s) couldn't be found via YouTube API</strong>
									<p>These comments may have been deleted externally or are no longer accessible</p>
								</div>
							</div>
							{#if isDeletingInBackground}
								<div class="enrich-progress">
									<LoadingSpinner size={24} message="" />
									<span>{backgroundDeleteProgress?.deleted || 0} / {backgroundDeleteProgress?.total || 0}</span>
								</div>
							{:else}
								<div class="banner-actions">
									<button class="btn btn-secondary btn-sm" onclick={handleDeleteUnenrichableComments} title="Try to delete via YouTube API, then remove from local database">
										Try Delete via API
									</button>
									<button class="btn btn-ghost btn-sm" onclick={handleRemoveUnenrichableFromDatabase} title="Remove from local database without trying API">
										Remove from Database
									</button>
								</div>
							{/if}
						</div>
					{/if}

					<!-- Hidden file input for import -->
					<input
						type="file"
						accept=".json,.zip,.csv"
						onchange={handleImportJson}
						bind:this={importJsonInput}
						class="hidden-input"
					/>

					<FilterPanel 
						{groupByVideo}
						{hideSelectedFromList}
						onGroupByVideoChange={(v) => groupByVideo = v}
						onHideSelectedChange={(v) => hideSelectedFromList = v}
						onExportJson={() => handleExportComments(false)}
						onExportZip={() => handleExportComments(true)}
						onImport={() => importJsonInput?.click()}
						onWipeData={() => showWipeConfirm = true}
					/>

					<div class="dashboard-layout">
						<div class="comments-section">
							<div class="section-header">
								<h2>Your Comments</h2>
								<div class="header-actions">
									<button class="btn btn-ghost" onclick={handleSelectAllFiltered}>
										Select All Visible ({visibleCommentsCount()})
									</button>
								</div>
							</div>

							<div class="comments-scroll-wrapper">
								{#if visibleCommentsCount() === 0 && !$isLoadingWindow}
									<div class="comments-scroll-container">
										{#if allCommentsAreQueued}
											<!-- Show "all queued" banner with animation after delay -->
											{#if showAllQueuedBanner}
												<div class="empty-state all-queued-state">
													<div class="empty-icon">✅</div>
													<h3>All comments are in the queue</h3>
													<p>Uncheck "Hide queued" to see them, or review your slash queue</p>
												</div>
											{/if}
										{:else}
											<!-- Show "no comments found" immediately -->
											<div class="empty-state">
												<div class="empty-icon">🔍</div>
												<h3>No comments found</h3>
												<p>Try adjusting your filters or search query</p>
											</div>
										{/if}
									</div>
								{:else if groupByVideo}
									<div class="comments-scroll-container" onscroll={handleGroupedViewScroll}>
										<div class="video-groups">
											{#each groupedComments() as group (group.videoId)}
												{#if group.comments.length >= 2}
													<!-- Show grouped container for videos with 2+ comments -->
													<VideoGroup 
														videoId={group.videoId}
														videoTitle={group.videoTitle}
														videoChannelId={group.videoChannelId}
														videoChannelTitle={group.videoChannelTitle}
														comments={group.comments}
														hideSelectedComments={hideSelectedFromList}
														onRemoveFromDatabase={handleRemoveFromDatabase}
													/>
												{:else}
													<!-- Show individual card for videos with single comment -->
													{#each group.comments as comment (comment.id)}
														<CommentCard 
															{comment} 
															hideWhenSelected={hideSelectedFromList} 
															onRemoveFromDatabase={handleRemoveFromDatabase}
														/>
													{/each}
												{/if}
											{/each}
										</div>
									</div>
								{:else}
									<!-- Use virtualized list with sliding window for non-grouped view -->
									<VirtualizedCommentList 
										comments={$windowedComments}
										hideWhenSelected={hideSelectedFromList}
										onRemoveFromDatabase={handleRemoveFromDatabase}
									/>
								{/if}
								{#if $isLoadingWindow}
									<div class="loading-indicator">
										<LoadingSpinner size={20} message="Loading more comments..." />
									</div>
								{/if}
							</div>
						</div>

						<!-- svelte-ignore a11y_click_events_have_key_events -->
						<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
						<aside 
							class="sidebar" 
							class:sidebar-expanded={showMobileSidebar} 
							class:has-items={$selectedComments.length > 0} 
							class:sidebar-peeking={isNearRightEdge || isDraggingComment}
							onclick={(e) => {
								// Only handle click when peeking and not expanded
								if ((isNearRightEdge || isDraggingComment) && !showMobileSidebar) {
									e.stopPropagation();
									showMobileSidebar = true;
								}
							}}
						>
							<button 
								class="sidebar-toggle" 
								onclick={(e) => { e.stopPropagation(); showMobileSidebar = !showMobileSidebar; }}
								aria-label={showMobileSidebar ? 'Close slash queue' : 'Open slash queue'}
								aria-expanded={showMobileSidebar}
							>
								<span class="queue-badge" class:has-count={$selectedComments.length > 0}>{$selectedComments.length}</span>
								<svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor" class:flipped={showMobileSidebar}>
									<path fill-rule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clip-rule="evenodd"/>
								</svg>
							</button>
							<div class="sidebar-content">
								<SelectedCommentsPanel 
									onDeleteRequest={() => showDeleteModal = true}
									onCancelDelete={handleCancelDelete}
									isDeleting={isDeletingInBackground}
									deleteProgress={{
										currentId: currentDeletingId,
										statuses: deleteStatuses,
										deleted: backgroundDeleteProgress?.deleted,
										total: backgroundDeleteProgress?.total
									}}
									isConnected={!!$apiKey}
									quotaExhausted={$quotaRemaining.isExhausted}
								/>
							</div>
						</aside>
						
						<!-- Mobile sidebar overlay -->
						{#if showMobileSidebar}
							<!-- svelte-ignore a11y_click_events_have_key_events -->
							<!-- svelte-ignore a11y_no_static_element_interactions -->
							<div class="sidebar-overlay" onclick={() => showMobileSidebar = false} onkeydown={(e) => e.key === 'Escape' && (showMobileSidebar = false)}></div>
						{/if}
					</div>
				</div>
			{/if}
		</div>
	</main>

	<footer class="footer">
		<div class="container">
			<div class="footer-content">
				{#if enableLegal}
					<div class="footer-links">
						<a href="/legal/privacy">Privacy Policy</a>
						<span class="footer-separator">•</span>
						<a href="/legal/terms">Terms of Service</a>
						{#if enableImpressum}
							<span class="footer-separator">•</span>
							<a href="/legal/impressum">Impressum</a>
						{/if}
					</div>
				{:else}
					<p>CommentSlash — Destroy your YouTube comments with precision ⚔️✨</p>
				{/if}
			</div>
		</div>
	</footer>
</div>

{#if showDeleteModal}
	<DeleteConfirmModal
		comments={$selectedComments}
		{isDeleting}
		{deleteProgress}
		onConfirm={handleDeleteConfirm}
		onCancel={() => showDeleteModal = false}
		isConnected={!!$apiKey}
	/>
{/if}

{#if showLogoutModal}
	<LogoutConfirmModal
		{hasRefreshToken}
		onConfirm={handleLogoutConfirm}
		onCancel={() => showLogoutModal = false}
	/>
{/if}

{#if showCleanLeaveConfirm}
	<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
	<!-- svelte-ignore a11y_interactive_supports_focus -->
	<div class="modal-overlay" onclick={() => showCleanLeaveConfirm = false} onkeydown={(e) => e.key === 'Escape' && (showCleanLeaveConfirm = false)} role="dialog" aria-modal="true">
		<!-- svelte-ignore a11y_click_events_have_key_events -->
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div class="modal-content wipe-modal" onclick={(e) => e.stopPropagation()}>
			<div class="modal-header">
				<h3>🗑️ Clean & Leave?</h3>
			</div>
			<div class="modal-body">
				<p>This will permanently delete all data from your browser and log you out.</p>
				<p class="modal-note">Your comments on YouTube will NOT be affected. This only clears your local data.</p>
			</div>
			<div class="modal-actions">
				<button class="btn btn-ghost" onclick={() => showCleanLeaveConfirm = false}>Cancel</button>
				<button class="btn btn-danger" onclick={handleCleanLeave}>Clean & Leave</button>
			</div>
		</div>
	</div>
{/if}

{#if showWipeConfirm}
	<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
	<!-- svelte-ignore a11y_interactive_supports_focus -->
	<div class="modal-overlay" onclick={() => showWipeConfirm = false} onkeydown={(e) => e.key === 'Escape' && (showWipeConfirm = false)} role="dialog" aria-modal="true">
		<!-- svelte-ignore a11y_click_events_have_key_events -->
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div class="modal-content wipe-modal" onclick={(e) => e.stopPropagation()}>
			<div class="modal-header">
				<h3>⚠️ Wipe All Data?</h3>
			</div>
			<div class="modal-body">
				<p>This will permanently delete all cached comment data from your browser.</p>
				<p class="modal-note">Your quota usage will be preserved. You can re-import your Google Takeout files after wiping.</p>
			</div>
			<div class="modal-actions">
				<button class="btn btn-ghost" onclick={() => showWipeConfirm = false}>Cancel</button>
				<button class="btn btn-danger" onclick={handleWipeData}>Wipe All Data</button>
			</div>
		</div>
	</div>
{/if}

<ToastContainer />
<CookieConsent enabled={enableCookieConsent} showLegalLinks={enableLegal} />

<style>
	/* 
	 * Safari-compatible viewport heights using progressive enhancement.
	 * Older browsers use 100vh, modern browsers override with 100dvh.
	 * This pattern works because browsers ignore properties they don't understand,
	 * and later declarations override earlier ones.
	 */
	:global(:root) {
		--app-height: 100vh; /* Fallback for older browsers */
		--app-height: 100dvh; /* Dynamic viewport height for modern browsers (Safari, mobile) */
	}

	.app {
		height: var(--app-height);
		min-height: var(--app-height);
		max-height: var(--app-height);
		display: flex;
		flex-direction: column;
	}

	.header {
		position: sticky;
		top: 0;
		z-index: 100;
		background: rgba(15, 15, 26, 0.95);
		backdrop-filter: blur(12px);
		-webkit-backdrop-filter: blur(12px);
		border-bottom: 1px solid var(--bg-tertiary);
		flex-shrink: 0;
	}

	.header-content {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding-top: 1rem;
		padding-bottom: 1rem;
	}

	.header-actions {
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}

	.main {
		flex: 1 1 0;
		display: flex;
		flex-direction: column;
		min-height: 0; /* Critical for flex children to shrink properly */
		padding: 1rem 0;
	}

	.main > .container {
		flex: 1 1 0;
		display: flex;
		flex-direction: column;
		min-height: 0; /* Allow shrinking */
		width: 100%; /* Override margin:auto from global .container to ensure full width */
	}

	.loading-section {
		display: flex;
		justify-content: center;
		align-items: center;
		min-height: 60vh;
	}

	.auth-section {
		max-width: 700px;
		margin: 0 auto;
		overflow-y: auto;
	}

	.hero {
		text-align: center;
		margin-bottom: 1.5rem;
	}

	.hero h1 {
		font-size: 2.5rem;
		font-weight: 800;
		color: var(--text-primary);
		margin-bottom: 1rem;
		line-height: 1.2;
	}

	.hero-subtitle {
		font-size: 1.1rem;
		color: var(--text-secondary);
		max-width: 500px;
		margin: 0 auto;
		line-height: 1.6;
	}

	.error-message {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 1rem;
		background: rgba(239, 68, 68, 0.1);
		border: 1px solid rgba(239, 68, 68, 0.2);
		border-radius: var(--radius-md);
		color: var(--error);
		font-size: 0.9rem;
		margin-bottom: 1rem;
	}

	.error-message svg {
		flex-shrink: 0;
	}

	.error-message span {
		flex: 1;
	}

	.dismiss-btn {
		background: transparent;
		color: var(--error);
		padding: 0.25rem;
	}

	.dismiss-btn:hover {
		background: rgba(239, 68, 68, 0.1);
		border-radius: 50%;
	}

	.mb-4 {
		margin-bottom: 1rem;
	}

	.security-note {
		text-align: center;
		font-size: 0.8rem;
		color: var(--text-muted);
		line-height: 1.5;
	}

	.dashboard {
		flex: 1 1 0;
		display: flex;
		flex-direction: column;
		min-height: 0;
		/* Ensure consistent layout width when scrollbar appears/disappears */
		scrollbar-gutter: stable;
	}

	.dashboard-layout {
		display: grid;
		/* Use minmax with actual minimum to prevent shrinking below content width */
		grid-template-columns: minmax(300px, 1fr) 350px;
		gap: 1.5rem;
		flex: 1 1 0;
		min-height: 0;
		position: relative;
		/* Prevent layout from shrinking when content is empty */
		width: 100%;
	}

	.comments-section {
		min-width: 0;
		min-height: 0;
		display: flex;
		flex-direction: column;
		/* Prevent layout collapse when content is empty */
		width: 100%;
		/* Force grid item to maintain its track width */
		overflow: hidden;
	}

	.comments-scroll-wrapper {
		position: relative;
		flex: 1 1 0;
		min-height: 0;
		display: flex;
		flex-direction: column;
		/* Ensure wrapper maintains full width even when content is empty */
		width: 100%;
	}
	
	.loading-indicator {
		position: sticky;
		bottom: 0;
		left: 0;
		right: 0;
		padding: 1rem;
		text-align: center;
		background: linear-gradient(to top, var(--bg-primary) 50%, transparent);
		z-index: 10;
	}

	.comments-scroll-container {
		flex: 1 1 0;
		overflow-y: auto;
		overflow-x: hidden;
		padding-right: 0.5rem;
		padding-bottom: 1rem;
		padding-top: 0.5rem;
		/* Smooth scrolling for better UX */
		scroll-behavior: smooth;
		-webkit-overflow-scrolling: touch;
		/* Always reserve scrollbar space to prevent layout shift */
		width: 100%;
		scrollbar-gutter: stable;
	}

	.section-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 1rem;
		flex-shrink: 0;
	}

	.section-header h2 {
		font-size: 1.25rem;
		font-weight: 700;
		color: var(--text-primary);
	}

	.sidebar {
		display: flex;
		flex-direction: column;
		min-height: 0;
		position: relative;
		border-radius: var(--radius-xl);
		overflow: hidden;
	}

	.sidebar-toggle {
		display: none;
		border: none;
		cursor: pointer;
	}

	.queue-badge {
		display: none;
	}

	.sidebar-content {
		flex: 1 1 0;
		min-height: 0;
		display: flex;
		flex-direction: column;
	}

	.sidebar-overlay {
		display: none;
	}

	.empty-state {
		text-align: center;
		padding: 4rem 2rem;
		background: var(--bg-card);
		border-radius: var(--radius-lg);
		border: 1px solid var(--bg-tertiary);
		/* Ensure empty state fills the container to prevent layout narrowing */
		flex: 1;
		display: flex;
		flex-direction: column;
		justify-content: center;
		align-items: center;
		/* Prevent container collapse when empty - take full width */
		width: 100%;
		box-sizing: border-box;
	}

	/* Animated "all queued" banner with slide-up and fade-in */
	.empty-state.all-queued-state {
		animation: allQueuedSlideIn 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
		background: linear-gradient(135deg, rgba(34, 197, 94, 0.1) 0%, rgba(99, 102, 241, 0.1) 100%);
		border-color: rgba(34, 197, 94, 0.3);
	}

	@keyframes allQueuedSlideIn {
		0% {
			opacity: 0;
			transform: translateY(20px) scale(0.95);
		}
		100% {
			opacity: 1;
			transform: translateY(0) scale(1);
		}
	}

	.empty-icon {
		font-size: 3rem;
		margin-bottom: 1rem;
		opacity: 0.5;
	}

	.empty-state h3 {
		font-size: 1.25rem;
		font-weight: 600;
		color: var(--text-primary);
		margin-bottom: 0.5rem;
	}

	.empty-state p {
		color: var(--text-muted);
	}

	.footer {
		padding: 0.75rem 0;
		text-align: center;
		color: var(--text-muted);
		font-size: 0.75rem;
		border-top: 1px solid var(--bg-tertiary);
		flex-shrink: 0;
	}

	.footer-content {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.footer-links {
		display: flex;
		justify-content: center;
		gap: 0.5rem;
	}

	.footer-links a {
		color: var(--text-secondary);
		font-size: 0.75rem;
	}

	.footer-links a:hover {
		color: var(--accent-tertiary);
	}

	.footer-separator {
		color: var(--text-muted);
	}

	/* Import section styles */
	.import-section {
		background: var(--bg-card);
		border-radius: var(--radius-xl);
		border: 1px solid var(--bg-tertiary);
		padding: 2rem;
		margin-bottom: 1.5rem;
	}

	.import-section h2 {
		font-size: 1.25rem;
		font-weight: 700;
		color: var(--text-primary);
		margin-bottom: 0.5rem;
		text-align: center;
	}

	.import-description {
		text-align: center;
		color: var(--text-secondary);
		margin-bottom: 1.5rem;
	}

	.drop-zone {
		position: relative;
		border: 2px dashed var(--bg-tertiary);
		border-radius: var(--radius-lg);
		padding: 3rem 2rem;
		text-align: center;
		transition: all 0.3s ease;
		cursor: pointer;
		margin-bottom: 1rem;
	}

	.drop-zone:hover,
	.drop-zone.dragging {
		border-color: var(--accent-primary);
		background: rgba(99, 102, 241, 0.05);
	}

	.drop-zone.dragging {
		transform: scale(1.02);
	}

	.file-input {
		position: absolute;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		opacity: 0;
		cursor: pointer;
	}

	.drop-zone-content {
		pointer-events: none;
	}

	.drop-icon {
		font-size: 3rem;
		margin-bottom: 1rem;
	}

	.drop-text {
		font-size: 1rem;
		color: var(--text-primary);
		margin-bottom: 0.5rem;
	}

	.drop-subtext {
		font-size: 0.875rem;
		color: var(--text-muted);
		margin-bottom: 1rem;
	}

	.drop-zone-content .btn {
		pointer-events: auto;
	}

	/* Token connect banner */
	.token-connect-banner {
		background: linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(139, 92, 246, 0.1) 100%);
		border: 1px solid rgba(99, 102, 241, 0.2);
		border-radius: var(--radius-lg);
		padding: 1.25rem;
		margin-bottom: 1.5rem;
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 1rem;
	}

	.banner-content {
		display: flex;
		align-items: center;
		gap: 1rem;
		flex: 1;
		min-width: 200px;
	}

	.banner-icon {
		font-size: 1.5rem;
	}

	.banner-text strong {
		display: block;
		color: var(--text-primary);
		font-size: 0.95rem;
	}

	.banner-text p {
		color: var(--text-secondary);
		font-size: 0.8rem;
		margin-top: 0.25rem;
	}

	.banner-form {
		display: flex;
		gap: 0.5rem;
		flex-shrink: 0;
	}

	.banner-form input {
		width: 220px;
		padding: 0.5rem 0.75rem;
		font-size: 0.875rem;
	}

	.banner-form .btn {
		padding: 0.5rem 1rem;
		font-size: 0.875rem;
	}

	/* Quick login form and button */
	.quick-login-form {
		flex-direction: column;
		align-items: flex-start;
		gap: 0.75rem;
	}
	
	.btn-quick-login {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
		padding: 0.75rem 1.5rem;
		background: var(--gradient-primary);
		color: white;
		font-weight: 600;
		border: none;
		border-radius: var(--radius-md);
		cursor: pointer;
		transition: all 0.2s ease;
		box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3);
	}
	
	.btn-quick-login:hover:not(:disabled) {
		transform: translateY(-2px);
		box-shadow: 0 6px 16px rgba(99, 102, 241, 0.4);
	}
	
	.btn-quick-login:disabled {
		opacity: 0.7;
		cursor: not-allowed;
		transform: none;
	}
	
	.btn-quick-login .loading-spinner {
		width: 16px;
		height: 16px;
		border: 2px solid rgba(255, 255, 255, 0.3);
		border-top-color: white;
		border-radius: 50%;
		animation: spin 0.8s linear infinite;
	}
	
	@keyframes spin {
		to { transform: rotate(360deg); }
	}

	@media (max-width: 1024px) {
		.dashboard-layout {
			grid-template-columns: 1fr;
		}

		/* Modern glassy sliding sidebar */
		.sidebar {
			position: fixed;
			top: 0;
			right: 0;
			bottom: 0;
			width: 380px;
			max-width: 90vw;
			z-index: 200;
			/* Glassy transparent background */
			background: rgba(15, 15, 26, 0.85);
			backdrop-filter: blur(20px) saturate(180%);
			-webkit-backdrop-filter: blur(20px) saturate(180%);
			/* Slide completely off screen when hidden */
			transform: translateX(100%);
			transition: transform 0.4s cubic-bezier(0.32, 0.72, 0, 1);
			border-left: 1px solid rgba(99, 102, 241, 0.2);
			box-shadow: -8px 0 32px rgba(0, 0, 0, 0.4);
			border-radius: var(--radius-xl) 0 0 var(--radius-xl);
		}
		
		/* Peek effect when there are items but sidebar is closed - minimal peek */
		.sidebar.has-items:not(.sidebar-expanded):not(.sidebar-peeking) {
			transform: translateX(calc(100% - 8px));
		}
		
		/* Larger peek when mouse is near right edge or dragging a comment */
		.sidebar.sidebar-peeking:not(.sidebar-expanded) {
			transform: translateX(calc(100% - 80px));
			cursor: pointer;
		}
		
		/* Fully expanded state */
		.sidebar.sidebar-expanded {
			transform: translateX(0);
		}

		/* Toggle button - minimal design that becomes more visible when peeking */
		.sidebar-toggle {
			display: flex;
			align-items: center;
			justify-content: center;
			gap: 0.35rem;
			position: absolute;
			left: -40px;
			top: 50%;
			transform: translateY(-50%);
			width: auto;
			min-width: 40px;
			height: 72px;
			padding: 0 0.5rem;
			/* Glassy toggle button */
			background: rgba(99, 102, 241, 0.1);
			backdrop-filter: blur(12px);
			-webkit-backdrop-filter: blur(12px);
			border: 1px solid rgba(99, 102, 241, 0.2);
			border-right: none;
			border-radius: 12px 0 0 12px;
			cursor: pointer;
			color: var(--text-secondary);
			flex-direction: column;
			transition: all 0.3s cubic-bezier(0.32, 0.72, 0, 1);
			z-index: 1;
			box-shadow: -2px 0 12px rgba(0, 0, 0, 0.2);
		}
		
		/* Hide toggle button when sidebar is peeking - the visible sidebar itself is clickable */
		.sidebar.sidebar-peeking:not(.sidebar-expanded) .sidebar-toggle {
			opacity: 0;
			pointer-events: none;
		}
		
		.sidebar-toggle:hover {
			background: rgba(99, 102, 241, 0.2);
			border-color: rgba(99, 102, 241, 0.4);
			color: var(--text-primary);
			transform: translateY(-50%) translateX(-4px);
		}
		
		.sidebar-toggle:focus-visible {
			outline: 2px solid var(--accent-primary);
			outline-offset: 2px;
		}

		.sidebar-toggle svg {
			transition: transform 0.3s ease, opacity 0.3s ease;
			flex-shrink: 0;
			opacity: 0.6;
		}

		.sidebar-toggle svg.flipped {
			transform: rotate(180deg);
		}
		
		.sidebar-toggle:hover svg {
			opacity: 1;
		}

		/* Queue badge - only show when there are items */
		.queue-badge {
			display: none;
			background: var(--gradient-primary);
			color: white;
			font-size: 0.75rem;
			font-weight: 700;
			padding: 0.2rem 0.6rem;
			border-radius: 9999px;
			min-width: 22px;
			text-align: center;
			box-shadow: 0 2px 8px rgba(99, 102, 241, 0.4);
			animation: badgePulse 2s ease-in-out infinite;
		}
		
		.queue-badge.has-count {
			display: inline-block;
		}
		
		@keyframes badgePulse {
			0%, 100% { box-shadow: 0 2px 8px rgba(99, 102, 241, 0.4); }
			50% { box-shadow: 0 2px 16px rgba(99, 102, 241, 0.6); }
		}

		/* Sidebar content - no left margin since toggle is outside */
		.sidebar-content {
			height: 100%;
			min-height: 0;
			display: flex;
			flex-direction: column;
		}

		/* Overlay with smooth fade */
		.sidebar-overlay {
			display: block;
			position: fixed;
			inset: 0;
			background: rgba(0, 0, 0, 0.6);
			backdrop-filter: blur(4px);
			-webkit-backdrop-filter: blur(4px);
			z-index: 150;
			animation: overlayFadeIn 0.3s ease forwards;
		}

		@keyframes overlayFadeIn {
			from { 
				opacity: 0;
				backdrop-filter: blur(0px);
				-webkit-backdrop-filter: blur(0px);
			}
			to { 
				opacity: 1;
				backdrop-filter: blur(4px);
				-webkit-backdrop-filter: blur(4px);
			}
		}
	}

	@media (max-width: 640px) {
		.hero h1 {
			font-size: 1.75rem;
		}

		.hero-subtitle {
			font-size: 1rem;
		}

		.token-connect-banner {
			flex-direction: column;
			align-items: stretch;
		}

		.banner-form {
			flex-direction: column;
		}

		.banner-form input {
			width: 100%;
		}
	}

	/* Enrich banner */
	.enrich-banner {
		background: linear-gradient(135deg, rgba(34, 197, 94, 0.1) 0%, rgba(59, 130, 246, 0.1) 100%);
		border: 1px solid rgba(34, 197, 94, 0.2);
		border-radius: var(--radius-lg);
		padding: 1.25rem;
		margin-bottom: 1.5rem;
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 1rem;
	}

	/* Unenrichable banner */
	.unenrichable-banner {
		background: linear-gradient(135deg, rgba(251, 191, 36, 0.1) 0%, rgba(239, 68, 68, 0.1) 100%);
		border: 1px solid rgba(251, 191, 36, 0.2);
		border-radius: var(--radius-lg);
		padding: 1.25rem;
		margin-bottom: 1.5rem;
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 1rem;
	}

	.banner-actions {
		display: flex;
		gap: 0.5rem;
		flex-wrap: wrap;
	}

	.btn-sm {
		padding: 0.4rem 0.75rem;
		font-size: 0.8rem;
	}

	.enrich-progress {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		color: var(--text-secondary);
		font-size: 0.9rem;
	}

	.hidden-input {
		display: none;
	}

	/* Icon-only button style for navbar */
	.btn-icon-only {
		padding: 0.5rem;
	}

	/* 
	 * Video groups spacing - 1rem gap creates visual separation between 
	 * grouped video containers and standalone comment cards.
	 */
	.video-groups {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}
	
	@media (max-width: 640px) {

		.enrich-banner {
			flex-direction: column;
			align-items: stretch;
		}
	}

	/* Wipe confirmation modal */
	.modal-overlay {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.7);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 1000;
		backdrop-filter: blur(4px);
	}

	.modal-content {
		background: var(--bg-card);
		border-radius: var(--radius-xl);
		border: 1px solid var(--bg-tertiary);
		max-width: 400px;
		width: 90%;
		padding: 1.5rem;
		box-shadow: var(--shadow-lg);
	}

	.modal-header h3 {
		font-size: 1.25rem;
		font-weight: 700;
		color: var(--text-primary);
		margin-bottom: 1rem;
	}

	.modal-body {
		margin-bottom: 1.5rem;
	}

	.modal-body p {
		color: var(--text-secondary);
		margin-bottom: 0.5rem;
	}

	.modal-note {
		font-size: 0.85rem;
		color: var(--text-muted);
	}

	.modal-actions {
		display: flex;
		gap: 0.75rem;
		justify-content: flex-end;
	}
</style>
