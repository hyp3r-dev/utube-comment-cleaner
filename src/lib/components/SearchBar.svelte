<script lang="ts">
	import { searchQuery, filteredComments, comments, searchMode, type SearchMode } from '$lib/stores/comments';
	
	let inputElement: HTMLInputElement;
	let isFocused = $state(false);
	let localQuery = $state('');
	let isSearching = $state(false);
	let showSettingsPopup = $state(false);
	
	// Sync from store
	$effect(() => {
		localQuery = $searchQuery;
	});
	
	function handleInput(e: Event) {
		const value = (e.target as HTMLInputElement).value;
		localQuery = value;
	}
	
	function executeSearch() {
		if (localQuery !== $searchQuery) {
			isSearching = true;
			// Use setTimeout to allow UI to show searching state
			setTimeout(() => {
				searchQuery.set(localQuery);
				isSearching = false;
			}, 0);
		}
	}
	
	function handleClear() {
		localQuery = '';
		searchQuery.set('');
		inputElement?.focus();
	}
	
	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter') {
			e.preventDefault();
			executeSearch();
		} else if (e.key === 'Escape') {
			if (showSettingsPopup) {
				showSettingsPopup = false;
			} else if (localQuery) {
				handleClear();
			} else {
				inputElement?.blur();
			}
		}
	}

	function setSearchMode(mode: SearchMode) {
		searchMode.set(mode);
		// Re-execute search if there's an active query
		if ($searchQuery) {
			isSearching = true;
			setTimeout(() => {
				searchQuery.set($searchQuery);
				isSearching = false;
			}, 0);
		}
	}
	
	function toggleSettingsPopup(e: MouseEvent) {
		e.stopPropagation();
		showSettingsPopup = !showSettingsPopup;
	}
	
	// Close popup when clicking outside
	function handleDocumentClick(e: MouseEvent) {
		if (showSettingsPopup) {
			showSettingsPopup = false;
		}
	}
	
	// Add document click listener only when popup is open
	$effect(() => {
		if (showSettingsPopup && typeof document !== 'undefined') {
			document.addEventListener('click', handleDocumentClick);
			return () => {
				document.removeEventListener('click', handleDocumentClick);
			};
		}
	});
	
	const resultCount = $derived($filteredComments.length);
	const totalCount = $derived($comments.length);
	const hasQuery = $derived($searchQuery.length > 0);
	const hasLocalQuery = $derived(localQuery.length > 0);

	// Search mode options
	const searchModes: { value: SearchMode; label: string; icon: string; title: string }[] = [
		{ value: 'all', label: 'All Fields', icon: '🔍', title: 'Search in comments, video titles, and channel names' },
		{ value: 'comments', label: 'Comments', icon: '💬', title: 'Search in comment text only' },
		{ value: 'videos', label: 'Video Titles', icon: '📹', title: 'Search in video titles only' },
		{ value: 'channels', label: 'Channel Names', icon: '👤', title: 'Search in channel names only' }
	];
	
	// Get current mode label
	const currentModeLabel = $derived(searchModes.find(m => m.value === $searchMode)?.label || 'All Fields');
</script>

