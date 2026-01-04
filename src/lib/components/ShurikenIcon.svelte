<script lang="ts">
	/**
	 * Shuriken (ninja star) icon component
	 * Used throughout the app for delete/slash actions
	 */
	let {
		size = 18,
		animate = false,
		className = ''
	}: {
		size?: number;
		animate?: boolean;
		className?: string;
	} = $props();
</script>

<svg 
	width={size} 
	height={size} 
	viewBox="0 0 20 20" 
	fill="currentColor" 
	class="shuriken-icon {className}"
	class:animate
>
	<!-- Four-pointed shuriken -->
	<path d="M10 2 L11.5 8.5 L10 10 L8.5 8.5 Z" />
	<path d="M18 10 L11.5 11.5 L10 10 L11.5 8.5 Z" />
	<path d="M10 18 L8.5 11.5 L10 10 L11.5 11.5 Z" />
	<path d="M2 10 L8.5 8.5 L10 10 L8.5 11.5 Z" />
	<circle cx="10" cy="10" r="1.5" />
</svg>

<style>
	.shuriken-icon {
		transition: transform 0.3s ease;
	}

	.shuriken-icon.animate {
		animation: shurikenSpin 8s linear infinite;
	}

	@keyframes shurikenSpin {
		from { transform: rotate(0deg); }
		to { transform: rotate(360deg); }
	}
</style>
