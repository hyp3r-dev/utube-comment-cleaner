<script lang="ts">
	import { searchQuery, filteredComments, comments, searchMode, type SearchMode } from '$lib/stores/comments';
	import Icon from './Icon.svelte';
	
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
					<Icon name="spinner" size={20} strokeWidth={2} />
				</div>
			{:else}
				<Icon name="search" size={20} class="search-icon" />
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
					<Icon name="error" size={16} />
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
					<Icon name="settings" size={16} />
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
										<Icon name="check" size={14} class="check-icon" />
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
				<Icon name="search" size={16} />
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
