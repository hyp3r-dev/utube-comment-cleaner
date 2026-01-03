<script lang="ts">
	let { size = 40 }: { size?: number } = $props();
</script>

<div class="logo" style="--size: {size}px">
	<div class="logo-icon-wrapper">
		<svg viewBox="0 0 32 32" width={size} height={size} class="logo-icon">
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
			<g class="shuriken">
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
	}

	.logo-icon-wrapper {
		filter: drop-shadow(0 4px 8px rgba(99, 102, 241, 0.3));
	}

	.logo-icon {
		transition: transform 0.3s ease;
	}

	.shuriken {
		transform-origin: 16px 16px;
		animation: spin 8s linear infinite;
	}

	.logo:hover .shuriken {
		animation: spinFast 0.5s linear infinite;
	}

	.logo:hover .logo-icon {
		transform: scale(1.1);
	}

	@keyframes spin {
		from { transform: rotate(0deg); }
		to { transform: rotate(360deg); }
	}

	@keyframes spinFast {
		from { transform: rotate(0deg); }
		to { transform: rotate(360deg); }
	}

	.logo-text {
		font-size: calc(var(--size) * 0.5);
		font-weight: 800;
		background: linear-gradient(135deg, #f0f0ff 0%, #ef4444 50%, #a78bfa 100%);
		-webkit-background-clip: text;
		-webkit-text-fill-color: transparent;
		background-clip: text;
		letter-spacing: -0.02em;
	}
</style>
