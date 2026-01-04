<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { getDataLifetimeInfo, refreshDataLifetime, type DataLifetimeInfo } from '$lib/services/storage';
	import { comments } from '$lib/stores/comments';
	import { formatDate } from '$lib/utils/formatting';

	let lifetimeInfo = $state<DataLifetimeInfo | null>(null);
	let showTooltip = $state(false);
	let isPinned = $state(false); // When true, only closes on outside click
	let isRefreshing = $state(false);
	let containerRef: HTMLDivElement | undefined = $state();
	let closeTimeout: ReturnType<typeof setTimeout> | null = null;

	// Delay before closing the tooltip (allows moving cursor through gap)
	const CLOSE_DELAY_MS = 150;

	// Only show when there are comments
	const shouldShow = $derived($comments.length > 0 && lifetimeInfo?.createdAt !== null);

	onMount(async () => {
		await loadLifetimeInfo();
		document.addEventListener('click', handleOutsideClick);
	});

	onDestroy(() => {
		if (closeTimeout) {
			clearTimeout(closeTimeout);
		}
		document.removeEventListener('click', handleOutsideClick);
	});

	function handleOutsideClick(e: MouseEvent) {
		if (isPinned && containerRef && !containerRef.contains(e.target as Node)) {
			isPinned = false;
			showTooltip = false;
		}
	}

	async function loadLifetimeInfo() {
		lifetimeInfo = await getDataLifetimeInfo();
	}

	async function handleRefresh() {
		if (isRefreshing) return;
		isRefreshing = true;
		try {
			await refreshDataLifetime();
			await loadLifetimeInfo();
		} finally {
			isRefreshing = false;
		}
	}

	function handleIndicatorClick(e: MouseEvent) {
		e.stopPropagation();
		if (isPinned) {
			// If already pinned, unpin and close
			isPinned = false;
			showTooltip = false;
		} else {
			// Pin it open
			isPinned = true;
			showTooltip = true;
		}
	}

	function handleMouseEnter() {
		// Cancel any pending close timeout
		if (closeTimeout) {
			clearTimeout(closeTimeout);
			closeTimeout = null;
		}
		if (!isPinned) {
			showTooltip = true;
		}
	}

	function handleMouseLeave() {
		if (!isPinned) {
			// Add a small delay before closing to allow cursor to move through gap
			closeTimeout = setTimeout(() => {
				showTooltip = false;
				closeTimeout = null;
			}, CLOSE_DELAY_MS);
		}
	}
</script>

