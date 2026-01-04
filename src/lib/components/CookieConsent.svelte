<script lang="ts">
	let { 
		enabled = false,
		showLegalLinks = true
	}: { 
		enabled?: boolean;
		showLegalLinks?: boolean;
	} = $props();

	let showBanner = $state(false);
	let isAnimatingOut = $state(false);
	let hasChecked = $state(false);

	const CONSENT_KEY = 'commentslash_cookie_consent';

	// Use $effect to react to enabled prop changes
	$effect(() => {
		// Only run once when enabled becomes true
		if (!enabled || hasChecked) return;
		hasChecked = true;
		
		// Check if user has already acknowledged
		const consent = localStorage.getItem(CONSENT_KEY);
		if (!consent) {
			// Small delay before showing for smoother UX
			setTimeout(() => {
				showBanner = true;
			}, 500);
		}
	});

	function dismissBanner() {
		isAnimatingOut = true;
		localStorage.setItem(CONSENT_KEY, JSON.stringify({
			acknowledged: true,
			timestamp: new Date().toISOString()
		}));
		setTimeout(() => {
			showBanner = false;
		}, 300);
	}
</script>

{#if showBanner}
	<div class="cookie-banner" class:animating-out={isAnimatingOut}>
		<div class="banner-content">
			<div class="banner-icon">🍪</div>
			<div class="banner-text">
				<strong>Cookie Notice</strong>
				<p>
					We only use essential cookies for authentication and to remember your preferences. 
					No tracking or analytics cookies are used. Your data stays in your browser.
					{#if showLegalLinks}
						<a href="/legal/privacy">Learn more</a>
					{/if}
				</p>
			</div>
		</div>
		<div class="banner-actions">
			<button class="btn btn-primary btn-sm" onclick={dismissBanner}>
				Got it
			</button>
		</div>
	</div>
{/if}

<style>
	.cookie-banner {
		position: fixed;
		bottom: 1.5rem;
		left: 50%;
		transform: translateX(-50%);
		z-index: 1000;
		background: var(--bg-card);
		border: 1px solid var(--bg-tertiary);
		border-radius: var(--radius-xl);
		padding: 1rem 1.5rem;
		box-shadow: var(--shadow-lg);
		display: flex;
		align-items: center;
		gap: 1.5rem;
		max-width: 700px;
		width: calc(100% - 2rem);
		animation: slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
	}

	.cookie-banner.animating-out {
		animation: slideDown 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
	}

	@keyframes slideUp {
		from {
			opacity: 0;
			transform: translateX(-50%) translateY(20px);
		}
		to {
			opacity: 1;
			transform: translateX(-50%) translateY(0);
		}
	}

	@keyframes slideDown {
		from {
			opacity: 1;
			transform: translateX(-50%) translateY(0);
		}
		to {
			opacity: 0;
			transform: translateX(-50%) translateY(20px);
		}
	}

	.banner-content {
		display: flex;
		align-items: flex-start;
		gap: 1rem;
		flex: 1;
	}

	.banner-icon {
		font-size: 1.75rem;
		flex-shrink: 0;
	}

	.banner-text strong {
		display: block;
		color: var(--text-primary);
		font-size: 0.95rem;
		margin-bottom: 0.25rem;
	}

	.banner-text p {
		color: var(--text-secondary);
		font-size: 0.85rem;
		line-height: 1.5;
		margin: 0;
	}

	.banner-text a {
		color: var(--accent-tertiary);
		text-decoration: underline;
	}

	.banner-text a:hover {
		color: var(--accent-primary);
	}

	.banner-actions {
		display: flex;
		gap: 0.5rem;
		flex-shrink: 0;
	}

	.btn-sm {
		padding: 0.5rem 1rem;
		font-size: 0.85rem;
	}

	@media (max-width: 640px) {
		.cookie-banner {
			flex-direction: column;
			align-items: stretch;
			bottom: 0.75rem;
			padding: 1rem;
		}

		.banner-content {
			flex-direction: column;
			align-items: center;
			text-align: center;
		}

		.banner-actions {
			justify-content: center;
		}
	}
</style>
