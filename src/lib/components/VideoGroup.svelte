<script lang="ts">
	import type { YouTubeComment } from '$lib/types/comment';
	import { selectedIds } from '$lib/stores/comments';
	import CommentCard from './CommentCard.svelte';
	
	let { 
		videoId,
		videoTitle,
		comments,
		hideSelectedComments = false,
		onRemoveFromDatabase
	}: { 
		videoId: string;
		videoTitle?: string;
		comments: YouTubeComment[];
		hideSelectedComments?: boolean;
		onRemoveFromDatabase?: (commentId: string) => void;
	} = $props();

	let isExpanded = $state(true);
	
	const displayTitle = $derived(videoTitle || `Video: ${videoId}`);
	const commentCount = $derived(comments.length);
	const totalLikes = $derived(comments.reduce((sum, c) => sum + c.likeCount, 0));
	
	// Count visible comments (not in slash queue) when hideSelectedComments is enabled
	const visibleCount = $derived(
		hideSelectedComments 
			? comments.filter(c => !$selectedIds.has(c.id)).length
			: comments.length
	);
	
	// Hide the entire group if all comments are selected (in slash queue)
	const shouldHideGroup = $derived(hideSelectedComments && visibleCount === 0);
</script>

{#if !shouldHideGroup}
<div class="video-group" class:collapsed={!isExpanded}>
	<div class="group-header-wrapper">
		<button 
			class="group-header"
			onclick={() => isExpanded = !isExpanded}
		>
			<div class="video-icon">
				<svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
					<path d="M4 4a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2H4zm0 2h12v8H4V6z"/>
					<path d="M8 8l4 2-4 2V8z"/>
				</svg>
			</div>
			
			<div class="group-info">
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
		
		<!-- External link to video -->
		<a 
			href="https://www.youtube.com/watch?v={videoId}" 
			target="_blank" 
			rel="noopener noreferrer"
			class="video-external-link"
			title="Open video on YouTube"
		>
			<svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
				<path d="M11 3a1 1 0 100 2h2.586l-6.293 6.293a1 1 0 101.414 1.414L15 6.414V9a1 1 0 102 0V4a1 1 0 00-1-1h-5z"/>
				<path d="M5 5a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2v-3a1 1 0 10-2 0v3H5V7h3a1 1 0 000-2H5z"/>
			</svg>
		</a>
	</div>
	
	{#if isExpanded}
		<div class="group-content">
			{#each comments as comment (comment.id)}
				<CommentCard {comment} hideWhenSelected={hideSelectedComments} {onRemoveFromDatabase} />
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
		margin-bottom: 1rem;
		transition: all 0.3s ease;
	}
	
	.video-group:hover {
		border-color: rgba(99, 102, 241, 0.3);
	}

	.group-header-wrapper {
		display: flex;
		align-items: center;
		background: var(--bg-tertiary);
	}
	
	.group-header {
		flex: 1;
		display: flex;
		align-items: center;
		gap: 1rem;
		padding: 1rem 1.25rem;
		background: transparent;
		border: none;
		cursor: pointer;
		text-align: left;
		transition: all 0.2s ease;
	}
	
	.group-header:hover {
		background: var(--bg-hover);
	}

	.video-external-link {
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 0.75rem 1rem;
		color: var(--text-muted);
		transition: all 0.2s ease;
		border-left: 1px solid var(--bg-hover);
	}

	.video-external-link:hover {
		background: var(--bg-hover);
		color: var(--accent-tertiary);
	}

	.video-id-fallback {
		font-family: monospace;
		font-size: 0.85rem;
		color: var(--text-muted);
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
	}
	
	.group-info {
		flex: 1;
		min-width: 0;
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
		.group-header {
			padding: 0.875rem 1rem;
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
