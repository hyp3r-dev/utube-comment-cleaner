<script lang="ts">
	import type { YouTubeComment } from '$lib/types/comment';
	import { selectedIds } from '$lib/stores/comments';
	import CommentCard from './CommentCard.svelte';
	import { truncateText } from '$lib/utils/formatting';
	
	let { 
		videoId,
		videoTitle,
		videoChannelId,
		videoChannelTitle,
		comments,
		hideSelectedComments = false,
		onRemoveFromDatabase
	}: { 
		videoId: string;
		videoTitle?: string;
		videoChannelId?: string;
		videoChannelTitle?: string;
		comments: YouTubeComment[];
		hideSelectedComments?: boolean;
		onRemoveFromDatabase?: (commentId: string) => void;
	} = $props();

	// Animation duration - must match CommentCard's SLIDE_TO_QUEUE_DURATION_MS
	const SLIDE_TO_QUEUE_DURATION_MS = 400;

	let isExpanded = $state(true);
	let isAnimatingOut = $state(false);
	
	const displayTitle = $derived(videoTitle || `Video: ${videoId}`);
	const commentCount = $derived(comments.length);
	const totalLikes = $derived(comments.reduce((sum, c) => sum + c.likeCount, 0));
	
	// Count visible comments (not in slash queue) when hideSelectedComments is enabled
	const visibleCount = $derived(
		hideSelectedComments 
			? comments.filter(c => !$selectedIds.has(c.id)).length
			: comments.length
	);
	
	// Track previous visible count to detect when last comment is selected
	let prevVisibleCount: number | undefined;
	
	// Trigger fade-out animation when all comments become selected
	$effect(() => {
		const currentCount = visibleCount;
		if (hideSelectedComments && currentCount === 0 && prevVisibleCount !== undefined && prevVisibleCount > 0) {
			// Last comment was just selected - wait for its animation to complete
			isAnimatingOut = true;
			setTimeout(() => {
				isAnimatingOut = false;
			}, SLIDE_TO_QUEUE_DURATION_MS);
		}
		prevVisibleCount = currentCount;
	});
	
	// Hide the entire group if all comments are selected (in slash queue) AND not animating
	const shouldHideGroup = $derived(hideSelectedComments && visibleCount === 0 && !isAnimatingOut);
</script>

