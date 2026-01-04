<script lang="ts">
	import type { YouTubeComment } from '$lib/types/comment';
	import { truncateText } from '$lib/utils/formatting';
	import SlashAnimation from './SlashAnimation.svelte';
	import ShurikenIcon from './ShurikenIcon.svelte';
	
	let {
		comments,
		isDeleting = false,
		deleteProgress,
		onConfirm,
		onCancel,
		isConnected = true
	}: {
		comments: YouTubeComment[];
		isDeleting?: boolean;
		deleteProgress?: { deleted: number; total: number };
		onConfirm: () => void;
		onCancel: () => void;
		isConnected?: boolean;
	} = $props();

	let showSlashAnimation = $state(false);

	function handleConfirmClick() {
		if (!isConnected) return;
		showSlashAnimation = true;
	}

	function handleSlashComplete() {
		showSlashAnimation = false;
		onConfirm();
	}

	const totalLikes = $derived(comments.reduce((sum, c) => sum + c.likeCount, 0));
</script>

<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<div 
	class="modal-backdrop" 
	onclick={onCancel} 
	onkeydown={(e) => e.key === 'Escape' && onCancel()}
	role="dialog" 
	aria-modal="true"
	aria-labelledby="modal-title"
	tabindex="-1"
>
	<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<div class="modal" onclick={(e) => e.stopPropagation()} role="document">
		{#if showSlashAnimation}
			<SlashAnimation onComplete={handleSlashComplete} />
		{/if}
		
		<div class="modal-header">
			<div class="warning-icon">
				<ShurikenIcon size={48} animate={true} className="modal-shuriken" />
			</div>
			<h2 id="modal-title">Confirm Slash</h2>
			<p>Are you sure you want to slash these comments? This action cannot be undone.</p>
		</div>

		{#if !isDeleting}
			<div class="modal-body">
				<div class="summary-card">
					<div class="summary-row">
						<span class="label">Comments to delete</span>
						<span class="value">{comments.length}</span>
					</div>
					<div class="summary-row">
						<span class="label">Total likes you'll lose</span>
						<span class="value likes">{totalLikes} ❤️</span>
					</div>
				</div>

				<div class="comment-preview">
					<h4>Preview ({Math.min(5, comments.length)} of {comments.length})</h4>
					<div class="preview-list">
						{#each comments.slice(0, 5) as comment}
							<div class="preview-item">
								<p>{truncateText(comment.textOriginal, 80)}</p>
								<span class="meta">on: {comment.videoTitle ? truncateText(comment.videoTitle, 30) : 'Unknown video'}</span>
							</div>
						{/each}
						{#if comments.length > 5}
							<div class="more-indicator">
								+{comments.length - 5} more comments...
							</div>
						{/if}
					</div>
				</div>
			</div>
		{:else}
			<div class="modal-body deleting">
				<div class="delete-progress">
					<div class="progress-icon">⚔️</div>
					<p>Slashing your comments...</p>
					{#if deleteProgress}
						<div class="progress-bar">
							<div 
								class="progress-fill" 
								style="width: {(deleteProgress.deleted / deleteProgress.total) * 100}%"
							></div>
						</div>
						<span class="progress-text">
							{deleteProgress.deleted} / {deleteProgress.total}
						</span>
					{/if}
				</div>
			</div>
		{/if}

		<div class="modal-footer">
			{#if !isDeleting}
				<button class="btn btn-secondary" onclick={onCancel}>
					Cancel
				</button>
				{#if isConnected}
					<button class="btn btn-danger slash-btn" onclick={handleConfirmClick}>
						<ShurikenIcon size={18} className="btn-shuriken" />
						Yes, Slash {comments.length} Comment{comments.length !== 1 ? 's' : ''}
					</button>
				{:else}
					<div class="login-required-notice">
						<ShurikenIcon size={16} className="notice-shuriken" />
						<span>Connect to YouTube to slash comments</span>
					</div>
				{/if}
			{/if}
		</div>
	</div>
</div>

<style>
	.modal-backdrop {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.7);
		backdrop-filter: blur(4px);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 1000;
		padding: 1rem;
		animation: fadeIn 0.2s ease;
	}

	@keyframes fadeIn {
		from { opacity: 0; }
		to { opacity: 1; }
	}

	.modal {
		position: relative;
		background: var(--bg-card);
		border-radius: var(--radius-xl);
		border: 1px solid var(--bg-tertiary);
		max-width: 500px;
		width: 100%;
		max-height: 80vh;
		overflow: hidden;
		display: flex;
		flex-direction: column;
		animation: slideUp 0.3s ease;
	}

	@keyframes slideUp {
		from {
			opacity: 0;
			transform: translateY(20px) scale(0.95);
		}
		to {
			opacity: 1;
			transform: translateY(0) scale(1);
		}
	}

	.modal-header {
		text-align: center;
		padding: 2rem 2rem 1.5rem;
	}

	.warning-icon {
		color: var(--error);
		margin-bottom: 1rem;
	}

	.modal-header h2 {
		font-size: 1.5rem;
		font-weight: 700;
		color: var(--text-primary);
		margin-bottom: 0.5rem;
	}

	.modal-header p {
		color: var(--text-secondary);
		font-size: 0.95rem;
	}

	.modal-body {
		padding: 0 2rem 2rem;
		overflow-y: auto;
	}

	.modal-body.deleting {
		display: flex;
		align-items: center;
		justify-content: center;
		min-height: 200px;
	}

	.summary-card {
		background: var(--bg-tertiary);
		border-radius: var(--radius-md);
		padding: 1rem;
		margin-bottom: 1.5rem;
	}

	.summary-row {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 0.5rem 0;
	}

	.summary-row:not(:last-child) {
		border-bottom: 1px solid var(--bg-hover);
	}

	.summary-row .label {
		color: var(--text-secondary);
		font-size: 0.9rem;
	}

	.summary-row .value {
		font-weight: 700;
		color: var(--text-primary);
		font-size: 1.1rem;
	}

	.summary-row .value.likes {
		color: var(--error);
	}

	.comment-preview h4 {
		font-size: 0.8rem;
		font-weight: 600;
		color: var(--text-muted);
		text-transform: uppercase;
		letter-spacing: 0.05em;
		margin-bottom: 0.75rem;
	}

	.preview-list {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		max-height: 200px;
		overflow-y: auto;
	}

	.preview-item {
		background: var(--bg-tertiary);
		border-radius: var(--radius-sm);
		padding: 0.75rem;
	}

	.preview-item p {
		font-size: 0.85rem;
		color: var(--text-primary);
		margin: 0 0 0.25rem 0;
		line-height: 1.4;
	}

	.preview-item .meta {
		font-size: 0.7rem;
		color: var(--text-muted);
	}

	.more-indicator {
		text-align: center;
		color: var(--text-muted);
		font-size: 0.85rem;
		padding: 0.5rem;
	}

	.delete-progress {
		text-align: center;
	}

	.progress-icon {
		font-size: 3rem;
		display: block;
		margin-bottom: 1rem;
		animation: slashSwing 0.8s ease-in-out infinite;
	}

	@keyframes slashSwing {
		0%, 100% { transform: rotate(-15deg); }
		50% { transform: rotate(15deg); }
	}

	.delete-progress p {
		color: var(--text-secondary);
		margin-bottom: 1.5rem;
	}

	.progress-bar {
		width: 200px;
		height: 6px;
		background: var(--bg-tertiary);
		border-radius: 3px;
		overflow: hidden;
		margin: 0 auto 0.5rem;
	}

	.progress-fill {
		height: 100%;
		background: linear-gradient(90deg, #6366f1, #ef4444, #8b5cf6);
		background-size: 200% 100%;
		animation: gradientFlow 2s ease infinite;
		border-radius: 3px;
		transition: width 0.3s ease;
	}

	@keyframes gradientFlow {
		0%, 100% { background-position: 0% 50%; }
		50% { background-position: 100% 50%; }
	}

	.progress-text {
		font-size: 0.8rem;
		color: var(--text-muted);
	}

	.modal-footer {
		display: flex;
		justify-content: flex-end;
		gap: 0.75rem;
		padding: 1.5rem 2rem;
		background: var(--bg-tertiary);
		border-top: 1px solid var(--bg-hover);
	}

	.slash-btn {
		position: relative;
		overflow: hidden;
	}

	/* Shuriken animation on button hover */
	.slash-btn:hover :global(.btn-shuriken) {
		animation: shurikenSpin 0.5s ease-in-out;
	}

	@keyframes shurikenSpin {
		0% {
			transform: rotate(0deg) scale(1);
		}
		50% {
			transform: rotate(180deg) scale(1.1);
		}
		100% {
			transform: rotate(360deg) scale(1);
		}
	}

	.slash-btn::after {
		content: '';
		position: absolute;
		top: 0;
		left: -100%;
		width: 100%;
		height: 100%;
		background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
		transition: left 0.5s ease;
	}

	.slash-btn:hover::after {
		left: 100%;
	}

	/* Modal shuriken styling */
	:global(.modal-shuriken) {
		color: var(--error);
		filter: drop-shadow(0 0 8px rgba(239, 68, 68, 0.5));
	}

	/* Login required notice */
	.login-required-notice {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.75rem 1rem;
		background: rgba(251, 191, 36, 0.15);
		border: 1px solid rgba(251, 191, 36, 0.3);
		border-radius: var(--radius-md);
		color: var(--warning);
		font-size: 0.85rem;
		font-weight: 500;
	}

	:global(.notice-shuriken) {
		color: var(--warning);
		opacity: 0.8;
	}

	@media (max-width: 640px) {
		.modal {
			max-height: 90vh;
		}

		.modal-header, .modal-body {
			padding-left: 1.5rem;
			padding-right: 1.5rem;
		}

		.modal-footer {
			flex-direction: column-reverse;
			padding: 1rem 1.5rem;
		}

		.modal-footer .btn {
			width: 100%;
		}
		
		.login-required-notice {
			width: 100%;
			justify-content: center;
		}
	}
</style>
