/**
 * Sliding window for selected comments panel (slash queue)
 * Handles large queues (thousands of selected comments) efficiently
 */

import { writable, derived, get } from 'svelte/store';
import type { YouTubeComment } from '$lib/types/comment';
import { selectedComments, selectedIds, selectionOrder } from './comments';

// Sliding window configuration for queue
const QUEUE_WINDOW_SIZE = 200; // Keep 200 selected comments in view
const QUEUE_LOAD_THRESHOLD = 0.6; // Load more at 60% scroll

// Queue windowed state
export const queueWindowedComments = writable<YouTubeComment[]>([]);
export const queueWindowStart = writable<number>(0);
export const queueWindowEnd = writable<number>(0);
export const queueScrollIndex = writable<number>(0);

/**
 * Initialize queue sliding window
 */
export function initializeQueueWindow(): void {
	const selected = get(selectedComments);
	const windowSize = Math.min(QUEUE_WINDOW_SIZE, selected.length);
	
	queueWindowedComments.set(selected.slice(0, windowSize));
	queueWindowStart.set(0);
	queueWindowEnd.set(windowSize);
	queueScrollIndex.set(0);
}

/**
 * Load more queue items forward
 */
function loadQueueForward(): void {
	const selected = get(selectedComments);
	const start = get(queueWindowStart);
	const end = get(queueWindowEnd);
	
	// Don't load if at end
	if (end >= selected.length) return;
	
	// Load next 100
	const batchSize = 100;
	const newEnd = Math.min(end + batchSize, selected.length);
	const newBatch = selected.slice(end, newEnd);
	
	queueWindowedComments.update(current => {
		const updated = [...current, ...newBatch];
		
		// If exceeds window size, remove from front
		if (updated.length > QUEUE_WINDOW_SIZE) {
			const excess = updated.length - QUEUE_WINDOW_SIZE;
			queueWindowStart.update(s => s + excess);
			return updated.slice(excess);
		}
		
		return updated;
	});
	
	queueWindowEnd.set(newEnd);
}

/**
 * Load more queue items backward
 */
function loadQueueBackward(): void {
	const selected = get(selectedComments);
	const start = get(queueWindowStart);
	
	// Don't load if at beginning
	if (start <= 0) return;
	
	// Load previous 100
	const batchSize = 100;
	const newStart = Math.max(0, start - batchSize);
	const newBatch = selected.slice(newStart, start);
	
	queueWindowedComments.update(current => {
		const updated = [...newBatch, ...current];
		
		// If exceeds window size, remove from end
		if (updated.length > QUEUE_WINDOW_SIZE) {
			const excess = updated.length - QUEUE_WINDOW_SIZE;
			queueWindowEnd.update(e => e - excess);
			return updated.slice(0, QUEUE_WINDOW_SIZE);
		}
		
		return updated;
	});
	
	queueWindowStart.set(newStart);
}

/**
 * Handle queue scroll position
 */
export function handleQueueScroll(scrollIndex: number): void {
	const windowed = get(queueWindowedComments);
	const selected = get(selectedComments);
	const start = get(queueWindowStart);
	
	if (windowed.length === 0) return;
	
	queueScrollIndex.set(scrollIndex);
	
	// Check if we need to load forward
	const forwardThreshold = windowed.length * QUEUE_LOAD_THRESHOLD;
	if (scrollIndex > forwardThreshold && (start + windowed.length) < selected.length) {
		loadQueueForward();
	}
	
	// Check if we need to load backward
	const backwardThreshold = windowed.length * (1 - QUEUE_LOAD_THRESHOLD);
	if (scrollIndex < backwardThreshold && start > 0) {
		loadQueueBackward();
	}
}

/**
 * Update queue window when selection changes
 */
export function updateQueueWindow(): void {
	const selected = get(selectedComments);
	const currentStart = get(queueWindowStart);
	const currentEnd = get(queueWindowEnd);
	
	// If queue is now empty, reset
	if (selected.length === 0) {
		queueWindowedComments.set([]);
		queueWindowStart.set(0);
		queueWindowEnd.set(0);
		queueScrollIndex.set(0);
		return;
	}
	
	// Adjust window if current range is out of bounds
	let newStart = currentStart;
	let newEnd = currentEnd;
	
	if (newStart >= selected.length) {
		// Reset to end of list
		newStart = Math.max(0, selected.length - QUEUE_WINDOW_SIZE);
		newEnd = selected.length;
	} else if (newEnd > selected.length) {
		newEnd = selected.length;
	}
	
	// Ensure window has content
	if (newEnd - newStart < Math.min(QUEUE_WINDOW_SIZE, selected.length)) {
		newEnd = Math.min(newStart + QUEUE_WINDOW_SIZE, selected.length);
	}
	
	queueWindowedComments.set(selected.slice(newStart, newEnd));
	queueWindowStart.set(newStart);
	queueWindowEnd.set(newEnd);
}

/**
 * Clear queue window
 */
export function clearQueueWindow(): void {
	queueWindowedComments.set([]);
	queueWindowStart.set(0);
	queueWindowEnd.set(0);
	queueScrollIndex.set(0);
}
