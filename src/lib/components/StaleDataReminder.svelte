<script lang="ts">
	import { onMount } from 'svelte';
	import { isTakeoutStale, loadLastTakeoutImport, storageConfig } from '$lib/services/storage';

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
				<svg width="24" height="24" viewBox="0 0 20 20" fill="currentColor">
					<path fill-rule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clip-rule="evenodd"/>
				</svg>
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
			<svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
				<path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
			</svg>
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
