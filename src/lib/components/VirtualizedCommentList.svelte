<script lang="ts">
	import { onMount, tick } from 'svelte';
	import type { YouTubeComment } from '$lib/types/comment';
	import { selectedIds } from '$lib/stores/comments';
	import { handleScrollPosition } from '$lib/stores/slidingWindow';
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

	// Virtualization settings - optimized for smooth scrolling
	const ESTIMATED_ITEM_HEIGHT = 160; // Average height of a comment card in pixels
	const GAP_SIZE = 16; // 1rem gap between items
	const ITEM_WITH_GAP = ESTIMATED_ITEM_HEIGHT + GAP_SIZE;
	const BUFFER_SIZE = 25; // Number of items to render above/below viewport (increased for smoother scrolling)
	const MIN_BATCH_SIZE = 50; // Minimum items to render (increased)
	const SCROLL_REPORT_THRESHOLD = 5; // Report scroll position after this many items change

	let containerRef: HTMLDivElement | undefined = $state();
	let scrollTop = $state(0);
	let containerHeight = $state(600); // Default height
	let lastReportedIndex = -1;
	let isScrolling = $state(false);
	let scrollEndTimeout: ReturnType<typeof setTimeout> | null = null;

	// Filter out selected comments if hideWhenSelected is true
	const displayComments = $derived(
		hideWhenSelected 
			? comments.filter(c => !$selectedIds.has(c.id))
			: comments
	);

	// Total estimated height for scrollbar
	const totalHeight = $derived(
		displayComments.length > 0 
			? displayComments.length * ITEM_WITH_GAP - GAP_SIZE 
			: 0
	);

	// Calculate which items to render based on scroll position using scrollbar ratio
	const visibleRange = $derived.by(() => {
		const totalItems = displayComments.length;
		if (totalItems === 0) {
			return { start: 0, end: 0 };
		}

		// If total items is small, just render all
		if (totalItems <= MIN_BATCH_SIZE * 2) {
			return { start: 0, end: totalItems };
		}

		// Calculate the scroll ratio (0.0 to 1.0)
		const maxScrollTop = totalHeight - containerHeight;
		const scrollRatio = maxScrollTop > 0 ? scrollTop / maxScrollTop : 0;
		
		// Calculate the center index based on scroll ratio
		// This gives us position-based virtualization
		const lastIndex = totalItems - 1;
		const centerIndex = Math.round(scrollRatio * lastIndex);
		
		// Calculate visible count based on container height
		const visibleCount = Math.ceil(containerHeight / ITEM_WITH_GAP) + (BUFFER_SIZE * 2);
		const halfVisible = Math.floor(visibleCount / 2);
		
		// Calculate start and end indices centered around the scroll position
		let startIndex = Math.max(0, centerIndex - halfVisible);
		let endIndex = Math.min(totalItems, startIndex + visibleCount);
		
		// Adjust if we hit the bottom
		if (endIndex === totalItems) {
			startIndex = Math.max(0, totalItems - visibleCount);
		}
		
		return { start: startIndex, end: endIndex };
	});

	// Items to render
	const visibleItems = $derived(
		displayComments.slice(visibleRange.start, visibleRange.end)
	);

	// Calculate spacer heights for proper scrollbar
	const topSpacerHeight = $derived(visibleRange.start * ITEM_WITH_GAP);
	const bottomSpacerHeight = $derived(
		Math.max(0, (displayComments.length - visibleRange.end) * ITEM_WITH_GAP - GAP_SIZE)
	);

	// Whether virtualization is active (only for large lists)
	const isVirtualized = $derived(displayComments.length > MIN_BATCH_SIZE * 2);

	// Current scroll index (middle of visible range)
	const currentScrollIndex = $derived(
		Math.floor((visibleRange.start + visibleRange.end) / 2)
	);

	function handleScroll(e: Event) {
		const target = e.target as HTMLDivElement;
		
		// Update scroll position immediately for responsive UI
		scrollTop = target.scrollTop;
		isScrolling = true;
		
		// Report scroll position during scrolling (not just at the end)
		// This ensures the sliding window loads data proactively
		const currentIndex = currentScrollIndex;
		if (Math.abs(currentIndex - lastReportedIndex) > SCROLL_REPORT_THRESHOLD) {
			handleScrollPosition(currentIndex);
			lastReportedIndex = currentIndex;
		}
		
		// Clear previous timeout
		if (scrollEndTimeout) {
			clearTimeout(scrollEndTimeout);
		}
		
		// Set timeout to detect scroll end and do a final report
		scrollEndTimeout = setTimeout(() => {
			isScrolling = false;
			
			// Final report when scrolling stops
			const finalIndex = currentScrollIndex;
			if (Math.abs(finalIndex - lastReportedIndex) > 0) {
				handleScrollPosition(finalIndex);
				lastReportedIndex = finalIndex;
			}
		}, 100); // Reduced timeout for faster response
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
			if (scrollEndTimeout) {
				clearTimeout(scrollEndTimeout);
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
