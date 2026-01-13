/**
 * Motion Animation Utilities
 * 
 * This module provides reusable animation functions using the Motion library.
 * Motion docs: https://motion.dev/docs
 * 
 * Usage in Svelte components:
 * ```svelte
 * <script lang="ts">
 *   import { onMount } from 'svelte';
 *   import { slideIn, fadeIn, springScale } from '$lib/utils/motion';
 *   
 *   let element: HTMLElement;
 *   
 *   onMount(() => {
 *     slideIn(element);
 *   });
 * </script>
 * ```
 * 
 * Key benefits of Motion over CSS animations:
 * - Spring physics for natural-feeling animations
 * - Hardware-accelerated transforms and opacity
 * - Programmatic control (pause, resume, reverse)
 * - Sequencing and staggering built-in
 * - Better performance on complex animations
 */

import { animate, type AnimationOptions, stagger } from 'motion';

// Re-export for direct use
export { animate, stagger };
export type { AnimationOptions };

/**
 * Default animation options for consistency across the app
 */
export const defaultTransition: AnimationOptions = {
	duration: 0.3,
	ease: [0.4, 0, 0.2, 1] // Equivalent to CSS ease-out
};

/**
 * Spring animation options for bouncy, natural animations
 */
export const springTransition: AnimationOptions = {
	type: 'spring',
	stiffness: 300,
	damping: 25
};

/**
 * Slide in from left animation
 * Used for queue items, cards entering view
 */
export function slideInFromLeft(
	element: Element | Element[] | null,
	options?: Partial<AnimationOptions>
) {
	if (!element) return;
	
	return animate(
		element,
		{ x: ['-100%', '0%'], opacity: [0, 1] },
		{ ...defaultTransition, duration: 0.35, ...options }
	);
}

/**
 * Slide out to left animation
 * Used for removing items from queue
 */
export function slideOutToLeft(
	element: Element | Element[] | null,
	options?: Partial<AnimationOptions>
) {
	if (!element) return;
	
	return animate(
		element,
		{ x: ['0%', '-100%'], opacity: [1, 0] },
		{ ...defaultTransition, duration: 0.35, ...options }
	);
}

/**
 * Slide in from bottom animation
 * Used for modals, toasts, popups
 */
export function slideInFromBottom(
	element: Element | Element[] | null,
	options?: Partial<AnimationOptions>
) {
	if (!element) return;
	
	return animate(
		element,
		{ y: ['20px', '0px'], opacity: [0, 1] },
		{ ...defaultTransition, ...options }
	);
}

/**
 * Fade in animation
 * Simple opacity animation for subtle appearances
 */
export function fadeIn(
	element: Element | Element[] | null,
	options?: Partial<AnimationOptions>
) {
	if (!element) return;
	
	return animate(
		element,
		{ opacity: [0, 1] },
		{ ...defaultTransition, ...options }
	);
}

/**
 * Fade out animation
 */
export function fadeOut(
	element: Element | Element[] | null,
	options?: Partial<AnimationOptions>
) {
	if (!element) return;
	
	return animate(
		element,
		{ opacity: [1, 0] },
		{ ...defaultTransition, ...options }
	);
}

/**
 * Spring scale animation
 * Used for button presses, selection feedback
 */
export function springScale(
	element: Element | Element[] | null,
	scale: number = 1.1,
	options?: Partial<AnimationOptions>
) {
	if (!element) return;
	
	return animate(
		element,
		{ scale: [1, scale, 1] },
		{ ...springTransition, ...options }
	);
}

/**
 * Pop in animation with spring physics
 * Used for elements appearing with emphasis
 */
export function popIn(
	element: Element | Element[] | null,
	options?: Partial<AnimationOptions>
) {
	if (!element) return;
	
	return animate(
		element,
		{ scale: [0, 1.1, 1], opacity: [0, 1, 1] },
		{ ...springTransition, duration: 0.4, ...options }
	);
}

