# CommentSlash - Copilot Coding Agent Instructions

## Repository Overview

**CommentSlash** is a privacy-focused SvelteKit web application that helps users manage and delete their YouTube comments. Users import their comment history via Google Takeout exports, then can filter, search, and batch-delete comments through the YouTube Data API v3.

### Tech Stack
- **Framework**: SvelteKit 2.x with Svelte 5 (uses runes: `$state`, `$derived`, `$effect`, `$props`)
- **Language**: TypeScript (strict mode)
- **Build Tool**: Vite 7.x
- **Storage**: IndexedDB via `idb` library (browser-only)
- **API**: YouTube Data API v3 with OAuth 2.0
- **Deployment**: Docker with Node.js adapter

## Project Structure

```
├── src/
│   ├── lib/
│   │   ├── components/     # Svelte 5 components (.svelte files)
│   │   ├── services/       # YouTube API client, storage service
│   │   ├── stores/         # Svelte stores for state management
│   │   ├── styles/         # Global CSS with CSS variables
│   │   ├── types/          # TypeScript interfaces
│   │   └── server/         # Server-only code (config, logging)
│   └── routes/
│       ├── +page.svelte    # Main application page
│       ├── +layout.svelte  # Root layout
│       ├── api/            # API endpoints (auth, quota)
│       └── legal/          # Privacy policy & terms pages
├── static/                 # Static assets (favicon, etc.)
├── Dockerfile             # Multi-stage Docker build
├── package.json           # Dependencies and scripts
├── svelte.config.js       # SvelteKit configuration
├── tsconfig.json          # TypeScript configuration
└── vite.config.ts         # Vite configuration
```

## Build & Development Commands

### Initial Setup
```bash
npm install    # Install dependencies (uses npm, not yarn)
```

### Development
```bash
npm run dev    # Start dev server at http://localhost:5173
```

### Build for Production
```bash
npm run build  # Build to .svelte-kit/output
node build     # Run production build at http://localhost:3000
```

### Type Checking
```bash
npm run check  # Run svelte-check for type errors
```

**Note**: There is no `npm run lint` or `npm run test` command configured. Type checking via `npm run check` is the primary validation.

## Key Development Guidelines

### Svelte 5 Runes (IMPORTANT)
This project uses **Svelte 5 runes syntax**. Always use:
- `$state()` for reactive state (not `let x = value`)
- `$derived()` for computed values
- `$effect()` for side effects
- `$props()` for component props

Example:
```svelte
<script lang="ts">
  let count = $state(0);
  const doubled = $derived(count * 2);
  
  let { name, onClick }: { name: string; onClick?: () => void } = $props();
</script>
```

### Component Structure
- Components are in `src/lib/components/`
- Use TypeScript with `lang="ts"`
- Prefer scoped `<style>` blocks over global CSS
- Use CSS variables from `src/lib/styles/global.css`

### State Management
- Global state uses Svelte stores in `src/lib/stores/`
- Local component state uses `$state()`
- The main stores are:
  - `comments.ts` - Comment list and selection
  - `filters.ts` - Search and filter state
  - `quota.ts` - API quota tracking
  - `toast.ts` - Toast notifications

### API Services
- `src/lib/services/youtube.ts` - YouTube API client
- `src/lib/services/storage.ts` - IndexedDB persistence
- Server-side code must be in `src/lib/server/` directory

### Data Flow
1. User imports Google Takeout → parsed in browser
2. Comments stored in IndexedDB (30-day TTL)
3. User connects YouTube OAuth for enrichment/deletion
4. API calls go through `YouTubeService` class
5. Quota tracked locally and on server (when OAuth configured)

## Common Patterns

### Adding a New Component
```svelte
<script lang="ts">
  import { comments } from '$lib/stores/comments';
  
  let { prop1, prop2 = 'default' }: {
    prop1: string;
    prop2?: string;
  } = $props();
  
  let localState = $state(false);
</script>

<div class="my-component">
  <!-- content -->
</div>

<style>
  .my-component {
    /* use CSS variables */
    background: var(--bg-card);
    border-radius: var(--radius-md);
  }
</style>
```

### Adding an API Endpoint
```typescript
// src/routes/api/example/+server.ts
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ request }) => {
  return json({ data: 'value' });
};
```

## Environment Variables

Server-side (set in Docker/deployment):
- `GOOGLE_CLIENT_ID` - OAuth client ID
- `GOOGLE_CLIENT_SECRET` - OAuth client secret
- `GOOGLE_REDIRECT_URI` - OAuth callback URL
- `LOCAL_DATA_RETENTION_DAYS` - Data TTL (default: 30)
- `STALE_DATA_WARNING_DAYS` - Stale warning (default: 14)
- `ENABLE_LEGAL` - Show legal pages
- `ENABLE_COOKIE_CONSENT` - Show cookie banner

## Validation Checklist

Before submitting changes:
1. Run `npm run check` - must pass with no errors
2. Run `npm run build` - must complete successfully
3. Test the feature in browser (dev or preview mode)
4. For UI changes, verify responsiveness (mobile breakpoints at 640px, 768px, 1024px)

## Common Gotchas

1. **Svelte 5 syntax**: Don't mix Svelte 4 reactive statements (`$:`) with runes
2. **Server imports**: Don't import from `$lib/server/` in client components
3. **IndexedDB**: Only available in browser, check `typeof window !== 'undefined'`
4. **CSS variables**: Always use defined variables from global.css
5. **OAuth tokens**: Never log or expose tokens - use server-side handling

## File Naming Conventions

- Components: `PascalCase.svelte` (e.g., `CommentCard.svelte`)
- Routes: `+page.svelte`, `+layout.svelte`, `+server.ts`
- Stores: `camelCase.ts` (e.g., `comments.ts`)
- Types: `camelCase.ts` in `src/lib/types/`

## CSS Variables Reference

Key variables from `src/lib/styles/global.css`:
```css
--bg-primary: #0f0f1a;
--bg-card: #1a1a2e;
--bg-tertiary: #252538;
--text-primary: #f8f8f8;
--text-secondary: #a0a0b0;
--accent-primary: #6366f1;
--accent-tertiary: #a78bfa;
--error: #ef4444;
--warning: #fbbf24;
--radius-md: 0.5rem;
--radius-lg: 0.75rem;
--radius-xl: 1rem;
```
