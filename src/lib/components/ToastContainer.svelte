<script lang="ts">
	import { toasts } from '$lib/stores/toast';
	import Icon from './Icon.svelte';
	import { animate } from '$lib/utils/motion';
	
	// Animate toast entry using Motion library
	function animateToastIn(element: HTMLElement) {
		animate(
			element,
			{ x: ['100%', '0%'], opacity: [0, 1] },
			{ duration: 0.35, ease: [0.34, 1.56, 0.64, 1] }
		);
	}
	
	// Animate toast exit before removal
	async function handleDismiss(id: string, element: HTMLElement) {
		await animate(
			element,
			{ x: ['0%', '100%'], opacity: [1, 0] },
			{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }
		).finished;
		toasts.remove(id);
	}
</script>

<div class="toast-container">
	{#each $toasts as toast (toast.id)}
		<div 
			class="toast toast-{toast.type}" 
			role="alert"
			use:animateToastIn
		>
			<div class="toast-icon">
				{#if toast.type === 'success'}
					✓
				{:else if toast.type === 'error'}
					✕
				{:else if toast.type === 'warning'}
					⚠
				{:else}
					ℹ
				{/if}
			</div>
			<span class="toast-message">{toast.message}</span>
			<button 
				class="toast-close" 
				onclick={(e) => {
					const toastEl = (e.currentTarget as HTMLElement).closest('.toast') as HTMLElement;
					handleDismiss(toast.id, toastEl);
				}} 
				aria-label="Dismiss"
			>
				<Icon name="close" size={16} />
			</button>
		</div>
	{/each}
</div>

<style>
	.toast-container {
		position: fixed;
		bottom: 1.5rem;
		right: 1.5rem;
		z-index: 1000;
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		max-width: 400px;
	}

	.toast {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 1rem 1.25rem;
		border-radius: var(--radius-lg);
		background: var(--bg-card);
		border: 1px solid var(--bg-tertiary);
		box-shadow: var(--shadow-lg);
		/* Animation handled by Motion library */
	}

	.toast-icon {
		font-size: 1.25rem;
		font-weight: bold;
	}

	.toast-success .toast-icon {
		color: var(--success);
	}

	.toast-error .toast-icon {
		color: var(--error);
	}

	.toast-warning .toast-icon {
		color: var(--warning);
	}

	.toast-info .toast-icon {
		color: var(--accent-primary);
	}

	.toast-message {
		flex: 1;
		font-size: 0.9rem;
		color: var(--text-primary);
	}

	.toast-close {
		background: transparent;
		color: var(--text-muted);
		padding: 0.25rem;
		border-radius: 50%;
		cursor: pointer;
		transition: all 0.2s ease;
	}

	.toast-close:hover {
		background: var(--bg-tertiary);
		color: var(--text-primary);
	}

	@media (max-width: 640px) {
		.toast-container {
			left: 1rem;
			right: 1rem;
			bottom: 1rem;
			max-width: none;
		}
	}
</style>
