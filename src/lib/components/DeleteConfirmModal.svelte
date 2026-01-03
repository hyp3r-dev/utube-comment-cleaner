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
				<svg width="48" height="48" viewBox="0 0 48 48" fill="none">
					<defs>
						<linearGradient id="modal-blade" x1="0%" y1="0%" x2="100%" y2="100%">
							<stop offset="0%" style="stop-color:#e0e7ff"/>
							<stop offset="100%" style="stop-color:#a5b4fc"/>
						</linearGradient>
					</defs>
					<!-- Katana -->
					<path d="M8 40 L36 8 L40 12 L12 44 Z" fill="url(#modal-blade)"/>
					<rect x="4" y="38" width="10" height="6" rx="2" fill="#dc2626" transform="rotate(-45 9 41)"/>
					<ellipse cx="14" cy="36" rx="3" ry="1.5" fill="#fbbf24" transform="rotate(-45 14 36)"/>
					<!-- Slash effects -->
					<path d="M30 14 L38 6" stroke="#ef4444" stroke-width="2" stroke-linecap="round"/>
					<path d="M34 18 L42 10" stroke="#ef4444" stroke-width="1.5" stroke-linecap="round" opacity="0.7"/>
				</svg>
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
				<button class="btn btn-danger" onclick={onConfirm}>
					<svg width="18" height="18" viewBox="0 0 20 20" fill="currentColor">
						<path d="M3 17 L15 3 L17 5 L5 19 Z" />
						<path d="M13 5 L17 1" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
					</svg>
					Yes, Slash {comments.length} Comment{comments.length !== 1 ? 's' : ''}
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
