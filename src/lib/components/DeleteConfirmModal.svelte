<script lang="ts">
	import type { YouTubeComment } from '$lib/types/comment';
	
	let {
		comments,
		isDeleting = false,
		deleteProgress,
		onConfirm,
		onCancel
	}: {
		comments: YouTubeComment[];
		isDeleting?: boolean;
		deleteProgress?: { deleted: number; total: number };
		onConfirm: () => void;
		onCancel: () => void;
	} = $props();

	function truncateText(text: string, maxLength: number): string {
		if (text.length <= maxLength) return text;
		return text.slice(0, maxLength) + '...';
	}

	const totalLikes = $derived(comments.reduce((sum, c) => sum + c.likeCount, 0));
</script>

<div 
	class="modal-backdrop" 
	onclick={onCancel} 
	onkeydown={(e) => e.key === 'Escape' && onCancel()}
	role="dialog" 
	aria-modal="true"
	aria-labelledby="modal-title"
	tabindex="-1"
>
	<div class="modal" onclick={(e) => e.stopPropagation()} role="document">
		<div class="modal-header">
			<div class="warning-icon">
				<svg width="48" height="48" viewBox="0 0 24 24" fill="currentColor">
					<path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
				</svg>
			</div>
			<h2 id="modal-title">Confirm Deletion</h2>
			<p>Are you sure you want to delete these comments? This action cannot be undone.</p>
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
					<div class="progress-icon animate-spin">🧹</div>
					<p>Sweeping away your comments...</p>
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
				<button class="btn btn-danger" onclick={onConfirm}>
					<svg width="18" height="18" viewBox="0 0 20 20" fill="currentColor">
						<path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd" />
					</svg>
					Yes, Delete {comments.length} Comment{comments.length !== 1 ? 's' : ''}
				</button>
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
		background: var(--gradient-primary);
		border-radius: 3px;
		transition: width 0.3s ease;
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
	}
</style>
