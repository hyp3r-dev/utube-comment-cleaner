<script lang="ts">
	import Logo from '$lib/components/Logo.svelte';
	
	type Language = 'en' | 'de';
	let currentLang = $state<Language>('en');
</script>

<svelte:head>
	<title>{currentLang === 'en' ? 'Terms of Service' : 'Nutzungsbedingungen'} - CommentSlash</title>
</svelte:head>

<div class="legal-page">
	<header class="header">
		<div class="container header-content">
			<a href="/" class="logo-link">
				<Logo size={36} />
			</a>
			<a href="/" class="close-btn" aria-label="Close and return to app">
				<svg width="24" height="24" viewBox="0 0 20 20" fill="currentColor">
					<path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
				</svg>
			</a>
		</div>
	</header>

	<main class="main">
		<div class="container">
			<article class="legal-content">
				<!-- Language Selector -->
				<div class="language-selector">
					<button 
						class="lang-btn" 
						class:active={currentLang === 'en'}
						onclick={() => currentLang = 'en'}
					>
						🇬🇧 English
					</button>
					<button 
						class="lang-btn" 
						class:active={currentLang === 'de'}
						onclick={() => currentLang = 'de'}
					>
						🇩🇪 Deutsch
					</button>
				</div>

				{#if currentLang === 'en'}
				<!-- ENGLISH VERSION -->
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
					<h2>8. Data Retention</h2>
					<ul>
						<li>Your comment data is stored locally in your browser for up to 30 days by default</li>
						<li>You will receive a stale data warning after 14 days</li>
						<li>You can refresh the data lifetime or clear your data at any time</li>
						<li>These retention periods may be configured by the server administrator</li>
					</ul>
				</section>

				<section>
					<h2>9. Disclaimer of Warranties</h2>
					<p>THE SERVICE IS PROVIDED "AS IS" WITHOUT WARRANTIES OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING:</p>
					<ul>
						<li>Merchantability</li>
						<li>Fitness for a particular purpose</li>
						<li>Non-infringement</li>
						<li>Accuracy or reliability of results</li>
					</ul>
				</section>

				<section>
					<h2>10. Limitation of Liability</h2>
					<p>TO THE MAXIMUM EXTENT PERMITTED BY LAW, WE SHALL NOT BE LIABLE FOR:</p>
					<ul>
						<li>Any indirect, incidental, special, or consequential damages</li>
						<li>Loss of data, profits, or business opportunities</li>
						<li>Damages arising from your use or inability to use the Service</li>
						<li>Actions taken by Google, YouTube, or other third parties</li>
					</ul>
				</section>

				<section>
					<h2>11. Indemnification</h2>
					<p>You agree to indemnify and hold harmless CommentSlash and its contributors from any claims, damages, or expenses arising from:</p>
					<ul>
						<li>Your use of the Service</li>
						<li>Your violation of these Terms</li>
						<li>Your violation of any third-party rights</li>
					</ul>
				</section>

				<section>
					<h2>12. Changes to Service</h2>
					<p>We reserve the right to:</p>
					<ul>
						<li>Modify or discontinue the Service at any time</li>
						<li>Change these Terms of Service</li>
					</ul>
					<p>Changes will be effective upon posting to the repository.</p>
				</section>

				<section>
					<h2>13. Termination</h2>
					<ul>
						<li>You may stop using the Service at any time</li>
						<li>We may terminate your access for violation of these Terms</li>
						<li>Upon termination, your locally stored data will remain until you clear it</li>
					</ul>
				</section>

				<section>
					<h2>14. Governing Law</h2>
					<p>These Terms shall be governed by and construed in accordance with the laws of Germany, without regard to conflict of law principles.</p>
				</section>

				<section>
					<h2>15. Dispute Resolution</h2>
					<p>For EU residents: You may also seek resolution through the <a href="https://ec.europa.eu/consumers/odr/" target="_blank" rel="noopener noreferrer">EU Online Dispute Resolution Platform</a>.</p>
				</section>

				<section>
					<h2>16. Severability</h2>
					<p>If any provision of these Terms is found to be unenforceable, the remaining provisions will continue in effect.</p>
				</section>

				<section>
					<h2>17. Contact</h2>
					<p>For questions about these Terms, please open an issue at:<br/>
					<a href="https://github.com/hyp3r-dev/utube-comment-cleaner/issues" target="_blank" rel="noopener noreferrer">https://github.com/hyp3r-dev/utube-comment-cleaner/issues</a></p>
				</section>
				{:else}
				<!-- GERMAN VERSION -->
				<h1>Nutzungsbedingungen</h1>
				<p class="last-updated">Zuletzt aktualisiert: Januar 2026</p>

				<section>
					<h2>1. Annahme der Bedingungen</h2>
					<p>Durch den Zugriff auf oder die Nutzung von CommentSlash ("der Dienst") erklären Sie sich mit diesen Nutzungsbedingungen einverstanden. Wenn Sie diesen Bedingungen nicht zustimmen, nutzen Sie den Dienst bitte nicht.</p>
				</section>

				<section>
					<h2>2. Beschreibung des Dienstes</h2>
					<p>CommentSlash ist eine Webanwendung, die Nutzern hilft, ihre YouTube-Kommentare zu verwalten und zu löschen. Der Dienst ermöglicht Ihnen:</p>
					<ul>
						<li>Import Ihres YouTube-Kommentarverlaufs aus Google Takeout-Exporten</li>
						<li>Anzeigen, Suchen und Filtern Ihrer Kommentare</li>
						<li>Löschen von Kommentaren über die YouTube Data API v3</li>
					</ul>
				</section>

				<section>
					<h2>3. Nutzeranforderungen</h2>
					<p>Um den Dienst zu nutzen, müssen Sie:</p>
					<ul>
						<li>Ein gültiges Google/YouTube-Konto haben</li>
						<li>Mindestens 13 Jahre alt sein</li>
						<li>Die YouTube-Nutzungsbedingungen und Community-Richtlinien einhalten</li>
						<li>Berechtigt sein, die Kommentare zu verwalten, die Sie löschen möchten</li>
					</ul>
				</section>

				<section>
					<h2>4. Google- und YouTube-Integration</h2>
					
					<h3>4.1 Google-Kontozugriff</h3>
					<p>Wenn Sie Ihr Google-Konto verbinden, gewähren Sie dem Dienst die Berechtigung:</p>
					<ul>
						<li>Auf Ihre YouTube-Kanalinformationen zuzugreifen</li>
						<li>Ihre YouTube-Kommentare zu lesen und zu löschen</li>
					</ul>

					<h3>4.2 Drittanbieter-Bedingungen</h3>
					<p>Ihre Nutzung von Google- und YouTube-Funktionen unterliegt:</p>
					<ul>
						<li><a href="https://policies.google.com/terms" target="_blank" rel="noopener noreferrer">Google Nutzungsbedingungen</a></li>
						<li><a href="https://www.youtube.com/t/terms" target="_blank" rel="noopener noreferrer">YouTube Nutzungsbedingungen</a></li>
						<li><a href="https://www.youtube.com/howyoutubeworks/policies/community-guidelines/" target="_blank" rel="noopener noreferrer">YouTube Community-Richtlinien</a></li>
					</ul>
				</section>

				<section>
					<h2>5. Nutzerpflichten</h2>
					<p>Sie verpflichten sich:</p>
					<ul>
						<li>Den Dienst nur zur Verwaltung Ihrer eigenen Kommentare zu nutzen</li>
						<li>Nicht zu versuchen, Kommentare anderer zu löschen</li>
						<li>Den Dienst nicht zu nutzen, um Gesetze oder Rechte Dritter zu verletzen</li>
						<li>Den Quellcode nicht zurückzuentwickeln, zu dekompilieren oder zu extrahieren</li>
						<li>Keine automatisierten Mittel über die normale Nutzung hinaus zu verwenden</li>
					</ul>
				</section>

				<section>
					<h2>6. Geistiges Eigentum</h2>
					<ul>
						<li>Der Dienst und seine ursprünglichen Inhalte gehören dem CommentSlash-Projekt</li>
						<li>Der Dienst ist Open Source unter der MIT-Lizenz</li>
						<li>Ihre Kommentare und Daten bleiben Ihr Eigentum</li>
					</ul>
				</section>

				<section>
					<h2>7. API-Kontingente und Einschränkungen</h2>
					<ul>
						<li>Die YouTube Data API v3 hat tägliche Kontingentlimits</li>
						<li>Wir verfolgen die Kontingentnutzung, um Überschreitungen zu verhindern</li>
						<li>Der Dienst kann bei Kontingentüberschreitung vorübergehend nicht verfügbar sein</li>
						<li>Wir sind nicht verantwortlich für Einschränkungen durch Google/YouTube</li>
					</ul>
				</section>

				<section>
					<h2>8. Datenspeicherung</h2>
					<ul>
						<li>Ihre Kommentardaten werden lokal in Ihrem Browser standardmäßig bis zu 30 Tage gespeichert</li>
						<li>Nach 14 Tagen erhalten Sie eine Warnung über möglicherweise veraltete Daten</li>
						<li>Sie können die Datenlebensdauer jederzeit aktualisieren oder Ihre Daten löschen</li>
						<li>Diese Aufbewahrungsfristen können vom Serveradministrator konfiguriert werden</li>
					</ul>
				</section>

				<section>
					<h2>9. Gewährleistungsausschluss</h2>
					<p>DER DIENST WIRD "WIE BESEHEN" OHNE GARANTIEN JEGLICHER ART BEREITGESTELLT, EINSCHLIESSLICH:</p>
					<ul>
						<li>Marktgängigkeit</li>
						<li>Eignung für einen bestimmten Zweck</li>
						<li>Nichtverletzung von Rechten</li>
						<li>Genauigkeit oder Zuverlässigkeit der Ergebnisse</li>
					</ul>
				</section>

				<section>
					<h2>10. Haftungsbeschränkung</h2>
					<p>IM GRÖSSTMÖGLICHEN GESETZLICH ZULÄSSIGEN UMFANG HAFTEN WIR NICHT FÜR:</p>
					<ul>
						<li>Indirekte, zufällige, besondere oder Folgeschäden</li>
						<li>Datenverlust, Gewinnverlust oder verpasste Geschäftsmöglichkeiten</li>
						<li>Schäden durch Ihre Nutzung oder Nichtnutzung des Dienstes</li>
						<li>Handlungen von Google, YouTube oder anderen Dritten</li>
					</ul>
				</section>

				<section>
					<h2>11. Freistellung</h2>
					<p>Sie verpflichten sich, CommentSlash und seine Mitwirkenden von allen Ansprüchen, Schäden oder Kosten freizustellen, die entstehen aus:</p>
					<ul>
						<li>Ihrer Nutzung des Dienstes</li>
						<li>Ihrer Verletzung dieser Bedingungen</li>
						<li>Ihrer Verletzung von Rechten Dritter</li>
					</ul>
				</section>

				<section>
					<h2>12. Änderungen am Dienst</h2>
					<p>Wir behalten uns das Recht vor:</p>
					<ul>
						<li>Den Dienst jederzeit zu ändern oder einzustellen</li>
						<li>Diese Nutzungsbedingungen zu ändern</li>
					</ul>
					<p>Änderungen werden mit der Veröffentlichung im Repository wirksam.</p>
				</section>

				<section>
					<h2>13. Kündigung</h2>
					<ul>
						<li>Sie können die Nutzung des Dienstes jederzeit beenden</li>
						<li>Wir können Ihren Zugang bei Verstoß gegen diese Bedingungen beenden</li>
						<li>Nach Beendigung bleiben Ihre lokal gespeicherten Daten erhalten, bis Sie sie löschen</li>
					</ul>
				</section>

				<section>
					<h2>14. Anwendbares Recht</h2>
					<p>Diese Bedingungen unterliegen dem Recht der Bundesrepublik Deutschland und werden entsprechend ausgelegt, ohne Berücksichtigung von Kollisionsnormen.</p>
				</section>

				<section>
					<h2>15. Streitbeilegung</h2>
					<p>Für EU-Bürger: Sie können auch eine Lösung über die <a href="https://ec.europa.eu/consumers/odr/" target="_blank" rel="noopener noreferrer">EU-Plattform für Online-Streitbeilegung</a> anstreben.</p>
				</section>

				<section>
					<h2>16. Salvatorische Klausel</h2>
					<p>Sollte eine Bestimmung dieser Bedingungen für nicht durchsetzbar befunden werden, bleiben die übrigen Bestimmungen in Kraft.</p>
				</section>

				<section>
					<h2>17. Kontakt</h2>
					<p>Bei Fragen zu diesen Bedingungen öffnen Sie bitte ein Issue unter:<br/>
					<a href="https://github.com/hyp3r-dev/utube-comment-cleaner/issues" target="_blank" rel="noopener noreferrer">https://github.com/hyp3r-dev/utube-comment-cleaner/issues</a></p>
				</section>
				{/if}
			</article>
		</div>
	</main>

	<footer class="footer">
		<div class="container">
			<div class="footer-links">
				<a href="/legal/privacy">{currentLang === 'en' ? 'Privacy Policy' : 'Datenschutzerklärung'}</a>
				<span class="separator">•</span>
				<a href="/legal/terms">{currentLang === 'en' ? 'Terms of Service' : 'Nutzungsbedingungen'}</a>
				<span class="separator">•</span>
				<a href="/">{currentLang === 'en' ? 'Back to App' : 'Zurück zur App'}</a>
			</div>
			<p>CommentSlash — {currentLang === 'en' ? 'Destroy your YouTube comments with precision' : 'Lösche deine YouTube-Kommentare mit Präzision'} ⚔️✨</p>
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

	.close-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 40px;
		height: 40px;
		border-radius: 50%;
		background: var(--bg-tertiary);
		color: var(--text-secondary);
		transition: all 0.2s ease;
	}

	.close-btn:hover {
		background: var(--error);
		color: white;
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

	.language-selector {
		display: flex;
		gap: 0.5rem;
		margin-bottom: 1.5rem;
		padding-bottom: 1rem;
		border-bottom: 1px solid var(--bg-tertiary);
	}

	.lang-btn {
		padding: 0.5rem 1rem;
		border-radius: var(--radius-md);
		background: var(--bg-tertiary);
		color: var(--text-secondary);
		font-size: 0.9rem;
		cursor: pointer;
		transition: all 0.2s ease;
		border: 1px solid transparent;
	}

	.lang-btn:hover {
		background: var(--bg-hover);
		color: var(--text-primary);
	}

	.lang-btn.active {
		background: rgba(99, 102, 241, 0.2);
		border-color: var(--accent-primary);
		color: var(--accent-tertiary);
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

		.language-selector {
			flex-wrap: wrap;
		}
	}
</style>
