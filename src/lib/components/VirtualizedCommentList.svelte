<script lang="ts">
	import { onMount, tick } from 'svelte';
	import type { YouTubeComment } from '$lib/types/comment';
	import { selectedIds } from '$lib/stores/comments';
	import CommentCard from './CommentCard.svelte';

	let { 
		comments,
		hideWhenSelected = false,
		onRemoveFromDatabase
	}: { 
		comments: YouTubeComment[];
		hideWhenSelected?: boolean;
		onRemoveFromDatabase?: (commentId: string) => void;
	} = $props();

	// Virtualization settings
	const ESTIMATED_ITEM_HEIGHT = 160; // Average height of a comment card in pixels
	const BUFFER_SIZE = 15; // Number of items to render above/below viewport
	const MIN_BATCH_SIZE = 30; // Minimum items to render
	const SCROLL_DEBOUNCE_MS = 16; // ~60fps

	let containerRef: HTMLDivElement | undefined = $state();
	let scrollTop = $state(0);
	let containerHeight = $state(600); // Default height
	let scrollTimeout: ReturnType<typeof setTimeout> | null = null;

	// Filter out selected comments if hideWhenSelected is true
	const displayComments = $derived(
		hideWhenSelected 
			? comments.filter(c => !$selectedIds.has(c.id))
			: comments
	);

	// Calculate which items to render based on scroll position
	const visibleRange = $derived.by(() => {
		const totalItems = displayComments.length;
		if (totalItems === 0) {
			return { start: 0, end: 0 };
		}

		// If total items is small, just render all
		if (totalItems <= MIN_BATCH_SIZE * 2) {
			return { start: 0, end: totalItems };
		}

		// Calculate visible range with buffer
		const startIndex = Math.max(0, Math.floor(scrollTop / ESTIMATED_ITEM_HEIGHT) - BUFFER_SIZE);
		const visibleCount = Math.ceil(containerHeight / ESTIMATED_ITEM_HEIGHT) + (BUFFER_SIZE * 2);
		const endIndex = Math.min(totalItems, startIndex + Math.max(visibleCount, MIN_BATCH_SIZE));

		return { start: startIndex, end: endIndex };
	});

	// Items to render
	const visibleItems = $derived(
		displayComments.slice(visibleRange.start, visibleRange.end)
	);

	// Calculate spacer heights for proper scrollbar
	const topSpacerHeight = $derived(visibleRange.start * ESTIMATED_ITEM_HEIGHT);
	const bottomSpacerHeight = $derived(
		Math.max(0, (displayComments.length - visibleRange.end) * ESTIMATED_ITEM_HEIGHT)
	);

	// Total estimated height for scrollbar
	const totalHeight = $derived(displayComments.length * ESTIMATED_ITEM_HEIGHT);

	// Whether virtualization is active (only for large lists)
	const isVirtualized = $derived(displayComments.length > MIN_BATCH_SIZE * 2);

	function handleScroll(e: Event) {
		const target = e.target as HTMLDivElement;
		
		// Debounce scroll updates
		if (scrollTimeout) {
			clearTimeout(scrollTimeout);
		}
		
		scrollTimeout = setTimeout(() => {
			scrollTop = target.scrollTop;
		}, SCROLL_DEBOUNCE_MS);
	}

	let resizeObserver: ResizeObserver | null = null;

	onMount(() => {
		tick().then(() => {
			if (containerRef) {
				containerHeight = containerRef.clientHeight || 600;
				
				// Set up resize observer
				resizeObserver = new ResizeObserver((entries) => {
					for (const entry of entries) {
						containerHeight = entry.contentRect.height || 600;
					}
				});
				
				resizeObserver.observe(containerRef);
			}
		});
		
		return () => {
			if (resizeObserver) {
				resizeObserver.disconnect();
			}
			if (scrollTimeout) {
				clearTimeout(scrollTimeout);
			}
		};
	});
</script>

<div 
	class="virtualized-list"
	bind:this={containerRef}
	onscroll={handleScroll}
>
	{#if isVirtualized}
		<!-- Virtualized rendering for large lists -->
		<div class="scroll-content" style="min-height: {totalHeight}px;">
			<!-- Top spacer -->
			{#if topSpacerHeight > 0}
				<div class="spacer" style="height: {topSpacerHeight}px;" aria-hidden="true"></div>
			{/if}
			
			<!-- Rendered items -->
			<div class="items-container">
				{#each visibleItems as comment (comment.id)}
					<!-- hideWhenSelected is false here because filtering is done at the list level for virtualization -->
					<CommentCard 
						{comment} 
						hideWhenSelected={false}
						onRemoveFromDatabase={onRemoveFromDatabase}
					/>
				{/each}
			</div>
			
			<!-- Bottom spacer -->
			{#if bottomSpacerHeight > 0}
				<div class="spacer" style="height: {bottomSpacerHeight}px;" aria-hidden="true"></div>
			{/if}
		</div>
		
		<!-- Performance indicator -->
		<div class="virtualization-info" aria-live="polite">
			Showing {visibleItems.length} of {displayComments.length} comments
		</div>
	{:else}
		<!-- Standard rendering for small lists -->
		<div class="items-container">
			{#each displayComments as comment (comment.id)}
				<!-- hideWhenSelected is false here because filtering is done at the list level -->
				<CommentCard 
					{comment} 
					hideWhenSelected={false}
					onRemoveFromDatabase={onRemoveFromDatabase}
				/>
			{/each}
		</div>
	{/if}
</div>

<style>
	.virtualized-list {
		flex: 1 1 0;
		overflow-y: auto;
		overflow-x: hidden;
		position: relative;
		-webkit-overflow-scrolling: touch;
		scroll-behavior: auto; /* Disable smooth scrolling for performance */
		padding-bottom: 1rem;
	}

	.scroll-content {
		position: relative;
	}

	.spacer {
		/* Empty spacer for scroll positioning */
		pointer-events: none;
	}

	.items-container {
		display: flex;
		flex-direction: column;
		gap: 1rem;
		padding-right: 0.5rem;
		padding-top: 0.5rem;
	}

	.virtualization-info {
		position: sticky;
		bottom: 0;
		left: 0;
		right: 0;
		padding: 0.5rem;
		background: rgba(15, 15, 26, 0.9);
		backdrop-filter: blur(4px);
		font-size: 0.7rem;
		color: var(--text-muted);
		text-align: center;
		border-top: 1px solid var(--bg-tertiary);
	}
</style>
