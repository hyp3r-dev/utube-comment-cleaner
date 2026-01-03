<script lang="ts">
	import { onMount } from 'svelte';
	import Logo from '$lib/components/Logo.svelte';
	import OAuthGuide from '$lib/components/OAuthGuide.svelte';
	import FilterPanel from '$lib/components/FilterPanel.svelte';
	import CommentCard from '$lib/components/CommentCard.svelte';
	import SelectedCommentsPanel from '$lib/components/SelectedCommentsPanel.svelte';
	import LoadingSpinner from '$lib/components/LoadingSpinner.svelte';
	import DeleteConfirmModal from '$lib/components/DeleteConfirmModal.svelte';
	import StatsBar from '$lib/components/StatsBar.svelte';
	import QuotaProgressBar from '$lib/components/QuotaProgressBar.svelte';
	import { YouTubeService } from '$lib/services/youtube';
	import { saveComments, loadComments, deleteComments as deleteFromStorage, clearAllData } from '$lib/services/storage';
	import {
		apiKey,
		isAuthenticated,
		comments,
		selectedComments,
		filteredComments,
		isLoading,
		loadingProgress,
		error,
		removeComments,
		selectAllFiltered,
		deselectAll,
		logout
	} from '$lib/stores/comments';

	let inputApiKey = $state('');
	let showDeleteModal = $state(false);
	let isDeleting = $state(false);
	let deleteProgress = $state<{ deleted: number; total: number } | undefined>();
	let youtubeService: YouTubeService | null = null;

	onMount(async () => {
		// Try to load cached comments
		try {
			const cachedComments = await loadComments();
			if (cachedComments.length > 0) {
				comments.set(cachedComments);
				// If we have cached comments, we're "authenticated" in a way
				// but we don't have the API key stored for security
			}
		} catch (e) {
			console.error('Failed to load cached comments:', e);
		}
	});

	async function handleLogin() {
		if (!inputApiKey.trim()) {
			error.set('Please enter your OAuth access token');
			return;
		}

		isLoading.set(true);
		error.set(null);
		loadingProgress.set({ loaded: 0 });

		try {
			youtubeService = new YouTubeService(inputApiKey.trim());
			
			const fetchedComments = await youtubeService.fetchAllComments((loaded, total) => {
				loadingProgress.set({ loaded, total });
			});

			if (fetchedComments.length === 0) {
				error.set('No comments found. Make sure you have commented on YouTube videos.');
				isLoading.set(false);
				return;
			}

			comments.set(fetchedComments);
			await saveComments(fetchedComments);
			
			apiKey.set(inputApiKey.trim());
			isAuthenticated.set(true);
		} catch (e) {
			error.set(e instanceof Error ? e.message : 'Failed to fetch comments. Please check your access token.');
		} finally {
			isLoading.set(false);
		}
	}

	async function handleDeleteConfirm() {
		if (!youtubeService || $selectedComments.length === 0) return;

		isDeleting = true;
		deleteProgress = { deleted: 0, total: $selectedComments.length };

		try {
			const commentIds = $selectedComments.map(c => c.id);
			const result = await youtubeService.deleteComments(commentIds, (deleted, total) => {
				deleteProgress = { deleted, total };
			});

			// Remove successfully deleted comments from stores and storage
			removeComments(result.success);
			await deleteFromStorage(result.success);

			if (result.failed.length > 0) {
				error.set(`Failed to delete ${result.failed.length} comment(s). They may have already been deleted.`);
			}
		} catch (e) {
			error.set(e instanceof Error ? e.message : 'Failed to delete comments');
		} finally {
			isDeleting = false;
			deleteProgress = undefined;
			showDeleteModal = false;
			deselectAll();
		}
	}

	async function handleLogout() {
		logout();
		await clearAllData();
		inputApiKey = '';
		youtubeService = null;
	}
</script>