{#if shouldShow && lifetimeInfo}
	<div 
		class="lifetime-indicator"
		class:expiring-soon={lifetimeInfo.isExpiringSoon}
		class:pinned={isPinned}
		role="button"
		tabindex="0"
		bind:this={containerRef}
		onmouseenter={handleMouseEnter}
		onmouseleave={handleMouseLeave}
		onfocus={handleMouseEnter}
		onblur={handleMouseLeave}
		onclick={handleIndicatorClick}
		onkeydown={(e) => (e.key === 'Enter' || e.key === ' ') && handleIndicatorClick(e as unknown as MouseEvent)}
	>
		<svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
			<path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clip-rule="evenodd"/>
		</svg>
		<span class="days-remaining">{lifetimeInfo.daysRemaining}d</span>

		{#if showTooltip}
			<div class="lifetime-tooltip" onclick={(e) => e.stopPropagation()}>
				<div class="tooltip-header">
					<strong>Data Retention</strong>
				</div>
				<div class="tooltip-content">
					<p>
						<span class="label">Imported:</span>
						<span class="value">{lifetimeInfo.createdAt ? formatDate(lifetimeInfo.createdAt) : 'Unknown'}</span>
					</p>
					<p>
						<span class="label">Expires:</span>
						<span class="value">{lifetimeInfo.expiresAt ? formatDate(lifetimeInfo.expiresAt) : 'Unknown'}</span>
					</p>
					<p>
						<span class="label">Days left:</span>
						<span class="value" class:warning={lifetimeInfo.isExpiringSoon}>{lifetimeInfo.daysRemaining} days</span>
					</p>
				</div>
				<div class="tooltip-footer">
					<button 
						class="reset-btn" 
						onclick={handleRefresh}
						disabled={isRefreshing}
					>
						<svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor" class:spinning={isRefreshing}>
							<path fill-rule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clip-rule="evenodd"/>
						</svg>
						{isRefreshing ? 'Resetting...' : 'Reset Timer'}
					</button>
				</div>
			</div>
		{/if}
	</div>
{/if}

<style>
	.lifetime-indicator {
		display: flex;
		align-items: center;
		gap: 0.3rem;
		padding: 0.35rem 0.5rem;
		background: var(--bg-tertiary);
		border-radius: var(--radius-md);
		border: 1px solid transparent;
		cursor: pointer;
		transition: all 0.2s ease;
		position: relative;
		color: var(--text-secondary);
	}

	.lifetime-indicator:hover {
		border-color: var(--accent-primary);
		background: var(--bg-hover);
		color: var(--text-primary);
	}

	.lifetime-indicator.pinned {
		border-color: var(--accent-primary);
		background: var(--bg-hover);
		box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.2);
	}

	.lifetime-indicator.expiring-soon {
		border-color: var(--warning);
		background: rgba(251, 191, 36, 0.1);
	}

	.lifetime-indicator.expiring-soon:hover {
		background: rgba(251, 191, 36, 0.2);
	}

	.lifetime-indicator.expiring-soon.pinned {
		box-shadow: 0 0 0 2px rgba(251, 191, 36, 0.2);
	}

	.lifetime-indicator svg {
		flex-shrink: 0;
	}

	/* Counter-clockwise spin animation for reset button (going back in time) */
	@keyframes spinCounterClockwise {
		from { transform: rotate(0deg); }
		to { transform: rotate(-360deg); }
	}

	.days-remaining {
		font-size: 0.7rem;
		font-weight: 700;
	}

	.lifetime-tooltip {
		position: absolute;
		top: 100%;
		right: 0;
		margin-top: 0.5rem;
		background: var(--bg-card);
		border: 1px solid var(--bg-tertiary);
		border-radius: var(--radius-md);
		padding: 0.75rem;
		min-width: 200px;
		box-shadow: var(--shadow-lg);
		z-index: 100;
		animation: fadeIn 0.2s ease;
	}

	@keyframes fadeIn {
		from {
			opacity: 0;
			transform: translateY(-5px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	.tooltip-header {
		margin-bottom: 0.5rem;
		padding-bottom: 0.5rem;
		border-bottom: 1px solid var(--bg-tertiary);
	}

	.tooltip-header strong {
		font-size: 0.8rem;
		color: var(--text-primary);
	}

	.tooltip-content p {
		display: flex;
		justify-content: space-between;
		margin: 0.25rem 0;
		font-size: 0.75rem;
	}

	.tooltip-content .label {
		color: var(--text-muted);
	}

	.tooltip-content .value {
		color: var(--text-primary);
		font-weight: 500;
	}

	.tooltip-content .value.warning {
		color: var(--warning);
	}

	.tooltip-footer {
		margin-top: 0.5rem;
		padding-top: 0.5rem;
		border-top: 1px solid var(--bg-tertiary);
	}

	.reset-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.4rem;
		width: 100%;
		padding: 0.5rem 0.75rem;
		background: var(--bg-tertiary);
		color: var(--text-secondary);
		border-radius: var(--radius-sm);
		font-size: 0.75rem;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.2s ease;
	}

	.reset-btn:hover:not(:disabled) {
		background: var(--accent-primary);
		color: white;
	}

	.reset-btn:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.reset-btn svg {
		/* Ensure rotation is centered */
		transform-origin: center;
		/* Disable transitions to prevent ghosting when animation starts/stops */
		transition: none;
	}
	
	.reset-btn svg.spinning {
		animation: spinCounterClockwise 1s linear infinite;
		/* Hint browser to prepare for animation */
		will-change: transform;
	}

	@media (max-width: 768px) {
		.lifetime-tooltip {
			right: auto;
			left: 50%;
			transform: translateX(-50%);
		}
	}
</style>
