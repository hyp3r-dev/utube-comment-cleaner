<script lang="ts">
import { onMount } from 'svelte';
import Logo from '$lib/components/Logo.svelte';

type Language = 'en' | 'de';
let currentLang = $state<Language>('de'); // Default to German for Impressum
let impressumData = $state<any>(null);
let loading = $state(true);

onMount(async () => {
try {
const response = await fetch('/api/impressum');
if (response.ok) {
impressumData = await response.json();
}
} catch (e) {
console.error('Failed to load impressum data:', e);
}
loading = false;
});
</script>

<svelte:head>
<title>{currentLang === 'en' ? 'Legal Notice' : 'Impressum'} - CommentSlash</title>
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

{#if loading}
<p>Loading...</p>
{:else if !impressumData || !impressumData.enabled}
{#if currentLang === 'en'}
<h1>Legal Notice</h1>
<p>Legal notice is not configured for this instance.</p>
{:else}
<h1>Impressum</h1>
<p>Das Impressum wurde für diese Instanz nicht konfiguriert.</p>
{/if}
{:else}
{#if currentLang === 'en'}
<!-- ENGLISH VERSION -->
<h1>Legal Notice</h1>

<section>
<h2>Service Provider</h2>
<p>
{impressumData.serviceName}<br/>
{#if impressumData.representativeName}
Represented by: {impressumData.representativeName}<br/>
{/if}
{#if impressumData.addressLine1}
{impressumData.addressLine1}<br/>
{/if}
{#if impressumData.addressLine2}
{impressumData.addressLine2}<br/>
{/if}
{#if impressumData.postalCode && impressumData.city}
{impressumData.postalCode} {impressumData.city}<br/>
{/if}
{#if impressumData.country}
{impressumData.country}<br/>
{/if}
</p>
</section>

{#if impressumData.email || impressumData.phone}
<section>
<h2>Contact</h2>
<p>
{#if impressumData.email}
Email: <a href="mailto:{impressumData.email}">{impressumData.email}</a><br/>
{/if}
{#if impressumData.phone}
Phone: {impressumData.phone}<br/>
{/if}
</p>
</section>
{/if}

<section>
<h2>Disclaimer</h2>
<p>CommentSlash is a free, open-source tool. No commercial services are provided. The service is provided "as-is" without any warranties.</p>
</section>
{:else}
<!-- GERMAN VERSION -->
<h1>Impressum</h1>

<section>
<h2>Angaben gemäß § 5 TMG</h2>
<p>
{impressumData.serviceName}<br/>
{#if impressumData.representativeName}
Vertreten durch: {impressumData.representativeName}<br/>
{/if}
{#if impressumData.addressLine1}
{impressumData.addressLine1}<br/>
{/if}
{#if impressumData.addressLine2}
{impressumData.addressLine2}<br/>
{/if}
{#if impressumData.postalCode && impressumData.city}
{impressumData.postalCode} {impressumData.city}<br/>
{/if}
{#if impressumData.country}
{impressumData.country}<br/>
{/if}
</p>
</section>

{#if impressumData.email || impressumData.phone}
<section>
<h2>Kontakt</h2>
<p>
{#if impressumData.email}
E-Mail: <a href="mailto:{impressumData.email}">{impressumData.email}</a><br/>
{/if}
{#if impressumData.phone}
Telefon: {impressumData.phone}<br/>
{/if}
</p>
</section>
{/if}

<section>
<h2>Haftungsausschluss</h2>
<p>CommentSlash ist ein kostenloses Open-Source-Tool. Es werden keine kommerziellen Dienstleistungen erbracht. Der Dienst wird "wie besehen" ohne jegliche Garantien bereitgestellt.</p>
</section>
{/if}
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
{#if impressumData?.enabled}
<span class="separator">•</span>
<a href="/legal/impressum">Impressum</a>
{/if}
<span class="separator">•</span>
<a href="/">{currentLang === 'en' ? 'Back to App' : 'Zurück zur App'}</a>
</div>
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
margin-bottom: 2rem;
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

.legal-content p {
color: var(--text-secondary);
line-height: 1.7;
margin-bottom: 1rem;
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
flex-wrap: wrap;
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
