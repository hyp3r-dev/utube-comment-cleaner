<script lang="ts">
	import { onMount } from 'svelte';
	import Logo from '$lib/components/Logo.svelte';
	import TakeoutGuide from '$lib/components/TakeoutGuide.svelte';
	import FilterPanel from '$lib/components/FilterPanel.svelte';
	import CommentCard from '$lib/components/CommentCard.svelte';
	import VideoGroup from '$lib/components/VideoGroup.svelte';
	import SelectedCommentsPanel from '$lib/components/SelectedCommentsPanel.svelte';
	import LoadingSpinner from '$lib/components/LoadingSpinner.svelte';
	import DeleteConfirmModal from '$lib/components/DeleteConfirmModal.svelte';
	import StatsBar from '$lib/components/StatsBar.svelte';
	import QuotaProgressBar from '$lib/components/QuotaProgressBar.svelte';
	import ToastContainer from '$lib/components/ToastContainer.svelte';
	import { toasts } from '$lib/stores/toast';
	import { 
		YouTubeService, 
		TokenExpiredError, 
		InsufficientScopesError, 
		NoChannelError, 
		QuotaExceededError,
		YouTubeAPIError 
	} from '$lib/services/youtube';
	import { parseTakeoutFile, readFileAsText, parseZipFile, parseMultipleFiles } from '$lib/services/takeout';
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
		logout,
		updateComments
	} from '$lib/stores/comments';
	import type { YouTubeComment } from '$lib/types/comment';
	import JSZip from 'jszip';

	let inputApiKey = $state('');
	let showDeleteModal = $state(false);
	let isDeleting = $state(false);
	let deleteProgress = $state<{ deleted: number; total: number } | undefined>();
	let youtubeService: YouTubeService | null = null;
	let fileInput: HTMLInputElement;
	let importJsonInput: HTMLInputElement;
	let isDragging = $state(false);
	let isEnriching = $state(false);
	let enrichProgress = $state<{ enriched: number; total: number } | undefined>();
	let groupByVideo = $state(true);
	let hideSelectedFromList = $state(true);

	// Group comments by video ID
	const groupedComments = $derived(() => {
		const groups = new Map<string, { videoId: string; videoTitle?: string; comments: YouTubeComment[] }>();
		
		for (const comment of $filteredComments) {
			const existing = groups.get(comment.videoId);
			if (existing) {
				existing.comments.push(comment);
				// Use the latest video title if available
				if (comment.videoTitle && !existing.videoTitle) {
					existing.videoTitle = comment.videoTitle;
				}
			} else {
				groups.set(comment.videoId, {
					videoId: comment.videoId,
					videoTitle: comment.videoTitle,
					comments: [comment]
				});
			}
		}
		
		return Array.from(groups.values());
	});

	// Count unenriched comments for enrichment banner
	const unenrichedCount = $derived($comments.filter(c => !c.isEnriched).length);

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

	async function handleFileImport(files: FileList | File[]) {
		const fileArray = Array.from(files);
		if (fileArray.length === 0) return;
		
		isLoading.set(true);
		error.set(null);
		loadingProgress.set({ loaded: 0, total: 1 });

		try {
			const importedComments = await parseMultipleFiles(fileArray, (progress) => {
				loadingProgress.set(progress);
			});
			
			if (importedComments.length === 0) {
				error.set('No comments found in the uploaded file(s). Make sure you uploaded the correct Google Takeout export (ZIP file or CSV).');
				isLoading.set(false);
				return;
			}

			comments.set(importedComments);
			await saveComments(importedComments);
			loadingProgress.set({ loaded: 1, total: 1 });
			
			isAuthenticated.set(true);
		} catch (e) {
			error.set(e instanceof Error ? e.message : 'Failed to parse file(s). Please make sure they are valid Google Takeout exports.');
		} finally {
			isLoading.set(false);
		}
	}

	function handleFileSelect(event: Event) {
		const input = event.target as HTMLInputElement;
		const files = input.files;
		if (files && files.length > 0) {
			handleFileImport(files);
		}
	}

	function handleDrop(event: DragEvent) {
		event.preventDefault();
		isDragging = false;
		const files = event.dataTransfer?.files;
		if (files && files.length > 0) {
			handleFileImport(files);
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
			toasts.success(`Connected to YouTube as "${validationResult.channelTitle}". You can now enrich and delete comments.`);
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

	async function handleEnrichComments() {
		if (!youtubeService || $comments.length === 0) return;
		
		// Only enrich comments that haven't been enriched yet
		const unenrichedComments = $comments.filter(c => !c.isEnriched);
		if (unenrichedComments.length === 0) return;
		
		isEnriching = true;
		enrichProgress = { enriched: 0, total: unenrichedComments.length };
		error.set(null);
		
		try {
			const result = await youtubeService.enrichComments(
				unenrichedComments, 
				// Progress callback
				(enriched, total) => {
					enrichProgress = { enriched, total };
				},
				// Real-time batch update callback
				(batchUpdates) => {
					// Update comments in place for immediate UI feedback
					updateComments(batchUpdates);
				}
			);
			
			// Final save to storage after all batches complete
			await saveComments($comments);
			
			if (result.missing.length > 0) {
				toasts.warning(`${result.missing.length} comment(s) could not be enriched (may be deleted or private).`);
			} else {
				toasts.success(`Successfully enriched ${result.enriched.filter(c => c.isEnriched).length} comments!`);
			}
		} catch (e) {
			error.set(getErrorMessage(e));
		} finally {
			isEnriching = false;
			enrichProgress = undefined;
		}
	}

	async function handleExportComments(asZip: boolean = false) {
		if ($comments.length === 0) return;
		
		const exportData = {
			version: 1,
			exportedAt: new Date().toISOString(),
			comments: $comments
		};
		
		const jsonString = JSON.stringify(exportData, null, 2);
		
		if (asZip) {
			const zip = new JSZip();
			zip.file('comments.json', jsonString);
			const blob = await zip.generateAsync({ type: 'blob' });
			downloadBlob(blob, 'commentslash-export.zip');
		} else {
			const blob = new Blob([jsonString], { type: 'application/json' });
			downloadBlob(blob, 'commentslash-export.json');
		}
	}

	function downloadBlob(blob: Blob, filename: string) {
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = filename;
		document.body.appendChild(a);
		a.click();
		document.body.removeChild(a);
		URL.revokeObjectURL(url);
	}

	async function handleImportJson(event: Event) {
		const input = event.target as HTMLInputElement;
		const files = input.files;
		if (!files || files.length === 0) return;
		
		isLoading.set(true);
		error.set(null);
		
		try {
			const file = files[0];
			let jsonString: string;
			
			if (file.name.endsWith('.zip')) {
				const zip = await JSZip.loadAsync(file);
				const jsonFile = zip.file('comments.json');
				if (!jsonFile) {
					throw new Error('No comments.json found in the zip file');
				}
				jsonString = await jsonFile.async('string');
			} else {
				jsonString = await readFileAsText(file);
			}
			
			const importData = JSON.parse(jsonString);
			
			if (!importData.comments || !Array.isArray(importData.comments)) {
				throw new Error('Invalid export file format');
			}
			
			// Merge with existing comments
			const existingIds = new Set($comments.map(c => c.id));
			const newComments = importData.comments.filter((c: YouTubeComment) => !existingIds.has(c.id));
			
			if (newComments.length > 0) {
				const merged = [...$comments, ...newComments];
				comments.set(merged);
				await saveComments(merged);
			}
			
			const addedCount = newComments.length;
			const skippedCount = importData.comments.length - addedCount;
			
			if (addedCount > 0) {
				toasts.success(`Import complete: ${addedCount} new comment(s) added, ${skippedCount} duplicate(s) skipped.`);
			} else {
				toasts.info(`All ${skippedCount} comment(s) were already in your collection.`);
			}
			
			isAuthenticated.set(true);
		} catch (e) {
			error.set(e instanceof Error ? e.message : 'Failed to import comments');
		} finally {
			isLoading.set(false);
			input.value = '';
		}
	}

	async function handleMergeTakeout(files: FileList | File[]) {
		const fileArray = Array.from(files);
		if (fileArray.length === 0) return;
		
		isLoading.set(true);
		error.set(null);
		loadingProgress.set({ loaded: 0, total: 1 });
		
		try {
			const newComments = await parseMultipleFiles(fileArray, (progress) => {
				loadingProgress.set(progress);
			});
			
			if (newComments.length === 0) {
				error.set('No comments found in the uploaded file(s).');
				isLoading.set(false);
				return;
			}
			
			// Create sets for comparison
			const newIds = new Set(newComments.map(c => c.id));
			const existingIds = new Set($comments.map(c => c.id));
			
			// Find comments that exist in current data but not in new takeout (externally deleted)
			const externallyDeleted = $comments.filter(c => !newIds.has(c.id) && !c.isExternallyDeleted);
			
			// Mark externally deleted comments
			const updatedComments = $comments.map(c => {
				if (!newIds.has(c.id) && !c.isExternallyDeleted) {
					return { ...c, isExternallyDeleted: true };
				}
				return c;
			});
			
			// Add new comments that don't exist
			const addedComments = newComments.filter(c => !existingIds.has(c.id));
			
			const merged = [...updatedComments, ...addedComments];
			comments.set(merged);
			await saveComments(merged);
			
			if (addedComments.length > 0) {
				toasts.success(`Merge complete: ${addedComments.length} new comment(s) added.`);
			} else {
				toasts.info('No new comments found in the takeout export.');
			}
			
			if (externallyDeleted.length > 0) {
				toasts.warning(`${externallyDeleted.length} comment(s) marked as externally deleted.`);
			}
			
		} catch (e) {
			error.set(e instanceof Error ? e.message : 'Failed to merge takeout data');
		} finally {
			isLoading.set(false);
		}
	}

	// Count of enriched vs unenriched comments
	const enrichedCount = $derived($comments.filter(c => c.isEnriched).length);
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
								accept=".csv,.zip"
								onchange={handleFileSelect}
								bind:this={fileInput}
								class="file-input"
								multiple
							/>
							<div class="drop-zone-content">
								<div class="drop-icon">📦</div>
								<p class="drop-text">
									Drag & drop your Google Takeout export here
								</p>
								<p class="drop-subtext">Supports <strong>ZIP files</strong> or CSV • or click to browse</p>
								<button class="btn btn-primary" onclick={() => fileInput.click()}>
									<svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
										<path fill-rule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM6.293 6.707a1 1 0 010-1.414l3-3a1 1 0 011.414 0l3 3a1 1 0 01-1.414 1.414L11 5.414V13a1 1 0 11-2 0V5.414L7.707 6.707a1 1 0 01-1.414 0z" clip-rule="evenodd" />
									</svg>
									Select File(s)
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
									<strong>Connect your YouTube account to enrich & delete comments</strong>
									<p>Enter your OAuth access token to fetch likes, reply counts, and enable deletion</p>
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
					{:else if unenrichedCount > 0}
						<div class="enrich-banner">
							<div class="banner-content">
								<div class="banner-icon">✨</div>
								<div class="banner-text">
									<strong>Enrich comments with YouTube data</strong>
									<p>{unenrichedCount} comment(s) need enrichment to show likes and reply counts</p>
								</div>
							</div>
							{#if isEnriching}
								<div class="enrich-progress">
									<LoadingSpinner size={24} message="" />
									<span>{enrichProgress?.enriched || 0} / {enrichProgress?.total || 0}</span>
								</div>
							{:else}
								<button class="btn btn-primary" onclick={handleEnrichComments}>
									<svg width="18" height="18" viewBox="0 0 20 20" fill="currentColor">
										<path d="M5 2a1 1 0 011 1v1h1a1 1 0 010 2H6v1a1 1 0 01-2 0V6H3a1 1 0 010-2h1V3a1 1 0 011-1zm0 10a1 1 0 011 1v1h1a1 1 0 110 2H6v1a1 1 0 11-2 0v-1H3a1 1 0 110-2h1v-1a1 1 0 011-1zM12 2a1 1 0 01.967.744L14.146 7.2 17.5 9.134a1 1 0 010 1.732l-3.354 1.935-1.18 4.455a1 1 0 01-1.933 0L9.854 12.8 6.5 10.866a1 1 0 010-1.732l3.354-1.935 1.18-4.455A1 1 0 0112 2z"/>
									</svg>
									Enrich Comments
								</button>
							{/if}
						</div>
					{/if}

					<!-- Action bar with export/import -->
					<div class="action-bar">
						<div class="action-group">
							<button class="btn btn-ghost btn-sm" onclick={() => handleExportComments(false)}>
								<svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
									<path fill-rule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clip-rule="evenodd"/>
								</svg>
								Export JSON
							</button>
							<button class="btn btn-ghost btn-sm" onclick={() => handleExportComments(true)}>
								<svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
									<path fill-rule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clip-rule="evenodd"/>
								</svg>
								Export ZIP
							</button>
							<input
								type="file"
								accept=".json,.zip"
								onchange={handleImportJson}
								bind:this={importJsonInput}
								class="hidden-input"
							/>
							<button class="btn btn-ghost btn-sm" onclick={() => importJsonInput.click()}>
								<svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
									<path fill-rule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM6.293 6.707a1 1 0 010-1.414l3-3a1 1 0 011.414 0l3 3a1 1 0 01-1.414 1.414L11 5.414V13a1 1 0 11-2 0V5.414L7.707 6.707a1 1 0 01-1.414 0z" clip-rule="evenodd"/>
								</svg>
								Import
							</button>
						</div>
						<div class="action-group">
							<label class="toggle-label">
								<input type="checkbox" bind:checked={groupByVideo} />
								<span>Group by video</span>
							</label>
							<label class="toggle-label">
								<input type="checkbox" bind:checked={hideSelectedFromList} />
								<span>Hide selected</span>
							</label>
						</div>
					</div>

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
							{:else if groupByVideo}
								<div class="video-groups">
									{#each groupedComments() as group (group.videoId)}
										<VideoGroup 
											videoId={group.videoId}
											videoTitle={group.videoTitle}
											comments={group.comments}
											hideSelectedComments={hideSelectedFromList}
										/>
									{/each}
								</div>
							{:else}
								<div class="comments-grid">
									{#each $filteredComments as comment (comment.id)}
										<CommentCard {comment} hideWhenSelected={hideSelectedFromList} />
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

<ToastContainer />

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

	/* Enrich banner */
	.enrich-banner {
		background: linear-gradient(135deg, rgba(34, 197, 94, 0.1) 0%, rgba(59, 130, 246, 0.1) 100%);
		border: 1px solid rgba(34, 197, 94, 0.2);
		border-radius: var(--radius-lg);
		padding: 1.25rem;
		margin-bottom: 1.5rem;
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 1rem;
	}

	.enrich-progress {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		color: var(--text-secondary);
		font-size: 0.9rem;
	}

	/* Action bar */
	.action-bar {
		display: flex;
		justify-content: space-between;
		align-items: center;
		flex-wrap: wrap;
		gap: 1rem;
		margin-bottom: 1rem;
		padding: 0.75rem 1rem;
		background: var(--bg-card);
		border-radius: var(--radius-md);
		border: 1px solid var(--bg-tertiary);
	}

	.action-group {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		flex-wrap: wrap;
	}

	.btn-sm {
		padding: 0.4rem 0.75rem;
		font-size: 0.8rem;
	}

	.hidden-input {
		display: none;
	}

	.toggle-label {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 0.8rem;
		color: var(--text-secondary);
		cursor: pointer;
		padding: 0.35rem 0.75rem;
		border-radius: var(--radius-sm);
		transition: all 0.2s ease;
	}

	.toggle-label:hover {
		background: var(--bg-tertiary);
		color: var(--text-primary);
	}

	.toggle-label input[type="checkbox"] {
		width: 16px;
		height: 16px;
		accent-color: var(--accent-primary);
	}

	/* Video groups */
	.video-groups {
		display: flex;
		flex-direction: column;
		gap: 0;
	}

	@media (max-width: 640px) {
		.action-bar {
			flex-direction: column;
			align-items: stretch;
		}

		.action-group {
			justify-content: center;
		}

		.enrich-banner {
			flex-direction: column;
			align-items: stretch;
		}
	}
</style>
