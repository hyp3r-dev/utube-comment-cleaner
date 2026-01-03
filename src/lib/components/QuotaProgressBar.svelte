<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { 
		quotaStore, 
		quotaPercentage, 
		pendingQuota,
		DEFAULT_DAILY_QUOTA 
	} from '$lib/stores/quota';
	import { getTimeUntilPacificMidnight } from '$lib/utils/timezone';

	let isExpanded = $state(false);
	let timeDisplay = $state({ hours: 0, minutes: 0, seconds: 0, formatted: 'Loading...' });
	let timerInterval: ReturnType<typeof setInterval> | null = null;

	// Update time every second
	onMount(() => {
		const updateTime = () => {
			timeDisplay = getTimeUntilPacificMidnight();
		};
		
		updateTime();
		timerInterval = setInterval(updateTime, 1000);
	});
	
	onDestroy(() => {
		if (timerInterval) {
			clearInterval(timerInterval);
		}
	});

	function getStatusColor(percentage: number): string {
		if (percentage < 50) return 'var(--success)';
		if (percentage < 75) return 'var(--warning)';
		return 'var(--error)';
	}

	const usedUnits = $derived($quotaStore.used);
	const pendingUnits = $derived($pendingQuota);
	const dailyLimit = $derived($quotaStore.dailyLimit);
	const usedPercent = $derived($quotaPercentage.used);
	const pendingPercent = $derived($quotaPercentage.pending);
</script>

