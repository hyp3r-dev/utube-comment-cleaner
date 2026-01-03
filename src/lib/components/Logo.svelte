<script lang="ts">
	import { onMount } from 'svelte';
	
	let { size = 40 }: { size?: number } = $props();
	
	let shurikenElement: SVGGElement;
	let currentSpeed = $state(8); // seconds per rotation (higher = slower)
	let isHovering = $state(false);
	let animationFrame: number;
	let rotation = 0;
	let lastTime = 0;
	
	const IDLE_SPEED = 8; // 8 seconds per rotation when idle
	const MAX_SPEED = 0.4; // 0.4 seconds per rotation at max speed
	const ACCELERATION = 0.92; // Speed multiplier per frame when accelerating (lower = faster acceleration)
	const DECELERATION = 1.02; // Speed multiplier per frame when decelerating (higher = faster deceleration)
	
	function animate(currentTime: number) {
		if (!lastTime) lastTime = currentTime;
		const deltaTime = currentTime - lastTime;
		lastTime = currentTime;
		
		// Smoothly interpolate speed
		if (isHovering && currentSpeed > MAX_SPEED) {
			currentSpeed = Math.max(currentSpeed * ACCELERATION, MAX_SPEED);
		} else if (!isHovering && currentSpeed < IDLE_SPEED) {
			currentSpeed = Math.min(currentSpeed * DECELERATION, IDLE_SPEED);
		}
		
		// Calculate rotation based on current speed
		const degreesPerMs = 360 / (currentSpeed * 1000);
		rotation = (rotation + degreesPerMs * deltaTime) % 360;
		
		if (shurikenElement) {
			shurikenElement.style.transform = `rotate(${rotation}deg)`;
		}
		
		animationFrame = requestAnimationFrame(animate);
	}
	
	function handleMouseEnter() {
		isHovering = true;
	}
	
	function handleMouseLeave() {
		isHovering = false;
	}
	
	onMount(() => {
		animationFrame = requestAnimationFrame(animate);
		return () => cancelAnimationFrame(animationFrame);
	});
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div 
	class="logo" 
	style="--size: {size}px"
	onmouseenter={handleMouseEnter}
	onmouseleave={handleMouseLeave}
>
	<div class="logo-icon-wrapper">
		<svg viewBox="0 0 32 32" width={size} height={size} class="logo-icon" class:hovering={isHovering}>
			<defs>
				<linearGradient id="logo-bg" x1="0%" y1="0%" x2="100%" y2="100%">
					<stop offset="0%" style="stop-color:#6366f1"/>
					<stop offset="100%" style="stop-color:#8b5cf6"/>
				</linearGradient>
				<linearGradient id="star-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
					<stop offset="0%" style="stop-color:#e0e7ff"/>
					<stop offset="50%" style="stop-color:#c7d2fe"/>
					<stop offset="100%" style="stop-color:#a5b4fc"/>
				</linearGradient>
				<linearGradient id="star-edge" x1="0%" y1="0%" x2="100%" y2="100%">
					<stop offset="0%" style="stop-color:#ffffff"/>
					<stop offset="100%" style="stop-color:#a5b4fc"/>
				</linearGradient>
			</defs>
			<rect width="32" height="32" rx="6" fill="url(#logo-bg)"/>
			<!-- Ninja Star (Shuriken) -->
			<g class="shuriken" bind:this={shurikenElement}>
				<!-- Four-pointed ninja star -->
				<path d="M16 4 L18 14 L16 16 L14 14 Z" fill="url(#star-gradient)"/>
				<path d="M28 16 L18 18 L16 16 L18 14 Z" fill="url(#star-gradient)"/>
				<path d="M16 28 L14 18 L16 16 L18 18 Z" fill="url(#star-gradient)"/>
				<path d="M4 16 L14 14 L16 16 L14 18 Z" fill="url(#star-gradient)"/>
				<!-- Edge highlights -->
				<path d="M16 4 L18 14 L16 16" stroke="url(#star-edge)" stroke-width="0.5" fill="none" opacity="0.8"/>
				<path d="M28 16 L18 18 L16 16" stroke="url(#star-edge)" stroke-width="0.5" fill="none" opacity="0.8"/>
				<path d="M16 28 L14 18 L16 16" stroke="url(#star-edge)" stroke-width="0.5" fill="none" opacity="0.8"/>
				<path d="M4 16 L14 14 L16 16" stroke="url(#star-edge)" stroke-width="0.5" fill="none" opacity="0.8"/>
				<!-- Center circle -->
				<circle cx="16" cy="16" r="2.5" fill="#1e1b4b"/>
				<circle cx="16" cy="16" r="1.5" fill="#ef4444"/>
			</g>
		</svg>
	</div>
	<span class="logo-text">CommentSlash</span>
</div>

<style>
	.logo {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		cursor: pointer;
	}

	.logo-icon-wrapper {
		filter: drop-shadow(0 4px 8px rgba(99, 102, 241, 0.3));
		transition: filter 0.3s ease;
	}

	.logo:hover .logo-icon-wrapper {
		filter: drop-shadow(0 6px 12px rgba(99, 102, 241, 0.5));
	}

	.logo-icon {
		transition: transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
	}

	.logo-icon.hovering {
		transform: scale(1.1);
	}

	.shuriken {
		transform-origin: 16px 16px;
		will-change: transform;
	}

	.logo-text {
		font-size: calc(var(--size) * 0.5);
		font-weight: 800;
		background: linear-gradient(135deg, #f0f0ff 0%, #ef4444 50%, #a78bfa 100%);
		-webkit-background-clip: text;
		-webkit-text-fill-color: transparent;
		background-clip: text;
		letter-spacing: -0.02em;
		transition: background-position 0.3s ease;
		background-size: 200% 200%;
	}

	.logo:hover .logo-text {
		background-position: 100% 100%;
	}
</style>