/**
 * Shake animation for error feedback
 */
export function shake(
	element: Element | Element[] | null,
	options?: Partial<AnimationOptions>
) {
	if (!element) return;
	
	return animate(
		element,
		{ x: [0, -8, 8, -4, 4, 0] },
		{ duration: 0.4, ease: 'easeOut', ...options }
	);
}

/**
 * Pulse animation - subtle scale pulse
 */
export function pulse(
	element: Element | Element[] | null,
	options?: Partial<AnimationOptions>
) {
	if (!element) return;
	
	return animate(
		element,
		{ scale: [1, 1.05, 1] },
		{ duration: 0.6, ease: 'easeInOut', repeat: Infinity, ...options }
	);
}

/**
 * Spin animation for loading indicators
 */
export function spin(
	element: Element | Element[] | null,
	options?: Partial<AnimationOptions>
) {
	if (!element) return;
	
	return animate(
		element,
		{ rotate: [0, 360] },
		{ duration: 1, ease: 'linear', repeat: Infinity, ...options }
	);
}

/**
 * Swipe right success animation
 * Used after successful deletion
 */
export function swipeRightSuccess(
	element: Element | Element[] | null,
	options?: Partial<AnimationOptions>
) {
	if (!element) return;
	
	return animate(
		element,
		{ 
			x: ['0%', '10%', '100%'],
			opacity: [1, 1, 0]
		},
		{ duration: 0.6, ease: 'easeOut', ...options }
	);
}

/**
 * Swipe left failure animation (shake + stay)
 */
export function swipeLeftFailed(
	element: Element | Element[] | null,
	options?: Partial<AnimationOptions>
) {
	if (!element) return;
	
	return animate(
		element,
		{ x: [0, -10, 5, -5, 0] },
		{ duration: 0.4, ease: 'easeOut', ...options }
	);
}

/**
 * Staggered list animation
 * Animate multiple elements with a stagger delay
 */
export function staggeredSlideIn(
	elements: Element[] | NodeListOf<Element> | null,
	delayBetween: number = 0.05,
	options?: Partial<AnimationOptions>
) {
	if (!elements || elements.length === 0) return;
	
	return animate(
		elements,
		{ y: [20, 0], opacity: [0, 1] },
		{ 
			...defaultTransition,
			delay: stagger(delayBetween),
			...options 
		}
	);
}

/**
 * Highlight animation - flash with accent color (via filter brightness)
 */
export function highlight(
	element: Element | Element[] | null,
	options?: Partial<AnimationOptions>
) {
	if (!element) return;
	
	return animate(
		element,
		{ filter: ['brightness(1)', 'brightness(1.3)', 'brightness(1)'] },
		{ duration: 0.4, ...options }
	);
}

/**
 * Collapse animation - shrink height to 0
 */
export function collapse(
	element: HTMLElement | HTMLElement[] | null,
	options?: Partial<AnimationOptions>
) {
	if (!element) return;
	
	// Get initial height if single element
	const initialHeight = Array.isArray(element) 
		? undefined 
		: `${element.offsetHeight}px`;
	
	return animate(
		element,
		{ 
			height: [initialHeight || 'auto', '0px'],
			opacity: [1, 0],
			marginBottom: ['0.5rem', '0px'],
			paddingTop: ['auto', '0px'],
			paddingBottom: ['auto', '0px']
		},
		{ duration: 0.3, ease: 'easeOut', ...options }
	);
}

/**
 * Create a reusable animation controller
 * Useful for complex animations that need to be paused/resumed
 */
export function createAnimationController(
	element: Element | Element[] | null,
	keyframes: Parameters<typeof animate>[1],
	options?: AnimationOptions
) {
	if (!element) return null;
	
	const animation = animate(element, keyframes, options);
	
	return {
		play: () => animation.play(),
		pause: () => animation.pause(),
		stop: () => animation.stop(),
		cancel: () => animation.cancel(),
		get finished() { return animation.finished; }
	};
}
