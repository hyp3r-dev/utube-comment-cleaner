# Privacy Policy

**Last updated: January 2026**

## 1. Introduction

CommentSlash ("we", "our", or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, and safeguard your information when you use our web application.

## 2. Data Controller

For users in the European Union (including Germany), the data controller is:
CommentSlash
Contact: via GitHub Issues at https://github.com/hyp3r-dev/utube-comment-cleaner

## 3. What Data We Collect

### 3.1 Data You Provide
- **Google Takeout Export Files**: When you upload your Google Takeout export, we process your YouTube comment history locally in your browser. This data is **never transmitted to our servers**.
- **OAuth Tokens**: If you connect your YouTube account, your OAuth access token is used solely to interact with the YouTube Data API v3 on your behalf.

### 3.2 Automatically Collected Data
- **Browser Storage**: Comment data is stored locally in your browser's IndexedDB. This data remains on your device and is not accessible to us.
- **Cookies**: We use essential cookies for:
  - OAuth state management (session cookies)
  - Cookie consent preferences

### 3.3 Data We Do NOT Collect
- We do not collect personal identification information
- We do not track your browsing behavior
- We do not use analytics services
- We do not share any data with third parties
- We do not store your comments on our servers

## 4. How We Use Your Data

- **Google Takeout Processing**: Your uploaded files are processed entirely in your browser to extract and display your YouTube comments.
- **YouTube API Access**: When connected, we use the YouTube Data API v3 to:
  - Validate your access token
  - Enrich comments with additional metadata (likes, reply counts, video titles)
  - Delete comments at your request
- **Local Storage**: Comment data is cached locally to improve performance and allow offline access.

## 5. Third-Party Services

### 5.1 Google APIs
We integrate with the following Google services:
- **YouTube Data API v3**: Used to enrich and delete your comments
- **Google OAuth 2.0**: Used for secure authentication

These services are subject to:
- [Google Privacy Policy](https://policies.google.com/privacy)
- [YouTube Terms of Service](https://www.youtube.com/t/terms)
- [Google API Services User Data Policy](https://developers.google.com/terms/api-services-user-data-policy)

### 5.2 Hetzner Online GmbH (Hosting Provider)
Our service is hosted on servers provided by Hetzner Online GmbH, a German hosting provider. Key information about their data handling:

- **Location**: Our servers are located in Hetzner data centers within Germany and the European Union
- **IP Address Logging**: Hetzner anonymizes IP addresses in server logs by default, replacing the last octet with a random value (e.g., `123.123.123.XXX`)
- **Log Retention**: Server access logs are retained for 7 days by default
- **GDPR Compliance**: Hetzner is fully GDPR compliant with ISO 27001-certified data centers
- **No Data Transfer Outside EU**: Your data remains within the European Union

For more information:
- [Hetzner Privacy Policy](https://www.hetzner.com/legal/privacy-policy/)
- [Hetzner Data Privacy FAQ](https://docs.hetzner.com/general/general-terms-and-conditions/data-privacy-faq/)

### 5.3 Limited Use Disclosure
CommentSlash's use and transfer of information received from Google APIs adheres to the [Google API Services User Data Policy](https://developers.google.com/terms/api-services-user-data-policy), including the Limited Use requirements.

## 6. Data Retention

- **Browser Storage**: Data stored in IndexedDB automatically expires after 30 days (configurable)
- **OAuth Tokens**: Access tokens are stored only for the duration of your session
- **Server Logs**: Minimal server logs are retained for up to 7 days and contain only anonymized IP addresses (no personally identifiable information)

## 7. Your Rights (GDPR)

Under the General Data Protection Regulation (GDPR), you have the right to:

- **Access**: View what data is stored about you (all data is in your browser's local storage)
- **Rectification**: Correct inaccurate data
- **Erasure**: Delete your data using the "Wipe All Data" function
- **Data Portability**: Export your data using our export function
- **Withdraw Consent**: You can revoke OAuth access at any time via your Google Account settings

To exercise these rights, you can:
1. Use the in-app data management features
2. Clear your browser's local storage
3. Revoke app access in your [Google Account Settings](https://myaccount.google.com/permissions)

## 8. Data Security

We implement appropriate security measures:
- All data processing occurs locally in your browser
- OAuth tokens are transmitted securely via HTTPS
- No sensitive data is stored on our servers
- Server logs automatically redact any personally identifiable information
- Our hosting provider (Hetzner) uses ISO 27001-certified data centers with state-of-the-art encryption

## 9. Children's Privacy

CommentSlash is not intended for use by children under 13 years of age. We do not knowingly collect data from children.

## 10. International Data Transfers

Since all data processing occurs locally in your browser, no international data transfers take place through our service. Our servers are located within the European Union (Germany) and no data is transferred outside the EU.

## 11. Changes to This Policy

We may update this Privacy Policy from time to time. We will notify users of any material changes by updating the "Last updated" date.

## 12. Contact Us

If you have questions about this Privacy Policy, please open an issue at:
https://github.com/hyp3r-dev/utube-comment-cleaner/issues

---

## Datenschutzerklärung (German Summary)

Diese Anwendung verarbeitet Ihre YouTube-Kommentardaten ausschließlich lokal in Ihrem Browser. Es werden keine personenbezogenen Daten an unsere Server übertragen. Unsere Server werden bei Hetzner Online GmbH in Deutschland gehostet, wo IP-Adressen standardmäßig anonymisiert werden. Sie können Ihre Daten jederzeit über die integrierte "Daten löschen"-Funktion entfernen oder den Zugriff über Ihre Google-Kontoeinstellungen widerrufen.