{#if !shouldHideGroup}
<div class="video-group" class:collapsed={!isExpanded} class:fading-out={isAnimatingOut}>
	<div class="group-header-wrapper">
		<!-- YouTube video link icon -->
		<a 
			href="https://www.youtube.com/watch?v={videoId}" 
			target="_blank" 
			rel="noopener noreferrer"
			class="video-icon-link"
			title="Open video on YouTube"
		>
			<div class="video-icon">
				<svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
					<path d="M4 4a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2H4zm0 2h12v8H4V6z"/>
					<path d="M8 8l4 2-4 2V8z"/>
				</svg>
			</div>
		</a>
		
		<button 
			class="group-header"
			onclick={() => isExpanded = !isExpanded}
		>
			<div class="group-info">
				<!-- Channel name (if available) -->
				{#if videoChannelTitle}
					<div class="channel-name">
						<svg width="12" height="12" viewBox="0 0 20 20" fill="currentColor">
							<path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-6-3a2 2 0 11-4 0 2 2 0 014 0zm-2 4a5 5 0 00-4.546 2.916A5.986 5.986 0 0010 16a5.986 5.986 0 004.546-2.084A5 5 0 0010 11z" clip-rule="evenodd"/>
						</svg>
						{#if videoChannelId}
							<a 
								href="https://www.youtube.com/channel/{videoChannelId}" 
								target="_blank" 
								rel="noopener noreferrer"
								class="channel-link"
								onclick={(e) => e.stopPropagation()}
							>
								{truncateText(videoChannelTitle, 30)}
							</a>
						{:else}
							<span class="channel-text">{truncateText(videoChannelTitle, 30)}</span>
						{/if}
					</div>
				{/if}
				<h4 class="video-title">
					{#if videoTitle}
						{videoTitle}
					{:else}
						<span class="video-id-fallback">Video ID: {videoId}</span>
					{/if}
				</h4>
				<div class="group-stats">
					<span class="stat">
						<svg width="12" height="12" viewBox="0 0 20 20" fill="currentColor">
							<path fill-rule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clip-rule="evenodd"/>
						</svg>
						{commentCount} comment{commentCount !== 1 ? 's' : ''}
					</span>
					<span class="stat">
						<svg width="12" height="12" viewBox="0 0 20 20" fill="currentColor">
							<path d="M2 10.5a1.5 1.5 0 113 0v6a1.5 1.5 0 01-3 0v-6zM6 10.333v5.43a2 2 0 001.106 1.79l.05.025A4 4 0 008.943 18h5.416a2 2 0 001.962-1.608l1.2-6A2 2 0 0015.56 8H12V4a2 2 0 00-2-2 1 1 0 00-1 1v.667a4 4 0 01-.8 2.4L6.8 7.933a4 4 0 00-.8 2.4z"/>
						</svg>
						{totalLikes} total likes
					</span>
				</div>
			</div>
			
			<div class="expand-icon" class:rotated={!isExpanded}>
				<svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
					<path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd" />
				</svg>
			</div>
		</button>
	</div>
	
	{#if isExpanded}
		<div class="group-content">
			{#each comments as comment (comment.id)}
				<CommentCard {comment} hideWhenSelected={hideSelectedComments} {onRemoveFromDatabase} hideVideoInfo={true} />
			{/each}
		</div>
	{/if}
</div>
{/if}

<style>
	.video-group {
		background: var(--bg-card);
		border: 1px solid var(--bg-tertiary);
		border-radius: var(--radius-xl);
		overflow: hidden;
		/* No margin needed - parent .video-groups container uses gap for spacing */
		transition: border-color 0.2s ease, box-shadow 0.2s ease;
	}
	
	/* Fade out animation when all comments in group are selected */
	.video-group.fading-out {
		animation: fadeOutGroup 0.4s ease-out forwards;
		pointer-events: none;
	}
	
	@keyframes fadeOutGroup {
		0% {
			opacity: 1;
			transform: scale(1);
		}
		100% {
			opacity: 0;
			transform: scale(0.98);
		}
	}
	
	.video-group:hover {
		border-color: rgba(99, 102, 241, 0.3);
	}

	.group-header-wrapper {
		display: flex;
		align-items: center;
		background: var(--bg-tertiary);
	}
	
	/* Clickable video icon link */
	.video-icon-link {
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 1rem;
		padding-right: 0.5rem;
		text-decoration: none;
	}
	
	.video-icon {
		width: 40px;
		height: 40px;
		display: flex;
		align-items: center;
		justify-content: center;
		background: rgba(239, 68, 68, 0.1);
		color: #ef4444;
		border-radius: var(--radius-md);
		flex-shrink: 0;
		transition: all 0.2s ease;
	}
	
	.video-icon-link:hover .video-icon {
		background: rgba(239, 68, 68, 0.25);
		transform: scale(1.05);
		box-shadow: 0 0 12px rgba(239, 68, 68, 0.3);
	}
	
	.group-header {
		flex: 1;
		display: flex;
		align-items: center;
		gap: 1rem;
		padding: 1rem 1.25rem;
		padding-left: 0.75rem;
		background: transparent;
		border: none;
		cursor: pointer;
		text-align: left;
		transition: background-color 0.2s ease;
	}
	
	.group-header:hover {
		background: var(--bg-hover);
	}

	.video-id-fallback {
		font-family: monospace;
		font-size: 0.85rem;
		color: var(--text-muted);
	}
	
	.group-info {
		flex: 1;
		min-width: 0;
	}

	.channel-name {
		display: flex;
		align-items: center;
		gap: 0.35rem;
		font-size: 0.7rem;
		color: var(--text-secondary);
		margin-bottom: 0.15rem;
	}

	.channel-name svg {
		flex-shrink: 0;
	}

	.channel-link {
		color: var(--text-secondary);
		text-decoration: none;
		transition: color 0.2s ease;
	}

	.channel-link:hover {
		color: var(--accent-tertiary);
		text-decoration: underline;
	}

	.channel-text {
		color: var(--text-secondary);
	}
	
	.video-title {
		font-size: 0.95rem;
		font-weight: 600;
		color: var(--text-primary);
		margin: 0 0 0.25rem 0;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
	
	.group-stats {
		display: flex;
		gap: 1rem;
	}
	
	.stat {
		display: flex;
		align-items: center;
		gap: 0.35rem;
		font-size: 0.75rem;
		color: var(--text-muted);
	}
	
	.expand-icon {
		color: var(--text-muted);
		transition: transform 0.3s ease;
	}
	
	.expand-icon.rotated {
		transform: rotate(-90deg);
	}
	
	.group-content {
		padding: 1.25rem;
		display: flex;
		flex-direction: column;
		gap: 0.875rem;
		background: rgba(0, 0, 0, 0.15);
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
	
	.video-group.collapsed {
		background: var(--bg-tertiary);
	}
	
	@media (max-width: 640px) {
		.video-icon-link {
			padding: 0.875rem;
			padding-right: 0.5rem;
		}
		
		.group-header {
			padding: 0.875rem 1rem;
			padding-left: 0.5rem;
		}
		
		.video-icon {
			width: 32px;
			height: 32px;
		}
		
		.video-title {
			font-size: 0.875rem;
		}
		
		.group-content {
			padding: 0.75rem;
		}
	}
</style>
