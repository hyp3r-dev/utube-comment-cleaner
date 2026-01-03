<script lang="ts">
	import { searchQuery, filteredComments, comments } from '$lib/stores/comments';
	import { tick } from 'svelte';
	
	let inputElement: HTMLInputElement;
	let isFocused = $state(false);
	let localQuery = $state('');
	let isSearching = $state(false);
	let debounceTimeout: ReturnType<typeof setTimeout>;
	
	// Sync from store
	$effect(() => {
		localQuery = $searchQuery;
	});
	
	function handleInput(e: Event) {
		const value = (e.target as HTMLInputElement).value;
		localQuery = value;
		isSearching = true;
		
		// Debounce the search
		clearTimeout(debounceTimeout);
		debounceTimeout = setTimeout(() => {
			searchQuery.set(value);
			isSearching = false;
		}, 150);
	}
	
	function handleClear() {
		localQuery = '';
		searchQuery.set('');
		inputElement?.focus();
	}
	
	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			if (localQuery) {
				handleClear();
			} else {
				inputElement?.blur();
			}
		}
	}
	
	// Keyboard shortcut (Cmd/Ctrl + K)
	function handleGlobalKeydown(e: KeyboardEvent) {
		if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
			e.preventDefault();
			inputElement?.focus();
		}
	}
	
	$effect(() => {
		if (typeof window !== 'undefined') {
			window.addEventListener('keydown', handleGlobalKeydown);
			return () => window.removeEventListener('keydown', handleGlobalKeydown);
		}
	});
	
	const resultCount = $derived($filteredComments.length);
	const totalCount = $derived($comments.length);
	const hasQuery = $derived(localQuery.length > 0);
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
			placeholder="Search comments..."
			value={localQuery}
			oninput={handleInput}
			onfocus={() => isFocused = true}
			onblur={() => isFocused = false}
			onkeydown={handleKeydown}
			class="search-input"
			aria-label="Search comments"
		/>
		
		<div class="search-actions">
			{#if hasQuery}
				<div class="result-count" class:dimmed={isSearching}>
					<span class="count">{resultCount}</span>
					<span class="separator">/</span>
					<span class="total">{totalCount}</span>
				</div>
				
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
			{:else}
				<div class="shortcut-hint">
					<kbd>⌘</kbd><kbd>K</kbd>
				</div>
			{/if}
		</div>
	</div>
	
	{#if isFocused && hasQuery}
		<div class="search-overlay"></div>
	{/if}
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
		transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
		overflow: hidden;
	}

	.search-container.focused .search-wrapper {
		border-color: var(--accent-primary);
		box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.15), 0 4px 20px rgba(0, 0, 0, 0.2);
		transform: scale(1.01);
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
		padding: 14px 16px 14px 52px;
		background: transparent;
		border: none;
		outline: none;
		font-size: 1rem;
		color: var(--text-primary);
		width: 100%;
	}

	.search-input::placeholder {
		color: var(--text-muted);
		transition: color 0.2s ease;
	}

	.search-container.focused .search-input::placeholder {
		color: var(--text-secondary);
	}

	.search-actions {
		display: flex;
		align-items: center;
		gap: 8px;
		padding-right: 12px;
	}

	.result-count {
		display: flex;
		align-items: center;
		gap: 2px;
		font-size: 0.8rem;
		font-weight: 500;
		transition: opacity 0.2s ease;
	}

	.result-count.dimmed {
		opacity: 0.5;
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

	.clear-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 6px;
		background: var(--bg-tertiary);
		border-radius: 6px;
		color: var(--text-muted);
		transition: all 0.2s ease;
	}

	.clear-btn:hover {
		background: var(--error);
		color: white;
		transform: scale(1.1);
	}

	.shortcut-hint {
		display: flex;
		align-items: center;
		gap: 3px;
		opacity: 0.6;
		transition: opacity 0.2s ease;
	}

	.search-container:hover .shortcut-hint {
		opacity: 1;
	}

	.shortcut-hint kbd {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		min-width: 22px;
		height: 22px;
		padding: 0 5px;
		font-size: 0.7rem;
		font-family: inherit;
		font-weight: 600;
		color: var(--text-secondary);
		background: var(--bg-tertiary);
		border-radius: 4px;
		border: 1px solid var(--bg-hover);
	}

	.search-overlay {
		position: absolute;
		top: 100%;
		left: 0;
		right: 0;
		height: 4px;
		background: linear-gradient(90deg, var(--accent-primary), var(--accent-secondary), var(--accent-primary));
		background-size: 200% 100%;
		animation: shimmer 2s linear infinite;
		border-radius: 0 0 12px 12px;
		opacity: 0.6;
	}

	@keyframes shimmer {
		0% { background-position: -200% 0; }
		100% { background-position: 200% 0; }
	}

	@media (max-width: 640px) {
		.shortcut-hint {
			display: none;
		}

		.search-input {
			padding: 12px 12px 12px 44px;
			font-size: 0.95rem;
		}

		.search-icon-wrapper {
			left: 12px;
		}
	}
</style>
