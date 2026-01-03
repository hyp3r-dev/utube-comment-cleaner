<script lang="ts">
	import { selectedComments, selectedIds, deselectComment, deselectAll, selectComment } from '$lib/stores/comments';
	import { pendingQuota, calculateDeleteQuotaCost, QUOTA_COSTS } from '$lib/stores/quota';
	import type { YouTubeComment } from '$lib/types/comment';
	
	// Delete result for each comment
	type DeleteStatus = 'pending' | 'deleting' | 'success' | 'failed';
	
	let {
		onDeleteRequest,
		isDeleting = false,
		deleteProgress
	}: {
		onDeleteRequest?: () => void;
		isDeleting?: boolean;
		deleteProgress?: { 
			currentId?: string;
			statuses: Map<string, { status: DeleteStatus; error?: string }>;
		};
	} = $props();

	let isDragOver = $state(false);
	let isMinimized = $state(false);
	let isHoveringDelete = $state(false);

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

	function truncateText(text: string, maxLength: number): string {
		if (text.length <= maxLength) return text;
		return text.slice(0, maxLength) + '...';
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
			<div class="header-icon">⚔️</div>
			<div class="header-text">
				<h3>Slash Queue</h3>
				<p>{$selectedComments.length} comment{$selectedComments.length !== 1 ? 's' : ''} selected</p>
			</div>
		</div>
		
		<button 
			class="minimize-btn" 
			onclick={() => isMinimized = !isMinimized}
			title={isMinimized ? 'Expand' : 'Minimize'}
		>
			<svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor" class:rotated={isMinimized}>
				<path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd" />
			</svg>
		</button>
	</div>

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
				<div class="selected-list">
					{#each $selectedComments as comment (comment.id)}
						{@const status = getCommentStatus(comment.id)}
						<div 
							class="selected-item" 
							class:deleting={status === 'deleting'}
							class:success={status === 'success'}
							class:failed={status === 'failed'}
						>
							<div class="item-content">
								<p class="item-text">{truncateText(comment.textOriginal, 60)}</p>
								<div class="item-meta">
									<span class="likes">❤️ {comment.likeCount}</span>
									<span class="chars">{comment.textOriginal.length} chars</span>
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
							{:else if !isDeleting}
								<button 
									class="remove-btn" 
									onclick={() => deselectComment(comment.id)}
									title="Remove from queue"
								>
									<svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
										<path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
									</svg>
								</button>
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
				<button class="btn btn-ghost" onclick={deselectAll} disabled={isDeleting}>
					Clear All
				</button>
				<button 
					class="btn btn-danger delete-btn" 
					onclick={onDeleteRequest}
					onmouseenter={handleDeleteHoverStart}
					onmouseleave={handleDeleteHoverEnd}
					onfocus={handleDeleteHoverStart}
					onblur={handleDeleteHoverEnd}
					disabled={isDeleting}
				>
					<svg width="18" height="18" viewBox="0 0 20 20" fill="currentColor">
						<path d="M3 17 L15 3 L17 5 L5 19 Z" />
						<path d="M13 5 L17 1" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
						<path d="M15 7 L19 3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
					</svg>
					<span class="btn-text">
						Slash Selected
						<span class="quota-cost">({deleteCost} quota)</span>
					</span>
				</button>
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
		font-size: 1.5rem;
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

	.minimize-btn {
		background: transparent;
		color: var(--text-muted);
		padding: 0.5rem;
		border-radius: 50%;
		transition: all 0.2s ease;
	}

	.minimize-btn:hover {
		background: var(--bg-hover);
		color: var(--text-primary);
	}

	.minimize-btn svg {
		transition: transform 0.3s ease;
	}

	.minimize-btn svg.rotated {
		transform: rotate(180deg);
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
		align-items: center;
		gap: 0.75rem;
		padding: 0.75rem;
		background: var(--bg-tertiary);
		border-radius: var(--radius-md);
		transition: all 0.4s ease;
		position: relative;
		overflow: hidden;
	}

	.selected-item:hover {
		background: var(--bg-hover);
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

	.delete-btn {
		position: relative;
		overflow: hidden;
	}

	.delete-btn:hover svg {
		animation: slashWiggle 0.3s ease-in-out;
	}

	@keyframes slashWiggle {
		0%, 100% {
			transform: rotate(0deg);
		}
		25% {
			transform: rotate(-15deg);
		}
		75% {
			transform: rotate(15deg);
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
