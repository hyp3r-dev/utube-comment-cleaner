<script lang="ts">
	let isGuideExpanded = $state(false);
	let expandedStep = $state<number | null>(null);

	const steps = [
		{
			title: "Go to Google Cloud Console",
			description: "Open the Google Cloud Console and create a new project or select an existing one.",
			link: "https://console.cloud.google.com/",
			icon: "🌐"
		},
		{
			title: "Enable YouTube Data API v3",
			description: "Navigate to 'APIs & Services' → 'Library' and search for 'YouTube Data API v3'. Click on it and enable the API.",
			link: "https://console.cloud.google.com/apis/library/youtube.googleapis.com",
			icon: "📺"
		},
		{
			title: "Create OAuth Credentials",
			description: "Go to 'APIs & Services' → 'Credentials' → 'Create Credentials' → 'OAuth client ID'. Select 'Web application' as the application type.",
			link: "https://console.cloud.google.com/apis/credentials",
			icon: "🔑"
		},
		{
			title: "Configure OAuth Consent Screen",
			description: "Set up the OAuth consent screen with your app name. Add the required scopes: 'youtube.force-ssl' for read/write access to comments.",
			link: "https://console.cloud.google.com/apis/credentials/consent",
			icon: "⚙️"
		},
		{
			title: "Get Your Access Token",
			description: "Use the OAuth 2.0 Playground to generate an access token. Authorize with the YouTube Data API v3 scope and exchange for tokens.",
			link: "https://developers.google.com/oauthplayground/",
			icon: "🎫"
		}
	];

	function toggleGuide() {
		isGuideExpanded = !isGuideExpanded;
	}

	function toggleStep(index: number) {
		expandedStep = expandedStep === index ? null : index;
	}
</script>

