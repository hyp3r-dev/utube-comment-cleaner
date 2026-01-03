<script lang="ts">
	import { filters, sortField, sortOrder, resetFilters } from '$lib/stores/comments';
	import SearchBar from './SearchBar.svelte';
	import type { SortField, CommentLabel } from '$lib/types/comment';

	let {
		groupByVideo = true,
		hideSelectedFromList = true,
		onGroupByVideoChange,
		onHideSelectedChange,
		onExportJson,
		onExportZip,
		onImport,
		onWipeData
	}: {
		groupByVideo?: boolean;
		hideSelectedFromList?: boolean;
		onGroupByVideoChange?: (value: boolean) => void;
		onHideSelectedChange?: (value: boolean) => void;
		onExportJson?: () => void;
		onExportZip?: () => void;
		onImport?: () => void;
		onWipeData?: () => void;
	} = $props();

	let isExpanded = $state(false);

	const sortOptions = [
		{ value: 'likeCount', label: 'Likes' },
		{ value: 'publishedAt', label: 'Date' },
		{ value: 'textLength', label: 'Length' }
	] as const;

	const labelOptions: { value: CommentLabel; label: string; icon: string }[] = [
		{ value: 'api_error', label: 'API Error', icon: '❌' },
		{ value: 'unenrichable', label: 'Unenrichable', icon: '⚠️' },
		{ value: 'externally_deleted', label: 'Externally Deleted', icon: '🗑️' }
	];

	function handleSortChange(field: SortField) {
		if ($sortField === field) {
			sortOrder.update(o => o === 'desc' ? 'asc' : 'desc');
		} else {
			sortField.set(field);
			sortOrder.set('desc');
		}
	}

	function toggleLabel(label: CommentLabel) {
		filters.update(f => {
			const currentLabels = f.labels || [];
			const hasLabel = currentLabels.includes(label);
			const newLabels = hasLabel 
				? currentLabels.filter(l => l !== label)
				: [...currentLabels, label];
			return { ...f, labels: newLabels.length > 0 ? newLabels : undefined };
		});
	}

	function toggleShowErrors() {
		filters.update(f => ({ ...f, showOnlyWithErrors: !f.showOnlyWithErrors }));
	}
	
	// Check if any filters are active
	const hasActiveFilters = $derived(
		$filters.minCharacters > 0 ||
		$filters.maxCharacters < 10000 ||
		$filters.minLikes > 0 ||
		$filters.maxLikes < 1000000 ||
		($filters.labels && $filters.labels.length > 0) ||
		$filters.showOnlyWithErrors
	);
</script>

