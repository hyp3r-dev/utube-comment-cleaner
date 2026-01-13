<script lang="ts">
	import { animate } from '$lib/utils/motion';
	
	let { 
		onConfirm, 
		onCancel,
		hasRefreshToken = false
	}: { 
		onConfirm: (mode: 'full' | 'soft') => void;
		onCancel: () => void;
		hasRefreshToken?: boolean;
	} = $props();
	
	// Animate overlay fade in
	function animateOverlay(element: HTMLElement) {
		animate(element, { opacity: [0, 1] }, { duration: 0.2, ease: [0.4, 0, 0.2, 1] });
	}
	
	// Animate modal slide up
	function animateModal(element: HTMLElement) {
		animate(
			element,
			{ 
				opacity: [0, 1],
				y: ['20px', '0px'],
				scale: [0.95, 1]
			},
			{ duration: 0.3, ease: [0.34, 1.56, 0.64, 1] }
		);
	}
	
	function handleFullLogout() {
		onConfirm('full');
	}
	
	function handleSoftLogout() {
		onConfirm('soft');
	}
	
	function handleOverlayClick(e: MouseEvent) {
		if (e.target === e.currentTarget) {
			onCancel();
		}
	}
	
	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			onCancel();
		}
	}
</script>

<svelte:window on:keydown={handleKeydown} />

<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<!-- svelte-ignore a11y_click_events_have_key_events -->
<div class="modal-overlay" onclick={handleOverlayClick} role="dialog" aria-modal="true" aria-labelledby="logout-title" tabindex="-1" use:animateOverlay>
	<div class="modal-content" use:animateModal>
		<div class="modal-header">
			<h3 id="logout-title">🔐 Sign Out of YouTube</h3>
		</div>
		
		<div class="modal-body">
			<p class="modal-description">
				Choose how you want to sign out:
			</p>
			
			<div class="logout-options">
				{#if hasRefreshToken}
					<button class="logout-option soft" onclick={handleSoftLogout}>
						<div class="option-icon">⏸️</div>
						<div class="option-content">
							<strong>End Session</strong>
							<p>Sign out but keep your login credentials stored for quick re-login later. Your comment data stays saved.</p>
						</div>
					</button>
				{/if}
				
				<button class="logout-option full" onclick={handleFullLogout}>
					<div class="option-icon">🚪</div>
					<div class="option-content">
						<strong>Full Sign Out</strong>
						<p>Clear all authentication data. You'll need to sign in again with Google next time. Your comment data stays saved.</p>
					</div>
				</button>
			</div>
			
			<p class="modal-note">
				💡 Your imported comments and queue will be preserved either way.
			</p>
		</div>
		
		<div class="modal-actions">
			<button class="btn btn-ghost" onclick={onCancel}>Cancel</button>
		</div>
	</div>
</div>

<style>
	.modal-overlay {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.7);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 1000;
		backdrop-filter: blur(4px);
		-webkit-backdrop-filter: blur(4px);
		/* Animation handled by Motion library */
	}
	
	.modal-content {
		background: var(--bg-card);
		border-radius: var(--radius-xl);
		border: 1px solid var(--bg-tertiary);
		max-width: 480px;
		width: 90%;
		padding: 1.5rem;
		box-shadow: var(--shadow-lg);
		/* Animation handled by Motion library */
	}
	
	.modal-header h3 {
		font-size: 1.25rem;
		font-weight: 700;
		color: var(--text-primary);
		margin-bottom: 0.5rem;
	}
	
	.modal-body {
		margin-bottom: 1.5rem;
	}
	
	.modal-description {
		color: var(--text-secondary);
		margin-bottom: 1.25rem;
	}
	
	.logout-options {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		margin-bottom: 1rem;
	}
	
	.logout-option {
		display: flex;
		align-items: flex-start;
		gap: 1rem;
		padding: 1rem;
		background: var(--bg-tertiary);
		border: 1px solid transparent;
		border-radius: var(--radius-lg);
		cursor: pointer;
		text-align: left;
		transition: all 0.2s ease;
	}
	
	.logout-option:hover {
		border-color: var(--accent-primary);
		background: rgba(99, 102, 241, 0.1);
	}
	
	.logout-option:focus {
		outline: none;
		border-color: var(--accent-primary);
		box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.2);
	}
	
	.logout-option.soft:hover {
		border-color: var(--accent-tertiary);
		background: rgba(167, 139, 250, 0.1);
	}
	
	.logout-option.full:hover {
		border-color: var(--warning);
		background: rgba(251, 191, 36, 0.1);
	}
	
	.option-icon {
		font-size: 1.5rem;
		flex-shrink: 0;
		margin-top: 0.125rem;
	}
	
	.option-content {
		flex: 1;
	}
	
	.option-content strong {
		display: block;
		color: var(--text-primary);
		font-size: 0.95rem;
		margin-bottom: 0.25rem;
	}
	
	.option-content p {
		color: var(--text-muted);
		font-size: 0.8rem;
		line-height: 1.4;
		margin: 0;
	}
	
	.modal-note {
		font-size: 0.8rem;
		color: var(--text-muted);
		padding: 0.75rem;
		background: rgba(99, 102, 241, 0.05);
		border-radius: var(--radius-md);
		text-align: center;
	}
	
	.modal-actions {
		display: flex;
		justify-content: flex-end;
	}
	
	@media (max-width: 480px) {
		.modal-content {
			padding: 1.25rem;
		}
		
		.logout-option {
			padding: 0.875rem;
		}
		
		.option-icon {
			font-size: 1.25rem;
		}
	}
</style>