<div class="search-container" class:focused={isFocused}>
	<div class="search-wrapper">
		<div class="search-icon-wrapper">
			{#if isSearching}
				<div class="search-spinner">
					<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<circle cx="12" cy="12" r="10" stroke-dasharray="31.416" stroke-dashoffset="10" />
					</svg>
				</div>
			{:else}
				<svg class="search-icon" width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
					<path fill-rule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clip-rule="evenodd" />
				</svg>
			{/if}
		</div>
		
		<input
			bind:this={inputElement}
			type="text"
			placeholder="Search comments... (press Enter)"
			value={localQuery}
			oninput={handleInput}
			onfocus={() => isFocused = true}
			onblur={() => isFocused = false}
			onkeydown={handleKeydown}
			class="search-input"
			aria-label="Search comments"
		/>
		
		<div class="search-actions">
			<!-- Always show result count area to prevent layout shift -->
			<div class="result-count" class:visible={hasQuery}>
				{#if hasQuery}
					<span class="count">{resultCount}</span>
					<span class="separator">/</span>
					<span class="total">{totalCount}</span>
				{/if}
			</div>
			
			{#if hasLocalQuery}
				<button 
					class="clear-btn" 
					onclick={handleClear} 
					aria-label="Clear search"
					type="button"
				>
					<svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
						<path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
					</svg>
				</button>
			{/if}
			
			<!-- Settings cog button for search mode -->
			<div class="settings-container">
				<button 
					class="settings-btn" 
					class:active={showSettingsPopup || $searchMode !== 'all'}
					onclick={toggleSettingsPopup}
					aria-label="Search settings"
					type="button"
					title={`Search mode: ${currentModeLabel}`}
				>
					<svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
						<path fill-rule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clip-rule="evenodd" />
					</svg>
				</button>
				
				<!-- Settings popup -->
				{#if showSettingsPopup}
					<!-- svelte-ignore a11y_click_events_have_key_events -->
					<!-- svelte-ignore a11y_no_static_element_interactions -->
					<div class="settings-popup" onclick={(e) => e.stopPropagation()}>
						<div class="popup-header">Search in:</div>
						<div class="search-modes">
							{#each searchModes as mode}
								<button
									class="mode-btn"
									class:active={$searchMode === mode.value}
									onclick={() => setSearchMode(mode.value)}
									title={mode.title}
									type="button"
								>
									<span class="mode-icon">{mode.icon}</span>
									<span class="mode-label">{mode.label}</span>
									{#if $searchMode === mode.value}
										<svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor" class="check-icon">
											<path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/>
										</svg>
									{/if}
								</button>
							{/each}
						</div>
					</div>
				{/if}
			</div>
			
			<button 
				class="search-btn" 
				class:highlight={localQuery !== $searchQuery && hasLocalQuery}
				onclick={executeSearch} 
				aria-label="Search"
				type="button"
				disabled={isSearching}
			>
				<svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
					<path fill-rule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clip-rule="evenodd" />
				</svg>
			</button>
		</div>
	</div>
</div>

<style>
	.search-container {
		position: relative;
		width: 100%;
		max-width: 600px;
	}

	.search-wrapper {
		position: relative;
		display: flex;
		align-items: center;
		background: var(--bg-card);
		border: 2px solid var(--bg-tertiary);
		border-radius: 12px;
		transition: border-color 0.2s ease, box-shadow 0.2s ease;
	}

	.search-container.focused .search-wrapper {
		border-color: var(--accent-primary);
		box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.15);
	}

	.search-icon-wrapper {
		position: absolute;
		left: 16px;
		display: flex;
		align-items: center;
		justify-content: center;
		color: var(--text-muted);
		transition: color 0.2s ease;
		z-index: 2;
		pointer-events: none;
	}

	.search-container.focused .search-icon-wrapper {
		color: var(--accent-primary);
	}

	.search-icon {
		transition: transform 0.2s ease;
	}

	.search-container.focused .search-icon {
		transform: scale(1.1);
	}

	.search-spinner {
		animation: spin 0.8s linear infinite;
	}

	@keyframes spin {
		from { transform: rotate(0deg); }
		to { transform: rotate(360deg); }
	}

	.search-input {
		flex: 1;
		padding: 12px 16px 12px 48px;
		background: transparent;
		border: none;
		outline: none;
		font-size: 0.95rem;
		color: var(--text-primary);
		width: 100%;
	}

	/* Override global focus styles - the wrapper handles focus state */
	.search-input:focus {
		box-shadow: none;
		border-color: transparent;
	}

	.search-input::placeholder {
		color: var(--text-muted);
	}

	.search-actions {
		display: flex;
		align-items: center;
		gap: 6px;
		padding-right: 8px;
		/* Reserve minimum width to prevent layout shift */
		min-width: 90px;
	}

	.result-count {
		display: flex;
		align-items: center;
		gap: 2px;
		font-size: 0.8rem;
		font-weight: 500;
		padding: 4px 0;
		/* Reserve minimum width for consistent layout */
		min-width: 60px;
		/* Hidden by default */
		opacity: 0;
		visibility: hidden;
		transition: opacity 0.15s ease;
	}

	.result-count.visible {
		opacity: 1;
		visibility: visible;
	}

	.result-count .count {
		color: var(--accent-primary);
		font-weight: 700;
	}

	.result-count .separator {
		color: var(--text-muted);
	}

	.result-count .total {
		color: var(--text-secondary);
	}

	.clear-btn,
	.search-btn,
	.settings-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 6px;
		background: var(--bg-tertiary);
		border-radius: 6px;
		color: var(--text-muted);
		transition: all 0.2s ease;
		border: none;
		cursor: pointer;
	}

	.clear-btn:hover {
		background: var(--error);
		color: white;
	}

	.search-btn:hover {
		background: var(--accent-primary);
		color: white;
	}

	.search-btn.highlight {
		background: var(--accent-primary);
		color: white;
		animation: pulse 1.5s ease-in-out infinite;
	}

	.search-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	@keyframes pulse {
		0%, 100% { opacity: 1; }
		50% { opacity: 0.7; }
	}

	/* Settings button and popup container */
	.settings-container {
		position: relative;
	}

	.settings-btn:hover {
		background: var(--bg-hover);
		color: var(--text-primary);
	}

	.settings-btn.active {
		background: rgba(99, 102, 241, 0.2);
		color: var(--accent-primary);
	}

	/* Settings popup */
	.settings-popup {
		position: absolute;
		top: 100%;
		right: 0;
		margin-top: 8px;
		background: var(--bg-card);
		border: 1px solid var(--bg-tertiary);
		border-radius: var(--radius-md);
		box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
		z-index: 100;
		min-width: 180px;
		animation: popupSlideIn 0.2s ease;
	}

	@keyframes popupSlideIn {
		from {
			opacity: 0;
			transform: translateY(-8px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	.popup-header {
		padding: 0.5rem 0.75rem;
		font-size: 0.7rem;
		font-weight: 600;
		color: var(--text-muted);
		text-transform: uppercase;
		letter-spacing: 0.05em;
		border-bottom: 1px solid var(--bg-tertiary);
	}

	/* Search mode options in popup */
	.search-modes {
		display: flex;
		flex-direction: column;
		padding: 0.25rem;
	}

	.mode-btn {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.5rem 0.75rem;
		background: transparent;
		border: none;
		border-radius: var(--radius-sm);
		color: var(--text-secondary);
		font-size: 0.85rem;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.15s ease;
		text-align: left;
		width: 100%;
	}

	.mode-btn:hover {
		background: var(--bg-tertiary);
		color: var(--text-primary);
	}

	.mode-btn.active {
		background: rgba(99, 102, 241, 0.15);
		color: var(--accent-primary);
	}

	.mode-icon {
		font-size: 0.9rem;
		line-height: 1;
	}

	.mode-label {
		flex: 1;
		line-height: 1;
	}

	.check-icon {
		color: var(--accent-primary);
	}

	@media (max-width: 640px) {
		.search-input {
			padding: 10px 12px 10px 44px;
			font-size: 0.9rem;
		}

		.search-icon-wrapper {
			left: 12px;
		}

		.search-actions {
			gap: 4px;
			padding-right: 6px;
		}

		.settings-popup {
			right: -40px;
		}
	}
</style>
