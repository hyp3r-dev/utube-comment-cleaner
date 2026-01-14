# CommentSlash

A privacy-focused web application for managing and deleting YouTube comments. Import your comment history via Google Takeout, filter and search your comments, and batch-delete them through the YouTube Data API.

## Tech Stack

- **Framework**: SvelteKit 2.x with Svelte 5
- **Language**: TypeScript
- **Build Tool**: Vite 7.x
- **Storage**: IndexedDB (browser-only)
- **API**: YouTube Data API v3 with OAuth 2.0
- **Deployment**: Docker with Node.js adapter

## Features

- Import comments from Google Takeout exports (CSV or ZIP)
- Filter by character count, like count, and comment labels
- Sort by likes, date, or comment length
- Batch select and delete comments via YouTube API
- All data stored locally in browser's IndexedDB
- Configurable data retention (default: 30 days)

## Quick Start

### Development

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173)

### Production Build

```bash
npm run build
node build
```

## Docker Deployment

### Basic Setup

```yaml
version: '3.8'
services:
  commentslash:
    image: hyp3rsonix/commentslash:latest
    container_name: commentslash
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
    restart: unless-stopped
```

### Full Configuration with Google Login and Impressum

```yaml
version: '3.8'
services:
  commentslash:
    image: hyp3rsonix/commentslash:latest
    container_name: commentslash
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      # Google OAuth (enables Google Sign-In)
      - GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
      - GOOGLE_CLIENT_SECRET=your-client-secret
      - GOOGLE_REDIRECT_URI=https://your-domain.com/api/auth/callback
      # Legal pages
      - ENABLE_LEGAL=true
      - ENABLE_COOKIE_CONSENT=true
      # Impressum (German legal requirement)
      - ENABLE_IMPRESSUM=true
      - IMPRESSUM_SERVICE_NAME=CommentSlash
      - IMPRESSUM_REPRESENTATIVE_NAME=John Doe
      - IMPRESSUM_ADDRESS_LINE1=Example Street 123
      - IMPRESSUM_CITY=Berlin
      - IMPRESSUM_POSTAL_CODE=10115
      - IMPRESSUM_COUNTRY=Germany
      - IMPRESSUM_EMAIL=contact@example.com
      - IMPRESSUM_PHONE=+49 123 456789
      # Data retention
      - LOCAL_DATA_RETENTION_DAYS=30
      - STALE_DATA_WARNING_DAYS=14
    volumes:
      - commentslash_data:/app/data
    restart: unless-stopped

volumes:
  commentslash_data:
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `GOOGLE_CLIENT_ID` | OAuth 2.0 Client ID for Google Sign-In | - |
| `GOOGLE_CLIENT_SECRET` | OAuth 2.0 Client Secret | - |
| `GOOGLE_REDIRECT_URI` | OAuth callback URL (e.g., `https://example.com/api/auth/callback`) | - |
| `ENABLE_LEGAL` | Show Privacy Policy and Terms of Service links | `false` |
| `ENABLE_COOKIE_CONSENT` | Show cookie consent banner | `false` |
| `ENABLE_IMPRESSUM` | Enable Impressum page (German legal requirement) | `false` |
| `IMPRESSUM_SERVICE_NAME` | Service/company name for Impressum | `CommentSlash` |
| `IMPRESSUM_REPRESENTATIVE_NAME` | Representative name | - |
| `IMPRESSUM_ADDRESS_LINE1` | Street address | - |
| `IMPRESSUM_ADDRESS_LINE2` | Additional address line | - |
| `IMPRESSUM_CITY` | City | - |
| `IMPRESSUM_POSTAL_CODE` | Postal/ZIP code | - |
| `IMPRESSUM_COUNTRY` | Country | - |
| `IMPRESSUM_EMAIL` | Contact email | - |
| `IMPRESSUM_PHONE` | Contact phone | - |
| `LOCAL_DATA_RETENTION_DAYS` | Days to keep local comment data | `30` |
| `STALE_DATA_WARNING_DAYS` | Days after which to show stale data warning | `14` |
| `DETAILED_LOGGING` | Enable verbose server logs | `false` |
| `DATA_DIR` | Directory for persistent data | `/app/data` |

### YouTube API Quota Configuration

These settings allow you to customize quota management when running CommentSlash with Google Login mode enabled (OAuth configured). The quota is shared across all users in multi-user deployments.

| Variable | Description | Default |
|----------|-------------|---------|
| `YOUTUBE_DAILY_QUOTA_LIMIT` | Daily quota limit (YouTube API default is 10,000) | `10000` |
| `YOUTUBE_PER_MINUTE_QUOTA_LIMIT` | Per-minute quota limit (usually very high) | `1800000` |
| `YOUTUBE_PER_USER_MINUTE_LIMIT` | Per-user per-minute limit | `180000` |
| `QUOTA_RESERVATION_CHUNK_SIZE` | Quota units reserved at a time during deletions | `1000` |
| `MAX_PARALLEL_DELETIONS` | Maximum parallel API calls per user (1-10) | `5` |

**Note:** If you have higher quota limits granted by Google, update `YOUTUBE_DAILY_QUOTA_LIMIT` to match. The quota reservation system ensures fair usage across multiple users while maximizing throughput.

## Getting Your OAuth Access Token

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a project and enable YouTube Data API v3
3. Create OAuth 2.0 credentials (Web application type)
4. Add the required scope: `youtube.force-ssl`
5. Use [OAuth 2.0 Playground](https://developers.google.com/oauthplayground/) to get an access token

**Note:** Access tokens expire after 1 hour. For production deployments, configure Google Login mode.

## Docker Images

**Docker Hub:**
```bash
docker pull hyp3rsonix/commentslash:latest
```

**GitHub Container Registry:**
```bash
docker pull ghcr.io/hyp3r-dev/utube-comment-cleaner:latest
```

## Project Structure

```
├── src/
│   ├── lib/
│   │   ├── components/     # Svelte components
│   │   ├── services/       # YouTube API & Storage services
│   │   ├── stores/         # Svelte stores
│   │   ├── styles/         # Global CSS
│   │   └── server/         # Server-only code
│   └── routes/             # SvelteKit routes
├── static/                 # Static assets
└── Dockerfile             # Docker configuration
```

## License

Apache License 2.0 - see [LICENSE](LICENSE)
