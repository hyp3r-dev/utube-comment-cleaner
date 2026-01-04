<script lang="ts">
	import { onMount } from 'svelte';
	import { getDataLifetimeInfo, refreshDataLifetime, type DataLifetimeInfo } from '$lib/services/storage';
	import { comments } from '$lib/stores/comments';

	let lifetimeInfo = $state<DataLifetimeInfo | null>(null);
	let showTooltip = $state(false);
	let isRefreshing = $state(false);

	// Only show when there are comments
	const shouldShow = $derived($comments.length > 0 && lifetimeInfo?.createdAt !== null);

	onMount(async () => {
		await loadLifetimeInfo();
	});

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

	function formatDate(timestamp: number): string {
		return new Date(timestamp).toLocaleDateString('en-US', {
			month: 'short',
			day: 'numeric',
			year: 'numeric'
		});
	}
</script>

{#if shouldShow && lifetimeInfo}
	<div 
		class="lifetime-indicator"
		class:expiring-soon={lifetimeInfo.isExpiringSoon}
		role="button"
		tabindex="0"
		onmouseenter={() => showTooltip = true}
		onmouseleave={() => showTooltip = false}
		onfocus={() => showTooltip = true}
		onblur={() => showTooltip = false}
		onclick={handleRefresh}
		onkeydown={(e) => (e.key === 'Enter' || e.key === ' ') && handleRefresh()}
	>
		<svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor" class:spinning={isRefreshing}>
			<path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clip-rule="evenodd"/>
		</svg>
		<span class="days-remaining">{lifetimeInfo.daysRemaining}d</span>

		{#if showTooltip}
			<div class="lifetime-tooltip">
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
					<span class="hint">Click to refresh expiry</span>
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

	.lifetime-indicator.expiring-soon {
		border-color: var(--warning);
		background: rgba(251, 191, 36, 0.1);
	}

	.lifetime-indicator.expiring-soon:hover {
		background: rgba(251, 191, 36, 0.2);
	}

	.lifetime-indicator svg {
		flex-shrink: 0;
	}

	.lifetime-indicator svg.spinning {
		animation: spin 1s linear infinite;
	}

	@keyframes spin {
		from { transform: rotate(0deg); }
		to { transform: rotate(360deg); }
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
		min-width: 180px;
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

	.tooltip-footer .hint {
		font-size: 0.65rem;
		color: var(--text-muted);
		font-style: italic;
	}

	@media (max-width: 768px) {
		.lifetime-tooltip {
			right: auto;
			left: 50%;
			transform: translateX(-50%);
		}
	}
</style>
