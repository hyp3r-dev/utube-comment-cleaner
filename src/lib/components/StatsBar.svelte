<script lang="ts">
	import { stats, filteredComments, selectedIds } from '$lib/stores/comments';
</script>

<div class="stats-bar">
	<div class="stat animate-fade-in" style="animation-delay: 0ms">
		<div class="stat-icon">📝</div>
		<div class="stat-content">
			<span class="stat-value">{$stats.total}</span>
			<span class="stat-label">Total Comments</span>
		</div>
	</div>

	<div class="stat animate-fade-in" style="animation-delay: 100ms">
		<div class="stat-icon">👁️</div>
		<div class="stat-content">
			<span class="stat-value">{$filteredComments.length}</span>
			<span class="stat-label">Visible</span>
		</div>
	</div>

	<div class="stat animate-fade-in" style="animation-delay: 200ms">
		<div class="stat-icon">✅</div>
		<div class="stat-content">
			<span class="stat-value">{$selectedIds.size}</span>
			<span class="stat-label">Selected</span>
		</div>
	</div>

	<div class="stat animate-fade-in" style="animation-delay: 300ms">
		<div class="stat-icon">❤️</div>
		<div class="stat-content">
			<span class="stat-value">{$stats.totalLikes.toLocaleString()}</span>
			<span class="stat-label">Total Likes</span>
		</div>
	</div>

	<div class="stat animate-fade-in" style="animation-delay: 400ms">
		<div class="stat-icon">📊</div>
		<div class="stat-content">
			<span class="stat-value">{$stats.avgLength}</span>
			<span class="stat-label">Avg. Length</span>
		</div>
	</div>
</div>

<style>
	.stats-bar {
		display: flex;
		gap: 1rem;
		flex-wrap: wrap;
		margin-bottom: 1.5rem;
	}

	.stat {
		flex: 1;
		min-width: 120px;
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 1rem 1.25rem;
		background: var(--bg-card);
		border-radius: var(--radius-lg);
		border: 1px solid var(--bg-tertiary);
		transition: all 0.3s ease;
	}

	.stat:hover {
		border-color: var(--accent-primary);
		transform: translateY(-2px);
		box-shadow: var(--shadow-md);
	}

	.stat-icon {
		font-size: 1.5rem;
		opacity: 0.9;
	}

	.stat-content {
		display: flex;
		flex-direction: column;
	}

	.stat-value {
		font-size: 1.25rem;
		font-weight: 700;
		color: var(--text-primary);
		line-height: 1.2;
	}

	.stat-label {
		font-size: 0.7rem;
		color: var(--text-muted);
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	@media (max-width: 768px) {
		.stats-bar {
			gap: 0.5rem;
		}

		.stat {
			min-width: calc(50% - 0.5rem);
			padding: 0.75rem 1rem;
		}

		.stat-icon {
			font-size: 1.25rem;
		}

		.stat-value {
			font-size: 1rem;
		}
	}
</style>
