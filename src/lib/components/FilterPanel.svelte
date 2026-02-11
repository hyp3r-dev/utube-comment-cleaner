<script lang="ts">
	import { filters, sortField, sortOrder, resetFilters, clearChannelFilter, setDateRange, clearDateRange } from '$lib/stores/comments';
	import SearchBar from './SearchBar.svelte';
	import DateRangePicker from './DateRangePicker.svelte';
	import Icon from './Icon.svelte';
	import type { SortField, CommentLabel } from '$lib/types/comment';
	import { onMount } from 'svelte';
	import { getCommentDateBounds } from '$lib/services/storage';

	// Filter default/max values as constants
	const DEFAULT_MAX_CHARACTERS = 10000;
	const DEFAULT_MAX_LIKES = 1000000;

	let {
		groupByVideo = true,
		hideSelectedFromList = true,
		onGroupByVideoChange,
		onHideSelectedChange,
		onWipeData
	}: {
		groupByVideo?: boolean;
		hideSelectedFromList?: boolean;
		onGroupByVideoChange?: (value: boolean) => void;
		onHideSelectedChange?: (value: boolean) => void;
		onWipeData?: () => void;
	} = $props();

	let isExpanded = $state(false);
	
	// Date bounds from IndexedDB
	let oldestDate = $state<string | null>(null);
	let newestDate = $state<string | null>(null);
	
	// Load date bounds on mount
	onMount(async () => {
		const bounds = await getCommentDateBounds();
		oldestDate = bounds.oldest;
		newestDate = bounds.newest;
	});

	const sortOptions = [
		{ value: 'publishedAt', label: 'Date' },
		{ value: 'likeCount', label: 'Likes' },
		{ value: 'textLength', label: 'Length' }
	] as const;

	const labelOptions: { value: CommentLabel; label: string; icon: string }[] = [
		{ value: 'api_error', label: 'Delete Error', icon: '❌' },
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

	// Clear specific filters
	function clearMinCharacters() {
		filters.update(f => ({ ...f, minCharacters: 0 }));
	}

	function clearMaxCharacters() {
		filters.update(f => ({ ...f, maxCharacters: DEFAULT_MAX_CHARACTERS }));
	}

	function clearMinLikes() {
		filters.update(f => ({ ...f, minLikes: 0 }));
	}

	function clearMaxLikes() {
		filters.update(f => ({ ...f, maxLikes: DEFAULT_MAX_LIKES }));
	}
	
	// Check if any filters are active
	const hasActiveFilters = $derived(
		$filters.minCharacters > 0 ||
		$filters.maxCharacters < DEFAULT_MAX_CHARACTERS ||
		$filters.minLikes > 0 ||
		$filters.maxLikes < DEFAULT_MAX_LIKES ||
		($filters.labels && $filters.labels.length > 0) ||
		$filters.channelFilter !== undefined ||
		$filters.dateRange !== undefined
	);

	// Individual active filter checks
	const hasCharacterFilter = $derived($filters.minCharacters > 0 || $filters.maxCharacters < DEFAULT_MAX_CHARACTERS);
	const hasLikesFilter = $derived($filters.minLikes > 0 || $filters.maxLikes < DEFAULT_MAX_LIKES);
	const hasLabelFilter = $derived($filters.labels && $filters.labels.length > 0);
	const hasChannelFilter = $derived($filters.channelFilter !== undefined);
	const hasDateFilter = $derived($filters.dateRange !== undefined);

	// Helper function to format filter range display text
	function formatRangeDisplay(min: number, max: number, defaultMax: number, prefix: string): string {
		const hasMin = min > 0;
		const hasMax = max < defaultMax;
		if (hasMin && hasMax) {
			return `${prefix}: ${min}+ - ≤${max}`;
		} else if (hasMin) {
			return `${prefix}: ${min}+`;
		} else if (hasMax) {
			return `${prefix}: ≤${max}`;
		}
		return prefix;
	}
	
	// Format date for display
	function formatDateShort(dateStr: string): string {
		if (!dateStr) return '';
		const date = new Date(dateStr + 'T00:00:00');
		return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' });
	}
	
	// Date filter display text
	const dateFilterText = $derived(() => {
		if (!$filters.dateRange) return '';
		const { startDate, endDate } = $filters.dateRange;
		if (startDate && endDate) return `${formatDateShort(startDate)} - ${formatDateShort(endDate)}`;
		if (startDate) return `From ${formatDateShort(startDate)}`;
		return `Until ${formatDateShort(endDate)}`;
	});

	// Computed filter display text
	const characterFilterText = $derived(
		formatRangeDisplay($filters.minCharacters, $filters.maxCharacters, DEFAULT_MAX_CHARACTERS, 'Chars')
	);
	const likesFilterText = $derived(
		formatRangeDisplay($filters.minLikes, $filters.maxLikes, DEFAULT_MAX_LIKES, 'Likes')
	);
	
	// Date range handlers
	function handleStartDateChange(date: string) {
		setDateRange(date, $filters.dateRange?.endDate);
	}
	
	function handleEndDateChange(date: string) {
		setDateRange($filters.dateRange?.startDate, date);
	}
	
	function handleSetOldest() {
		if (oldestDate) {
			setDateRange(oldestDate, $filters.dateRange?.endDate);
		}
	}
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
				<Icon name="filter" size={20} />
				<span>Filters</span>
				{#if hasActiveFilters}
					<span class="filter-badge">!</span>
				{/if}
				<span class="filter-arrow" class:rotated={isExpanded}>
					<Icon name="chevronDown" size={16} />
				</span>
			</button>
		</div>
		
		<!-- Actions integrated into the search row -->
		<!-- Note: Export/Import buttons removed per YouTube API ToS III.E.4a-g
		     (exporting and re-importing could bypass 30-day data expiry) -->
		<div class="search-actions">
			<div class="action-buttons">
				<!-- Wipe data -->
				<button class="btn btn-ghost btn-sm btn-danger-text" onclick={onWipeData} title="Wipe all data">
					<Icon name="trash" size={16} />
				</button>
			</div>
		</div>
	</div>

	<!-- Sort bar with toggles aligned right -->
	<div class="sort-bar-row">
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
							<Icon name="chevronDown" size={12} />
						</span>
					{/if}
				</button>
			{/each}
		</div>
		
		<!-- Toggles with better labels -->
		<div class="display-toggles">
			<label class="toggle-label" title="Group comments by video when multiple comments are on the same video">
				<input 
					type="checkbox" 
					checked={groupByVideo} 
					onchange={(e) => onGroupByVideoChange?.(e.currentTarget.checked)} 
				/>
				<span>Group by video</span>
			</label>
			<label class="toggle-label" title="Hide comments that are already in the slash queue">
				<input 
					type="checkbox" 
					checked={hideSelectedFromList} 
					onchange={(e) => onHideSelectedChange?.(e.currentTarget.checked)} 
				/>
				<span>Hide queued</span>
			</label>
		</div>
	</div>

	<!-- Active filter badges (always visible when filters are active, even if expanded) -->
	{#if hasActiveFilters}
		<div class="active-filters-bar">
			<span class="active-filters-label">Active filters:</span>
			<div class="active-filter-badges">
				{#if hasCharacterFilter}
					<button 
						class="active-filter-badge" 
						onclick={() => { clearMinCharacters(); clearMaxCharacters(); }}
						title="Click to clear character filter"
					>
						<span class="badge-text">{characterFilterText}</span>
						<Icon name="close" size={12} class="badge-close" />
					</button>
				{/if}
				{#if hasLikesFilter}
					<button 
						class="active-filter-badge" 
						onclick={() => { clearMinLikes(); clearMaxLikes(); }}
						title="Click to clear likes filter"
					>
						<span class="badge-text">{likesFilterText}</span>
						<Icon name="close" size={12} class="badge-close" />
					</button>
				{/if}
				{#if hasLabelFilter}
					{#each $filters.labels || [] as label}
						<button 
							class="active-filter-badge" 
							onclick={() => toggleLabel(label)}
							title="Click to remove this label filter"
						>
							<span class="badge-text">
								{#if label === 'api_error'}❌ Delete Error
								{:else if label === 'unenrichable'}⚠️ Unenrichable
								{:else if label === 'externally_deleted'}🗑️ Deleted
								{/if}
							</span>
							<Icon name="close" size={12} class="badge-close" />
						</button>
					{/each}
				{/if}
				{#if hasDateFilter}
					<button 
						class="active-filter-badge date-filter-badge" 
						onclick={clearDateRange}
						title="Click to clear date filter"
					>
						<Icon name="calendar" size={12} class="badge-icon" />
						<span class="badge-text">{dateFilterText()}</span>
						<Icon name="close" size={12} class="badge-close" />
					</button>
				{/if}
				{#if hasChannelFilter}
					<button 
						class="active-filter-badge channel-filter-badge" 
						onclick={clearChannelFilter}
						title="Click to clear channel filter"
					>
						<Icon name="user" size={12} class="badge-icon" />
						<span class="badge-text">{$filters.channelFilter?.channelTitle}</span>
						<Icon name="close" size={12} class="badge-close" />
					</button>
				{/if}
			</div>
		</div>
	{/if}

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
			</div>

			<div class="filter-section">
				<h4>Date Range</h4>
				<DateRangePicker 
					startDate={$filters.dateRange?.startDate || ''}
					endDate={$filters.dateRange?.endDate || ''}
					minDate={oldestDate || ''}
					maxDate={newestDate || ''}
					onStartChange={handleStartDateChange}
					onEndChange={handleEndDateChange}
					onSetOldest={handleSetOldest}
				/>
			</div>

			<div class="filter-actions">
				<button class="btn btn-ghost" onclick={resetFilters}>
					Reset All
				</button>
			</div>
		</div>
	{/if}
</div>

<style>
	.filter-panel {
		background: var(--bg-card);
		border-radius: var(--radius-lg);
		border: 1px solid var(--bg-tertiary);
		padding: 1rem;
		margin-bottom: 1.5rem;
		/* Prevent layout shift when scrollbar appears/disappears in comments section */
		box-sizing: border-box;
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

	/* Sort bar row with toggles */
	.sort-bar-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		margin-top: 1rem;
		padding-top: 1rem;
		border-top: 1px solid var(--bg-tertiary);
		flex-wrap: wrap;
	}

	.sort-bar {
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}

	.display-toggles {
		display: flex;
		gap: 0.75rem;
		align-items: center;
	}

	.toggle-label {
		display: flex;
		align-items: center;
		gap: 0.35rem;
		font-size: 0.8rem;
		color: var(--text-secondary);
		cursor: pointer;
		padding: 0.4rem 0.75rem;
		border-radius: var(--radius-sm);
		background: var(--bg-tertiary);
		border: 1px solid transparent;
		transition: all 0.2s ease;
		white-space: nowrap;
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
		/* Use fixed 3-column layout on wider screens to prevent layout shifts */
		grid-template-columns: repeat(3, 1fr);
		gap: 1.5rem;
		animation: slideDown 0.3s ease;
	}

	/* On smaller screens, allow auto-fit for responsiveness */
	@media (max-width: 900px) {
		.filter-content {
			grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
		}
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
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: 0.5rem;
		margin-bottom: 0.75rem;
	}

	@media (max-width: 480px) {
		.label-filters {
			grid-template-columns: 1fr;
		}
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
		white-space: nowrap;
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

	.filter-actions {
		display: flex;
		justify-content: flex-end;
		grid-column: 1 / -1;
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

	/* Active filter badges (pinned when panel collapsed) */
	.active-filters-bar {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		margin-top: 0.75rem;
		padding-top: 0.75rem;
		border-top: 1px solid var(--bg-tertiary);
		flex-wrap: wrap;
		animation: slideDown 0.2s ease;
	}

	.active-filters-label {
		color: var(--text-muted);
		font-size: 0.75rem;
		font-weight: 500;
		white-space: nowrap;
	}

	.active-filter-badges {
		display: flex;
		flex-wrap: wrap;
		gap: 0.35rem;
	}

	.active-filter-badge {
		display: inline-flex;
		align-items: center;
		gap: 0.35rem;
		padding: 0.3rem 0.6rem;
		background: rgba(99, 102, 241, 0.15);
		border: 1px solid rgba(99, 102, 241, 0.3);
		border-radius: var(--radius-sm);
		color: var(--accent-tertiary);
		font-size: 0.75rem;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.2s ease;
	}

	.active-filter-badge:hover {
		background: rgba(239, 68, 68, 0.15);
		border-color: rgba(239, 68, 68, 0.4);
		color: var(--error);
	}

	.active-filter-badge .badge-text {
		line-height: 1;
	}

	.active-filter-badge .badge-icon {
		flex-shrink: 0;
	}

	.active-filter-badge .badge-close {
		opacity: 0.7;
		transition: opacity 0.2s ease;
	}

	.active-filter-badge:hover .badge-close {
		opacity: 1;
	}

	/* Channel filter badge - special styling */
	.channel-filter-badge {
		background: rgba(167, 139, 250, 0.15);
		border-color: rgba(167, 139, 250, 0.3);
	}

	/* Date filter badge - special styling */
	.date-filter-badge {
		background: rgba(34, 197, 94, 0.15);
		border-color: rgba(34, 197, 94, 0.3);
		color: rgb(34, 197, 94);
	}

	.date-filter-badge:hover {
		background: rgba(239, 68, 68, 0.15);
		border-color: rgba(239, 68, 68, 0.4);
		color: var(--error);
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

		.sort-bar-row {
			flex-direction: column;
			align-items: stretch;
			gap: 0.75rem;
		}

		.display-toggles {
			justify-content: flex-end;
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

		.display-toggles {
			flex-wrap: wrap;
		}

		.action-buttons .btn-text {
			display: none;
		}

		.action-buttons .btn {
			padding: 0.4rem;
		}

		.toggle-label {
			font-size: 0.75rem;
			padding: 0.35rem 0.5rem;
		}
	}
</style>
