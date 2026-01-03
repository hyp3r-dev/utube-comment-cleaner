<script lang="ts">
	import { stats, filteredComments, selectedIds } from '$lib/stores/comments';
</script>

<div class="navbar-stats">
	<div class="stat-badge" title="Total Comments">
		<span class="stat-icon">📝</span>
		<span class="stat-value">{$stats.total}</span>
	</div>

	<div class="stat-badge" title="Visible Comments (matching filters)">
		<span class="stat-icon">👁️</span>
		<span class="stat-value">{$filteredComments.length}</span>
	</div>

	<div class="stat-badge" title="Selected Comments (in slash queue)">
		<span class="stat-icon">✅</span>
		<span class="stat-value">{$selectedIds.size}</span>
	</div>

	<div class="stat-badge" title="Total Likes">
		<span class="stat-icon">❤️</span>
		<span class="stat-value">{$stats.totalLikes.toLocaleString()}</span>
	</div>

	<div class="stat-badge" title="Average Comment Length">
		<span class="stat-icon">📊</span>
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
		font-size: 0.875rem;
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

		.stat-icon {
			font-size: 0.75rem;
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
