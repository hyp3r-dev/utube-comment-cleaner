<script lang="ts">
	let isGuideExpanded = $state(false);
	let expandedStep = $state<number | null>(null);

	const steps = [
		{
			title: "Go to Google Takeout",
			description: "Visit Google Takeout to download your YouTube data. Make sure you're signed in with the Google account you use for YouTube.",
			link: "https://takeout.google.com/",
			icon: "🌐"
		},
		{
			title: "Deselect All & Select YouTube",
			description: "Click 'Deselect all' at the top, then scroll down and check only 'YouTube and YouTube Music' to save time and download size.",
			link: "https://takeout.google.com/",
			icon: "✅"
		},
		{
			title: "Click 'All YouTube data included'",
			description: "Click the button that says 'All YouTube data included' and deselect everything except 'comments'. This ensures you only download what you need.",
			link: "https://takeout.google.com/",
			icon: "📝"
		},
		{
			title: "Create & Download Export",
			description: "Click 'Next step', choose your export settings (ZIP format recommended), then click 'Create export'. Google will email you when it's ready to download.",
			link: "https://takeout.google.com/",
			icon: "📦"
		},
		{
			title: "Extract & Upload",
			description: "Once downloaded, extract the ZIP file. Navigate to 'Takeout/YouTube and YouTube Music/my-comments/' and upload the 'my-comments.html' file here.",
			link: "",
			icon: "📁"
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
				<span class="toggle-title">How to get your Google Takeout export</span>
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
				<div class="guide-icon animate-float">📥</div>
				<p>Download your YouTube comment history from Google</p>
			</div>

			<div class="info-box">
				<div class="info-icon">ℹ️</div>
				<div class="info-content">
					<strong>Why Google Takeout?</strong>
					<p>The YouTube API doesn't provide a way to retrieve comments you've posted on other people's videos. Google Takeout is the only official method to export your complete comment history.</p>
				</div>
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
								{#if step.link}
									<a href={step.link} target="_blank" rel="noopener noreferrer" class="step-link">
										<span>Open Google Takeout</span>
										<svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
											<path d="M11 3a1 1 0 100 2h2.586l-6.293 6.293a1 1 0 101.414 1.414L15 6.414V9a1 1 0 102 0V4a1 1 0 00-1-1h-5z" />
											<path d="M5 5a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2v-3a1 1 0 10-2 0v3H5V7h3a1 1 0 000-2H5z" />
										</svg>
									</a>
								{/if}
							</div>
						{/if}
					</div>
				{/each}
			</div>

			<div class="tip-box">
				<div class="tip-icon">💡</div>
				<div class="tip-content">
					<strong>Pro Tip:</strong> Google Takeout exports can take a few minutes to hours depending on your data size. 
					You'll receive an email when your export is ready to download.
				</div>
			</div>

			<div class="tip-box warning">
				<div class="tip-icon">⚠️</div>
				<div class="tip-content">
					<strong>Note:</strong> To delete comments, you'll also need to connect your YouTube account with an OAuth token. 
					This is only needed for deletion, not for viewing your comments.
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

	.info-box {
		display: flex;
		align-items: flex-start;
		gap: 1rem;
		margin-bottom: 1.5rem;
		padding: 1rem 1.25rem;
		background: rgba(59, 130, 246, 0.1);
		border: 1px solid rgba(59, 130, 246, 0.2);
		border-radius: var(--radius-md);
	}

	.info-icon {
		font-size: 1.25rem;
		flex-shrink: 0;
	}

	.info-content {
		color: var(--text-secondary);
		font-size: 0.875rem;
		line-height: 1.6;
	}

	.info-content strong {
		color: rgb(96, 165, 250);
		display: block;
		margin-bottom: 0.25rem;
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

	.tip-box.warning {
		background: rgba(239, 68, 68, 0.1);
		border: 1px solid rgba(239, 68, 68, 0.2);
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

	.tip-box.warning .tip-content strong {
		color: var(--error);
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
