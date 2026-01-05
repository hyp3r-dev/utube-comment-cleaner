<script lang="ts">
	import { selectedComments, selectedIds, deselectComment, deselectAll, selectComment } from '$lib/stores/comments';
	import { queueWindowedComments, initializeQueueWindow, handleQueueScroll, updateQueueWindow } from '$lib/stores/queueWindow';
	import { pendingQuota, calculateDeleteQuotaCost, QUOTA_COSTS } from '$lib/stores/quota';
	import type { YouTubeComment } from '$lib/types/comment';
	import { truncateText } from '$lib/utils/formatting';
	import ShurikenIcon from './ShurikenIcon.svelte';
	import { onMount } from 'svelte';
	
	// Delete result for each comment
	type DeleteStatus = 'pending' | 'deleting' | 'success' | 'failed';
	
	let {
		onDeleteRequest,
		isDeleting = false,
		deleteProgress,
		isConnected = true
	}: {
		onDeleteRequest?: () => void;
		isDeleting?: boolean;
		deleteProgress?: { 
			currentId?: string;
			statuses: Map<string, { status: DeleteStatus; error?: string }>;
		};
		isConnected?: boolean;
	} = $props();

	let isDragOver = $state(false);
	let isMinimized = $state(false);
	let isHoveringDelete = $state(false);
	let expandedErrorId = $state<string | null>(null);
	
	// Animation duration constants (must match CSS animations)
	const SLIDE_IN_DURATION_MS = 400;  // matches slideInFromLeft animation (0.35s + easing buffer)
	const SLIDE_OUT_DURATION_MS = 350; // matches slideOutToLeft animation (0.35s)
	
	// Track new items for slide-in animation
	let newItemIds = $state<Set<string>>(new Set());
	let removingIds = $state<Set<string>>(new Set());
	
	// Track when items are added (use non-reactive variable to avoid infinite loop)
	let prevIds: Set<string> = new Set();
	
	// Initialize queue window on mount and when selection changes significantly
	onMount(() => {
		initializeQueueWindow();
	});
	
	$effect(() => {
		const currentIds = new Set($selectedComments.map(c => c.id));
		const added = [...currentIds].filter(id => !prevIds.has(id));
		
		// Mark new items for animation
		if (added.length > 0) {
			newItemIds = new Set([...newItemIds, ...added]);
			// Clear animation flag after animation completes
			setTimeout(() => {
				newItemIds = new Set([...newItemIds].filter(id => !added.includes(id)));
			}, SLIDE_IN_DURATION_MS);
		}
		
		// Update queue window when selection changes
		updateQueueWindow();
		
		prevIds = currentIds;
	});
	
	// Queue search state
	let showQueueSearch = $state(false);
	let queueSearchQuery = $state('');
	let queueSearchInput: HTMLInputElement;
	
	// Filter WINDOWED comments by search query (not all selected comments)
	const filteredQueueComments = $derived(() => {
		if (!queueSearchQuery.trim()) return $queueWindowedComments;
		const query = queueSearchQuery.toLowerCase().trim();
		return $queueWindowedComments.filter(c => 
			c.textOriginal.toLowerCase().includes(query) ||
			c.videoTitle?.toLowerCase().includes(query)
		);
	});
	
	// Track scroll position for lazy loading
	let queueScrollContainer: HTMLDivElement | undefined;
	let scrollTimeout: ReturnType<typeof setTimeout> | null = null;
	
	function handleQueueScrollEvent(e: Event) {
		const target = e.target as HTMLDivElement;
		
		if (scrollTimeout) {
			clearTimeout(scrollTimeout);
		}
		
		scrollTimeout = setTimeout(() => {
			// Calculate scroll index (approximate)
			const scrollTop = target.scrollTop;
			const itemHeight = 120; // Approximate height of queue item
			const scrollIndex = Math.floor(scrollTop / itemHeight);
			
			// Only report if changed significantly
			handleQueueScroll(scrollIndex);
		}, 16); // ~60fps
	}
	
	// Handle removing a single comment with animation
	function handleRemoveWithAnimation(commentId: string) {
		removingIds = new Set([...removingIds, commentId]);
		setTimeout(() => {
			deselectComment(commentId);
			removingIds = new Set([...removingIds].filter(id => id !== commentId));
		}, SLIDE_OUT_DURATION_MS);
	}
	
	// Handle clearing all with animation
	function handleClearAllWithAnimation() {
		const allIds = $selectedComments.map(c => c.id);
		removingIds = new Set(allIds);
		setTimeout(() => {
			deselectAll();
			removingIds = new Set();
		}, SLIDE_OUT_DURATION_MS);
	}

	function handleDragOver(e: DragEvent) {
		e.preventDefault();
		e.dataTransfer!.dropEffect = 'move';
		isDragOver = true;
	}

	function handleDragLeave() {
		isDragOver = false;
	}

	function handleDrop(e: DragEvent) {
		e.preventDefault();
		isDragOver = false;
		
		// Get the comment ID from the drag data
		const commentId = e.dataTransfer?.getData('text/plain');
		if (commentId) {
			selectComment(commentId);
		}
	}
	
	function handleDeleteHoverStart() {
		isHoveringDelete = true;
		const cost = calculateDeleteQuotaCost($selectedComments.length);
		pendingQuota.set(cost);
	}
	
	function handleDeleteHoverEnd() {
		isHoveringDelete = false;
		pendingQuota.set(0);
	}
	
	function getCommentStatus(commentId: string): DeleteStatus {
		if (!deleteProgress) return 'pending';
		return deleteProgress.statuses.get(commentId)?.status || 'pending';
	}
	
	function getCommentError(commentId: string): string | undefined {
		if (!deleteProgress) return undefined;
		return deleteProgress.statuses.get(commentId)?.error;
	}
	
	function toggleErrorExpand(commentId: string) {
		if (expandedErrorId === commentId) {
			expandedErrorId = null;
		} else {
			expandedErrorId = commentId;
		}
	}
	
	function hasDeleteError(comment: YouTubeComment): boolean {
		return !!comment.lastDeleteError;
	}

	const totalLikes = $derived($selectedComments.reduce((sum, c) => sum + c.likeCount, 0));
	const deleteCost = $derived(calculateDeleteQuotaCost($selectedComments.length));
