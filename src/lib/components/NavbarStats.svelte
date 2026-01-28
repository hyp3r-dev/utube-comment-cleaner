<script lang="ts">
	import { stats, selectedIds } from '$lib/stores/comments';
	import { totalAvailable } from '$lib/stores/slidingWindow';
	import Icon from './Icon.svelte';
</script>

<!-- Note: Total Likes removed per YouTube API ToS III.E.4h (no derived/aggregated metrics) -->
<div class="navbar-stats">
	<div class="stat-badge" title="Total Comments">
		<span class="stat-icon">
			<Icon name="comments" size={14} />
		</span>
		<span class="stat-value">{$stats.total}</span>
	</div>

	<div class="stat-badge" title="Visible Comments (matching filters)">
		<span class="stat-icon">
			<Icon name="eye" size={14} />
		</span>
		<span class="stat-value">{$totalAvailable}</span>
	</div>

	<div class="stat-badge" title="Selected Comments (in slash queue)">
		<span class="stat-icon">
			<Icon name="checkCircle" size={14} />
		</span>
		<span class="stat-value">{$selectedIds.size}</span>
	</div>

	<div class="stat-badge" title="Average Comment Length">
		<span class="stat-icon">
			<Icon name="chart" size={14} />
		</span>
		<span class="stat-value">{$stats.avgLength}</span>
	</div>
</div>

<style>
	.navbar-stats {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.stat-badge {
		display: flex;
		flex-direction: column;
		align-items: center;
		padding: 0.35rem 0.5rem;
		background: var(--bg-tertiary);
		border-radius: var(--radius-md);
		border: 1px solid transparent;
		cursor: default;
		transition: all 0.2s ease;
		min-width: 44px;
	}

	.stat-badge:hover {
		border-color: var(--accent-primary);
		background: var(--bg-hover);
	}

	.stat-icon {
		display: flex;
		align-items: center;
		justify-content: center;
		color: var(--accent-tertiary);
		line-height: 1;
	}

	.stat-value {
		font-size: 0.7rem;
		font-weight: 700;
		color: var(--text-primary);
		line-height: 1.2;
		margin-top: 0.15rem;
	}

	@media (max-width: 768px) {
		.navbar-stats {
			gap: 0.25rem;
		}

		.stat-badge {
			padding: 0.25rem 0.35rem;
			min-width: 36px;
		}

		.stat-icon svg {
			width: 12px;
			height: 12px;
		}

		.stat-value {
			font-size: 0.6rem;
		}
	}

	/* Hide last stat on very small screens */
	@media (max-width: 480px) {
		.stat-badge:nth-child(4) {
			display: none;
		}
	}
</style>
