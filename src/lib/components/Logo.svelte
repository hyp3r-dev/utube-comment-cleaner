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
		</defs>
		<rect width="32" height="32" rx="6" fill="url(#logo-bg)"/>
		<line x1="8" y1="24" x2="22" y2="8" stroke="#fbbf24" stroke-width="2.5" stroke-linecap="round" class="handle"/>
		<path d="M20 10 L26 4 M22 8 L28 6 M24 6 L28 2" stroke="#fbbf24" stroke-width="2" stroke-linecap="round" class="bristles"/>
		<circle cx="12" cy="10" r="1.5" fill="#fbbf24" opacity="0.8" class="sparkle s1"/>
		<circle cx="6" cy="16" r="1" fill="#fbbf24" opacity="0.6" class="sparkle s2"/>
		<circle cx="14" cy="20" r="1.2" fill="#fbbf24" opacity="0.7" class="sparkle s3"/>
	</svg>
	<span class="logo-text">CommentSweep</span>
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
		transform: rotate(-10deg) scale(1.05);
	}

	.logo:hover .bristles {
		animation: sweep 0.6s ease-in-out;
	}

	.logo:hover .sparkle {
		animation: sparkle 0.8s ease-in-out infinite;
	}

	.sparkle.s1 { animation-delay: 0s; }
	.sparkle.s2 { animation-delay: 0.2s; }
	.sparkle.s3 { animation-delay: 0.4s; }

	@keyframes sweep {
		0%, 100% { transform: translate(0, 0); }
		25% { transform: translate(2px, -2px); }
		75% { transform: translate(-2px, 2px); }
	}

	@keyframes sparkle {
		0%, 100% { opacity: 0.6; transform: scale(1); }
		50% { opacity: 1; transform: scale(1.3); }
	}

	.logo-text {
		font-size: calc(var(--size) * 0.5);
		font-weight: 800;
		background: linear-gradient(135deg, #f0f0ff 0%, #a78bfa 100%);
		-webkit-background-clip: text;
		-webkit-text-fill-color: transparent;
		background-clip: text;
		letter-spacing: -0.02em;
	}
</style>
