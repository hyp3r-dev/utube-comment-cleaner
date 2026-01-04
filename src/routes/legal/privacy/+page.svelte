<script lang="ts">
	import Logo from '$lib/components/Logo.svelte';
	
	type Language = 'en' | 'de';
	let currentLang = $state<Language>('en');
</script>

<svelte:head>
	<title>{currentLang === 'en' ? 'Privacy Policy' : 'Datenschutzerklärung'} - CommentSlash</title>
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
				<!-- Language Selector and Close Button Row -->
				<div class="content-header">
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
					<a href="/" class="close-btn" aria-label="Close and return to app">
						<svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
							<path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
						</svg>
					</a>
				</div>

				{#if currentLang === 'en'}
				<!-- ENGLISH VERSION -->
				<h1>Privacy Policy</h1>
				<p class="last-updated">Last updated: January 2026</p>

				<section>
					<h2>1. Introduction</h2>
					<p>CommentSlash ("we", "our", or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, and safeguard your information when you use our web application.</p>
				</section>

				<section>
					<h2>2. Data Controller</h2>
					<p>For users in the European Union (including Germany), the data controller is:</p>
					<p>CommentSlash<br/>
					Contact: via GitHub Issues at <a href="https://github.com/hyp3r-dev/utube-comment-cleaner" target="_blank" rel="noopener noreferrer">https://github.com/hyp3r-dev/utube-comment-cleaner</a></p>
				</section>

				<section>
					<h2>3. What Data We Collect</h2>
					
					<h3>3.1 Data You Provide</h3>
					<ul>
						<li><strong>Google Takeout Export Files:</strong> When you upload your Google Takeout export, we process your YouTube comment history locally in your browser. This data is <strong>never transmitted to our servers</strong>.</li>
						<li><strong>OAuth Tokens:</strong> If you connect your YouTube account, your OAuth access token is used solely to interact with the YouTube Data API v3 on your behalf.</li>
					</ul>

					<h3>3.2 Automatically Collected Data</h3>
					<ul>
						<li><strong>Browser Storage:</strong> Comment data is stored locally in your browser's IndexedDB. This data remains on your device and is not accessible to us.</li>
						<li><strong>Cookies:</strong> We use essential cookies for OAuth state management and cookie consent preferences.</li>
					</ul>

					<h3>3.3 Data We Do NOT Collect</h3>
					<ul>
						<li>We do not collect personal identification information</li>
						<li>We do not track your browsing behavior</li>
						<li>We do not use analytics services</li>
						<li>We do not share any data with third parties</li>
						<li>We do not store your comments on our servers</li>
					</ul>
				</section>

				<section>
					<h2>4. How We Use Your Data</h2>
					<ul>
						<li><strong>Google Takeout Processing:</strong> Your uploaded files are processed entirely in your browser to extract and display your YouTube comments.</li>
						<li><strong>YouTube API Access:</strong> When connected, we use the YouTube Data API v3 to validate your access token, enrich comments with additional metadata, and delete comments at your request.</li>
						<li><strong>Local Storage:</strong> Comment data is cached locally to improve performance and allow offline access.</li>
					</ul>
				</section>

				<section>
					<h2>5. Third-Party Services</h2>
					
					<h3>5.1 Google APIs</h3>
					<p>We integrate with the following Google services:</p>
					<ul>
						<li><strong>YouTube Data API v3:</strong> Used to enrich and delete your comments</li>
						<li><strong>Google OAuth 2.0:</strong> Used for secure authentication</li>
					</ul>
					<p>These services are subject to:</p>
					<ul>
						<li><a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer">Google Privacy Policy</a></li>
						<li><a href="https://www.youtube.com/t/terms" target="_blank" rel="noopener noreferrer">YouTube Terms of Service</a></li>
						<li><a href="https://developers.google.com/terms/api-services-user-data-policy" target="_blank" rel="noopener noreferrer">Google API Services User Data Policy</a></li>
					</ul>

					<h3>5.2 Limited Use Disclosure</h3>
					<p>CommentSlash's use and transfer of information received from Google APIs adheres to the <a href="https://developers.google.com/terms/api-services-user-data-policy" target="_blank" rel="noopener noreferrer">Google API Services User Data Policy</a>, including the Limited Use requirements.</p>
				</section>

				<section>
					<h2>6. Data Retention</h2>
					<ul>
						<li><strong>Browser Storage:</strong> Data stored in IndexedDB automatically expires after 30 days by default. After 14 days, you will receive a reminder that your data may be outdated. You can refresh the data lifetime at any time or configure these values via server settings.</li>
						<li><strong>OAuth Tokens:</strong> Access tokens are stored only for the duration of your session. You can log out at any time to clear your token while preserving your comment data.</li>
						<li><strong>Server Logs:</strong> Minimal server logs are retained for up to 8 hours and contain no personally identifiable information.</li>
					</ul>
				</section>

				<section>
					<h2>7. Your Rights (GDPR)</h2>
					<p>Under the General Data Protection Regulation (GDPR), you have the right to:</p>
					<ul>
						<li><strong>Access:</strong> View what data is stored about you (all data is in your browser's local storage)</li>
						<li><strong>Rectification:</strong> Correct inaccurate data</li>
						<li><strong>Erasure:</strong> Delete your data using the "Wipe All Data" function</li>
						<li><strong>Data Portability:</strong> Export your data using our export function</li>
						<li><strong>Withdraw Consent:</strong> You can revoke OAuth access at any time via your Google Account settings</li>
					</ul>
					<p>To exercise these rights, you can:</p>
					<ol>
						<li>Use the in-app data management features</li>
						<li>Clear your browser's local storage</li>
						<li>Revoke app access in your <a href="https://myaccount.google.com/permissions" target="_blank" rel="noopener noreferrer">Google Account Settings</a></li>
					</ol>
				</section>

				<section>
					<h2>8. Data Security</h2>
					<p>We implement appropriate security measures:</p>
					<ul>
						<li>All data processing occurs locally in your browser</li>
						<li>OAuth tokens are transmitted securely via HTTPS</li>
						<li>No sensitive data is stored on our servers</li>
						<li>Server logs automatically redact any personally identifiable information</li>
					</ul>
				</section>

				<section>
					<h2>9. Children's Privacy</h2>
					<p>CommentSlash is not intended for use by children under 13 years of age. We do not knowingly collect data from children.</p>
				</section>

				<section>
					<h2>10. International Data Transfers</h2>
					<p>Since all data processing occurs locally in your browser, no international data transfers take place through our service.</p>
				</section>

				<section>
					<h2>11. Changes to This Policy</h2>
					<p>We may update this Privacy Policy from time to time. We will notify users of any material changes by updating the "Last updated" date.</p>
				</section>

				<section>
					<h2>12. Contact Us</h2>
					<p>If you have questions about this Privacy Policy, please open an issue at:<br/>
					<a href="https://github.com/hyp3r-dev/utube-comment-cleaner/issues" target="_blank" rel="noopener noreferrer">https://github.com/hyp3r-dev/utube-comment-cleaner/issues</a></p>
				</section>
				{:else}
				<!-- GERMAN VERSION -->
				<h1>Datenschutzerklärung</h1>
				<p class="last-updated">Zuletzt aktualisiert: Januar 2026</p>

				<section>
					<h2>1. Einleitung</h2>
					<p>CommentSlash ("wir", "unser" oder "uns") verpflichtet sich zum Schutz Ihrer Privatsphäre. Diese Datenschutzerklärung erläutert, wie wir Ihre Informationen erfassen, verwenden und schützen, wenn Sie unsere Webanwendung nutzen.</p>
				</section>

				<section>
					<h2>2. Verantwortlicher</h2>
					<p>Für Nutzer in der Europäischen Union (einschließlich Deutschland) ist der Verantwortliche:</p>
					<p>CommentSlash<br/>
					Kontakt: über GitHub Issues unter <a href="https://github.com/hyp3r-dev/utube-comment-cleaner" target="_blank" rel="noopener noreferrer">https://github.com/hyp3r-dev/utube-comment-cleaner</a></p>
				</section>

				<section>
					<h2>3. Welche Daten wir erfassen</h2>
					
					<h3>3.1 Von Ihnen bereitgestellte Daten</h3>
					<ul>
						<li><strong>Google Takeout-Exportdateien:</strong> Wenn Sie Ihren Google Takeout-Export hochladen, verarbeiten wir Ihren YouTube-Kommentarverlauf lokal in Ihrem Browser. Diese Daten werden <strong>niemals an unsere Server übertragen</strong>.</li>
						<li><strong>OAuth-Token:</strong> Wenn Sie Ihr YouTube-Konto verbinden, wird Ihr OAuth-Zugriffstoken ausschließlich verwendet, um in Ihrem Namen mit der YouTube Data API v3 zu interagieren.</li>
					</ul>

					<h3>3.2 Automatisch erfasste Daten</h3>
					<ul>
						<li><strong>Browser-Speicher:</strong> Kommentardaten werden lokal in der IndexedDB Ihres Browsers gespeichert. Diese Daten verbleiben auf Ihrem Gerät und sind für uns nicht zugänglich.</li>
						<li><strong>Cookies:</strong> Wir verwenden essentielle Cookies für die OAuth-Statusverwaltung und Cookie-Zustimmungspräferenzen.</li>
					</ul>

					<h3>3.3 Daten, die wir NICHT erfassen</h3>
					<ul>
						<li>Wir erfassen keine persönlichen Identifikationsdaten</li>
						<li>Wir verfolgen Ihr Surfverhalten nicht</li>
						<li>Wir nutzen keine Analysedienste</li>
						<li>Wir teilen keine Daten mit Dritten</li>
						<li>Wir speichern Ihre Kommentare nicht auf unseren Servern</li>
					</ul>
				</section>

				<section>
					<h2>4. Wie wir Ihre Daten verwenden</h2>
					<ul>
						<li><strong>Google Takeout-Verarbeitung:</strong> Ihre hochgeladenen Dateien werden vollständig in Ihrem Browser verarbeitet, um Ihre YouTube-Kommentare zu extrahieren und anzuzeigen.</li>
						<li><strong>YouTube-API-Zugriff:</strong> Bei Verbindung nutzen wir die YouTube Data API v3, um Ihr Zugriffstoken zu validieren, Kommentare mit zusätzlichen Metadaten anzureichern und Kommentare auf Ihre Anfrage zu löschen.</li>
						<li><strong>Lokaler Speicher:</strong> Kommentardaten werden lokal zwischengespeichert, um die Leistung zu verbessern und Offline-Zugriff zu ermöglichen.</li>
					</ul>
				</section>

				<section>
					<h2>5. Drittanbieterdienste</h2>
					
					<h3>5.1 Google APIs</h3>
					<p>Wir integrieren folgende Google-Dienste:</p>
					<ul>
						<li><strong>YouTube Data API v3:</strong> Wird verwendet, um Ihre Kommentare anzureichern und zu löschen</li>
						<li><strong>Google OAuth 2.0:</strong> Wird für sichere Authentifizierung verwendet</li>
					</ul>
					<p>Diese Dienste unterliegen:</p>
					<ul>
						<li><a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer">Google Datenschutzerklärung</a></li>
						<li><a href="https://www.youtube.com/t/terms" target="_blank" rel="noopener noreferrer">YouTube Nutzungsbedingungen</a></li>
						<li><a href="https://developers.google.com/terms/api-services-user-data-policy" target="_blank" rel="noopener noreferrer">Google API Services Nutzerdatenrichtlinie</a></li>
					</ul>

					<h3>5.2 Offenlegung der eingeschränkten Nutzung</h3>
					<p>Die Nutzung und Übertragung von Informationen durch CommentSlash, die von Google APIs empfangen werden, entspricht der <a href="https://developers.google.com/terms/api-services-user-data-policy" target="_blank" rel="noopener noreferrer">Google API Services Nutzerdatenrichtlinie</a>, einschließlich der Anforderungen zur eingeschränkten Nutzung.</p>
				</section>

				<section>
					<h2>6. Datenspeicherung</h2>
					<ul>
						<li><strong>Browser-Speicher:</strong> In IndexedDB gespeicherte Daten laufen standardmäßig nach 30 Tagen automatisch ab. Nach 14 Tagen erhalten Sie eine Erinnerung, dass Ihre Daten möglicherweise veraltet sind. Sie können die Datenlebensdauer jederzeit aktualisieren oder diese Werte über Servereinstellungen konfigurieren.</li>
						<li><strong>OAuth-Token:</strong> Zugriffstoken werden nur für die Dauer Ihrer Sitzung gespeichert. Sie können sich jederzeit abmelden, um Ihr Token zu löschen, während Ihre Kommentardaten erhalten bleiben.</li>
						<li><strong>Server-Logs:</strong> Minimale Server-Logs werden bis zu 8 Stunden aufbewahrt und enthalten keine persönlich identifizierbaren Informationen.</li>
					</ul>
				</section>

				<section>
					<h2>7. Ihre Rechte (DSGVO)</h2>
					<p>Gemäß der Datenschutz-Grundverordnung (DSGVO) haben Sie das Recht auf:</p>
					<ul>
						<li><strong>Auskunft:</strong> Einsicht, welche Daten über Sie gespeichert sind (alle Daten befinden sich im lokalen Speicher Ihres Browsers)</li>
						<li><strong>Berichtigung:</strong> Korrektur ungenauer Daten</li>
						<li><strong>Löschung:</strong> Löschen Ihrer Daten über die Funktion "Alle Daten löschen"</li>
						<li><strong>Datenübertragbarkeit:</strong> Export Ihrer Daten über unsere Exportfunktion</li>
						<li><strong>Widerruf der Einwilligung:</strong> Sie können den OAuth-Zugriff jederzeit über Ihre Google-Kontoeinstellungen widerrufen</li>
					</ul>
					<p>Um diese Rechte auszuüben, können Sie:</p>
					<ol>
						<li>Die In-App-Datenverwaltungsfunktionen nutzen</li>
						<li>Den lokalen Speicher Ihres Browsers löschen</li>
						<li>Den App-Zugriff in Ihren <a href="https://myaccount.google.com/permissions" target="_blank" rel="noopener noreferrer">Google-Kontoeinstellungen</a> widerrufen</li>
					</ol>
				</section>

				<section>
					<h2>8. Datensicherheit</h2>
					<p>Wir implementieren angemessene Sicherheitsmaßnahmen:</p>
					<ul>
						<li>Alle Datenverarbeitung erfolgt lokal in Ihrem Browser</li>
						<li>OAuth-Token werden sicher über HTTPS übertragen</li>
						<li>Keine sensiblen Daten werden auf unseren Servern gespeichert</li>
						<li>Server-Logs entfernen automatisch persönlich identifizierbare Informationen</li>
					</ul>
				</section>

				<section>
					<h2>9. Datenschutz für Kinder</h2>
					<p>CommentSlash ist nicht für die Nutzung durch Kinder unter 13 Jahren vorgesehen. Wir erfassen wissentlich keine Daten von Kindern.</p>
				</section>

				<section>
					<h2>10. Internationale Datenübertragungen</h2>
					<p>Da die gesamte Datenverarbeitung lokal in Ihrem Browser erfolgt, finden keine internationalen Datenübertragungen durch unseren Dienst statt.</p>
				</section>

				<section>
					<h2>11. Änderungen dieser Richtlinie</h2>
					<p>Wir können diese Datenschutzerklärung von Zeit zu Zeit aktualisieren. Wir werden Nutzer über wesentliche Änderungen durch Aktualisierung des Datums "Zuletzt aktualisiert" informieren.</p>
				</section>

				<section>
					<h2>12. Kontakt</h2>
					<p>Bei Fragen zu dieser Datenschutzerklärung öffnen Sie bitte ein Issue unter:<br/>
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
		position: relative;
	}

	.content-header {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		margin-bottom: 1.5rem;
		padding-bottom: 1rem;
		border-bottom: 1px solid var(--bg-tertiary);
	}

	.language-selector {
		display: flex;
		gap: 0.5rem;
	}

	.close-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 32px;
		height: 32px;
		border-radius: 50%;
		background: var(--bg-tertiary);
		color: var(--text-secondary);
		transition: all 0.2s ease;
		flex-shrink: 0;
		margin-top: -0.25rem;
	}

	.close-btn:hover {
		background: var(--error);
		color: white;
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
