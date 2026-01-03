<script lang="ts">
	import { onMount } from 'svelte';
	import Logo from '$lib/components/Logo.svelte';
	import TakeoutGuide from '$lib/components/TakeoutGuide.svelte';
	import FilterPanel from '$lib/components/FilterPanel.svelte';
	import CommentCard from '$lib/components/CommentCard.svelte';
	import SelectedCommentsPanel from '$lib/components/SelectedCommentsPanel.svelte';
	import LoadingSpinner from '$lib/components/LoadingSpinner.svelte';
	import DeleteConfirmModal from '$lib/components/DeleteConfirmModal.svelte';
	import StatsBar from '$lib/components/StatsBar.svelte';
	import QuotaProgressBar from '$lib/components/QuotaProgressBar.svelte';
	import { 
		YouTubeService, 
		TokenExpiredError, 
		InsufficientScopesError, 
		NoChannelError, 
		QuotaExceededError,
		YouTubeAPIError 
	} from '$lib/services/youtube';
	import { parseTakeoutFile, readFileAsText } from '$lib/services/takeout';
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
	let fileInput: HTMLInputElement;
	let isDragging = $state(false);

	onMount(async () => {
		// Try to load cached comments
		try {
			const cachedComments = await loadComments();
			if (cachedComments.length > 0) {
				comments.set(cachedComments);
			}
		} catch (e) {
			console.error('Failed to load cached comments:', e);
		}
	});

	function getErrorMessage(e: unknown): string {
		if (e instanceof TokenExpiredError) {
			return 'Your access token has expired. Please generate a new one from the OAuth Playground.';
		}
		if (e instanceof InsufficientScopesError) {
			return 'Your access token does not have the required permissions. Please authorize with the "youtube.force-ssl" scope in the OAuth Playground.';
		}
		if (e instanceof NoChannelError) {
			return 'No YouTube channel found for this Google account. Please visit YouTube.com and create a channel first.';
		}
		if (e instanceof QuotaExceededError) {
			return 'YouTube API quota exceeded. The quota resets daily at midnight Pacific Time.';
		}
		if (e instanceof YouTubeAPIError) {
			return e.message;
		}
		if (e instanceof Error) {
			return e.message;
		}
		return 'An unexpected error occurred. Please try again.';
	}

	async function handleFileImport(file: File) {
		if (!file) return;
		
		isLoading.set(true);
		error.set(null);
		loadingProgress.set({ loaded: 0, total: 1 });

		try {
			const content = await readFileAsText(file);
			loadingProgress.set({ loaded: 0.5, total: 1 });
			
			const importedComments = parseTakeoutFile(content, file.name);
			
			if (importedComments.length === 0) {
				error.set('No comments found in the uploaded file. Make sure you uploaded a Google Takeout comments file (my-comments.html or comments.json).');
				isLoading.set(false);
				return;
			}

			comments.set(importedComments);
			await saveComments(importedComments);
			loadingProgress.set({ loaded: 1, total: 1 });
			
			isAuthenticated.set(true);
		} catch (e) {
			error.set(e instanceof Error ? e.message : 'Failed to parse file. Please make sure it\'s a valid Google Takeout export.');
		} finally {
			isLoading.set(false);
		}
	}

	function handleFileSelect(event: Event) {
		const input = event.target as HTMLInputElement;
		const file = input.files?.[0];
		if (file) {
			handleFileImport(file);
		}
	}

	function handleDrop(event: DragEvent) {
		event.preventDefault();
		isDragging = false;
		const file = event.dataTransfer?.files?.[0];
		if (file) {
			handleFileImport(file);
		}
	}

	function handleDragOver(event: DragEvent) {
		event.preventDefault();
		isDragging = true;
	}

	function handleDragLeave() {
		isDragging = false;
	}

	async function handleConnectToken() {
		if (!inputApiKey.trim()) {
			error.set('Please enter your OAuth access token');
			return;
		}

		isLoading.set(true);
		error.set(null);

		try {
			youtubeService = new YouTubeService(inputApiKey.trim());
			
			// Validate the token
			const validationResult = await youtubeService.validateToken();
			
			if (!validationResult.valid) {
				error.set(validationResult.error || 'Invalid access token');
				isLoading.set(false);
				return;
			}
			
			// Store the token for delete operations
			apiKey.set(inputApiKey.trim());
			error.set(null);
			
			// Show success message
			alert(`Connected to YouTube as "${validationResult.channelTitle}". You can now delete comments.`);
		} catch (e) {
			error.set(getErrorMessage(e));
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
							Find and manage your YouTube comments with precision. Import your comment history,
							filter by date, and clean up your digital footprint!
						</p>
					</div>

					{#if $error}
						<div class="error-message animate-fade-in">
							<svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
								<path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
							</svg>
							<span>{$error}</span>
						</div>
					{/if}

					<div class="import-section animate-fade-in">
						<h2>Import Your Comment History</h2>
						<p class="import-description">
							Upload your Google Takeout export to view and manage all comments you've ever made on YouTube.
						</p>
						
						<!-- svelte-ignore a11y_no_static_element_interactions -->
						<div 
							class="drop-zone"
							class:dragging={isDragging}
							ondrop={handleDrop}
							ondragover={handleDragOver}
							ondragleave={handleDragLeave}
						>
							<input
								type="file"
								accept=".html,.htm,.json"
								onchange={handleFileSelect}
								bind:this={fileInput}
								class="file-input"
							/>
							<div class="drop-zone-content">
								<div class="drop-icon">📁</div>
								<p class="drop-text">
									Drag & drop your <strong>my-comments.html</strong> file here
								</p>
								<p class="drop-subtext">or click to browse</p>
								<button class="btn btn-primary" onclick={() => fileInput.click()}>
									<svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
										<path fill-rule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM6.293 6.707a1 1 0 010-1.414l3-3a1 1 0 011.414 0l3 3a1 1 0 01-1.414 1.414L11 5.414V13a1 1 0 11-2 0V5.414L7.707 6.707a1 1 0 01-1.414 0z" clip-rule="evenodd" />
									</svg>
									Select File
								</button>
							</div>
						</div>

						<p class="security-note">
							🔒 Your data stays private. Files are processed locally in your browser and never uploaded to any server.
						</p>
					</div>

					<TakeoutGuide />
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

					<!-- Token connection for delete operations -->
					{#if !$apiKey}
						<div class="token-connect-banner">
							<div class="banner-content">
								<div class="banner-icon">🔑</div>
								<div class="banner-text">
									<strong>Connect your YouTube account to delete comments</strong>
									<p>Enter your OAuth access token to enable comment deletion</p>
								</div>
							</div>
							<div class="banner-form">
								<input
									type="password"
									placeholder="Paste your OAuth access token..."
									bind:value={inputApiKey}
									onkeydown={(e) => e.key === 'Enter' && handleConnectToken()}
								/>
								<button class="btn btn-primary" onclick={handleConnectToken}>
									Connect
								</button>
							</div>
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

	/* Import section styles */
	.import-section {
		background: var(--bg-card);
		border-radius: var(--radius-xl);
		border: 1px solid var(--bg-tertiary);
		padding: 2rem;
		margin-bottom: 1.5rem;
	}

	.import-section h2 {
		font-size: 1.25rem;
		font-weight: 700;
		color: var(--text-primary);
		margin-bottom: 0.5rem;
		text-align: center;
	}

	.import-description {
		text-align: center;
		color: var(--text-secondary);
		margin-bottom: 1.5rem;
	}

	.drop-zone {
		position: relative;
		border: 2px dashed var(--bg-tertiary);
		border-radius: var(--radius-lg);
		padding: 3rem 2rem;
		text-align: center;
		transition: all 0.3s ease;
		cursor: pointer;
		margin-bottom: 1rem;
	}

	.drop-zone:hover,
	.drop-zone.dragging {
		border-color: var(--accent-primary);
		background: rgba(99, 102, 241, 0.05);
	}

	.drop-zone.dragging {
		transform: scale(1.02);
	}

	.file-input {
		position: absolute;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		opacity: 0;
		cursor: pointer;
	}

	.drop-zone-content {
		pointer-events: none;
	}

	.drop-icon {
		font-size: 3rem;
		margin-bottom: 1rem;
	}

	.drop-text {
		font-size: 1rem;
		color: var(--text-primary);
		margin-bottom: 0.5rem;
	}

	.drop-subtext {
		font-size: 0.875rem;
		color: var(--text-muted);
		margin-bottom: 1rem;
	}

	.drop-zone-content .btn {
		pointer-events: auto;
	}

	/* Token connect banner */
	.token-connect-banner {
		background: linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(139, 92, 246, 0.1) 100%);
		border: 1px solid rgba(99, 102, 241, 0.2);
		border-radius: var(--radius-lg);
		padding: 1.25rem;
		margin-bottom: 1.5rem;
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 1rem;
	}

	.banner-content {
		display: flex;
		align-items: center;
		gap: 1rem;
		flex: 1;
		min-width: 200px;
	}

	.banner-icon {
		font-size: 1.5rem;
	}

	.banner-text strong {
		display: block;
		color: var(--text-primary);
		font-size: 0.95rem;
	}

	.banner-text p {
		color: var(--text-secondary);
		font-size: 0.8rem;
		margin-top: 0.25rem;
	}

	.banner-form {
		display: flex;
		gap: 0.5rem;
		flex-shrink: 0;
	}

	.banner-form input {
		width: 220px;
		padding: 0.5rem 0.75rem;
		font-size: 0.875rem;
	}

	.banner-form .btn {
		padding: 0.5rem 1rem;
		font-size: 0.875rem;
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

		.token-connect-banner {
			flex-direction: column;
			align-items: stretch;
		}

		.banner-form {
			flex-direction: column;
		}

		.banner-form input {
			width: 100%;
		}
	}
</style>