<div class="quota-bar" class:expanded={isExpanded}>
	<button 
		class="quota-toggle"
		onclick={() => isExpanded = !isExpanded}
		onmouseenter={() => isExpanded = true}
		onmouseleave={() => isExpanded = false}
		title="API Quota Usage"
	>
		<div class="quota-icon">
			<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
				<path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" stroke-linecap="round" stroke-linejoin="round"/>
			</svg>
		</div>
		
		<div class="quota-mini-progress">
			<div 
				class="progress-used" 
				style="width: {usedPercent}%; background: {getStatusColor(usedPercent)}"
			></div>
			{#if pendingPercent > 0}
				<div 
					class="progress-pending" 
					style="left: {usedPercent}%; width: {pendingPercent}%"
				></div>
			{/if}
		</div>
		
		<span class="quota-mini-text">{Math.round(usedPercent)}%</span>
	</button>

	{#if isExpanded}
		<div class="quota-dropdown">
			<div class="quota-header">
				<h4>API Quota Usage</h4>
				<span class="reset-time">Resets in {timeDisplay.formatted}</span>
			</div>
			
			<div class="quota-progress-container">
				<div class="quota-progress-bar">
					<div 
						class="progress-fill used" 
						style="width: {usedPercent}%"
					></div>
					{#if pendingPercent > 0}
						<div 
							class="progress-fill pending" 
							style="left: {usedPercent}%; width: {pendingPercent}%"
						></div>
					{/if}
				</div>
				
				<div class="quota-labels">
					<span class="used-label">
						<span class="dot used"></span>
						Used: {usedUnits.toLocaleString()}
					</span>
					{#if pendingUnits > 0}
						<span class="pending-label">
							<span class="dot pending"></span>
							Pending: +{pendingUnits.toLocaleString()}
						</span>
					{/if}
				</div>
			</div>
			
			<div class="quota-stats">
				<div class="stat-row">
					<span>Daily Limit</span>
					<span class="stat-value">{dailyLimit.toLocaleString()} units</span>
				</div>
				<div class="stat-row">
					<span>Remaining</span>
					<span class="stat-value remaining">{Math.max(0, dailyLimit - usedUnits - pendingUnits).toLocaleString()} units</span>
				</div>
			</div>
			
			<div class="quota-info">
				<p>
					<strong>Quota costs:</strong><br>
					• Fetch comments: ~1 unit/page<br>
					• Delete comment: 50 units each
				</p>
			</div>
		</div>
	{/if}
</div>

<style>
	.quota-bar {
		position: relative;
		display: flex;
		align-items: center;
	}

	.quota-toggle {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.5rem 0.75rem;
		background: var(--bg-tertiary);
		border-radius: var(--radius-md);
		color: var(--text-secondary);
		cursor: pointer;
		transition: all 0.2s ease;
		border: 1px solid transparent;
	}

	.quota-toggle:hover {
		background: var(--bg-hover);
		color: var(--text-primary);
		border-color: var(--accent-primary);
	}

	.quota-icon {
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.quota-mini-progress {
		width: 60px;
		height: 6px;
		background: var(--bg-primary);
		border-radius: 3px;
		position: relative;
		overflow: hidden;
	}

	.quota-mini-progress .progress-used {
		position: absolute;
		height: 100%;
		border-radius: 3px;
		transition: width 0.5s ease;
	}

	.quota-mini-progress .progress-pending {
		position: absolute;
		height: 100%;
		background: var(--accent-primary);
		border-radius: 3px;
		opacity: 0.5;
		animation: pulse 1s ease-in-out infinite;
	}

	.quota-mini-text {
		font-size: 0.75rem;
		font-weight: 600;
		min-width: 32px;
		text-align: right;
	}

	.quota-dropdown {
		position: absolute;
		top: 100%;
		right: 0;
		margin-top: 0.5rem;
		width: 280px;
		background: var(--bg-card);
		border: 1px solid var(--bg-tertiary);
		border-radius: var(--radius-lg);
		padding: 1rem;
		z-index: 100;
		box-shadow: var(--shadow-lg);
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

	@keyframes pulse {
		0%, 100% {
			opacity: 0.5;
		}
		50% {
			opacity: 0.8;
		}
	}

	.quota-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 1rem;
	}

	.quota-header h4 {
		font-size: 0.9rem;
		font-weight: 700;
		color: var(--text-primary);
		margin: 0;
	}

	.reset-time {
		font-size: 0.75rem;
		color: var(--accent-tertiary);
		background: rgba(167, 139, 250, 0.15);
		padding: 0.2rem 0.5rem;
		border-radius: var(--radius-sm);
	}

	.quota-progress-container {
		margin-bottom: 1rem;
	}

	.quota-progress-bar {
		height: 10px;
		background: var(--bg-tertiary);
		border-radius: 5px;
		position: relative;
		overflow: hidden;
		margin-bottom: 0.5rem;
	}

	.progress-fill {
		position: absolute;
		height: 100%;
		border-radius: 5px;
		transition: width 0.5s ease;
	}

	.progress-fill.used {
		background: linear-gradient(90deg, var(--success), var(--accent-primary));
	}

	.progress-fill.pending {
		background: var(--warning);
		animation: pendingPulse 1.5s ease-in-out infinite;
	}

	@keyframes pendingPulse {
		0%, 100% {
			opacity: 0.6;
		}
		50% {
			opacity: 1;
		}
	}

	.quota-labels {
		display: flex;
		gap: 1rem;
		font-size: 0.75rem;
	}

	.used-label, .pending-label {
		display: flex;
		align-items: center;
		gap: 0.35rem;
		color: var(--text-secondary);
	}

	.dot {
		width: 8px;
		height: 8px;
		border-radius: 50%;
	}

	.dot.used {
		background: var(--accent-primary);
	}

	.dot.pending {
		background: var(--warning);
	}

	.quota-stats {
		padding: 0.75rem;
		background: var(--bg-tertiary);
		border-radius: var(--radius-sm);
		margin-bottom: 0.75rem;
	}

	.stat-row {
		display: flex;
		justify-content: space-between;
		font-size: 0.8rem;
		color: var(--text-secondary);
	}

	.stat-row:not(:last-child) {
		margin-bottom: 0.35rem;
	}

	.stat-value {
		color: var(--text-primary);
		font-weight: 600;
	}

	.stat-value.remaining {
		color: var(--success);
	}

	.quota-info {
		font-size: 0.7rem;
		color: var(--text-muted);
		line-height: 1.5;
	}

	.quota-info strong {
		color: var(--text-secondary);
	}
</style>
