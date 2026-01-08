<script lang="ts">
	import { onMount } from 'svelte';

	let {
		startDate = '',
		endDate = '',
		minDate = '',
		maxDate = '',
		onStartChange,
		onEndChange,
		onSetOldest
	}: {
		startDate?: string;
		endDate?: string;
		minDate?: string;
		maxDate?: string;
		onStartChange?: (date: string) => void;
		onEndChange?: (date: string) => void;
		onSetOldest?: () => void;
	} = $props();

	let isExpanded = $state(false);

	function formatDateDisplay(dateStr: string): string {
		if (!dateStr) return 'Any';
		const date = new Date(dateStr + 'T00:00:00');
		return date.toLocaleDateString('en-US', { 
			month: 'short', 
			day: 'numeric', 
			year: 'numeric' 
		});
	}

	function handleStartChange(e: Event) {
		const value = (e.target as HTMLInputElement).value;
		onStartChange?.(value);
	}

	function handleEndChange(e: Event) {
		const value = (e.target as HTMLInputElement).value;
		onEndChange?.(value);
	}

	function handleSetOldest() {
		onSetOldest?.();
	}

	function clearDates() {
		onStartChange?.('');
		onEndChange?.('');
	}

	const hasDateFilter = $derived(startDate || endDate);
	const displayText = $derived(() => {
		if (!startDate && !endDate) return 'All dates';
		if (startDate && endDate) return `${formatDateDisplay(startDate)} - ${formatDateDisplay(endDate)}`;
		if (startDate) return `From ${formatDateDisplay(startDate)}`;
		return `Until ${formatDateDisplay(endDate)}`;
	});
</script>

<div class="date-picker-container">
	<button 
		class="date-picker-trigger"
		class:active={hasDateFilter}
		class:expanded={isExpanded}
		onclick={() => isExpanded = !isExpanded}
	>
		<svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
			<path fill-rule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clip-rule="evenodd"/>
		</svg>
		<span class="trigger-text">{displayText()}</span>
		<svg 
			width="12" 
			height="12" 
			viewBox="0 0 20 20" 
			fill="currentColor" 
			class="chevron"
			class:rotated={isExpanded}
		>
			<path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd"/>
		</svg>
	</button>

	{#if isExpanded}
		<div class="date-picker-dropdown">
			<div class="date-inputs">
				<div class="date-field">
					<label for="start-date">From</label>
					<div class="input-with-button">
						<input 
							type="date"
							id="start-date"
							value={startDate}
							min={minDate}
							max={endDate || maxDate}
							onchange={handleStartChange}
						/>
						{#if minDate}
							<button 
								class="oldest-btn" 
								onclick={handleSetOldest}
								title="Set to oldest comment date"
							>
								<svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor">
									<path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v3.586L7.707 9.293a1 1 0 00-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L11 10.586V7z" clip-rule="evenodd"/>
								</svg>
								Oldest
							</button>
						{/if}
					</div>
				</div>
				<div class="date-field">
					<label for="end-date">To</label>
					<input 
						type="date"
						id="end-date"
						value={endDate}
						min={startDate || minDate}
						max={maxDate}
						onchange={handleEndChange}
					/>
				</div>
			</div>
			{#if hasDateFilter}
				<button class="clear-dates-btn" onclick={clearDates}>
					<svg width="12" height="12" viewBox="0 0 20 20" fill="currentColor">
						<path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"/>
					</svg>
					Clear dates
				</button>
			{/if}
		</div>
	{/if}
</div>

<style>
	.date-picker-container {
		position: relative;
	}

	.date-picker-trigger {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.5rem 0.75rem;
		background: var(--bg-tertiary);
		border: 1px solid var(--bg-hover);
		border-radius: var(--radius-md);
		color: var(--text-secondary);
		font-size: 0.85rem;
		cursor: pointer;
		transition: all 0.2s ease;
		width: 100%;
	}

	.date-picker-trigger:hover {
		background: var(--bg-hover);
		border-color: var(--accent-primary);
	}

	.date-picker-trigger.active {
		background: rgba(99, 102, 241, 0.1);
		border-color: var(--accent-primary);
		color: var(--accent-tertiary);
	}

	.date-picker-trigger.expanded {
		border-bottom-left-radius: 0;
		border-bottom-right-radius: 0;
		border-bottom-color: transparent;
	}

	.trigger-text {
		flex: 1;
		text-align: left;
	}

	.chevron {
		transition: transform 0.2s ease;
		opacity: 0.6;
	}

	.chevron.rotated {
		transform: rotate(180deg);
	}

	.date-picker-dropdown {
		position: absolute;
		top: 100%;
		left: 0;
		right: 0;
		background: var(--bg-tertiary);
		border: 1px solid var(--accent-primary);
		border-top: none;
		border-radius: 0 0 var(--radius-md) var(--radius-md);
		padding: 0.75rem;
		z-index: 100;
		animation: slideDown 0.2s ease;
	}

	@keyframes slideDown {
		from {
			opacity: 0;
			transform: translateY(-8px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	.date-inputs {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.date-field {
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
	}

	.date-field label {
		font-size: 0.75rem;
		color: var(--text-muted);
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.input-with-button {
		display: flex;
		gap: 0.5rem;
	}

	.date-field input {
		flex: 1;
		padding: 0.5rem;
		background: var(--bg-secondary);
		border: 1px solid var(--bg-hover);
		border-radius: var(--radius-sm);
		color: var(--text-primary);
		font-size: 0.85rem;
	}

	.date-field input:focus {
		outline: none;
		border-color: var(--accent-primary);
		box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.15);
	}

	.oldest-btn {
		display: flex;
		align-items: center;
		gap: 0.25rem;
		padding: 0.4rem 0.5rem;
		background: rgba(99, 102, 241, 0.15);
		border: 1px solid rgba(99, 102, 241, 0.3);
		border-radius: var(--radius-sm);
		color: var(--accent-tertiary);
		font-size: 0.7rem;
		cursor: pointer;
		white-space: nowrap;
		transition: all 0.2s ease;
	}

	.oldest-btn:hover {
		background: rgba(99, 102, 241, 0.25);
		border-color: var(--accent-primary);
	}

	.clear-dates-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.35rem;
		width: 100%;
		margin-top: 0.75rem;
		padding: 0.5rem;
		background: transparent;
		border: 1px solid var(--bg-hover);
		border-radius: var(--radius-sm);
		color: var(--text-muted);
		font-size: 0.8rem;
		cursor: pointer;
		transition: all 0.2s ease;
	}

	.clear-dates-btn:hover {
		background: rgba(239, 68, 68, 0.1);
		border-color: var(--error);
		color: var(--error);
	}
</style>
