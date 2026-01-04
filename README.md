# ✦ CommentSlash

> Regret having commented weird stuff but can't find it anymore? WORRY NOT!

CommentSlash is a modern, privacy-focused web application that helps you manage and destroy your YouTube comments with precision. Find embarrassing comments, filter by likes, sort by date, and slash them away like a ninja!

![SvelteKit](https://img.shields.io/badge/SvelteKit-FF3E00?style=for-the-badge&logo=svelte&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white)

## ✨ Features

- **🔍 Load All Your Comments** - Fetch all your YouTube comments in one go using batch API calls
- **🔒 Privacy First** - All data stored in browser's IndexedDB with automatic 24-hour expiration
- **📊 Smart Filtering** - Filter by video privacy status, comment status, character count, and likes
- **📈 Sorting Options** - Sort by likes, date posted, or comment length
- **✦ Slash Queue** - Intuitive interface to select comments for precise deletion
- **🌙 Dark Theme** - Beautiful dark theme that's easy on the eyes
- **⚡ Ninja Animations** - Smooth, spinning ninja star animations throughout the UI
- **🐳 Docker Ready** - Easy deployment with Docker

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ or 20+
- Yarn package manager
- A Google Cloud project with YouTube Data API v3 enabled

### Installation

```bash
# Clone the repository
git clone https://github.com/hyp3r-dev/utube-comment-cleaner.git
cd utube-comment-cleaner

# Install dependencies
yarn install

# Start development server
yarn dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

### Building for Production

```bash
yarn build
yarn preview
```

## 🔑 Getting Your OAuth Access Token

1. **Go to [Google Cloud Console](https://console.cloud.google.com/)**
   - Create a new project or select an existing one

2. **Enable YouTube Data API v3**
   - Navigate to APIs & Services → Library
   - Search for "YouTube Data API v3" and enable it

3. **Create OAuth Credentials**
   - Go to APIs & Services → Credentials
   - Create Credentials → OAuth client ID
   - Select "Web application"

4. **Configure OAuth Consent Screen**
   - Add the required scope: `youtube.force-ssl`

5. **Get Your Access Token**
   - Use the [OAuth 2.0 Playground](https://developers.google.com/oauthplayground/)
   - Authorize with YouTube Data API v3 scope
   - Exchange for access token

> ⚠️ **Note:** Access tokens expire after 1 hour. Generate a new one when needed.

## 🐳 Docker Deployment

### Quick Start with Docker Compose

Create a `docker-compose.yml` file and copy-paste the following:

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
    volumes:
      - commentslash_data:/app/data
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 15s

volumes:
  commentslash_data:
```

Then run:

```bash
docker-compose up -d
```

Access the app at [http://localhost:3000](http://localhost:3000)

### Google Login Mode

For multi-user deployments, you can configure Google Login mode which enables Google Sign-In instead of requiring users to manually enter OAuth tokens:

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
      # Google Login (enables Google Sign-In button)
      - GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
      - GOOGLE_CLIENT_SECRET=your-client-secret
      - GOOGLE_REDIRECT_URI=https://your-domain.com/api/auth/callback
      # Legal & Compliance (optional, for GDPR compliance)
      - ENABLE_LEGAL=true           # Show Privacy Policy and Terms of Service links
      - ENABLE_COOKIE_CONSENT=true  # Show cookie consent banner
      # Privacy settings (optional)
      - DETAILED_LOGGING=false  # Set to 'true' for verbose logs
    volumes:
      - commentslash_data:/app/data
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 15s

volumes:
  commentslash_data:
```

**Environment Variables:**

| Variable | Description | Required |
|----------|-------------|----------|
| `GOOGLE_CLIENT_ID` | OAuth 2.0 Client ID from Google Cloud Console | For Google Login |
| `GOOGLE_CLIENT_SECRET` | OAuth 2.0 Client Secret | For Google Login |
| `GOOGLE_REDIRECT_URI` | Full URL to your callback endpoint (e.g., `https://example.com/api/auth/callback`) | For Google Login |
| `ENABLE_LEGAL` | Show Privacy Policy and Terms of Service links in footer (default: `false`) | No |
| `ENABLE_COOKIE_CONSENT` | Show cookie consent banner on first visit (default: `false`) | No |
| `DETAILED_LOGGING` | Enable detailed server logs (default: `false`) | No |
| `DATA_DIR` | Directory for persistent data (default: `/app/data`) | No |
| `LOCAL_DATA_RETENTION_DAYS` | Days to keep local comment data (default: `30`) | No |
| `STALE_DATA_WARNING_DAYS` | Days after which to show stale data warning (default: `14`) | No |

**Note:** When Google Login is enabled:
- Users see a "Sign in with Google" button instead of manual token entry
- Server-side quota tracking is enabled across all users and persists across restarts
- All logs are privacy-focused with automatic PII redaction

### Pull from Docker Hub

```bash
docker pull hyp3rsonix/commentslash:latest
docker run -p 3000:3000 -v commentslash_data:/app/data hyp3rsonix/commentslash:latest
```

### Pull from GitHub Container Registry

```bash
docker pull ghcr.io/hyp3r-dev/utube-comment-cleaner:latest
docker run -p 3000:3000 ghcr.io/hyp3r-dev/utube-comment-cleaner:latest
```

### Build Locally

```bash
docker build -t commentslash .
docker run -p 3000:3000 commentslash
```

## 🔧 Setting Up Docker Hub Publishing (For Repository Maintainers)

To enable the GitHub Actions workflow to publish images to Docker Hub:

### Step 1: Create Docker Hub Access Token

1. Log in to [Docker Hub](https://hub.docker.com/)
2. Go to **Account Settings** → **Security** → **Access Tokens**
3. Click **New Access Token**
4. Give it a description (e.g., "GitHub Actions")
5. Select **Read, Write, Delete** permissions
6. Click **Generate** and copy the token

### Step 2: Add Secrets to GitHub Repository

1. Go to your GitHub repository
2. Navigate to **Settings** → **Secrets and variables** → **Actions**
3. Add the following secrets:
   - `DOCKERHUB_USERNAME`: Your Docker Hub username (e.g., `hyp3rsonix`)
   - `DOCKERHUB_TOKEN`: The access token you just created

### Step 3: Run the Workflow

1. Go to **Actions** tab in your GitHub repository
2. Select **Build and Deploy Docker Image** workflow
3. Click **Run workflow**
4. Choose options:
   - **Tag**: `latest` or a version like `v1.0.0`
   - **Push to GHCR**: ✅ (optional)
   - **Push to Docker Hub**: ✅

The workflow will build and push the image to Docker Hub at `hyp3rsonix/commentslash:latest`

## 🔐 Security & Privacy

- **No Server Storage** - Your OAuth token is never stored on any server
- **Browser-Only Storage** - All comment data is stored in your browser's IndexedDB
- **Auto-Expiration** - Cached data automatically expires after 30 days by default (configurable via `LOCAL_DATA_RETENTION_DAYS`)
- **Stale Data Warnings** - Get reminded when your data is outdated (configurable via `STALE_DATA_WARNING_DAYS`)
- **Rate Limiting Aware** - Implements delays and batch operations to respect YouTube API limits
- **Privacy-Focused Logging** - All server logs automatically redact emails, tokens, and user identifiers
- **Minimal Data Collection** - The server only processes authentication requests; comment data stays in your browser
- **PII Redaction** - Email addresses, access tokens, and channel IDs are automatically redacted from logs
- **No Analytics** - No tracking, no analytics, no third-party scripts

## 🛠️ Tech Stack

- **Framework**: [SvelteKit](https://kit.svelte.dev/) with Vite
- **Language**: TypeScript
- **Storage**: IndexedDB via [idb](https://github.com/jakearchibald/idb)
- **API**: YouTube Data API v3
- **Styling**: Custom CSS with CSS Variables
- **Deployment**: Docker with Node.js runtime

## 📁 Project Structure

```
├── src/
│   ├── lib/
│   │   ├── components/     # Svelte components
│   │   ├── services/       # YouTube API & Storage services
│   │   ├── stores/         # Svelte stores for state management
│   │   ├── styles/         # Global CSS styles
│   │   └── types/          # TypeScript type definitions
│   └── routes/             # SvelteKit routes
├── static/                 # Static assets
├── Dockerfile             # Docker configuration
└── .github/workflows/     # GitHub Actions
```

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

Made with ✦ by [hyp3r-dev](https://github.com/hyp3r-dev)
