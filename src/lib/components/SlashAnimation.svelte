<script lang="ts">
	import { onMount } from 'svelte';

	let {
		onComplete,
		direction = 'right'
	}: {
		onComplete?: () => void;
		direction?: 'left' | 'right';
	} = $props();

	let isAnimating = $state(true);
	let showSparks = $state(false);

	onMount(() => {
		// Show sparks after initial slash
		setTimeout(() => {
			showSparks = true;
		}, 150);

		// Complete animation after all effects
		setTimeout(() => {
			isAnimating = false;
			onComplete?.();
		}, 800);
	});

	// Generate random spark positions with pre-calculated offsets
	const sparks = Array.from({ length: 8 }, (_, i) => {
		const angle = Math.random() * 2 * Math.PI;
		const distance = 20 + Math.random() * 40;
		return {
			id: i,
			x: 40 + Math.random() * 20,
			y: 40 + Math.random() * 20,
			size: 2 + Math.random() * 4,
			delay: Math.random() * 100,
			// Pre-calculate offset using JavaScript
			offsetX: Math.cos(angle) * distance,
			offsetY: Math.sin(angle) * distance
		};
	});
</script>

{#if isAnimating}
	<div class="slash-animation" class:left={direction === 'left'} class:right={direction === 'right'}>
		<!-- Main slash line -->
		<svg class="slash-svg" viewBox="0 0 100 100" preserveAspectRatio="none">
			<defs>
				<linearGradient id="slash-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
					<stop offset="0%" style="stop-color: transparent" />
					<stop offset="20%" style="stop-color: #ef4444" />
					<stop offset="50%" style="stop-color: #ffffff" />
					<stop offset="80%" style="stop-color: #ef4444" />
					<stop offset="100%" style="stop-color: transparent" />
				</linearGradient>
				<filter id="glow">
					<feGaussianBlur stdDeviation="2" result="coloredBlur"/>
					<feMerge>
						<feMergeNode in="coloredBlur"/>
						<feMergeNode in="SourceGraphic"/>
					</feMerge>
				</filter>
			</defs>
			
			<!-- Slash trail -->
			<path 
				class="slash-trail"
				d="M -10 60 Q 50 40 110 30"
				stroke="url(#slash-gradient)"
				stroke-width="3"
				fill="none"
				filter="url(#glow)"
			/>
			
			<!-- Secondary slash -->
			<path 
				class="slash-secondary"
				d="M -5 65 Q 50 45 105 35"
				stroke="rgba(239, 68, 68, 0.5)"
				stroke-width="1.5"
				fill="none"
			/>
		</svg>

		<!-- Sparks -->
		{#if showSparks}
			<div class="sparks">
				{#each sparks as spark}
					<div 
						class="spark"
						style="
							--x: {spark.x}%;
							--y: {spark.y}%;
							--size: {spark.size}px;
							--delay: {spark.delay}ms;
							--offset-x: {spark.offsetX}px;
							--offset-y: {spark.offsetY}px;
						"
					></div>
				{/each}
			</div>
		{/if}

		<!-- Sword/Katana blade flash -->
		<div class="blade-flash"></div>
	</div>
{/if}

<style>
	.slash-animation {
		position: absolute;
		inset: 0;
		pointer-events: none;
		overflow: hidden;
		z-index: 10;
	}

	.slash-svg {
		position: absolute;
		width: 120%;
		height: 120%;
		top: -10%;
		left: -10%;
	}

	.slash-animation.right .slash-svg {
		animation: slashSwipe 0.3s ease-out forwards;
	}

	.slash-animation.left .slash-svg {
		animation: slashSwipeLeft 0.3s ease-out forwards;
		transform: scaleX(-1);
	}

	@keyframes slashSwipe {
		0% {
			opacity: 0;
			transform: translateX(-100%) rotate(-5deg);
		}
		30% {
			opacity: 1;
		}
		100% {
			opacity: 0;
			transform: translateX(100%) rotate(5deg);
		}
	}

	@keyframes slashSwipeLeft {
		0% {
			opacity: 0;
			transform: scaleX(-1) translateX(-100%) rotate(-5deg);
		}
		30% {
			opacity: 1;
		}
		100% {
			opacity: 0;
			transform: scaleX(-1) translateX(100%) rotate(5deg);
		}
	}

	.slash-trail {
		stroke-dasharray: 200;
		stroke-dashoffset: 200;
		animation: drawSlash 0.25s ease-out forwards;
	}

	.slash-secondary {
		stroke-dasharray: 200;
		stroke-dashoffset: 200;
		animation: drawSlash 0.25s ease-out 0.05s forwards;
	}

	@keyframes drawSlash {
		to {
			stroke-dashoffset: 0;
		}
	}

	.sparks {
		position: absolute;
		inset: 0;
	}

	.spark {
		position: absolute;
		left: var(--x);
		top: var(--y);
		width: var(--size);
		height: var(--size);
		background: radial-gradient(circle, #fff 0%, #ef4444 50%, transparent 100%);
		border-radius: 50%;
		animation: sparkFly 0.5s ease-out var(--delay) forwards;
		opacity: 0;
	}

	@keyframes sparkFly {
		0% {
			opacity: 1;
			transform: translate(0, 0) scale(1);
		}
		100% {
			opacity: 0;
			transform: translate(var(--offset-x), var(--offset-y)) scale(0);
		}
	}

	.blade-flash {
		position: absolute;
		top: 30%;
		left: 50%;
		width: 60%;
		height: 4px;
		background: linear-gradient(90deg, transparent, #fff, transparent);
		transform: translateX(-50%) rotate(-15deg);
		animation: bladeFlash 0.2s ease-out forwards;
		opacity: 0;
	}

	@keyframes bladeFlash {
		0% {
			opacity: 0;
			transform: translateX(-150%) rotate(-15deg) scaleX(0.5);
		}
		50% {
			opacity: 1;
		}
		100% {
			opacity: 0;
			transform: translateX(50%) rotate(-15deg) scaleX(1.5);
		}
	}
</style>
