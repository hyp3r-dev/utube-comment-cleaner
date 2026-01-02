<script lang="ts">
	import type { YouTubeComment } from '$lib/types/comment';
	import { selectedIds, toggleComment } from '$lib/stores/comments';
	
	let { 
		comment,
		isDragging = false,
		onDragStart,
		onDragEnd
	}: { 
		comment: YouTubeComment;
		isDragging?: boolean;
		onDragStart?: () => void;
		onDragEnd?: () => void;
	} = $props();

	let isSelected = $derived($selectedIds.has(comment.id));

	function formatDate(dateString: string): string {
		const date = new Date(dateString);
		return new Intl.DateTimeFormat('en-US', {
			month: 'short',
			day: 'numeric',
			year: 'numeric'
		}).format(date);
	}

	function truncateText(text: string, maxLength: number): string {
		if (text.length <= maxLength) return text;
		return text.slice(0, maxLength) + '...';
	}

	function getPrivacyBadge(status?: string) {
		switch (status) {
			case 'public': return { text: 'Public', class: 'badge-success' };
			case 'private': return { text: 'Private', class: 'badge-error' };
			case 'unlisted': return { text: 'Unlisted', class: 'badge-warning' };
			default: return { text: 'Unknown', class: 'badge-info' };
		}
	}

	function getModerationBadge(status?: string) {
		switch (status) {
			case 'published': return { text: 'Published', class: 'badge-success' };
			case 'heldForReview': return { text: 'Held', class: 'badge-warning' };
			case 'likelySpam': return { text: 'Spam', class: 'badge-error' };
			case 'rejected': return { text: 'Rejected', class: 'badge-error' };
			default: return { text: 'Unknown', class: 'badge-info' };
		}
	}

	const privacyBadge = $derived(getPrivacyBadge(comment.videoPrivacyStatus));
	const moderationBadge = $derived(getModerationBadge(comment.moderationStatus));
</script>

<div 
	class="comment-card" 
	class:selected={isSelected}
	class:dragging={isDragging}
	draggable="true"
	ondragstart={onDragStart}
	ondragend={onDragEnd}
	role="button"
	tabindex="0"
	onclick={() => toggleComment(comment.id)}
	onkeydown={(e) => e.key === 'Enter' && toggleComment(comment.id)}
>
	<div class="card-header">
		<div class="select-indicator">
			{#if isSelected}
				<svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
					<path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
				</svg>
			{:else}
				<svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
					<path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm0-2a6 6 0 100-12 6 6 0 000 12z" clip-rule="evenodd" />
				</svg>
			{/if}
		</div>
		
		<div class="badges">
			<span class="badge {privacyBadge.class}">{privacyBadge.text}</span>
			<span class="badge {moderationBadge.class}">{moderationBadge.text}</span>
		</div>

		<div class="drag-handle" title="Drag to select">
			<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
				<path d="M4 4h2v2H4V4zm6 0h2v2h-2V4zM4 7h2v2H4V7zm6 0h2v2h-2V7zm-6 3h2v2H4v-2zm6 0h2v2h-2v-2z"/>
			</svg>
		</div>
	</div>

	<div class="card-body">
		<p class="comment-text">{@html truncateText(comment.textDisplay, 200)}</p>
		
		{#if comment.videoTitle}
			<div class="video-info">
				<svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor">
					<path d="M4 4a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2H4zm0 2h12v8H4V6z"/>
					<path d="M8 8l4 2-4 2V8z"/>
				</svg>
				<span>{truncateText(comment.videoTitle, 40)}</span>
			</div>
		{/if}
	</div>

	<div class="card-footer">
		<div class="stat">
			<svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
				<path d="M2 10.5a1.5 1.5 0 113 0v6a1.5 1.5 0 01-3 0v-6zM6 10.333v5.43a2 2 0 001.106 1.79l.05.025A4 4 0 008.943 18h5.416a2 2 0 001.962-1.608l1.2-6A2 2 0 0015.56 8H12V4a2 2 0 00-2-2 1 1 0 00-1 1v.667a4 4 0 01-.8 2.4L6.8 7.933a4 4 0 00-.8 2.4z"/>
			</svg>
			<span>{comment.likeCount}</span>
		</div>

		<div class="stat">
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
		transform: translateY(-2px);
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
	}

	.comment-card.selected .select-indicator {
		color: var(--accent-primary);
	}

	.badges {
		display: flex;
		gap: 0.5rem;
		flex: 1;
	}

	.badge {
		font-size: 0.65rem;
		padding: 0.2rem 0.5rem;
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
		line-height: 1.5;
		word-break: break-word;
	}

	.video-info {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		margin-top: 0.5rem;
		color: var(--text-muted);
		font-size: 0.8rem;
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
