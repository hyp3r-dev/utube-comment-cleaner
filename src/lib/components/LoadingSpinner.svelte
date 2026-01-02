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
		<div class="broom-wrapper">
			<svg viewBox="0 0 100 100" class="broom">
				<!-- Broom bristles -->
				<g class="bristles">
					<line x1="60" y1="30" x2="85" y2="5" stroke="#fbbf24" stroke-width="3" stroke-linecap="round"/>
					<line x1="65" y1="35" x2="90" y2="15" stroke="#fbbf24" stroke-width="3" stroke-linecap="round"/>
					<line x1="70" y1="40" x2="95" y2="25" stroke="#fbbf24" stroke-width="3" stroke-linecap="round"/>
				</g>
				<!-- Handle -->
				<line x1="20" y1="80" x2="55" y2="45" stroke="#fbbf24" stroke-width="5" stroke-linecap="round"/>
			</svg>
		</div>
		
		<!-- Sparkles -->
		<div class="sparkles">
			<div class="sparkle s1">✨</div>
			<div class="sparkle s2">✨</div>
			<div class="sparkle s3">✨</div>
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

	.broom-wrapper {
		width: 100%;
		height: 100%;
		animation: sweep 1.2s ease-in-out infinite;
	}

	.broom {
		width: 100%;
		height: 100%;
	}

	.bristles {
		transform-origin: 60px 30px;
		animation: bristle 0.3s ease-in-out infinite alternate;
	}

	@keyframes sweep {
		0%, 100% {
			transform: translateX(-10px) rotate(-15deg);
		}
		50% {
			transform: translateX(10px) rotate(15deg);
		}
	}

	@keyframes bristle {
		0% {
			transform: rotate(-5deg);
		}
		100% {
			transform: rotate(5deg);
		}
	}

	.sparkles {
		position: absolute;
		inset: 0;
		pointer-events: none;
	}

	.sparkle {
		position: absolute;
		font-size: calc(var(--size) * 0.3);
		opacity: 0;
		animation: sparkle 1.5s ease-in-out infinite;
	}

	.s1 {
		top: 0;
		right: 10%;
		animation-delay: 0s;
	}

	.s2 {
		top: 30%;
		right: 0;
		animation-delay: 0.5s;
	}

	.s3 {
		top: 60%;
		right: 20%;
		animation-delay: 1s;
	}

	@keyframes sparkle {
		0%, 100% {
			opacity: 0;
			transform: scale(0.5) translateY(10px);
		}
		50% {
			opacity: 1;
			transform: scale(1) translateY(-10px);
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
		background: var(--gradient-primary);
		border-radius: 3px;
		transition: width 0.3s ease;
	}

	.progress-text {
		font-size: 0.8rem;
		color: var(--text-muted);
	}
</style>