<div class="filter-panel">
	<div class="search-row">
		<div class="search-bar">
			<SearchBar />

			<button 
				class="filter-toggle btn btn-secondary" 
				class:active={hasActiveFilters}
				onclick={() => isExpanded = !isExpanded}
			>
				<svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
					<path fill-rule="evenodd" d="M3 3a1 1 0 011-1h12a1 1 0 011 1v3a1 1 0 01-.293.707L12 11.414V15a1 1 0 01-.293.707l-2 2A1 1 0 018 17v-5.586L3.293 6.707A1 1 0 013 6V3z" clip-rule="evenodd" />
				</svg>
				<span>Filters</span>
				{#if hasActiveFilters}
					<span class="filter-badge">!</span>
				{/if}
				<span class="filter-arrow" class:rotated={isExpanded}>
					<svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
						<path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd" />
					</svg>
				</span>
			</button>
		</div>
		
		<!-- Actions integrated into the search row -->
		<div class="search-actions">
			<div class="action-buttons">
				<!-- Export JSON - arrow pointing UP (data going out) -->
				<button class="btn btn-ghost btn-sm" onclick={onExportJson} title="Export as JSON">
					<svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
						<path fill-rule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM6.293 6.707a1 1 0 010-1.414l3-3a1 1 0 011.414 0l3 3a1 1 0 01-1.414 1.414L11 5.414V13a1 1 0 11-2 0V5.414L7.707 6.707a1 1 0 01-1.414 0z" clip-rule="evenodd"/>
					</svg>
					<span class="btn-text">JSON</span>
				</button>
				<!-- Export ZIP - arrow pointing UP (data going out) -->
				<button class="btn btn-ghost btn-sm" onclick={onExportZip} title="Export as ZIP">
					<svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
						<path fill-rule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM6.293 6.707a1 1 0 010-1.414l3-3a1 1 0 011.414 0l3 3a1 1 0 01-1.414 1.414L11 5.414V13a1 1 0 11-2 0V5.414L7.707 6.707a1 1 0 01-1.414 0z" clip-rule="evenodd"/>
					</svg>
					<span class="btn-text">ZIP</span>
				</button>
				<!-- Import - arrow pointing DOWN (data coming in) -->
				<button class="btn btn-ghost btn-sm" onclick={onImport} title="Import JSON/ZIP">
					<svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
						<path fill-rule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clip-rule="evenodd"/>
					</svg>
					<span class="btn-text">Import</span>
				</button>
				<!-- Wipe data -->
				<button class="btn btn-ghost btn-sm btn-danger-text" onclick={onWipeData} title="Wipe all data">
					<svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
						<path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd"/>
					</svg>
				</button>
			</div>
			
			<!-- Toggles -->
			<div class="action-toggles">
				<label class="toggle-label">
					<input 
						type="checkbox" 
						checked={groupByVideo} 
						onchange={(e) => onGroupByVideoChange?.(e.currentTarget.checked)} 
					/>
					<span>Group</span>
				</label>
				<label class="toggle-label">
					<input 
						type="checkbox" 
						checked={hideSelectedFromList} 
						onchange={(e) => onHideSelectedChange?.(e.currentTarget.checked)} 
					/>
					<span>Hide ✓</span>
				</label>
			</div>
		</div>
	</div>

	{#if isExpanded}
		<div class="filter-content">
			<div class="filter-section">
				<h4>Character Count</h4>
				<div class="range-inputs">
					<div class="range-input">
						<label for="minChars">Min</label>
						<input
							id="minChars"
							type="number"
							min="0"
							bind:value={$filters.minCharacters}
						/>
					</div>
					<span class="range-separator">to</span>
					<div class="range-input">
						<label for="maxChars">Max</label>
						<input
							id="maxChars"
							type="number"
							min="0"
							bind:value={$filters.maxCharacters}
						/>
					</div>
				</div>
			</div>

			<div class="filter-section">
				<h4>Like Count</h4>
				<div class="range-inputs">
					<div class="range-input">
						<label for="minLikes">Min</label>
						<input
							id="minLikes"
							type="number"
							min="0"
							bind:value={$filters.minLikes}
						/>
					</div>
					<span class="range-separator">to</span>
					<div class="range-input">
						<label for="maxLikes">Max</label>
						<input
							id="maxLikes"
							type="number"
							min="0"
							bind:value={$filters.maxLikes}
						/>
					</div>
				</div>
			</div>

			<div class="filter-section">
				<h4>Labels</h4>
				<div class="label-filters">
					{#each labelOptions as option}
						<button 
							class="label-btn" 
							class:active={$filters.labels?.includes(option.value)}
							onclick={() => toggleLabel(option.value)}
							title={`Filter by ${option.label}`}
						>
							<span class="label-icon">{option.icon}</span>
							<span class="label-text">{option.label}</span>
						</button>
					{/each}
				</div>
				<label class="error-toggle">
					<input 
						type="checkbox" 
						checked={$filters.showOnlyWithErrors} 
						onchange={toggleShowErrors}
					/>
					<span>Show only comments with delete errors</span>
				</label>
			</div>

			<div class="filter-actions">
				<button class="btn btn-ghost" onclick={resetFilters}>
					Reset All
				</button>
			</div>
		</div>
	{/if}

	<div class="sort-bar">
		<span class="sort-label">Sort by:</span>
		{#each sortOptions as option}
			<button
				class="sort-btn"
				class:active={$sortField === option.value}
				onclick={() => handleSortChange(option.value)}
			>
				{option.label}
				{#if $sortField === option.value}
					<span class="sort-direction" class:asc={$sortOrder === 'asc'}>
						<svg width="12" height="12" viewBox="0 0 20 20" fill="currentColor">
							<path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd" />
						</svg>
					</span>
				{/if}
			</button>
		{/each}
	</div>
</div>

<style>
	.filter-panel {
		background: var(--bg-card);
		border-radius: var(--radius-lg);
		border: 1px solid var(--bg-tertiary);
		padding: 1rem;
		margin-bottom: 1.5rem;
	}

	.search-row {
		display: flex;
		gap: 1rem;
		align-items: center;
		flex-wrap: wrap;
	}

	.search-bar {
		display: flex;
		gap: 0.75rem;
		align-items: center;
		flex: 1;
		min-width: 280px;
	}

	.search-actions {
		display: flex;
		gap: 0.75rem;
		align-items: center;
		flex-wrap: wrap;
	}

	.action-buttons {
		display: flex;
		gap: 0.25rem;
		align-items: center;
	}

	.action-buttons .btn {
		padding: 0.4rem 0.6rem;
	}

	.action-buttons .btn-text {
		display: inline;
	}

	.action-toggles {
		display: flex;
		gap: 0.5rem;
		align-items: center;
	}

	.toggle-label {
		display: flex;
		align-items: center;
		gap: 0.35rem;
		font-size: 0.75rem;
		color: var(--text-secondary);
		cursor: pointer;
		padding: 0.35rem 0.5rem;
		border-radius: var(--radius-sm);
		background: var(--bg-tertiary);
		border: 1px solid transparent;
		transition: all 0.2s ease;
	}

	.toggle-label:hover {
		background: var(--bg-hover);
		color: var(--text-primary);
	}

	.toggle-label input[type="checkbox"] {
		width: 14px;
		height: 14px;
		accent-color: var(--accent-primary);
	}

	.filter-toggle {
		flex-shrink: 0;
		position: relative;
	}

	.filter-toggle.active {
		border-color: var(--accent-primary);
		background: rgba(99, 102, 241, 0.1);
	}

	.filter-badge {
		position: absolute;
		top: -4px;
		right: -4px;
		width: 16px;
		height: 16px;
		background: var(--accent-primary);
		color: white;
		font-size: 0.65rem;
		font-weight: 700;
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		animation: pulse 2s ease-in-out infinite;
	}

	@keyframes pulse {
		0%, 100% { transform: scale(1); }
		50% { transform: scale(1.1); }
	}

	.filter-arrow {
		transition: transform 0.3s ease;
	}

	.filter-arrow.rotated {
		transform: rotate(180deg);
	}

	.filter-content {
		margin-top: 1rem;
		padding-top: 1rem;
		border-top: 1px solid var(--bg-tertiary);
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
		gap: 1.5rem;
		animation: slideDown 0.3s ease;
	}

	@keyframes slideDown {
		from {
			opacity: 0;
			transform: translateY(-10px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	.filter-section h4 {
		font-size: 0.8rem;
		font-weight: 600;
		color: var(--text-secondary);
		text-transform: uppercase;
		letter-spacing: 0.05em;
		margin-bottom: 0.75rem;
	}

	.range-inputs {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.range-input {
		flex: 1;
	}

	.range-input label {
		display: block;
		font-size: 0.7rem;
		color: var(--text-muted);
		margin-bottom: 0.25rem;
	}

	.range-input input {
		padding: 0.5rem 0.75rem;
		font-size: 0.875rem;
	}

	.range-separator {
		color: var(--text-muted);
		font-size: 0.875rem;
		padding-top: 1rem;
	}

	.label-filters {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
		margin-bottom: 0.75rem;
	}

	.label-btn {
		display: inline-flex;
		align-items: center;
		gap: 0.35rem;
		padding: 0.4rem 0.75rem;
		border-radius: var(--radius-md);
		background: var(--bg-tertiary);
		color: var(--text-secondary);
		font-size: 0.8rem;
		font-weight: 500;
		transition: all 0.2s ease;
		border: 1px solid transparent;
	}

	.label-btn:hover {
		background: var(--bg-hover);
		color: var(--text-primary);
	}

	.label-btn.active {
		background: rgba(99, 102, 241, 0.15);
		border-color: var(--accent-primary);
		color: var(--accent-tertiary);
	}

	.label-icon {
		font-size: 0.9rem;
	}

	.error-toggle {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 0.8rem;
		color: var(--text-secondary);
		cursor: pointer;
		padding: 0.25rem 0;
	}

	.error-toggle input {
		width: 14px;
		height: 14px;
		accent-color: var(--accent-primary);
	}

	.error-toggle:hover {
		color: var(--text-primary);
	}

	.filter-actions {
		display: flex;
		justify-content: flex-end;
		grid-column: 1 / -1;
	}

	.sort-bar {
		margin-top: 1rem;
		padding-top: 1rem;
		border-top: 1px solid var(--bg-tertiary);
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}

	.sort-label {
		color: var(--text-muted);
		font-size: 0.875rem;
	}

	.sort-btn {
		display: inline-flex;
		align-items: center;
		gap: 0.25rem;
		padding: 0.35rem 0.75rem;
		border-radius: var(--radius-sm);
		background: transparent;
		color: var(--text-secondary);
		font-size: 0.8rem;
		font-weight: 500;
	}

	.sort-btn:hover {
		background: var(--bg-tertiary);
		color: var(--text-primary);
	}

	.sort-btn.active {
		background: var(--bg-tertiary);
		color: var(--accent-tertiary);
	}

	.sort-direction {
		transition: transform 0.2s ease;
	}

	.sort-direction.asc {
		transform: rotate(180deg);
	}

	@media (max-width: 900px) {
		.search-row {
			flex-direction: column;
			align-items: stretch;
		}

		.search-bar {
			min-width: unset;
		}

		.search-actions {
			justify-content: space-between;
		}
	}

	@media (max-width: 640px) {
		.search-bar {
			flex-direction: column;
		}

		.filter-toggle {
			width: 100%;
		}

		.filter-content {
			grid-template-columns: 1fr;
		}

		.sort-bar {
			flex-wrap: wrap;
		}

		.action-buttons .btn-text {
			display: none;
		}

		.action-buttons .btn {
			padding: 0.4rem;
		}
	}
</style>
