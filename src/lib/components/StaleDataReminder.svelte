<script lang="ts">
	import { onMount } from 'svelte';
	import { isTakeoutStale, loadLastTakeoutImport, storageConfig } from '$lib/services/storage';
	import Icon from './Icon.svelte';

	let showReminder = $state(false);
	let daysSinceImport = $state(0);
	let dismissed = $state(false);

	const DISMISS_KEY = 'commentslash_stale_reminder_dismissed';

	onMount(async () => {
		// Check if already dismissed this session
		const dismissedTime = sessionStorage.getItem(DISMISS_KEY);
		if (dismissedTime) {
			dismissed = true;
			return;
		}

		// Check if data is stale (uses configurable stale warning days)
		const stale = await isTakeoutStale();
		if (stale) {
			const lastImport = await loadLastTakeoutImport();
			if (lastImport) {
				daysSinceImport = Math.floor((Date.now() - lastImport) / (24 * 60 * 60 * 1000));
				showReminder = true;
			}
		}
	});

	function dismissReminder() {
		sessionStorage.setItem(DISMISS_KEY, Date.now().toString());
		dismissed = true;
		showReminder = false;
	}
</script>

{#if showReminder && !dismissed}
	<div class="stale-reminder">
		<div class="reminder-content">
			<div class="reminder-icon">
				<Icon name="calendar" size={24} />
			</div>
			<div class="reminder-text">
				<strong>Your comment data may be outdated</strong>
				<p>
					Your last Google Takeout import was {daysSinceImport} days ago. 
					New comments won't appear until you import a fresh export.
				</p>
			</div>
		</div>
		<button class="dismiss-btn" onclick={dismissReminder} aria-label="Dismiss">
			<Icon name="close" size={16} />
		</button>
	</div>
{/if}

<style>
	.stale-reminder {
		display: flex;
		align-items: flex-start;
		gap: 1rem;
		padding: 1rem 1.25rem;
		background: linear-gradient(135deg, rgba(251, 191, 36, 0.1) 0%, rgba(234, 179, 8, 0.1) 100%);
		border: 1px solid rgba(251, 191, 36, 0.3);
		border-radius: var(--radius-lg);
		margin-bottom: 1.5rem;
		animation: slideIn 0.3s ease;
	}

	@keyframes slideIn {
		from {
			opacity: 0;
			transform: translateY(-10px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	.reminder-content {
		display: flex;
		align-items: flex-start;
		gap: 1rem;
		flex: 1;
	}

	.reminder-icon {
		color: var(--warning);
		flex-shrink: 0;
	}

	.reminder-text strong {
		display: block;
		color: var(--warning);
		font-size: 0.95rem;
		margin-bottom: 0.25rem;
	}

	.reminder-text p {
		color: var(--text-secondary);
		font-size: 0.85rem;
		line-height: 1.5;
		margin: 0;
	}

	.dismiss-btn {
		background: transparent;
		color: var(--text-muted);
		padding: 0.25rem;
		border-radius: 50%;
		flex-shrink: 0;
		transition: all 0.2s ease;
	}

	.dismiss-btn:hover {
		background: rgba(251, 191, 36, 0.2);
		color: var(--warning);
	}

	@media (max-width: 640px) {
		.stale-reminder {
			flex-direction: column;
			align-items: stretch;
		}

		.dismiss-btn {
			align-self: flex-end;
			margin-top: -2rem;
		}
	}
</style>
