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
		<div class="shuriken-wrapper">
			<svg viewBox="0 0 100 100" class="shuriken">
				<!-- Shuriken (ninja star) blades -->
				<defs>
					<linearGradient id="spinner-blade" x1="0%" y1="0%" x2="100%" y2="100%">
						<stop offset="0%" style="stop-color:#a78bfa"/>
						<stop offset="50%" style="stop-color:#6366f1"/>
						<stop offset="100%" style="stop-color:#4f46e5"/>
					</linearGradient>
					<linearGradient id="spinner-edge" x1="0%" y1="0%" x2="100%" y2="100%">
						<stop offset="0%" style="stop-color:#e0e7ff"/>
						<stop offset="100%" style="stop-color:#c7d2fe"/>
					</linearGradient>
				</defs>
				<!-- Four-pointed shuriken blades -->
				<path d="M50 10 L55 45 L50 50 L45 45 Z" fill="url(#spinner-blade)" class="blade"/>
				<path d="M90 50 L55 55 L50 50 L55 45 Z" fill="url(#spinner-blade)" class="blade"/>
				<path d="M50 90 L45 55 L50 50 L55 55 Z" fill="url(#spinner-blade)" class="blade"/>
				<path d="M10 50 L45 45 L50 50 L45 55 Z" fill="url(#spinner-blade)" class="blade"/>
				<!-- Edge highlights -->
				<path d="M50 10 L55 45 L50 50" stroke="url(#spinner-edge)" stroke-width="1" fill="none" opacity="0.8"/>
				<path d="M90 50 L55 55 L50 50" stroke="url(#spinner-edge)" stroke-width="1" fill="none" opacity="0.8"/>
				<path d="M50 90 L45 55 L50 50" stroke="url(#spinner-edge)" stroke-width="1" fill="none" opacity="0.8"/>
				<path d="M10 50 L45 45 L50 50" stroke="url(#spinner-edge)" stroke-width="1" fill="none" opacity="0.8"/>
				<!-- Center hole -->
				<circle cx="50" cy="50" r="6" fill="#1a1a2e"/>
				<circle cx="50" cy="50" r="4" fill="#ef4444"/>
			</svg>
		</div>
		
		<!-- Motion trail effects -->
		<div class="motion-trails">
			<div class="trail t1"></div>
			<div class="trail t2"></div>
			<div class="trail t3"></div>
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

	.shuriken-wrapper {
		width: 100%;
		height: 100%;
		animation: shurikenSpin 1.2s linear infinite;
	}

	.shuriken {
		width: 100%;
		height: 100%;
		filter: drop-shadow(0 0 12px rgba(99, 102, 241, 0.6));
	}

	@keyframes shurikenSpin {
		0% {
			transform: rotate(0deg);
		}
		100% {
			transform: rotate(360deg);
		}
	}

	/* Motion trail effects */
	.motion-trails {
		position: absolute;
		inset: 0;
		pointer-events: none;
		animation: shurikenSpin 1.2s linear infinite;
	}

	.trail {
		position: absolute;
		width: 40%;
		height: 2px;
		top: 50%;
		left: 50%;
		background: linear-gradient(90deg, rgba(99, 102, 241, 0.6), transparent);
		transform-origin: left center;
		opacity: 0;
		animation: trailFade 0.6s ease-out infinite;
	}

	.t1 {
		transform: rotate(0deg) translateY(-50%);
		animation-delay: 0s;
	}

	.t2 {
		transform: rotate(90deg) translateY(-50%);
		animation-delay: 0.15s;
	}

	.t3 {
		transform: rotate(180deg) translateY(-50%);
		animation-delay: 0.3s;
	}

	@keyframes trailFade {
		0% {
			opacity: 0.8;
			width: 50%;
		}
		100% {
			opacity: 0;
			width: 30%;
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
