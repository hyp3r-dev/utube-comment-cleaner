<script lang="ts">
	import { onMount } from 'svelte';
	import Icon from './Icon.svelte';

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
		<Icon name="calendar" size={16} />
		<span class="trigger-text">{displayText()}</span>
		<span class="chevron" class:rotated={isExpanded}>
			<Icon name="chevronDown" size={12} />
		</span>
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
								<Icon name="arrowDown" size={14} />
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
					<Icon name="close" size={12} />
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
