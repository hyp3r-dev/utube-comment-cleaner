<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { canReenrich, loadLastEnrichment, saveLastEnrichment } from '$lib/services/storage';
	import { formatDate } from '$lib/utils/formatting';
	import Icon from './Icon.svelte';
	import { fadeIn, pulse, springScale } from '$lib/utils/motion';
	
	let {
		channelTitle = '',
		channelId = '',
		onClose,
		onReenrich,
		isReenriching = false,
		reenrichProgress
	}: {
		channelTitle?: string;
		channelId?: string;
		onClose?: () => void;
		onReenrich?: () => void;
		isReenriching?: boolean;
		reenrichProgress?: { enriched: number; total: number };
	} = $props();
	
	let canReenrichNow = $state(false);
	let hoursUntilReenrich = $state(0);
	let lastEnrichmentDate = $state<number | null>(null);
	let isLoading = $state(true);
	let containerRef: HTMLDivElement | undefined = $state();
	let reenrichBtnRef: HTMLButtonElement | undefined = $state();
	
	onMount(async () => {
		await loadReenrichStatus();
		isLoading = false;
		
		// Animate container entrance
		if (containerRef) {
			fadeIn(containerRef);
		}
		
		// Add click outside listener
		document.addEventListener('click', handleOutsideClick);
	});
	
	onDestroy(() => {
		document.removeEventListener('click', handleOutsideClick);
	});
	
	async function loadReenrichStatus() {
		const status = await canReenrich();
		canReenrichNow = status.canReenrich;
		hoursUntilReenrich = status.hoursUntilAllowed;
		lastEnrichmentDate = status.lastEnrichment;
	}
	
	function handleOutsideClick(e: MouseEvent) {
		if (containerRef && !containerRef.contains(e.target as Node)) {
			onClose?.();
		}
	}
	
	async function handleReenrich() {
		if (!canReenrichNow || isReenriching) return;
		
		// Animate button press
		if (reenrichBtnRef) {
			springScale(reenrichBtnRef, 0.95);
		}
		
		onReenrich?.();
	}
	
	// Format hours remaining nicely
	const hoursRemainingText = $derived(() => {
		if (hoursUntilReenrich <= 1) return 'Less than 1 hour';
		if (hoursUntilReenrich < 24) return `${hoursUntilReenrich} hours`;
		const days = Math.floor(hoursUntilReenrich / 24);
		const hours = hoursUntilReenrich % 24;
		return days === 1 ? `1 day ${hours}h` : `${days} days ${hours}h`;
	});
</script>

<div 
	class="youtube-account-infobox"
	bind:this={containerRef}
	role="dialog"
	aria-modal="true"
	aria-label="YouTube Account Information"
