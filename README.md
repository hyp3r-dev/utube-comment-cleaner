# ⚔️ CommentSlash

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
- **⚔️ Slash Queue** - Intuitive interface to select comments for precise deletion
- **🌙 Dark Theme** - Beautiful dark theme that's easy on the eyes
- **⚡ Ninja Animations** - Smooth, slashing animations throughout the UI
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

### Build Locally

```bash
docker build -t commentslash .
docker run -p 3000:3000 commentslash
```

### Pull from GitHub Container Registry

```bash
docker pull ghcr.io/hyp3r-dev/utube-comment-cleaner:latest
docker run -p 3000:3000 ghcr.io/hyp3r-dev/utube-comment-cleaner:latest
```

### Docker Compose

```yaml
version: '3.8'
services:
  commentslash:
    image: ghcr.io/hyp3r-dev/utube-comment-cleaner:latest
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
```

## 🔒 Security & Privacy

- **No Server Storage** - Your OAuth token is never stored on any server
- **Browser-Only Storage** - All comment data is stored in your browser's IndexedDB
- **Auto-Expiration** - Cached data automatically expires after 24 hours
- **Rate Limiting Aware** - Implements delays and batch operations to respect YouTube API limits

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

Made with ⚔️ by [hyp3r-dev](https://github.com/hyp3r-dev)
