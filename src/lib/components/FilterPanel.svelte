<script lang="ts">
	import { filters, sortField, sortOrder, searchQuery, resetFilters } from '$lib/stores/comments';
	import type { CommentFilters, SortField, SortOrder } from '$lib/types/comment';

	let isExpanded = $state(false);

	const videoPrivacyOptions = [
		{ value: 'public', label: 'Public' },
		{ value: 'private', label: 'Private' },
		{ value: 'unlisted', label: 'Unlisted' },
		{ value: 'unknown', label: 'Unknown' }
	] as const;

	const moderationOptions = [
		{ value: 'published', label: 'Published' },
		{ value: 'heldForReview', label: 'Held for Review' },
		{ value: 'likelySpam', label: 'Spam' },
		{ value: 'rejected', label: 'Rejected' },
		{ value: 'unknown', label: 'Unknown' }
	] as const;

	const sortOptions = [
		{ value: 'likeCount', label: 'Likes' },
		{ value: 'publishedAt', label: 'Date' },
		{ value: 'textLength', label: 'Length' }
	] as const;

	function togglePrivacy(value: CommentFilters['videoPrivacy'][number]) {
		filters.update(f => {
			const newPrivacy = f.videoPrivacy.includes(value)
				? f.videoPrivacy.filter(v => v !== value)
				: [...f.videoPrivacy, value];
			return { ...f, videoPrivacy: newPrivacy };
		});
	}

	function toggleModeration(value: CommentFilters['moderationStatus'][number]) {
		filters.update(f => {
			const newStatus = f.moderationStatus.includes(value)
				? f.moderationStatus.filter(v => v !== value)
				: [...f.moderationStatus, value];
			return { ...f, moderationStatus: newStatus };
		});
	}

	function handleSortChange(field: SortField) {
		if ($sortField === field) {
			sortOrder.update(o => o === 'desc' ? 'asc' : 'desc');
		} else {
			sortField.set(field);
			sortOrder.set('desc');
		}
	}
</script>

<div class="filter-panel">
	<div class="search-bar">
		<div class="search-input-wrapper">
			<svg class="search-icon" width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
				<path fill-rule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clip-rule="evenodd" />
			</svg>
			<input
				type="text"
				placeholder="Search comments or videos..."
				bind:value={$searchQuery}
				class="search-input"
			/>
			{#if $searchQuery}
				<button class="clear-btn" onclick={() => searchQuery.set('')} aria-label="Clear search">
					<svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
						<path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
					</svg>
				</button>
			{/if}
		</div>

		<button class="filter-toggle btn btn-secondary" onclick={() => isExpanded = !isExpanded}>
			<svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
				<path fill-rule="evenodd" d="M3 3a1 1 0 011-1h12a1 1 0 011 1v3a1 1 0 01-.293.707L12 11.414V15a1 1 0 01-.293.707l-2 2A1 1 0 018 17v-5.586L3.293 6.707A1 1 0 013 6V3z" clip-rule="evenodd" />
			</svg>
			<span>Filters</span>
			<span class="filter-arrow" class:rotated={isExpanded}>
				<svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
					<path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd" />
				</svg>
			</span>
		</button>
	</div>

	{#if isExpanded}
		<div class="filter-content">
			<div class="filter-section">
				<h4>Video Privacy</h4>
				<div class="chip-group">
					{#each videoPrivacyOptions as option}
						<button
							class="chip"
							class:active={$filters.videoPrivacy.includes(option.value)}
							onclick={() => togglePrivacy(option.value)}
						>
							{option.label}
						</button>
					{/each}
				</div>
			</div>

			<div class="filter-section">
				<h4>Comment Status</h4>
				<div class="chip-group">
					{#each moderationOptions as option}
						<button
							class="chip"
							class:active={$filters.moderationStatus.includes(option.value)}
							onclick={() => toggleModeration(option.value)}
						>
							{option.label}
						</button>
					{/each}
				</div>
			</div>

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

	.search-bar {
		display: flex;
		gap: 1rem;
		align-items: center;
	}

	.search-input-wrapper {
		flex: 1;
		position: relative;
		display: flex;
		align-items: center;
	}

	.search-icon {
		position: absolute;
		left: 1rem;
		color: var(--text-muted);
		pointer-events: none;
	}

	.search-input {
		padding-left: 2.75rem;
		padding-right: 2.5rem;
	}

	.clear-btn {
		position: absolute;
		right: 0.75rem;
		background: transparent;
		color: var(--text-muted);
		padding: 0.25rem;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.clear-btn:hover {
		color: var(--text-primary);
	}

	.filter-toggle {
		flex-shrink: 0;
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

	.chip-group {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
	}

	.chip {
		padding: 0.35rem 0.75rem;
		border-radius: 9999px;
		background: var(--bg-tertiary);
		color: var(--text-secondary);
		font-size: 0.8rem;
		font-weight: 500;
		transition: all 0.2s ease;
	}

	.chip:hover {
		background: var(--bg-hover);
		color: var(--text-primary);
	}

	.chip.active {
		background: var(--accent-primary);
		color: white;
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
	}
</style>