>
	<div class="infobox-header">
		<div class="header-icon">
			<Icon name="youtube" size={24} />
		</div>
		<div class="header-text">
			<strong>YouTube Connected</strong>
		</div>
		<button 
			class="close-btn" 
			onclick={() => onClose?.()}
			aria-label="Close"
		>
			<Icon name="close" size={16} />
		</button>
	</div>
	
	<div class="infobox-content">
		<div class="account-info">
			<span class="label">Channel:</span>
			<span class="value">
				{#if channelId}
					<a 
						href="https://www.youtube.com/channel/{channelId}" 
						target="_blank" 
						rel="noopener noreferrer"
						class="channel-link"
					>
						{channelTitle || 'Unknown'}
						<Icon name="externalLink" size={12} class="external-icon" />
					</a>
				{:else}
					{channelTitle || 'Unknown'}
				{/if}
			</span>
		</div>
		
		<div class="enrichment-info">
			<span class="label">Last enrichment:</span>
			<span class="value">
				{#if lastEnrichmentDate}
					{formatDate(lastEnrichmentDate)}
				{:else}
					Never
				{/if}
			</span>
		</div>
	</div>
	
	<div class="infobox-footer">
		{#if isReenriching}
			<div class="reenrich-progress">
				<div class="progress-spinner">
					<Icon name="spinner" size={16} class="spinner-icon" />
				</div>
				<span class="progress-text">
					Updating likes... {reenrichProgress?.enriched || 0} / {reenrichProgress?.total || 0}
				</span>
			</div>
		{:else if canReenrichNow}
			<button 
				class="btn btn-reenrich" 
				onclick={handleReenrich}
				bind:this={reenrichBtnRef}
				disabled={isLoading}
			>
				<Icon name="refresh" size={16} />
				<span>Update Like Counts</span>
			</button>
			<p class="reenrich-hint">
				Re-fetch current like counts for all comments
			</p>
		{:else}
			<button 
				class="btn btn-reenrich disabled" 
				disabled
				title="You can re-enrich once per day"
			>
				<Icon name="clock" size={16} />
				<span>Available in {hoursRemainingText()}</span>
			</button>
			<p class="reenrich-hint">
				Re-enrichment is limited to once per day
			</p>
		{/if}
	</div>
</div>

<style>
	.youtube-account-infobox {
		position: absolute;
		top: 100%;
		right: 0;
		margin-top: 0.5rem;
		background: var(--bg-card);
		border: 1px solid var(--bg-tertiary);
		border-radius: var(--radius-lg);
		padding: 0;
		min-width: 280px;
		box-shadow: var(--shadow-lg);
		z-index: 100;
		overflow: hidden;
	}
	
	.infobox-header {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 1rem;
		background: linear-gradient(135deg, rgba(34, 197, 94, 0.1) 0%, rgba(34, 197, 94, 0.05) 100%);
		border-bottom: 1px solid var(--bg-tertiary);
	}
	
	.header-icon {
		display: flex;
		align-items: center;
		justify-content: center;
		color: #22c55e;
	}
	
	.header-text strong {
		font-size: 0.9rem;
		color: var(--text-primary);
	}
	
	.close-btn {
		margin-left: auto;
		background: transparent;
		color: var(--text-muted);
		padding: 0.35rem;
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		transition: all 0.2s ease;
	}
	
	.close-btn:hover {
		background: var(--bg-hover);
		color: var(--text-primary);
	}
	
	.infobox-content {
		padding: 1rem;
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}
	
	.account-info,
	.enrichment-info {
		display: flex;
		justify-content: space-between;
		align-items: center;
		font-size: 0.85rem;
	}
	
	.label {
		color: var(--text-muted);
	}
	
	.value {
		color: var(--text-primary);
		font-weight: 500;
	}
	
	.channel-link {
		display: inline-flex;
		align-items: center;
		gap: 0.35rem;
		color: var(--accent-tertiary);
		text-decoration: none;
		transition: color 0.2s ease;
	}
	
	.channel-link:hover {
		color: var(--accent-primary);
		text-decoration: underline;
	}
	
	:global(.external-icon) {
		opacity: 0.7;
	}
	
	.infobox-footer {
		padding: 1rem;
		background: var(--bg-tertiary);
		border-top: 1px solid var(--bg-hover);
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}
	
	.btn-reenrich {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
		width: 100%;
		padding: 0.65rem 1rem;
		background: var(--accent-primary);
		color: white;
		border-radius: var(--radius-md);
		font-size: 0.85rem;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.2s ease;
	}
	
	.btn-reenrich:hover:not(:disabled) {
		background: var(--accent-secondary);
		transform: translateY(-1px);
	}
	
	.btn-reenrich.disabled,
	.btn-reenrich:disabled {
		background: var(--bg-hover);
		color: var(--text-muted);
		cursor: not-allowed;
		transform: none;
	}
	
	.reenrich-hint {
		font-size: 0.7rem;
		color: var(--text-muted);
		text-align: center;
		margin: 0;
	}
	
	.reenrich-progress {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
		padding: 0.65rem;
		background: rgba(99, 102, 241, 0.1);
		border-radius: var(--radius-md);
	}
	
	.progress-spinner {
		color: var(--accent-primary);
	}
	
	:global(.spinner-icon) {
		animation: spin 1s linear infinite;
	}
	
	@keyframes spin {
		from { transform: rotate(0deg); }
		to { transform: rotate(360deg); }
	}
	
	.progress-text {
		font-size: 0.85rem;
		color: var(--text-secondary);
	}
	
	@media (max-width: 768px) {
		.youtube-account-infobox {
			right: auto;
			left: 50%;
			transform: translateX(-50%);
			min-width: 260px;
		}
	}
</style>
