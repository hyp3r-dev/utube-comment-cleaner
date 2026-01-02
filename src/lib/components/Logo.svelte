<script lang="ts">
	let { size = 40 }: { size?: number } = $props();
</script>

<div class="logo" style="--size: {size}px">
	<svg viewBox="0 0 32 32" width={size} height={size} class="logo-icon">
		<defs>
			<linearGradient id="logo-bg" x1="0%" y1="0%" x2="100%" y2="100%">
				<stop offset="0%" style="stop-color:#6366f1"/>
				<stop offset="100%" style="stop-color:#8b5cf6"/>
			</linearGradient>
			<linearGradient id="blade-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
				<stop offset="0%" style="stop-color:#e0e7ff"/>
				<stop offset="50%" style="stop-color:#c7d2fe"/>
				<stop offset="100%" style="stop-color:#a5b4fc"/>
			</linearGradient>
		</defs>
		<rect width="32" height="32" rx="6" fill="url(#logo-bg)"/>
		<!-- Katana blade -->
		<path d="M6 26 L24 6 L26 8 L8 28 Z" fill="url(#blade-gradient)" class="blade"/>
		<!-- Blade edge highlight -->
		<line x1="6" y1="26" x2="24" y2="6" stroke="#ffffff" stroke-width="1" opacity="0.6" class="edge"/>
		<!-- Handle wrap -->
		<rect x="3" y="25" width="6" height="4" rx="1" fill="#dc2626" transform="rotate(-45 6 27)" class="handle"/>
		<!-- Guard (tsuba) -->
		<ellipse cx="9" cy="23" rx="2" ry="1" fill="#fbbf24" transform="rotate(-45 9 23)" class="guard"/>
		<!-- Slash effect lines -->
		<path d="M18 10 L22 6" stroke="#ef4444" stroke-width="1.5" stroke-linecap="round" opacity="0.8" class="slash s1"/>
		<path d="M20 12 L24 8" stroke="#ef4444" stroke-width="1" stroke-linecap="round" opacity="0.6" class="slash s2"/>
		<path d="M16 8 L20 4" stroke="#ef4444" stroke-width="1" stroke-linecap="round" opacity="0.4" class="slash s3"/>
	</svg>
	<span class="logo-text">CommentSlash</span>
</div>

<style>
	.logo {
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}

	.logo-icon {
		filter: drop-shadow(0 4px 8px rgba(99, 102, 241, 0.3));
		transition: transform 0.3s ease;
	}

	.logo:hover .logo-icon {
		transform: rotate(-5deg) scale(1.05);
	}

	.logo:hover .blade {
		animation: slash 0.4s ease-out;
	}

	.logo:hover .slash {
		animation: slashEffect 0.5s ease-out;
	}

	.slash.s1 { animation-delay: 0s; }
	.slash.s2 { animation-delay: 0.1s; }
	.slash.s3 { animation-delay: 0.2s; }

	@keyframes slash {
		0% { transform: translate(0, 0); }
		50% { transform: translate(2px, -2px); }
		100% { transform: translate(0, 0); }
	}

	@keyframes slashEffect {
		0% { opacity: 0.4; stroke-width: 1; }
		50% { opacity: 1; stroke-width: 2; }
		100% { opacity: 0.4; stroke-width: 1; }
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
