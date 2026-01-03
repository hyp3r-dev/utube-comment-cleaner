<script lang="ts">
	let { 
		size = 40,
		message = 'Loading...',
		progress 
	}: { 
		size?: number;
		message?: string;
		progress?: { loaded: number; total?: number };
	} = $props();
</script>

<div class="loading-container">
	<div class="spinner" style="--size: {size}px">
		<div class="katana-wrapper">
			<svg viewBox="0 0 100 100" class="katana">
				<!-- Katana blade -->
				<defs>
					<linearGradient id="spinner-blade" x1="0%" y1="0%" x2="100%" y2="100%">
						<stop offset="0%" style="stop-color:#e0e7ff"/>
						<stop offset="50%" style="stop-color:#c7d2fe"/>
						<stop offset="100%" style="stop-color:#a5b4fc"/>
					</linearGradient>
				</defs>
				<path d="M20 80 L75 20 L80 25 L25 85 Z" fill="url(#spinner-blade)" class="blade"/>
				<!-- Edge highlight -->
				<line x1="20" y1="80" x2="75" y2="20" stroke="#ffffff" stroke-width="1" opacity="0.6"/>
				<!-- Handle -->
				<rect x="12" y="78" width="12" height="6" rx="2" fill="#dc2626" transform="rotate(-45 18 81)"/>
				<!-- Guard -->
				<ellipse cx="25" cy="75" rx="4" ry="2" fill="#fbbf24" transform="rotate(-45 25 75)"/>
			</svg>
		</div>
		
		<!-- Slash effects -->
		<div class="slash-effects">
			<div class="slash-line s1"></div>
			<div class="slash-line s2"></div>
			<div class="slash-line s3"></div>
		</div>
		
		<!-- Impact sparks -->
		<div class="sparks">
			<div class="spark sp1">⚡</div>
			<div class="spark sp2">✦</div>
			<div class="spark sp3">✦</div>
		</div>
	</div>

	<p class="message">{message}</p>
	
	{#if progress}
		<div class="progress-info">
			<div class="progress-bar">
				<div 
					class="progress-fill" 
					style="width: {progress.total ? (progress.loaded / progress.total) * 100 : 0}%"
				></div>
			</div>
			<span class="progress-text">
				{progress.loaded}{progress.total ? ` / ${progress.total}` : ''} comments
			</span>
		</div>
	{/if}
</div>

<style>
	.loading-container {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: 3rem;
		text-align: center;
	}

	.spinner {
		width: var(--size);
		height: var(--size);
		position: relative;
		margin-bottom: 1.5rem;
	}

	.katana-wrapper {
		width: 100%;
		height: 100%;
		animation: slash 0.8s ease-in-out infinite;
	}

	.katana {
		width: 100%;
		height: 100%;
		filter: drop-shadow(0 0 8px rgba(99, 102, 241, 0.5));
	}

	@keyframes slash {
		0%, 100% {
			transform: translateX(-5px) translateY(5px) rotate(0deg);
		}
		50% {
			transform: translateX(5px) translateY(-5px) rotate(-10deg);
		}
	}

	.slash-effects {
		position: absolute;
		inset: 0;
		pointer-events: none;
	}

	.slash-line {
		position: absolute;
		width: 60%;
		height: 2px;
		background: linear-gradient(90deg, transparent, #ef4444, transparent);
		transform: rotate(-45deg);
		opacity: 0;
		animation: slashLine 0.8s ease-in-out infinite;
	}

	.s1 {
		top: 20%;
		right: 10%;
		animation-delay: 0s;
	}

	.s2 {
		top: 35%;
		right: 5%;
		animation-delay: 0.1s;
		width: 40%;
	}

	.s3 {
		top: 50%;
		right: 15%;
		animation-delay: 0.2s;
		width: 30%;
	}

	@keyframes slashLine {
		0%, 40% {
			opacity: 0;
			transform: rotate(-45deg) scaleX(0);
		}
		50% {
			opacity: 1;
			transform: rotate(-45deg) scaleX(1);
		}
		60%, 100% {
			opacity: 0;
			transform: rotate(-45deg) scaleX(0);
		}
	}

	.sparks {
		position: absolute;
		inset: 0;
		pointer-events: none;
	}

	.spark {
		position: absolute;
		font-size: calc(var(--size) * 0.25);
		opacity: 0;
		animation: sparkBurst 0.8s ease-out infinite;
	}

	.sp1 {
		top: 15%;
		right: 20%;
		animation-delay: 0.4s;
		color: #fbbf24;
	}

	.sp2 {
		top: 25%;
		right: 10%;
		animation-delay: 0.5s;
		color: #ef4444;
	}

	.sp3 {
		top: 35%;
		right: 25%;
		animation-delay: 0.6s;
		color: #a78bfa;
	}

	@keyframes sparkBurst {
		0%, 40% {
			opacity: 0;
			transform: scale(0.5) translate(0, 0);
		}
		50% {
			opacity: 1;
			transform: scale(1.2) translate(-5px, -5px);
		}
		100% {
			opacity: 0;
			transform: scale(0.5) translate(-10px, -10px);
		}
	}

	.message {
		font-size: 1.1rem;
		font-weight: 500;
		color: var(--text-secondary);
		margin-bottom: 1rem;
	}

	.progress-info {
		width: 100%;
		max-width: 300px;
	}

	.progress-bar {
		height: 6px;
		background: var(--bg-tertiary);
		border-radius: 3px;
		overflow: hidden;
		margin-bottom: 0.5rem;
	}

	.progress-fill {
		height: 100%;
		background: linear-gradient(90deg, #6366f1, #ef4444, #8b5cf6);
		background-size: 200% 100%;
		animation: gradientShift 2s ease infinite;
		border-radius: 3px;
		transition: width 0.3s ease;
	}

	@keyframes gradientShift {
		0%, 100% { background-position: 0% 50%; }
		50% { background-position: 100% 50%; }
	}

	.progress-text {
		font-size: 0.8rem;
		color: var(--text-muted);
	}
</style>
