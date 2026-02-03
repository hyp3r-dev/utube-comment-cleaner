<script lang="ts">
	import type { YouTubeComment } from '$lib/types/comment';
	import { selectedIds, selectComment, setChannelFilter } from '$lib/stores/comments';
	import { formatDate, escapeHtml, truncateText } from '$lib/utils/formatting';
	import Icon from './Icon.svelte';
	
	let { 
		comment,
		isDragging = false,
		onDragStart,
		onDragEnd,
		hideWhenSelected = false,
		onRemoveFromDatabase,
		hideVideoInfo = false
	}: { 
		comment: YouTubeComment;
		isDragging?: boolean;
		onDragStart?: () => void;
		onDragEnd?: () => void;
		hideWhenSelected?: boolean;
		onRemoveFromDatabase?: (commentId: string) => void;
		hideVideoInfo?: boolean;
	} = $props();

	// Animation duration constant (must match CSS slideToQueue animation)
	const SLIDE_TO_QUEUE_DURATION_MS = 400;
	const SLASH_ANIMATION_DURATION_MS = 400;
	
	let isExpanded = $state(false);
	let isAnimatingOut = $state(false);
	let showSlashEffect = $state(false);
	let isSelected = $derived($selectedIds.has(comment.id));
	
	// Track previous selection state to detect changes
	let prevSelected: boolean | undefined;
	
	// Track selection changes for animation
	$effect(() => {
		const currentSelected = isSelected;
		if (currentSelected && prevSelected === false) {
			// Comment was just selected - show slash effect animation once
			showSlashEffect = true;
			setTimeout(() => {
				showSlashEffect = false;
			}, SLASH_ANIMATION_DURATION_MS);
			
			// Trigger slide out animation if hideWhenSelected is true
			if (hideWhenSelected) {
				isAnimatingOut = true;
				setTimeout(() => {
					isAnimatingOut = false;
				}, SLIDE_TO_QUEUE_DURATION_MS);
			}
		}
		prevSelected = currentSelected;
	});
	
	// Hide selected comments when hideWhenSelected is true (after animation completes)
	let shouldHide = $derived(hideWhenSelected && isSelected && !isAnimatingOut);

	function handleRemoveFromDatabase() {
		if (onRemoveFromDatabase) {
			onRemoveFromDatabase(comment.id);
		}
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
	
	function handleFilterByChannel(e: MouseEvent) {
		e.stopPropagation();
		if (comment.videoChannelId && comment.videoChannelTitle) {
			setChannelFilter(comment.videoChannelId, comment.videoChannelTitle);
		}
	}
	
	function handleDragStartWrapper(e: DragEvent) {
		// Prevent default browser image/text drag behavior
		if (e.dataTransfer) {
			// Set drag data so drop target can identify the comment
			e.dataTransfer.setData('text/plain', comment.id);
			e.dataTransfer.effectAllowed = 'move';
			// Create a custom drag image positioned relative to cursor click position
			// This ensures the ghost stays where you grabbed it, not jumping to corner
			const dragImage = e.currentTarget as HTMLElement;
			const rect = dragImage.getBoundingClientRect();
			const offsetX = e.clientX - rect.left;
			const offsetY = e.clientY - rect.top;
			e.dataTransfer.setDragImage(dragImage, offsetX, offsetY);
		}
		onDragStart?.();
	}
	
	function handleDragEnd() {
		onDragEnd?.();
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
	class:animating-to-queue={isAnimatingOut}
	draggable="true"
	ondragstart={handleDragStartWrapper}
	ondragend={handleDragEnd}
	role="article"
	tabindex="0"
	onclick={handleCardClick}
	onkeydown={(e) => e.key === 'Enter' && handleCardClick(e as unknown as MouseEvent)}
	aria-label={`Comment: ${truncateText(comment.textOriginal, 100)}${isSelected ? ' (selected for deletion)' : ''}`}
>
	<!-- Slash effect overlay when comment is first selected (plays once) -->
	{#if showSlashEffect}
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
				<Icon name="checkCircle" size={20} />
			{:else}
				<Icon name="circle" size={20} />
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
			<Icon name="dragHandle" size={16} />
		</div>
	</div>

	<div class="card-body">
		<p class="comment-text">{@html displayText}</p>
		
		{#if needsExpansion}
			<button class="expand-btn" onclick={handleCardClick}>
				{isExpanded ? 'Show less' : 'Show more...'}
			</button>
		{/if}
		
		{#if !hideVideoInfo}
			{#if comment.videoTitle || comment.videoChannelTitle}
				<div class="video-info">
					<!-- Channel info (if available from enrichment) -->
					{#if comment.videoChannelTitle}
						<div class="channel-info">
							<Icon name="user" size={14} />
							{#if isExpanded && comment.videoChannelId}
								<a 
									href="https://www.youtube.com/channel/{comment.videoChannelId}" 
									target="_blank" 
									rel="noopener noreferrer"
									class="channel-link"
									onclick={(e) => e.stopPropagation()}
								>
									{comment.videoChannelTitle}
									<Icon name="externalLink" size={10} class="external-link-icon" />
								</a>
								<!-- Filter by channel button -->
								<button
									class="filter-channel-btn"
									onclick={handleFilterByChannel}
									title="Filter comments by this channel"
								>
									<Icon name="filter" size={12} />
								</button>
							{:else}
								<span class="channel-title-text">{truncateText(comment.videoChannelTitle, 25)}</span>
							{/if}
						</div>
					{/if}
					<!-- Video info (using link icon per YouTube API ToS III.F.2a,b) -->
					{#if comment.videoTitle}
						<div class="video-title-info">
							<Icon name="link" size={14} />
							{#if isExpanded}
								<a 
									href="https://www.youtube.com/watch?v={comment.videoId}" 
									target="_blank" 
									rel="noopener noreferrer"
									class="video-link"
									onclick={(e) => e.stopPropagation()}
								>
									{comment.videoTitle}
									<Icon name="externalLink" size={12} class="external-link-icon" />
								</a>
							{:else}
								<span class="video-title-text">{truncateText(comment.videoTitle, 40)}</span>
							{/if}
						</div>
					{/if}
				</div>
			{:else if comment.videoId}
				<!-- Show video ID with link (using link icon per YouTube API ToS III.F.2a,b) -->
				<div class="video-info video-info-id">
					<Icon name="link" size={14} />
					<a 
						href="https://www.youtube.com/watch?v={comment.videoId}" 
						target="_blank" 
						rel="noopener noreferrer"
						class="video-id-link"
						onclick={(e) => e.stopPropagation()}
						title="Open video on YouTube"
					>
						{comment.videoId}
						<Icon name="externalLink" size={10} class="external-link-icon" />
					</a>
				</div>
			{/if}
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
						<Icon name="trash" size={14} />
						Remove from database
					</button>
				{/if}
			</div>
		{/if}
	</div>

	<div class="card-footer">
		<div class="stat" title="Likes">
			<Icon name="thumbUp" size={16} />
			<span>{comment.likeCount}</span>
		</div>

		{#if comment.totalReplyCount !== undefined && comment.totalReplyCount > 0}
			<div class="stat" title="Replies">
				<Icon name="reply" size={16} />
				<span>{comment.totalReplyCount}</span>
			</div>
		{/if}

		<div class="stat" title="Character count">
			<Icon name="document" size={16} />
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
		position: relative;
		/* GPU-accelerated transitions for smooth performance - only transition properties that change */
		transition: border-color 0.2s ease, box-shadow 0.2s ease, background 0.2s ease;
		/* Prevent any visual artifacts from overflow during animations */
		overflow: hidden;
	}

	/* Performant hover effect using only box-shadow and border-color (no pseudo-element animations) */
	.comment-card:hover {
		border-color: var(--accent-primary);
		box-shadow: 
			0 0 0 1px rgba(99, 102, 241, 0.3),
			0 4px 12px rgba(0, 0, 0, 0.3),
			0 0 20px rgba(99, 102, 241, 0.15),
			inset 0 1px 0 rgba(255, 255, 255, 0.05);
	}

	/* Subtle lift on focus for accessibility */
	.comment-card:focus-visible {
		outline: 2px solid var(--accent-primary);
		outline-offset: 2px;
	}

	/* Selected state - accent border with purple glow */
	.comment-card.selected {
		border-color: var(--accent-primary);
		background: rgba(99, 102, 241, 0.08);
		box-shadow: 
			0 0 0 2px rgba(99, 102, 241, 0.4),
			0 0 16px rgba(99, 102, 241, 0.2),
			0 4px 12px rgba(0, 0, 0, 0.25);
	}

	/* Slide animation when comment is added to queue - smooth swipe right */
	.comment-card.animating-to-queue {
		animation: slideToQueue 0.4s ease-out forwards;
		/* Disable transitions during animation to prevent conflicts with base transitions */
		transition: none;
	}

	/* Ensure animation takes priority by being more specific */
	.comment-card.comment-card.animating-to-queue {
		transition: none;
	}

	@keyframes slideToQueue {
		0% {
			transform: translateX(0);
			opacity: 1;
		}
		100% {
			transform: translateX(100%);
			opacity: 0;
		}
	}

	/* Slash effect overlay - clean diagonal slash animation */
	.slash-overlay {
		position: absolute;
		inset: 0;
		pointer-events: none;
		overflow: hidden;
		border-radius: var(--radius-lg);
		z-index: 10;
		/* Ensure overlay is hidden during slide animation */
		contain: paint;
	}

	/* Hide slash overlay when card is animating to queue */
	.comment-card.animating-to-queue .slash-overlay {
		display: none;
	}

	.slash-line {
		position: absolute;
		/* Keep the slash line within bounds - use width that fits inside the card */
		width: 100%;
		height: 3px;
		left: 0;
		top: 50%;
		/* Clean gradient without excessive blur */
		background: linear-gradient(
			90deg,
			transparent 0%,
			rgba(239, 68, 68, 0.4) 25%,
			var(--error) 50%,
			rgba(239, 68, 68, 0.4) 75%,
			transparent 100%
		);
		/* Diagonal rotation - contained within card */
		transform-origin: center;
		animation: slashDiagonal 0.4s ease-out forwards;
		/* Remove box-shadow to prevent visual artifacts during animations */
	}

	@keyframes slashDiagonal {
		0% {
			opacity: 0;
			transform: translateX(-120%) translateY(-50%) rotate(-25deg) scaleX(0.5);
		}
		15% {
			opacity: 1;
		}
		85% {
			opacity: 1;
		}
		100% {
			opacity: 0;
			transform: translateX(120%) translateY(-50%) rotate(-25deg) scaleX(0.5);
		}
	}

	/* Dragging state - clear ghostly effect showing "this card is being moved" */
	.comment-card.dragging {
		opacity: 0.35;
		transform: scale(0.97);
		box-shadow: 
			0 0 30px rgba(99, 102, 241, 0.4),
			inset 0 0 0 2px rgba(99, 102, 241, 0.3);
		cursor: grabbing;
		filter: grayscale(40%) brightness(0.9);
		border-color: var(--accent-primary);
		border-style: dashed;
		border-width: 2px;
		background: rgba(99, 102, 241, 0.05);
	}

	/* Pulsing effect on dragging state to make it even more obvious */
	.comment-card.dragging::after {
		content: '';
		position: absolute;
		inset: -2px;
		border-radius: var(--radius-lg);
		border: 2px dashed var(--accent-primary);
		animation: dragPulse 1s ease-in-out infinite;
		pointer-events: none;
	}

	@keyframes dragPulse {
		0%, 100% {
			opacity: 0.3;
		}
		50% {
			opacity: 0.7;
		}
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
		flex-direction: column;
		gap: 0.35rem;
		margin-top: 0.5rem;
		color: var(--text-muted);
		font-size: 0.8rem;
	}
	
	.channel-info,
	.video-title-info {
		display: flex;
		align-items: flex-start;
		gap: 0.5rem;
	}
	
	.channel-info svg,
	.video-title-info svg {
		flex-shrink: 0;
		margin-top: 2px;
	}

	.channel-link {
		color: var(--text-secondary);
		text-decoration: none;
		display: inline-flex;
		align-items: center;
		gap: 0.35rem;
		transition: color 0.2s ease;
	}

	.channel-link:hover {
		color: var(--accent-tertiary);
		text-decoration: underline;
	}

	/* Filter by channel button */
	.filter-channel-btn {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		padding: 0.2rem;
		margin-left: 0.35rem;
		background: var(--bg-tertiary);
		border: 1px solid transparent;
		border-radius: var(--radius-sm);
		color: var(--text-muted);
		cursor: pointer;
		transition: all 0.15s ease;
	}

	.filter-channel-btn:hover {
		background: rgba(99, 102, 241, 0.2);
		border-color: var(--accent-primary);
		color: var(--accent-primary);
	}

	.channel-title-text {
		color: var(--text-secondary);
	}

	.video-info-id {
		opacity: 0.7;
	}

	.video-link {
		color: var(--accent-tertiary);
		text-decoration: none;
		display: inline-flex;
		align-items: center;
		gap: 0.35rem;
		transition: color 0.2s ease;
	}

	.video-link:hover {
		color: var(--accent-primary);
		text-decoration: underline;
	}

	.video-id-link {
		color: var(--text-muted);
		text-decoration: none;
		display: inline-flex;
		align-items: center;
		gap: 0.35rem;
		font-family: monospace;
		font-size: 0.75rem;
		transition: color 0.2s ease;
	}

	.video-id-link:hover {
		color: var(--accent-tertiary);
	}

	.external-link-icon {
		opacity: 0.7;
	}

	.video-title-text {
		color: var(--text-muted);
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
