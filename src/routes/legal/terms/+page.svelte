<script lang="ts">
	import Logo from '$lib/components/Logo.svelte';
</script>

<svelte:head>
	<title>Terms of Service - CommentSlash</title>
</svelte:head>

<div class="legal-page">
	<header class="header">
		<div class="container header-content">
			<a href="/" class="logo-link">
				<Logo size={36} />
			</a>
		</div>
	</header>

	<main class="main">
		<div class="container">
			<article class="legal-content">
				<h1>Terms of Service</h1>
				<p class="last-updated">Last updated: January 2026</p>

				<section>
					<h2>1. Acceptance of Terms</h2>
					<p>By accessing or using CommentSlash ("the Service"), you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use the Service.</p>
				</section>

				<section>
					<h2>2. Description of Service</h2>
					<p>CommentSlash is a web application that helps users manage and delete their YouTube comments. The Service allows you to:</p>
					<ul>
						<li>Import your YouTube comment history from Google Takeout exports</li>
						<li>View, search, and filter your comments</li>
						<li>Delete comments through the YouTube Data API v3</li>
					</ul>
				</section>

				<section>
					<h2>3. User Requirements</h2>
					<p>To use the Service, you must:</p>
					<ul>
						<li>Have a valid Google/YouTube account</li>
						<li>Be at least 13 years of age</li>
						<li>Comply with YouTube's Terms of Service and Community Guidelines</li>
						<li>Have the authority to manage the comments you wish to delete</li>
					</ul>
				</section>

				<section>
					<h2>4. Google and YouTube Integration</h2>
					
					<h3>4.1 Google Account Access</h3>
					<p>When you connect your Google account, you grant the Service permission to:</p>
					<ul>
						<li>Access your YouTube channel information</li>
						<li>Read and delete your YouTube comments</li>
					</ul>

					<h3>4.2 Third-Party Terms</h3>
					<p>Your use of Google and YouTube features is subject to:</p>
					<ul>
						<li><a href="https://policies.google.com/terms" target="_blank" rel="noopener noreferrer">Google Terms of Service</a></li>
						<li><a href="https://www.youtube.com/t/terms" target="_blank" rel="noopener noreferrer">YouTube Terms of Service</a></li>
						<li><a href="https://www.youtube.com/howyoutubeworks/policies/community-guidelines/" target="_blank" rel="noopener noreferrer">YouTube Community Guidelines</a></li>
					</ul>
				</section>

				<section>
					<h2>5. User Responsibilities</h2>
					<p>You agree to:</p>
					<ul>
						<li>Use the Service only for managing your own comments</li>
						<li>Not attempt to delete comments belonging to others</li>
						<li>Not use the Service to violate any laws or third-party rights</li>
						<li>Not reverse engineer, decompile, or attempt to extract the source code</li>
						<li>Not use automated means to access the Service beyond normal usage</li>
					</ul>
				</section>

				<section>
					<h2>6. Intellectual Property</h2>
					<ul>
						<li>The Service and its original content are owned by the CommentSlash project</li>
						<li>The Service is open source under the MIT License</li>
						<li>Your comments and data remain your property</li>
					</ul>
				</section>

				<section>
					<h2>7. API Quotas and Limitations</h2>
					<ul>
						<li>The YouTube Data API v3 has daily quota limits</li>
						<li>We track quota usage to prevent exceeding limits</li>
						<li>The Service may be temporarily unavailable if quotas are exceeded</li>
						<li>We are not responsible for any limitations imposed by Google/YouTube</li>
					</ul>
				</section>

				<section>
					<h2>8. Disclaimer of Warranties</h2>
					<p>THE SERVICE IS PROVIDED "AS IS" WITHOUT WARRANTIES OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING:</p>
					<ul>
						<li>Merchantability</li>
						<li>Fitness for a particular purpose</li>
						<li>Non-infringement</li>
						<li>Accuracy or reliability of results</li>
					</ul>
				</section>

				<section>
					<h2>9. Limitation of Liability</h2>
					<p>TO THE MAXIMUM EXTENT PERMITTED BY LAW, WE SHALL NOT BE LIABLE FOR:</p>
					<ul>
						<li>Any indirect, incidental, special, or consequential damages</li>
						<li>Loss of data, profits, or business opportunities</li>
						<li>Damages arising from your use or inability to use the Service</li>
						<li>Actions taken by Google, YouTube, or other third parties</li>
					</ul>
				</section>

				<section>
					<h2>10. Indemnification</h2>
					<p>You agree to indemnify and hold harmless CommentSlash and its contributors from any claims, damages, or expenses arising from:</p>
					<ul>
						<li>Your use of the Service</li>
						<li>Your violation of these Terms</li>
						<li>Your violation of any third-party rights</li>
					</ul>
				</section>

				<section>
					<h2>11. Changes to Service</h2>
					<p>We reserve the right to:</p>
					<ul>
						<li>Modify or discontinue the Service at any time</li>
						<li>Change these Terms of Service</li>
					</ul>
					<p>Changes will be effective upon posting to the repository.</p>
				</section>

				<section>
					<h2>12. Termination</h2>
					<ul>
						<li>You may stop using the Service at any time</li>
						<li>We may terminate your access for violation of these Terms</li>
						<li>Upon termination, your locally stored data will remain until you clear it</li>
					</ul>
				</section>

				<section>
					<h2>13. Governing Law</h2>
					<p>These Terms shall be governed by and construed in accordance with the laws of Germany, without regard to conflict of law principles.</p>
				</section>

				<section>
					<h2>14. Dispute Resolution</h2>
					<p>For EU residents: You may also seek resolution through the <a href="https://ec.europa.eu/consumers/odr/" target="_blank" rel="noopener noreferrer">EU Online Dispute Resolution Platform</a>.</p>
				</section>

				<section>
					<h2>15. Severability</h2>
					<p>If any provision of these Terms is found to be unenforceable, the remaining provisions will continue in effect.</p>
				</section>

				<section>
					<h2>16. Contact</h2>
					<p>For questions about these Terms, please open an issue at:<br/>
					<a href="https://github.com/hyp3r-dev/utube-comment-cleaner/issues" target="_blank" rel="noopener noreferrer">https://github.com/hyp3r-dev/utube-comment-cleaner/issues</a></p>
				</section>

				<section class="german-summary">
					<h2>Nutzungsbedingungen (German Summary)</h2>
					<p>Durch die Nutzung von CommentSlash stimmen Sie diesen Nutzungsbedingungen zu. Der Dienst wird "wie besehen" ohne Garantien bereitgestellt. Sie sind dafür verantwortlich, nur Ihre eigenen Kommentare zu verwalten und alle geltenden Gesetze sowie die YouTube-Nutzungsbedingungen einzuhalten.</p>
				</section>
			</article>
		</div>
	</main>

	<footer class="footer">
		<div class="container">
			<div class="footer-links">
				<a href="/legal/privacy">Privacy Policy</a>
				<span class="separator">•</span>
				<a href="/legal/terms">Terms of Service</a>
				<span class="separator">•</span>
				<a href="/">Back to App</a>
			</div>
			<p>CommentSlash — Destroy your YouTube comments with precision ⚔️✨</p>
		</div>
	</footer>
