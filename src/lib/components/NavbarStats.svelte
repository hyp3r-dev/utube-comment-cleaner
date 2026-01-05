<script lang="ts">
	import { stats, selectedIds } from '$lib/stores/comments';
	import { totalAvailable } from '$lib/stores/slidingWindow';
</script>

<div class="navbar-stats">
	<div class="stat-badge" title="Total Comments">
		<span class="stat-icon">
			<svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor">
				<path fill-rule="evenodd" d="M18 13V5a2 2 0 00-2-2H4a2 2 0 00-2 2v8a2 2 0 002 2h3l3 3 3-3h3a2 2 0 002-2zM5 7a1 1 0 011-1h8a1 1 0 110 2H6a1 1 0 01-1-1zm1 3a1 1 0 100 2h3a1 1 0 100-2H6z" clip-rule="evenodd"/>
			</svg>
		</span>
		<span class="stat-value">{$stats.total}</span>
	</div>

	<div class="stat-badge" title="Visible Comments (matching filters)">
		<span class="stat-icon">
			<svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor">
				<path d="M10 12a2 2 0 100-4 2 2 0 000 4z"/>
				<path fill-rule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clip-rule="evenodd"/>
			</svg>
		</span>
		<span class="stat-value">{$totalAvailable}</span>
	</div>

	<div class="stat-badge" title="Selected Comments (in slash queue)">
		<span class="stat-icon">
			<svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor">
				<path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>
			</svg>
		</span>
		<span class="stat-value">{$selectedIds.size}</span>
	</div>

	<div class="stat-badge" title="Total Likes">
		<span class="stat-icon">
			<svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor">
				<path fill-rule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clip-rule="evenodd"/>
			</svg>
		</span>
		<span class="stat-value">{$stats.totalLikes.toLocaleString()}</span>
	</div>

	<div class="stat-badge" title="Average Comment Length">
		<span class="stat-icon">
			<svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor">
				<path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z"/>
			</svg>
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
		transform: translateY(-2px);
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

	/* Hide some stats on very small screens */
	@media (max-width: 480px) {
		.stat-badge:nth-child(4),
		.stat-badge:nth-child(5) {
			display: none;
		}
	}
</style>
