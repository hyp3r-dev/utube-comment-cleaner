<script lang="ts">
	import YouTubeAccountInfobox from './YouTubeAccountInfobox.svelte';
	
	type ConnectionStatus = 'disconnected' | 'connected' | 'working' | 'error' | 'deleting';
	
	let { 
		status = 'disconnected',
		channelTitle = '',
		channelId = '',
		onConnect,
		onReenrich,
		isReenriching = false,
		reenrichProgress
	}: { 
		status?: ConnectionStatus;
		channelTitle?: string;
		channelId?: string;
		onConnect?: () => void;
		onReenrich?: () => void;
		isReenriching?: boolean;
		reenrichProgress?: { enriched: number; total: number };
	} = $props();
	
	let showInfobox = $state(false);
	
	function handleClick(e: MouseEvent) {
		if (status === 'disconnected') {
			onConnect?.();
		} else if (status === 'connected' || status === 'working') {
			// Toggle the infobox for connected/working state
			e.stopPropagation();
			showInfobox = !showInfobox;
		}
	}
	
	function handleCloseInfobox() {
		showInfobox = false;
	}
</script>

<div class="youtube-status-container">
	<button 
		class="youtube-status" 
		class:disconnected={status === 'disconnected'}
		class:connected={status === 'connected'}
		class:working={status === 'working'}
		class:error={status === 'error'}
		class:infobox-open={showInfobox}
		onclick={handleClick}
		title={
			status === 'disconnected' ? 'YouTube: Not connected - Click to connect' :
			status === 'connected' ? 'YouTube: Connected - Click for account options' :
			status === 'working' ? 'YouTube: Processing... - Click for account options' :
			'YouTube: Connection error'
		}
		aria-label={
			status === 'disconnected' ? 'YouTube connection status: disconnected' :
			status === 'connected' ? 'YouTube connection status: connected' :
			status === 'working' ? 'YouTube connection status: working' :
			'YouTube connection status: error'
		}
	>
		<div class="icon-container">
			<!-- YouTube icon -->
			<svg class="youtube-icon" width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
				<path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
			</svg>
			
			<!-- Status ring/animation -->
			<div class="status-ring"></div>
			
			<!-- Working spinner with shurikens -->
			{#if status === 'working'}
				<div class="working-spinner"></div>
				<!-- Spinning shurikens orbiting around the icon -->
				<div class="shuriken shuriken-1" aria-hidden="true">
					<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
						<path d="M12 2L14 10L22 12L14 14L12 22L10 14L2 12L10 10L12 2Z"/>
					</svg>
				</div>
				<div class="shuriken shuriken-2" aria-hidden="true">
					<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
						<path d="M12 2L14 10L22 12L14 14L12 22L10 14L2 12L10 10L12 2Z"/>
					</svg>
				</div>
				<div class="shuriken shuriken-3" aria-hidden="true">
					<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
						<path d="M12 2L14 10L22 12L14 14L12 22L10 14L2 12L10 10L12 2Z"/>
					</svg>
				</div>
			{/if}
		</div>
		
		<!-- Status dot -->
		<span class="status-dot"></span>
	</button>
	
	{#if showInfobox && (status === 'connected' || status === 'working')}
		<YouTubeAccountInfobox 
			{channelTitle}
			{channelId}
			onClose={handleCloseInfobox}
			{onReenrich}
			{isReenriching}
			{reenrichProgress}
		/>
	{/if}
</div>

<style>
	.youtube-status-container {
		position: relative;
	}
	.youtube-status {
		position: relative;
		display: flex;
		align-items: center;
		justify-content: center;
		width: 40px;
		height: 40px;
		padding: 0;
		background: var(--bg-tertiary);
		border: 1px solid var(--bg-hover);
		border-radius: var(--radius-md);
		cursor: pointer;
		transition: all 0.3s ease;
	}

	.youtube-status:hover {
		box-shadow: var(--shadow-md);
	}

	/* Disconnected state */
	.youtube-status.disconnected {
		color: var(--text-muted);
	}

	.youtube-status.disconnected:hover {
		border-color: var(--accent-primary);
		color: var(--text-primary);
	}

	/* Connected state */
	.youtube-status.connected {
		color: #22c55e;
		border-color: rgba(34, 197, 94, 0.3);
	}

	.youtube-status.connected:hover {
		background: rgba(34, 197, 94, 0.1);
	}

	/* Connected with infobox open */
	.youtube-status.connected.infobox-open {
		background: rgba(34, 197, 94, 0.15);
		border-color: rgba(34, 197, 94, 0.5);
		box-shadow: 0 0 0 2px rgba(34, 197, 94, 0.2);
	}

	/* Working state */
	.youtube-status.working {
		color: var(--accent-primary);
		border-color: rgba(99, 102, 241, 0.3);
		animation: pulse-border 2s ease-in-out infinite;
	}

	@keyframes pulse-border {
		0%, 100% { border-color: rgba(99, 102, 241, 0.3); }
		50% { border-color: rgba(99, 102, 241, 0.6); }
	}

	/* Error state */
	.youtube-status.error {
		color: var(--error);
		border-color: rgba(239, 68, 68, 0.3);
	}

	.youtube-status.error:hover {
		background: rgba(239, 68, 68, 0.1);
	}

	.icon-container {
		position: relative;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.youtube-icon {
		width: 18px;
		height: 18px;
		transition: transform 0.3s ease;
	}

	.youtube-status:hover .youtube-icon {
		transform: scale(1.1);
	}

	/* Status ring for connected state */
	.status-ring {
		position: absolute;
		inset: -3px;
		border-radius: 50%;
		border: 2px solid transparent;
		pointer-events: none;
	}

	.youtube-status.connected .status-ring {
		border-color: rgba(34, 197, 94, 0.3);
		animation: ring-pulse 3s ease-in-out infinite;
	}

	@keyframes ring-pulse {
		0%, 100% { 
			transform: scale(1);
			opacity: 0.5;
		}
		50% { 
			transform: scale(1.15);
			opacity: 0;
		}
	}

	/* Working spinner */
	.working-spinner {
		position: absolute;
		inset: -4px;
		border: 2px solid transparent;
		border-top-color: var(--accent-primary);
		border-radius: 50%;
		animation: spin 1s linear infinite;
	}

	@keyframes spin {
		from { transform: rotate(0deg); }
		to { transform: rotate(360deg); }
	}

	/* Flying shurikens animation */
	.shuriken {
		position: absolute;
		width: 12px;
		height: 12px;
		pointer-events: none;
		color: var(--accent-primary);
	}

	.shuriken svg {
		animation: spinShuriken 0.6s linear infinite;
	}

	.shuriken-1 {
		animation: orbitShuriken 2.4s linear infinite;
		animation-delay: 0s;
	}

	.shuriken-2 {
		animation: orbitShuriken 2.4s linear infinite;
		animation-delay: -0.8s;
	}

	.shuriken-3 {
		animation: orbitShuriken 2.4s linear infinite;
		animation-delay: -1.6s;
	}

	@keyframes spinShuriken {
		from { transform: rotate(0deg); }
		to { transform: rotate(360deg); }
	}

	@keyframes orbitShuriken {
		0% {
			transform: rotate(0deg) translateX(26px);
			opacity: 1;
		}
		100% {
			transform: rotate(360deg) translateX(26px);
			opacity: 1;
		}
	}

	/* Status dot indicator */
	.status-dot {
		position: absolute;
		bottom: -2px;
		right: -2px;
		width: 10px;
		height: 10px;
		border-radius: 50%;
		border: 2px solid var(--bg-primary);
	}

	.youtube-status.disconnected .status-dot {
		background: var(--text-muted);
	}

	.youtube-status.connected .status-dot {
		background: #22c55e;
		animation: dot-pulse 2s ease-in-out infinite;
	}

	@keyframes dot-pulse {
		0%, 100% { box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.4); }
		50% { box-shadow: 0 0 0 4px rgba(34, 197, 94, 0); }
	}

	.youtube-status.working .status-dot {
		background: var(--accent-primary);
		animation: dot-flash 0.5s ease-in-out infinite;
	}

	@keyframes dot-flash {
		0%, 100% { opacity: 1; }
		50% { opacity: 0.3; }
	}

	.youtube-status.error .status-dot {
		background: var(--error);
	}

	/* Respect reduced motion preference */
	@media (prefers-reduced-motion: reduce) {
		.youtube-status.connected .status-ring,
		.youtube-status.connected .status-dot,
		.youtube-status.working .status-dot,
		.working-spinner {
			animation: none;
		}
	}

	@media (max-width: 768px) {
		.youtube-status {
			width: 36px;
			height: 36px;
		}

		.youtube-icon {
			width: 16px;
			height: 16px;
		}
	}
</style>