<div class="app">
	<header class="header">
		<div class="container header-content">
			<Logo size={36} />
			
			<div class="header-actions">
				{#if $isAuthenticated || $comments.length > 0}
					<QuotaProgressBar />
				{/if}
				
				{#if $isAuthenticated}
					<button class="btn btn-ghost" onclick={handleLogout}>
						<svg width="18" height="18" viewBox="0 0 20 20" fill="currentColor">
							<path fill-rule="evenodd" d="M3 3a1 1 0 00-1 1v12a1 1 0 001 1h12a1 1 0 001-1V4a1 1 0 00-1-1H3zm9 4a1 1 0 10-2 0v4a1 1 0 102 0V7zm-3 1a1 1 0 10-2 0v3a1 1 0 102 0V8z" clip-rule="evenodd" />
						</svg>
						Logout
					</button>
				{/if}
			</div>
		</div>
	</header>

	<main class="main">
		<div class="container">
			{#if $isLoading}
				<div class="loading-section">
					<LoadingSpinner 
						size={80} 
						message="Fetching your comments..." 
						progress={$loadingProgress}
					/>
				</div>
			{:else if !$isAuthenticated && $comments.length === 0}
				<div class="auth-section">
					<div class="hero animate-slide-up">
						<h1>Welcome to <span class="text-gradient">CommentSlash</span></h1>
						<p class="hero-subtitle">
							Find and destroy your YouTube comments with precision. Filter by likes, 
							hunt down those embarrassing comments, and slash them away!
						</p>
					</div>

					<div class="auth-form animate-fade-in">
						<h2>Enter Your Access Token</h2>
						
						{#if $error}
							<div class="error-message">
								<svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
									<path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
								</svg>
								<span>{$error}</span>
							</div>
						{/if}

						<div class="input-group">
							<input
								type="password"
								placeholder="Paste your OAuth access token here..."
								bind:value={inputApiKey}
								onkeydown={(e) => e.key === 'Enter' && handleLogin()}
							/>
							<button class="btn btn-primary" onclick={handleLogin}>
								<svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
									<path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-8.707l-3-3a1 1 0 00-1.414 1.414L10.586 9H7a1 1 0 100 2h3.586l-1.293 1.293a1 1 0 101.414 1.414l3-3a1 1 0 000-1.414z" clip-rule="evenodd" />
								</svg>
								Load Comments
							</button>
						</div>

						<p class="security-note">
							🔒 Your token is never stored and is only used for this session.
							All data is stored locally in your browser and auto-expires after 24 hours.
						</p>
					</div>

					<OAuthGuide />
				</div>
			{:else}
				<div class="dashboard">
					<StatsBar />

					{#if $error}
						<div class="error-message mb-4">
							<svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
								<path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
							</svg>
							<span>{$error}</span>
							<button class="dismiss-btn" onclick={() => error.set(null)} aria-label="Dismiss error">
								<svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
									<path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
								</svg>
							</button>
						</div>
					{/if}

					<FilterPanel />

					<div class="dashboard-layout">
						<div class="comments-section">
							<div class="section-header">
								<h2>Your Comments</h2>
								<div class="header-actions">
									<button class="btn btn-ghost" onclick={selectAllFiltered}>
										Select All Visible ({$filteredComments.length})
									</button>
								</div>
							</div>

							{#if $filteredComments.length === 0}
								<div class="empty-state">
									<div class="empty-icon">🔍</div>
									<h3>No comments found</h3>
									<p>Try adjusting your filters or search query</p>
								</div>
							{:else}
								<div class="comments-grid">
									{#each $filteredComments as comment (comment.id)}
										<CommentCard {comment} />
									{/each}
								</div>
							{/if}
						</div>

						<aside class="sidebar">
							<SelectedCommentsPanel onDeleteRequest={() => showDeleteModal = true} />
						</aside>
					</div>
				</div>
			{/if}
		</div>
	</main>

	<footer class="footer">
		<div class="container">
			<p>CommentSlash — Destroy your YouTube comments with precision ⚔️✨</p>
		</div>
	</footer>
</div>

{#if showDeleteModal}
	<DeleteConfirmModal
		comments={$selectedComments}
		{isDeleting}
		{deleteProgress}
		onConfirm={handleDeleteConfirm}
		onCancel={() => showDeleteModal = false}
	/>
{/if}

<style>
	.app {
		min-height: 100vh;
		display: flex;
		flex-direction: column;
	}

	.header {
		position: sticky;
		top: 0;
		z-index: 100;
		background: rgba(15, 15, 26, 0.9);
		backdrop-filter: blur(12px);
		border-bottom: 1px solid var(--bg-tertiary);
	}

	.header-content {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding-top: 1rem;
		padding-bottom: 1rem;
	}

	.header-actions {
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}

	.main {
		flex: 1;
		padding: 2rem 0;
	}

	.loading-section {
		display: flex;
		justify-content: center;
		align-items: center;
		min-height: 60vh;
	}

	.auth-section {
		max-width: 700px;
		margin: 0 auto;
	}

	.hero {
		text-align: center;
		margin-bottom: 1.5rem;
	}

	.hero h1 {
		font-size: 2.5rem;
		font-weight: 800;
		color: var(--text-primary);
		margin-bottom: 1rem;
		line-height: 1.2;
	}

	.hero-subtitle {
		font-size: 1.1rem;
		color: var(--text-secondary);
		max-width: 500px;
		margin: 0 auto;
		line-height: 1.6;
	}

	.auth-form {
		background: var(--bg-card);
		border-radius: var(--radius-xl);
		border: 1px solid var(--bg-tertiary);
		padding: 2rem;
	}

	.auth-form h2 {
		font-size: 1.25rem;
		font-weight: 700;
		color: var(--text-primary);
		margin-bottom: 1.5rem;
		text-align: center;
	}

	.input-group {
		display: flex;
		gap: 0.75rem;
		margin-bottom: 1rem;
	}

	.input-group input {
		flex: 1;
	}

	.input-group .btn {
		flex-shrink: 0;
	}

	.error-message {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 1rem;
		background: rgba(239, 68, 68, 0.1);
		border: 1px solid rgba(239, 68, 68, 0.2);
		border-radius: var(--radius-md);
		color: var(--error);
		font-size: 0.9rem;
		margin-bottom: 1rem;
	}

	.error-message svg {
		flex-shrink: 0;
	}

	.error-message span {
		flex: 1;
	}

	.dismiss-btn {
		background: transparent;
		color: var(--error);
		padding: 0.25rem;
	}

	.dismiss-btn:hover {
		background: rgba(239, 68, 68, 0.1);
		border-radius: 50%;
	}

	.mb-4 {
		margin-bottom: 1rem;
	}

	.security-note {
		text-align: center;
		font-size: 0.8rem;
		color: var(--text-muted);
		line-height: 1.5;
	}

	.dashboard-layout {
		display: grid;
		grid-template-columns: 1fr 350px;
		gap: 1.5rem;
	}

	.comments-section {
		min-width: 0;
	}

	.section-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 1rem;
	}

	.section-header h2 {
		font-size: 1.25rem;
		font-weight: 700;
		color: var(--text-primary);
	}

	.comments-grid {
		display: grid;
		gap: 1rem;
	}

	.sidebar {
		position: sticky;
		top: 100px;
		height: fit-content;
	}

	.empty-state {
		text-align: center;
		padding: 4rem 2rem;
		background: var(--bg-card);
		border-radius: var(--radius-lg);
		border: 1px solid var(--bg-tertiary);
	}

	.empty-icon {
		font-size: 3rem;
		margin-bottom: 1rem;
		opacity: 0.5;
	}

	.empty-state h3 {
		font-size: 1.25rem;
		font-weight: 600;
		color: var(--text-primary);
		margin-bottom: 0.5rem;
	}

	.empty-state p {
		color: var(--text-muted);
	}

	.footer {
		padding: 2rem 0;
		text-align: center;
		color: var(--text-muted);
		font-size: 0.875rem;
		border-top: 1px solid var(--bg-tertiary);
	}

	@media (max-width: 1024px) {
		.dashboard-layout {
			grid-template-columns: 1fr;
		}

		.sidebar {
			position: relative;
			top: 0;
		}
	}

	@media (max-width: 640px) {
		.hero h1 {
			font-size: 1.75rem;
		}

		.hero-subtitle {
			font-size: 1rem;
		}

		.input-group {
			flex-direction: column;
		}

		.input-group .btn {
			width: 100%;
		}
	}
</style>
