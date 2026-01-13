# CommentSlash - Copilot Coding Agent Instructions

## Repository Overview

**CommentSlash** is a privacy-focused SvelteKit web application that helps users manage and delete their YouTube comments. Users import their comment history via Google Takeout exports, then can filter, search, and batch-delete comments through the YouTube Data API v3.

### Tech Stack
- **Framework**: SvelteKit 2.x with Svelte 5 (uses runes: `$state`, `$derived`, `$effect`, `$props`)
- **Language**: TypeScript (strict mode)
- **Build Tool**: Vite 7.x
- **Storage**: IndexedDB via `idb` library (browser-only)
- **API**: YouTube Data API v3 with OAuth 2.0
- **Animation**: Motion library (https://motion.dev)
- **Deployment**: Docker with Node.js adapter

## Project Structure

```
├── src/
│   ├── lib/
│   │   ├── components/     # Svelte 5 components (.svelte files)
│   │   │   └── Icon.svelte # Reusable icon component system
│   │   ├── services/       # YouTube API client, storage service
│   │   ├── stores/         # Svelte stores for state management
│   │   ├── styles/         # Global CSS with CSS variables
│   │   ├── types/          # TypeScript interfaces
│   │   ├── utils/          # Shared utility functions (formatting, motion, etc.)
│   │   │   ├── formatting.ts  # Text/date formatting
│   │   │   ├── timezone.ts    # Timezone utilities
│   │   │   └── motion.ts      # Animation utilities (Motion library)
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

### Shared Utilities
Common utility functions are in `src/lib/utils/`:
- `formatting.ts` - Text/date formatting (`formatDate`, `truncateText`, `escapeHtml`)
- `timezone.ts` - Timezone utilities
- `motion.ts` - Animation utilities using Motion library

**Always use shared utilities** instead of duplicating functions across components.

### Icon Component System (IMPORTANT)
The project uses a centralized icon system instead of inline SVGs. **Always use the Icon component**:

```svelte
<script lang="ts">
  import Icon from '$lib/components/Icon.svelte';
</script>

<!-- Basic usage -->
<Icon name="search" size={20} />
<Icon name="close" size={16} class="custom-class" />
```

Available icon names include: `search`, `close`, `chevronDown`, `chevronLeft`, `externalLink`, `arrowDown`, `logout`, `upload`, `download`, `refresh`, `check`, `checkCircle`, `error`, `errorCircle`, `warning`, `info`, `filter`, `calendar`, `trash`, `heart`, `thumbUp`, `comment`, `comments`, `eye`, `bookmark`, `user`, `users`, `play`, `video`, `youtube`, `settings`, `sparkle`, `chart`, `clock`, `bolt`, `spinner`, `cancel`

To add a new icon:
1. Open `src/lib/components/Icon.svelte`
2. Add the icon name to the `IconName` type
3. Add the SVG path data to the `iconPaths` object

**DO NOT use inline SVGs** - always add icons to the Icon component for consistency and maintainability.

### Data Flow
1. User imports Google Takeout → parsed in browser
2. Comments stored in IndexedDB (30-day TTL)
3. User connects YouTube OAuth for enrichment/deletion
4. API calls go through `YouTubeService` class
5. Quota tracked locally and on server (when OAuth configured)

## Performance Best Practices

### CSS Animations (CRITICAL)
**DO:**
- Use `transform` and `opacity` for animations (GPU-accelerated)
- Use `box-shadow` for hover glow effects (efficient)
- Add `transform: translateZ(0)` to enable hardware acceleration
- Use `contain: layout style` to prevent layout thrashing
- Keep animations simple and use CSS transitions where possible

**DON'T:**
- Use rotating/animating pseudo-elements larger than the element itself
- Use continuously running animations on idle elements (e.g., `animation: spin infinite`)
- Animate `width`, `height`, `top`, `left` (causes layout recalculation)
- Use complex gradients (especially `conic-gradient`) in animations
- Create large compositing layers with `::before`/`::after` pseudo-elements

Example of performant hover effect:
```css
.card {
  transition: transform 0.25s ease, box-shadow 0.25s ease;
  transform: translateZ(0);
  contain: layout style;
}

.card:hover {
  transform: translateY(-2px) translateZ(0);
  box-shadow: 
    0 4px 20px rgba(99, 102, 241, 0.15),
    0 0 0 1px rgba(99, 102, 241, 0.4);
}
```

### Motion Library (Preferred for New Animations)

For complex or programmatic animations, use the Motion library. The utility functions are in `src/lib/utils/motion.ts`.

**Documentation:** https://motion.dev/docs

**Usage in Svelte components:**
```svelte
<script lang="ts">
  import { onMount } from 'svelte';
  import { slideInFromLeft, fadeIn, springScale, shake } from '$lib/utils/motion';
  
  let element: HTMLElement;
  
  onMount(() => {
    slideInFromLeft(element);
  });
  
  function handleError() {
    shake(element);
  }
</script>

<div bind:this={element}>Content</div>
```

**Available animation functions:**
- `slideInFromLeft(element)` - Slide in from left (queue items)
- `slideOutToLeft(element)` - Slide out to left (removing items)
- `slideInFromBottom(element)` - Slide up (modals, toasts)
- `fadeIn(element)` / `fadeOut(element)` - Simple opacity transitions
- `springScale(element, scale)` - Spring physics scale (button feedback)
- `popIn(element)` - Pop in with spring (emphasis)
- `shake(element)` - Error feedback shake
- `pulse(element)` - Subtle pulsing (loading states)
- `spin(element)` - Rotation (spinners)
- `swipeRightSuccess(element)` - Swipe right (success deletion)
- `swipeLeftFailed(element)` - Shake left (failed deletion)
- `staggeredSlideIn(elements, delay)` - Staggered list animation
- `highlight(element)` - Flash highlight effect
- `collapse(element)` - Shrink to 0 height

**When to use Motion vs CSS:**
- **Use Motion**: Complex sequences, spring physics, programmatic control, staggered animations
- **Use CSS**: Simple hover effects, transitions, infinite loops (with caution)

### Drag & Drop
- Set `draggable="true"` on the element
- Use `e.dataTransfer.setDragImage()` to prevent browser's default image drag
- Set `e.dataTransfer.effectAllowed = 'move'`
- Always provide proper drag feedback with CSS classes

### Component Size Guidelines
- **Ideal**: < 300 lines per component
- **Acceptable**: 300-500 lines for complex components
- **Refactor needed**: > 500 lines - extract sub-components or utilities

### When to Extract Code
1. **Utility functions** used in 2+ components → `src/lib/utils/`
2. **Complex logic** (>50 lines) → extract to a separate function/module
3. **Repeated UI patterns** → create reusable component
4. **Large style blocks** → consider CSS variables or utility classes

## Common Patterns

### Adding a New Component
```svelte
<script lang="ts">
  import { comments } from '$lib/stores/comments';
  import { formatDate, truncateText } from '$lib/utils/formatting';
  
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
- `SMALL_OPERATION_RESERVE_PERCENT` - Quota reserve for small operations (default: 5%)

### Quota System

The app tracks YouTube API quota usage. Key concepts:

- **Daily Limit**: 10,000 units by default (YouTube API quota)
- **Small Operation Reserve**: 5% of daily limit reserved for login/enrichment operations
- **Delete Cost**: 50 units per comment deletion
- **Cancellation**: Users can cancel deletion mid-process; already deleted comments stay deleted

The quota is displayed in `QuotaProgressBar.svelte` and shows:
- Used quota
- Reserved quota (for pending operations)
- Available for deletion (daily limit minus used minus 5% reserve)

### Simulation Mode

For testing OAuth and YouTube API without real credentials:
- `ENABLE_SIMULATION_MODE=true` - Enable simulation mode
- `SIMULATION_NETWORK_DELAY=500` - Network latency simulation in ms (default: 500)

When simulation mode is enabled:
- OAuth login redirects directly set a simulated token
- YouTube API calls return mock data from `demodata/enrichment-data.json`
- Comment deletion always succeeds
- Token validation always succeeds with a demo channel

To test with simulation mode:
```bash
ENABLE_SIMULATION_MODE=true npm run dev
```

**Tree-shaking:** Simulation code is automatically excluded from production builds through compile-time constants. When `ENABLE_SIMULATION_MODE` is not set (production), Vite's dead code elimination removes all simulation logic and mock data from the client bundle.

## Validation Checklist

Before submitting changes:
1. Run `npm run check` - must pass with no errors
2. Run `npm run build` - must complete successfully
3. Test the feature in browser (dev or preview mode)
4. For UI changes, verify responsiveness (mobile breakpoints at 640px, 768px, 1024px)
5. For animations, test performance with browser DevTools (aim for 60fps)

## Common Gotchas

1. **Svelte 5 syntax**: Don't mix Svelte 4 reactive statements (`$:`) with runes
2. **Server imports**: Don't import from `$lib/server/` in client components
3. **IndexedDB**: Only available in browser, check `typeof window !== 'undefined'`
4. **CSS variables**: Always use defined variables from global.css
5. **OAuth tokens**: Never log or expose tokens - use server-side handling
6. **Animation performance**: Never use continuously running animations on multiple elements
7. **Drag behavior**: Always set proper drag data and prevent default image drag

## File Naming Conventions

- Components: `PascalCase.svelte` (e.g., `CommentCard.svelte`)
- Routes: `+page.svelte`, `+layout.svelte`, `+server.ts`
- Stores: `camelCase.ts` (e.g., `comments.ts`)
- Types: `camelCase.ts` in `src/lib/types/`
- Utils: `camelCase.ts` in `src/lib/utils/`

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

## Demo Data for Testing

The `demodata/` directory contains sample Google Takeout exports for testing:

- **`Kommentare-example.csv`** - German-language CSV with 30 sample comments in authentic Google Takeout format
- **`enrichment-data.json`** - Mock YouTube API data for simulation mode (video titles, channel names, like counts)

Use these files to test:
- File import/parsing functionality
- Comment display and filtering
- UI changes related to comment lists
- Channel filter functionality (with simulation mode enabled)
- Multi-language CSV header support

To test: Start dev server (`npm run dev`) → Import → Select file from `demodata/`