</script>

<div 
	class="selected-panel" 
	class:drag-over={isDragOver}
	class:minimized={isMinimized}
	class:has-items={$selectedComments.length > 0}
	ondragover={handleDragOver}
	ondragleave={handleDragLeave}
	ondrop={handleDrop}
	role="region"
	aria-label="Selected comments for deletion"
>
	<div class="panel-header">
		<div class="header-content">
			<div class="header-icon">
				<ShurikenIcon size={24} animate={true} />
			</div>
			<div class="header-text">
				<h3>Slash Queue</h3>
				<p>{$selectedComments.length} comment{$selectedComments.length !== 1 ? 's' : ''} selected</p>
			</div>
		</div>
		
		<!-- Search button - only show when there are comments -->
		{#if $selectedComments.length > 0}
			<button 
				class="search-queue-btn" 
				class:active={showQueueSearch}
				onclick={() => {
					showQueueSearch = !showQueueSearch;
					if (showQueueSearch) {
						setTimeout(() => queueSearchInput?.focus(), 100);
					} else {
						queueSearchQuery = '';
					}
				}}
				title="Search in queue"
			>
				<svg width="18" height="18" viewBox="0 0 20 20" fill="currentColor">
					<path fill-rule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clip-rule="evenodd" />
				</svg>
			</button>
		{/if}
	</div>
	
	<!-- Queue search input -->
	{#if showQueueSearch && $selectedComments.length > 0}
		<div class="queue-search-bar">
			<input
				type="text"
				placeholder="Search queue..."
				bind:value={queueSearchQuery}
				bind:this={queueSearchInput}
				class="queue-search-input"
			/>
			{#if queueSearchQuery}
				<button class="queue-search-clear" onclick={() => queueSearchQuery = ''} aria-label="Clear search">
					<svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor">
						<path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
					</svg>
				</button>
			{/if}
			{#if queueSearchQuery}
				<span class="queue-search-count">{filteredQueueComments().length} found</span>
			{/if}
		</div>
	{/if}

	{#if !isMinimized}
		<div class="panel-body">
			{#if $selectedComments.length === 0}
				<div class="drop-zone">
					<div class="drop-icon animate-bounce">
						<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
							<path d="M19 14l-7 7m0 0l-7-7m7 7V3" stroke-linecap="round" stroke-linejoin="round"/>
						</svg>
					</div>
					<p>Drag comments here to mark for deletion</p>
					<span class="hint">Or click the circle button on each comment to add them</span>
				</div>
			{:else}
				<div 
					class="selected-list"
					bind:this={queueScrollContainer}
					onscroll={handleQueueScrollEvent}
				>
					{#each filteredQueueComments() as comment (comment.id)}
						{@const status = getCommentStatus(comment.id)}
						{@const hasError = hasDeleteError(comment)}
						{@const isExpanded = expandedErrorId === comment.id}
						{@const isNew = newItemIds.has(comment.id)}
						{@const isRemoving = removingIds.has(comment.id)}
						<div 
							class="selected-item" 
							class:deleting={status === 'deleting'}
							class:success={status === 'success'}
							class:failed={status === 'failed'}
							class:has-error={hasError}
							class:expanded={isExpanded}
							class:slide-in={isNew}
							class:slide-out={isRemoving}
						>
							<!-- svelte-ignore a11y_click_events_have_key_events -->
							<!-- svelte-ignore a11y_no_static_element_interactions -->
							<div 
								class="item-main"
								class:clickable={hasError}
								onclick={() => hasError && toggleErrorExpand(comment.id)}
							>
								<div class="item-content">
									<p class="item-text">{truncateText(comment.textOriginal, 60)}</p>
									<div class="item-meta">
										<span class="likes">❤️ {comment.likeCount}</span>
										<span class="chars">{comment.textOriginal.length} chars</span>
										{#if hasError}
											<span class="error-badge">❌ Error</span>
										{/if}
									</div>
								</div>
								
								<!-- Status indicator -->
								{#if status === 'deleting'}
									<div class="status-icon deleting">
										<svg class="spinner" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
											<circle cx="12" cy="12" r="10" stroke-opacity="0.25"/>
											<path d="M12 2a10 10 0 0 1 10 10" stroke-linecap="round"/>
										</svg>
									</div>
								{:else if status === 'success'}
									<div class="status-icon success">
										<svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
											<path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/>
										</svg>
									</div>
								{:else if status === 'failed'}
									<div class="status-icon failed" title={getCommentError(comment.id) || 'Delete failed'}>
										<svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
											<path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"/>
										</svg>
									</div>
								{:else if hasError}
									<div class="expand-icon" class:expanded={isExpanded}>
										<svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
											<path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd"/>
										</svg>
									</div>
								{:else if !isDeleting}
									<button 
										class="remove-btn" 
										onclick={(e) => { e.stopPropagation(); handleRemoveWithAnimation(comment.id); }}
										title="Remove from queue"
									>
										<svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
											<path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
										</svg>
									</button>
								{/if}
							</div>
							
							<!-- Error details section (expandable) -->
							{#if hasError && isExpanded}
								<div class="error-details">
									<div class="error-message">
										<span class="error-label">Error:</span>
										<span class="error-text">{comment.lastDeleteError}</span>
									</div>
									{#if comment.lastDeleteAttempt}
										<div class="error-time">
											Last attempt: {new Date(comment.lastDeleteAttempt).toLocaleString()}
										</div>
									{/if}
									<button 
										class="btn btn-sm btn-ghost remove-from-queue-btn"
										onclick={(e) => { e.stopPropagation(); handleRemoveWithAnimation(comment.id); }}
									>
										Remove from queue
									</button>
								</div>
							{/if}
						</div>
					{/each}
				</div>

				<div class="summary">
					<div class="summary-stats">
						<div class="stat">
							<span class="stat-value">{$selectedComments.length}</span>
							<span class="stat-label">Comments</span>
						</div>
						<div class="stat">
							<span class="stat-value">{totalLikes}</span>
							<span class="stat-label">Total Likes</span>
						</div>
					</div>
				</div>
			{/if}
		</div>

		{#if $selectedComments.length > 0}
			<div class="panel-footer">
				<button class="btn btn-ghost" onclick={handleClearAllWithAnimation} disabled={isDeleting}>
					Clear All
				</button>
				{#if isConnected}
					<button 
						class="btn btn-danger delete-btn" 
						onclick={onDeleteRequest}
						onmouseenter={handleDeleteHoverStart}
						onmouseleave={handleDeleteHoverEnd}
						onfocus={handleDeleteHoverStart}
						onblur={handleDeleteHoverEnd}
						disabled={isDeleting}
					>
						<ShurikenIcon size={18} className="delete-shuriken" />
						<span class="btn-text">
							Slash Selected
							<span class="quota-cost">({deleteCost} quota)</span>
						</span>
					</button>
				{:else}
					<button 
						class="btn btn-disabled delete-btn-disabled" 
						onclick={onDeleteRequest}
						title="Connect to YouTube to slash comments"
					>
						<ShurikenIcon size={18} className="delete-shuriken-disabled" />
						<span class="btn-text">
							Login Required
						</span>
					</button>
				{/if}
			</div>
		{/if}
	{/if}
</div>

<style>
	.selected-panel {
		background: var(--bg-card);
		border: 2px dashed var(--bg-tertiary);
		border-radius: var(--radius-xl);
		overflow: hidden;
		transition: all 0.3s ease;
		display: flex;
		flex-direction: column;
		height: 100%;
	}

	.selected-panel.has-items {
		border-style: solid;
		border-color: var(--accent-primary);
	}

	.selected-panel.drag-over {
		border-color: var(--accent-tertiary);
		background: rgba(99, 102, 241, 0.1);
		box-shadow: 0 0 20px rgba(99, 102, 241, 0.3);
		transform: scale(1.02);
	}

	.selected-panel.minimized {
		min-height: auto;
		max-height: none;
	}

	.panel-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 1rem 1.25rem;
		background: var(--bg-tertiary);
		border-bottom: 1px solid var(--bg-hover);
		flex-shrink: 0;
	}

	.header-content {
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}

	.header-icon {
		display: flex;
		align-items: center;
		justify-content: center;
		color: var(--accent-tertiary);
	}

	.header-text h3 {
		font-size: 1rem;
		font-weight: 700;
		color: var(--text-primary);
		margin: 0;
	}

	.header-text p {
		font-size: 0.8rem;
		color: var(--text-secondary);
		margin: 0;
	}

	/* Queue search button */
	.search-queue-btn {
		background: transparent;
		color: var(--text-muted);
		padding: 0.5rem;
		border-radius: 50%;
		transition: all 0.2s ease;
	}

	.search-queue-btn:hover {
		background: var(--bg-hover);
		color: var(--accent-primary);
	}

	.search-queue-btn.active {
		background: rgba(99, 102, 241, 0.2);
		color: var(--accent-primary);
	}

	/* Queue search bar */
	.queue-search-bar {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.5rem 1rem;
		background: var(--bg-secondary);
		border-bottom: 1px solid var(--bg-hover);
		animation: slideDown 0.2s ease;
	}

	@keyframes slideDown {
		from {
			opacity: 0;
			transform: translateY(-10px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	.queue-search-input {
		flex: 1;
		padding: 0.4rem 0.75rem;
		font-size: 0.85rem;
		background: var(--bg-tertiary);
		border: 1px solid var(--bg-hover);
		border-radius: var(--radius-sm);
		color: var(--text-primary);
	}

	.queue-search-input:focus {
		border-color: var(--accent-primary);
		outline: none;
		box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.15);
	}

	.queue-search-clear {
		background: transparent;
		color: var(--text-muted);
		padding: 0.25rem;
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.queue-search-clear:hover {
		background: var(--bg-hover);
		color: var(--error);
	}

	.queue-search-count {
		font-size: 0.75rem;
		color: var(--text-muted);
		white-space: nowrap;
	}

	.panel-body {
		flex: 1;
		overflow-y: auto;
		padding: 1rem;
		min-height: 0;
	}

	.drop-zone {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		height: 100%;
		min-height: 200px;
		text-align: center;
		color: var(--text-muted);
	}

	.drop-icon {
		color: var(--accent-primary);
		opacity: 0.5;
		margin-bottom: 1rem;
	}

	.drop-zone p {
		font-size: 0.95rem;
		font-weight: 500;
		margin-bottom: 0.5rem;
	}

	.drop-zone .hint {
		font-size: 0.8rem;
		opacity: 0.7;
	}

	.selected-list {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.selected-item {
		display: flex;
		flex-direction: column;
		background: var(--bg-tertiary);
		border-radius: var(--radius-md);
		transition: all 0.4s ease;
		position: relative;
		overflow: hidden;
	}

	.item-main {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0.75rem;
	}

	.item-main.clickable {
		cursor: pointer;
	}

	.item-main.clickable:hover {
		background: var(--bg-hover);
	}

	.selected-item:hover {
		background: var(--bg-hover);
	}

	.selected-item.has-error {
		border-left: 3px solid var(--error);
		background: rgba(239, 68, 68, 0.1);
	}

	.selected-item.expanded {
		background: rgba(239, 68, 68, 0.15);
	}

	/* Slide-in animation when item is added to queue */
	.selected-item.slide-in {
		animation: slideInFromLeft 0.35s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
	}

	@keyframes slideInFromLeft {
		0% {
			transform: translateX(-100%);
			opacity: 0;
		}
		100% {
			transform: translateX(0);
			opacity: 1;
		}
	}

	/* Slide-out animation when item is removed from queue */
	.selected-item.slide-out {
		animation: slideOutToLeft 0.35s cubic-bezier(0.36, 0, 0.66, -0.56) forwards;
	}

	@keyframes slideOutToLeft {
		0% {
			transform: translateX(0);
			opacity: 1;
		}
		100% {
			transform: translateX(-100%);
			opacity: 0;
		}
	}

	/* Deleting state - pulsing effect */
	.selected-item.deleting {
		background: rgba(99, 102, 241, 0.2);
		border-left: 3px solid var(--accent-primary);
	}

	/* Success state - swipe right animation */
	.selected-item.success {
		animation: swipeRightSuccess 0.6s ease forwards;
		background: rgba(16, 185, 129, 0.2);
		border-left: 3px solid var(--success);
	}

	/* Failed state - swipe left animation */
	.selected-item.failed {
		animation: swipeLeftFailed 0.6s ease forwards;
		background: rgba(239, 68, 68, 0.2);
		border-left: 3px solid var(--error);
	}

	@keyframes swipeRightSuccess {
		0% {
			transform: translateX(0);
			opacity: 1;
		}
		50% {
			transform: translateX(10px);
			opacity: 1;
		}
		100% {
			transform: translateX(100%);
			opacity: 0;
		}
	}

	@keyframes swipeLeftFailed {
		0% {
			transform: translateX(0);
		}
		15% {
			transform: translateX(-10px);
		}
		30% {
			transform: translateX(5px);
		}
		45% {
			transform: translateX(-5px);
		}
		60% {
			transform: translateX(0);
		}
		100% {
			transform: translateX(0);
		}
	}

	.status-icon {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 24px;
		height: 24px;
		flex-shrink: 0;
	}

	.status-icon.deleting .spinner {
		animation: spin 1s linear infinite;
	}

	@keyframes spin {
		from { transform: rotate(0deg); }
		to { transform: rotate(360deg); }
	}

	.status-icon.success {
		color: var(--success);
		animation: popIn 0.3s ease;
	}

	.status-icon.failed {
		color: var(--error);
		animation: shake 0.4s ease;
	}

	@keyframes popIn {
		0% { transform: scale(0); }
		50% { transform: scale(1.2); }
		100% { transform: scale(1); }
	}

	@keyframes shake {
		0%, 100% { transform: translateX(0); }
		25% { transform: translateX(-5px); }
		75% { transform: translateX(5px); }
	}

	.item-content {
		flex: 1;
		min-width: 0;
	}

	.item-text {
		font-size: 0.85rem;
		color: var(--text-primary);
		margin: 0 0 0.25rem 0;
		line-height: 1.4;
		word-break: break-word;
	}

	.item-meta {
		display: flex;
		gap: 0.75rem;
		font-size: 0.7rem;
		color: var(--text-muted);
		flex-wrap: wrap;
		align-items: center;
	}

	.error-badge {
		color: var(--error);
		font-weight: 600;
		background: rgba(239, 68, 68, 0.2);
		padding: 0.1rem 0.4rem;
		border-radius: var(--radius-sm);
	}

	.expand-icon {
		color: var(--text-muted);
		transition: transform 0.2s ease;
		flex-shrink: 0;
	}

	.expand-icon.expanded {
		transform: rotate(180deg);
	}

	.error-details {
		padding: 0.75rem;
		padding-top: 0;
		background: rgba(239, 68, 68, 0.05);
		border-top: 1px solid rgba(239, 68, 68, 0.2);
		animation: slideDown 0.2s ease;
	}

	@keyframes slideDown {
		from {
			opacity: 0;
			max-height: 0;
		}
		to {
			opacity: 1;
			max-height: 200px;
		}
	}

	.error-message {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		margin-bottom: 0.5rem;
	}

	.error-label {
		font-size: 0.7rem;
		font-weight: 600;
		color: var(--error);
		text-transform: uppercase;
	}

	.error-text {
		font-size: 0.8rem;
		color: var(--text-secondary);
		word-break: break-word;
	}

	.error-time {
		font-size: 0.7rem;
		color: var(--text-muted);
		margin-bottom: 0.5rem;
	}

	.remove-from-queue-btn {
		margin-top: 0.5rem;
		width: 100%;
		justify-content: center;
	}

	.remove-btn {
		background: transparent;
		color: var(--text-muted);
		padding: 0.35rem;
		border-radius: 50%;
		flex-shrink: 0;
		transition: all 0.2s ease;
	}

	.remove-btn:hover {
		background: rgba(239, 68, 68, 0.1);
		color: var(--error);
	}

	.summary {
		margin-top: 1rem;
		padding-top: 1rem;
		border-top: 1px solid var(--bg-tertiary);
	}

	.summary-stats {
		display: flex;
		gap: 1.5rem;
	}

	.stat {
		display: flex;
		flex-direction: column;
	}

	.stat-value {
		font-size: 1.25rem;
		font-weight: 700;
		color: var(--accent-tertiary);
	}

	.stat-label {
		font-size: 0.7rem;
		color: var(--text-muted);
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.panel-footer {
		display: flex;
		justify-content: space-between;
		gap: 0.75rem;
		padding: 1rem 1.25rem;
		background: var(--bg-tertiary);
		border-top: 1px solid var(--bg-hover);
		flex-shrink: 0;
	}

	.delete-btn {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		position: relative;
		overflow: hidden;
	}

	.btn-text {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		line-height: 1.2;
	}

	.quota-cost {
		font-size: 0.65rem;
		opacity: 0.8;
		font-weight: 500;
	}

	/* Shuriken animation on button hover */
	.delete-btn:hover :global(.delete-shuriken) {
		animation: shurikenSpin 0.5s ease-in-out;
	}

	@keyframes shurikenSpin {
		0% {
			transform: rotate(0deg) scale(1);
		}
		50% {
			transform: rotate(180deg) scale(1.1);
		}
		100% {
			transform: rotate(360deg) scale(1);
		}
	}

	.delete-btn::after {
		content: '';
		position: absolute;
		top: 0;
		left: -100%;
		width: 100%;
		height: 100%;
		background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
		transition: left 0.5s ease;
	}

	.delete-btn:hover::after {
		left: 100%;
	}

	/* Disabled button when not connected to YouTube */
	.btn-disabled {
		background: var(--bg-tertiary);
		color: var(--text-muted);
		cursor: not-allowed;
		opacity: 0.7;
	}

	.delete-btn-disabled {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	:global(.delete-shuriken-disabled) {
		opacity: 0.5;
	}

	@media (max-width: 1024px) {
		.selected-panel {
			min-height: 100%;
			max-height: none;
			/* Glassy transparent look */
			background: transparent;
			border-radius: var(--radius-xl) 0 0 var(--radius-xl);
			border: none;
		}

		.selected-panel.has-items {
			/* Keep consistent look */
			border: none;
		}
		
		.panel-header {
			/* Slightly more opaque header */
			background: rgba(37, 37, 66, 0.6);
			border-bottom: 1px solid rgba(99, 102, 241, 0.2);
		}

		.panel-body {
			max-height: none;
			/* Allow scrolling in the panel */
			flex: 1;
			overflow-y: auto;
		}
		
		.panel-footer {
			background: rgba(37, 37, 66, 0.6);
			border-top: 1px solid rgba(99, 102, 241, 0.2);
		}
	}
</style>