<div class="guide-container" class:expanded={isGuideExpanded}>
	<button class="guide-toggle" onclick={toggleGuide}>
		<div class="toggle-content">
			<div class="toggle-icon" class:expanded={isGuideExpanded}>
				<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<circle cx="12" cy="12" r="10"/>
					<path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/>
					<path d="M12 17h.01"/>
				</svg>
			</div>
			<div class="toggle-text">
				<span class="toggle-title">How to get your access token</span>
				<span class="toggle-subtitle">Click to {isGuideExpanded ? 'hide' : 'show'} the step-by-step guide</span>
			</div>
		</div>
		<div class="toggle-arrow" class:rotated={isGuideExpanded}>
			<svg width="24" height="24" viewBox="0 0 20 20" fill="currentColor">
				<path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd" />
			</svg>
		</div>
	</button>

	{#if isGuideExpanded}
		<div class="guide-content">
			<div class="guide-header">
				<div class="guide-icon animate-float">🔐</div>
				<p>Follow these steps to connect your YouTube account</p>
			</div>

			<div class="steps">
				{#each steps as step, i}
					<div 
						class="step" 
						class:expanded={expandedStep === i}
						style="animation-delay: {i * 100}ms"
					>
						<button class="step-header" onclick={() => toggleStep(i)}>
							<div class="step-number">{i + 1}</div>
							<div class="step-icon">{step.icon}</div>
							<div class="step-title">{step.title}</div>
							<div class="step-arrow" class:rotated={expandedStep === i}>
								<svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
									<path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd" />
								</svg>
							</div>
						</button>
						
						{#if expandedStep === i}
							<div class="step-content">
								<p>{step.description}</p>
								<a href={step.link} target="_blank" rel="noopener noreferrer" class="step-link">
									<span>Open in new tab</span>
									<svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
										<path d="M11 3a1 1 0 100 2h2.586l-6.293 6.293a1 1 0 101.414 1.414L15 6.414V9a1 1 0 102 0V4a1 1 0 00-1-1h-5z" />
										<path d="M5 5a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2v-3a1 1 0 10-2 0v3H5V7h3a1 1 0 000-2H5z" />
									</svg>
								</a>
							</div>
						{/if}
					</div>
				{/each}
			</div>

			<div class="tip-box">
				<div class="tip-icon">💡</div>
				<div class="tip-content">
					<strong>Pro Tip:</strong> The access token expires after 1 hour. For testing, use the OAuth Playground's 
					auto-refresh feature, or generate a new token when needed.
				</div>
			</div>
		</div>
	{/if}
</div>

<style>
	.guide-container {
		background: var(--bg-card);
		border-radius: var(--radius-xl);
		border: 1px solid var(--bg-tertiary);
		margin-top: 1.5rem;
		overflow: hidden;
		transition: all 0.3s ease;
	}

	.guide-container.expanded {
		border-color: var(--accent-primary);
	}

	.guide-toggle {
		width: 100%;
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 1rem 1.5rem;
		background: transparent;
		color: var(--text-primary);
		cursor: pointer;
		transition: all 0.3s ease;
	}

	.guide-toggle:hover {
		background: var(--bg-hover);
	}

	.toggle-content {
		display: flex;
		align-items: center;
		gap: 1rem;
	}

	.toggle-icon {
		width: 48px;
		height: 48px;
		display: flex;
		align-items: center;
		justify-content: center;
		background: var(--gradient-primary);
		border-radius: 50%;
		color: white;
		animation: gentlePulse 2s ease-in-out infinite;
		flex-shrink: 0;
	}

	.toggle-icon.expanded {
		animation: none;
	}

	@keyframes gentlePulse {
		0%, 100% {
			transform: scale(1);
			box-shadow: 0 0 0 0 rgba(99, 102, 241, 0.4);
		}
		50% {
			transform: scale(1.05);
			box-shadow: 0 0 0 10px rgba(99, 102, 241, 0);
		}
	}

	.toggle-text {
		display: flex;
		flex-direction: column;
		text-align: left;
	}

	.toggle-title {
		font-size: 1.1rem;
		font-weight: 700;
		color: var(--text-primary);
	}

	.toggle-subtitle {
		font-size: 0.8rem;
		color: var(--text-muted);
	}

	.toggle-arrow {
		color: var(--text-muted);
		transition: transform 0.3s ease;
	}

	.toggle-arrow.rotated {
		transform: rotate(180deg);
	}

	.guide-content {
		padding: 0 1.5rem 1.5rem;
		animation: expandContent 0.3s ease;
	}

	@keyframes expandContent {
		from {
			opacity: 0;
			transform: translateY(-10px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	.guide-header {
		text-align: center;
		margin-bottom: 1.5rem;
		padding-top: 0.5rem;
	}

	.guide-icon {
		font-size: 2.5rem;
		margin-bottom: 0.5rem;
	}

	.guide-header p {
		color: var(--text-secondary);
		font-size: 0.95rem;
	}

	.steps {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.step {
		background: var(--bg-tertiary);
		border-radius: var(--radius-md);
		overflow: hidden;
		transition: all 0.3s ease;
		animation: fadeIn 0.5s ease forwards;
		opacity: 0;
	}

	.step:hover {
		background: var(--bg-hover);
	}

	.step.expanded {
		background: var(--bg-hover);
		box-shadow: 0 0 0 2px var(--accent-primary), var(--shadow-md);
	}

	.step-header {
		width: 100%;
		display: flex;
		align-items: center;
		gap: 1rem;
		padding: 1rem 1.25rem;
		background: transparent;
		color: var(--text-primary);
		text-align: left;
		cursor: pointer;
	}

	.step-number {
		width: 28px;
		height: 28px;
		border-radius: 50%;
		background: var(--gradient-primary);
		display: flex;
		align-items: center;
		justify-content: center;
		font-weight: 700;
		font-size: 0.875rem;
		flex-shrink: 0;
	}

	.step-icon {
		font-size: 1.25rem;
		flex-shrink: 0;
	}

	.step-title {
		flex: 1;
		font-weight: 500;
	}

	.step-arrow {
		color: var(--text-muted);
		transition: transform 0.3s ease;
	}

	.step-arrow.rotated {
		transform: rotate(180deg);
	}

	.step-content {
		padding: 0 1.25rem 1.25rem 4.5rem;
		animation: slideDown 0.3s ease;
	}

	@keyframes slideDown {
		from {
			opacity: 0;
			transform: translateY(-10px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	@keyframes fadeIn {
		to {
			opacity: 1;
		}
	}

	.step-content p {
		color: var(--text-secondary);
		margin-bottom: 1rem;
		line-height: 1.6;
	}

	.step-link {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.5rem 1rem;
		background: var(--accent-primary);
		color: white;
		border-radius: var(--radius-sm);
		font-size: 0.875rem;
		font-weight: 500;
		transition: all 0.2s ease;
		text-decoration: none;
	}

	.step-link:hover {
		background: var(--accent-secondary);
		transform: translateY(-2px);
		text-decoration: none;
	}

	.tip-box {
		display: flex;
		align-items: flex-start;
		gap: 1rem;
		margin-top: 1.5rem;
		padding: 1rem 1.25rem;
		background: rgba(251, 191, 36, 0.1);
		border: 1px solid rgba(251, 191, 36, 0.2);
		border-radius: var(--radius-md);
	}

	.tip-icon {
		font-size: 1.25rem;
		flex-shrink: 0;
	}

	.tip-content {
		color: var(--text-secondary);
		font-size: 0.875rem;
		line-height: 1.6;
	}

	.tip-content strong {
		color: var(--warning);
	}

	@media (max-width: 640px) {
		.guide-toggle {
			padding: 1rem;
		}

		.toggle-icon {
			width: 40px;
			height: 40px;
		}

		.toggle-title {
			font-size: 0.95rem;
		}

		.guide-content {
			padding: 0 1rem 1rem;
		}

		.step-content {
			padding-left: 1.25rem;
		}

		.step-header {
			flex-wrap: wrap;
		}
	}
</style>
