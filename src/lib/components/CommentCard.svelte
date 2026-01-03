<script lang="ts">
	import type { YouTubeComment } from '$lib/types/comment';
	import { selectedIds, selectComment } from '$lib/stores/comments';
	
	let { 
		comment,
		isDragging = false,
		onDragStart,
		onDragEnd,
		hideWhenSelected = false,
		onRemoveFromDatabase
	}: { 
		comment: YouTubeComment;
		isDragging?: boolean;
		onDragStart?: () => void;
		onDragEnd?: () => void;
		hideWhenSelected?: boolean;
		onRemoveFromDatabase?: (commentId: string) => void;
	} = $props();

	let isExpanded = $state(false);
	let isSelected = $derived($selectedIds.has(comment.id));
	
	// Hide selected comments when hideWhenSelected is true
	let shouldHide = $derived(hideWhenSelected && isSelected);

	function handleRemoveFromDatabase() {
		if (onRemoveFromDatabase) {
			onRemoveFromDatabase(comment.id);
		}
	}

	function formatDate(dateString: string): string {
		if (!dateString) return 'Unknown date';
		try {
			const date = new Date(dateString);
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
	
	function escapeHtml(text: string): string {
		const div = document.createElement('div');
		div.textContent = text;
		return div.innerHTML;
	}

	function truncateText(text: string, maxLength: number): string {
		if (text.length <= maxLength) return text;
		return text.slice(0, maxLength) + '...';
	}

	function handleCardClick(e: MouseEvent) {
		// Don't toggle selection, just expand/collapse
		e.stopPropagation();
		isExpanded = !isExpanded;
	}
	
	function handleSelectClick(e: MouseEvent) {
		e.stopPropagation();
		selectComment(comment.id);
	}
	
	function handleDragStartWrapper(e: DragEvent) {
		// Set drag data so drop target can identify the comment
		e.dataTransfer?.setData('text/plain', comment.id);
		e.dataTransfer!.effectAllowed = 'move';
		onDragStart?.();
	}
	
	// Check if text is long enough to need expansion
	const needsExpansion = $derived(comment.textDisplay.length > 200 || comment.textOriginal.length > 200);
	
	// Format the display text: escape HTML first for XSS prevention, then convert newlines to <br>
	const displayText = $derived(
		isExpanded 
			? escapeHtml(comment.textDisplay).replace(/\n/g, '<br>')
			: escapeHtml(truncateText(comment.textDisplay.replace(/\n/g, ' '), 200))
	);
</script>

{#if !shouldHide}
<div 
	class="comment-card" 
	class:selected={isSelected}
	class:dragging={isDragging}
	class:expanded={isExpanded}
	draggable="true"
	ondragstart={handleDragStartWrapper}
	ondragend={onDragEnd}
	role="article"
	tabindex="0"
	onclick={handleCardClick}
	onkeydown={(e) => e.key === 'Enter' && handleCardClick(e as unknown as MouseEvent)}
>
	<!-- Slash effect overlay when selected -->
	{#if isSelected}
		<div class="slash-overlay">
			<div class="slash-line"></div>
		</div>
	{/if}
	
	<div class="card-header">
		<button 
			class="select-indicator" 
			onclick={handleSelectClick}
			title={isSelected ? 'Remove from slash queue' : 'Add to slash queue'}
		>
			{#if isSelected}
				<svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
					<path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
				</svg>
			{:else}
				<svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
					<path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm0-2a6 6 0 100-12 6 6 0 000 12z" clip-rule="evenodd" />
				</svg>
			{/if}
		</button>
		
		<div class="badges">
			{#if comment.isEnriched}
				<span class="badge badge-enriched" title="Enriched with YouTube API data">✓ API</span>
			{/if}
			{#if comment.labels?.includes('api_error')}
				<span class="badge badge-error" title={comment.lastDeleteError || 'Delete failed'}>❌ Error</span>
			{/if}
			{#if comment.isUnenrichable}
				<span class="badge badge-warning" title="Could not be enriched via YouTube API">⚠️ Unenrichable</span>
			{/if}
		</div>

		<div class="drag-handle" title="Drag to slash queue">
			<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
				<path d="M4 4h2v2H4V4zm6 0h2v2h-2V4zM4 7h2v2H4V7zm6 0h2v2h-2V7zm-6 3h2v2H4v-2zm6 0h2v2h-2v-2z"/>
			</svg>
		</div>
	</div>

	<div class="card-body">
		<p class="comment-text">{@html displayText}</p>
		
		{#if needsExpansion}
			<button class="expand-btn" onclick={handleCardClick}>
				{isExpanded ? 'Show less' : 'Show more...'}
			</button>
		{/if}
		
		{#if comment.videoTitle}
			<div class="video-info">
				<svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor">
					<path d="M4 4a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2H4zm0 2h12v8H4V6z"/>
					<path d="M8 8l4 2-4 2V8z"/>
				</svg>
				<span>{isExpanded ? comment.videoTitle : truncateText(comment.videoTitle, 40)}</span>
			</div>
		{/if}

		{#if isExpanded && comment.lastDeleteError}
			<div class="error-details">
				<div class="error-info">
					<span class="error-label">❌ Last delete error:</span>
					<span class="error-message">{comment.lastDeleteError}</span>
					{#if comment.lastDeleteAttempt}
						<span class="error-time">(at {formatDate(comment.lastDeleteAttempt)})</span>
					{/if}
				</div>
				{#if onRemoveFromDatabase}
					<button 
						class="remove-from-db-btn" 
						onclick={handleRemoveFromDatabase}
						title="Remove this comment from your local database only (does not delete from YouTube)"
					>
						<svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor">
							<path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd"/>
						</svg>
						Remove from database
					</button>
				{/if}
			</div>
		{/if}
	</div>

	<div class="card-footer">
		<div class="stat" title="Likes">
			<svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
				<path d="M2 10.5a1.5 1.5 0 113 0v6a1.5 1.5 0 01-3 0v-6zM6 10.333v5.43a2 2 0 001.106 1.79l.05.025A4 4 0 008.943 18h5.416a2 2 0 001.962-1.608l1.2-6A2 2 0 0015.56 8H12V4a2 2 0 00-2-2 1 1 0 00-1 1v.667a4 4 0 01-.8 2.4L6.8 7.933a4 4 0 00-.8 2.4z"/>
			</svg>
			<span>{comment.likeCount}</span>
		</div>

		{#if comment.totalReplyCount !== undefined && comment.totalReplyCount > 0}
			<div class="stat" title="Replies">
				<svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
					<path fill-rule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clip-rule="evenodd"/>
				</svg>
				<span>{comment.totalReplyCount}</span>
			</div>
		{/if}

		<div class="stat" title="Character count">
			<svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
				<path fill-rule="evenodd" d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a1 1 0 01-1.581.814L10 14.197l-4.419 2.617A1 1 0 014 16V4z" clip-rule="evenodd"/>
			</svg>
			<span>{comment.textOriginal.length} chars</span>
		</div>

		<div class="date">
			{formatDate(comment.publishedAt)}
		</div>
	</div>
</div>
{/if}

<style>
	.comment-card {
		background: var(--bg-card);
		border: 1px solid var(--bg-tertiary);
		border-radius: var(--radius-lg);
		padding: 1rem;
		cursor: pointer;
		transition: all 0.25s ease;
		position: relative;
		overflow: hidden;
	}

	.comment-card::before {
		content: '';
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		height: 3px;
		background: var(--gradient-primary);
		transform: scaleX(0);
		transition: transform 0.3s ease;
	}

	.comment-card:hover {
		border-color: var(--accent-primary);
		box-shadow: var(--shadow-md);
	}

	.comment-card:hover::before {
		transform: scaleX(1);
	}

	.comment-card.selected {
		border-color: var(--accent-primary);
		background: rgba(99, 102, 241, 0.1);
		box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.3);
	}

	.comment-card.selected::before {
		transform: scaleX(1);
		background: linear-gradient(90deg, #6366f1, #ef4444, #8b5cf6);
	}

	.slash-overlay {
		position: absolute;
		inset: 0;
		pointer-events: none;
		overflow: hidden;
		z-index: 1;
	}

	.slash-line {
		position: absolute;
		top: -50%;
		left: -10%;
		width: 120%;
		height: 2px;
		background: linear-gradient(90deg, transparent, #ef4444, #ef4444, transparent);
		transform: rotate(-15deg);
		animation: slashAcross 0.4s ease-out forwards;
		box-shadow: 0 0 10px #ef4444, 0 0 20px #ef4444;
	}

	@keyframes slashAcross {
		0% {
			top: -50%;
			opacity: 1;
		}
		100% {
			top: 150%;
			opacity: 0;
		}
	}

	.comment-card.dragging {
		opacity: 0.5;
		transform: scale(0.95);
	}

	.card-header {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		margin-bottom: 0.75rem;
	}

	.select-indicator {
		color: var(--text-muted);
		transition: all 0.2s ease;
		background: transparent;
		border: none;
		cursor: pointer;
		padding: 0.25rem;
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.select-indicator:hover {
		background: var(--bg-tertiary);
		color: var(--accent-primary);
	}

	.comment-card.selected .select-indicator {
		color: var(--accent-primary);
	}

	.badges {
		display: flex;
		gap: 0.5rem;
		flex: 1;
		flex-wrap: wrap;
	}

	.badge {
		font-size: 0.65rem;
		padding: 0.2rem 0.5rem;
		border-radius: var(--radius-sm);
	}
	
	.badge-enriched {
		background: rgba(34, 197, 94, 0.2);
		color: rgb(34, 197, 94);
		border: 1px solid rgba(34, 197, 94, 0.3);
	}

	.badge-error {
		background: rgba(239, 68, 68, 0.2);
		color: rgb(239, 68, 68);
		border: 1px solid rgba(239, 68, 68, 0.3);
		cursor: help;
	}

	.badge-warning {
		background: rgba(251, 191, 36, 0.2);
		color: rgb(251, 191, 36);
		border: 1px solid rgba(251, 191, 36, 0.3);
	}

	.drag-handle {
		color: var(--text-muted);
		opacity: 0;
		transition: opacity 0.2s ease;
		cursor: grab;
	}

	.comment-card:hover .drag-handle {
		opacity: 1;
	}

	.drag-handle:active {
		cursor: grabbing;
	}

	.card-body {
		margin-bottom: 0.75rem;
	}

	.comment-text {
		color: var(--text-primary);
		font-size: 0.9rem;
		line-height: 1.6;
		word-break: break-word;
		white-space: pre-wrap;
	}
	
	.expand-btn {
		background: transparent;
		border: none;
		color: var(--accent-primary);
		font-size: 0.8rem;
		padding: 0.25rem 0;
		cursor: pointer;
		margin-top: 0.25rem;
	}
	
	.expand-btn:hover {
		text-decoration: underline;
	}

	.video-info {
		display: flex;
		align-items: flex-start;
		gap: 0.5rem;
		margin-top: 0.5rem;
		color: var(--text-muted);
		font-size: 0.8rem;
	}
	
	.video-info svg {
		flex-shrink: 0;
		margin-top: 2px;
	}

	.error-details {
		margin-top: 0.75rem;
		padding: 0.75rem;
		background: rgba(239, 68, 68, 0.1);
		border: 1px solid rgba(239, 68, 68, 0.2);
		border-radius: var(--radius-sm);
		font-size: 0.8rem;
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.error-info {
		display: flex;
		flex-wrap: wrap;
		align-items: baseline;
		gap: 0.25rem;
	}

	.error-label {
		color: var(--error);
		font-weight: 600;
	}

	.error-message {
		color: var(--text-secondary);
	}

	.error-time {
		color: var(--text-muted);
		font-size: 0.7rem;
	}

	.remove-from-db-btn {
		display: inline-flex;
		align-items: center;
		gap: 0.35rem;
		padding: 0.4rem 0.75rem;
		background: rgba(239, 68, 68, 0.2);
		border: 1px solid rgba(239, 68, 68, 0.3);
		border-radius: var(--radius-sm);
		color: var(--error);
		font-size: 0.75rem;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.2s ease;
		align-self: flex-start;
	}

	.remove-from-db-btn:hover {
		background: rgba(239, 68, 68, 0.3);
		border-color: rgba(239, 68, 68, 0.5);
	}

	.card-footer {
		display: flex;
		align-items: center;
		gap: 1rem;
		padding-top: 0.75rem;
		border-top: 1px solid var(--bg-tertiary);
	}

	.stat {
		display: flex;
		align-items: center;
		gap: 0.35rem;
		color: var(--text-secondary);
		font-size: 0.8rem;
	}

	.stat svg {
		color: var(--text-muted);
	}

	.date {
		margin-left: auto;
		color: var(--text-muted);
		font-size: 0.75rem;
	}

	@media (max-width: 640px) {
		.comment-card {
			padding: 0.875rem;
		}

		.badges {
			flex-wrap: wrap;
		}

		.card-footer {
			flex-wrap: wrap;
			gap: 0.5rem;
		}

		.date {
			width: 100%;
			margin-left: 0;
			margin-top: 0.25rem;
		}
	}
</style>