</div>

<style>
	.legal-page {
		min-height: 100vh;
		display: flex;
		flex-direction: column;
	}

	.header {
		position: sticky;
		top: 0;
		z-index: 100;
		background: rgba(15, 15, 26, 0.95);
		backdrop-filter: blur(12px);
		-webkit-backdrop-filter: blur(12px);
		border-bottom: 1px solid var(--bg-tertiary);
	}

	.header-content {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding-top: 1rem;
		padding-bottom: 1rem;
	}

	.logo-link {
		text-decoration: none;
	}

	.main {
		flex: 1;
		padding: 2rem 0;
	}

	.legal-content {
		max-width: 800px;
		margin: 0 auto;
		background: var(--bg-card);
		border-radius: var(--radius-xl);
		border: 1px solid var(--bg-tertiary);
		padding: 2.5rem;
	}

	.legal-content h1 {
		font-size: 2rem;
		font-weight: 800;
		color: var(--text-primary);
		margin-bottom: 0.5rem;
	}

	.last-updated {
		color: var(--text-muted);
		font-size: 0.9rem;
		margin-bottom: 2rem;
		padding-bottom: 1rem;
		border-bottom: 1px solid var(--bg-tertiary);
	}

	.legal-content section {
		margin-bottom: 2rem;
	}

	.legal-content h2 {
		font-size: 1.25rem;
		font-weight: 700;
		color: var(--text-primary);
		margin-bottom: 1rem;
		padding-top: 0.5rem;
	}

	.legal-content h3 {
		font-size: 1rem;
		font-weight: 600;
		color: var(--text-secondary);
		margin-top: 1rem;
		margin-bottom: 0.75rem;
	}

	.legal-content p {
		color: var(--text-secondary);
		line-height: 1.7;
		margin-bottom: 1rem;
	}

	.legal-content ul, .legal-content ol {
		margin-bottom: 1rem;
		padding-left: 1.5rem;
	}

	.legal-content li {
		color: var(--text-secondary);
		line-height: 1.6;
		margin-bottom: 0.5rem;
	}

	.legal-content a {
		color: var(--accent-tertiary);
	}

	.legal-content a:hover {
		color: var(--accent-primary);
	}

	.german-summary {
		background: rgba(99, 102, 241, 0.1);
		border: 1px solid rgba(99, 102, 241, 0.2);
		border-radius: var(--radius-lg);
		padding: 1.5rem;
		margin-top: 2rem;
	}

	.german-summary h2 {
		padding-top: 0;
	}

	.footer {
		padding: 1.5rem 0;
		text-align: center;
		color: var(--text-muted);
		font-size: 0.85rem;
		border-top: 1px solid var(--bg-tertiary);
	}

	.footer-links {
		display: flex;
		justify-content: center;
		gap: 0.75rem;
		margin-bottom: 0.75rem;
	}

	.footer-links a {
		color: var(--text-secondary);
	}

	.footer-links a:hover {
		color: var(--accent-tertiary);
	}

	.separator {
		color: var(--text-muted);
	}

	@media (max-width: 640px) {
		.legal-content {
			padding: 1.5rem;
		}

		.legal-content h1 {
			font-size: 1.5rem;
		}
	}
</style>
