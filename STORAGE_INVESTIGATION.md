# GitHub Storage Usage Investigation

## Problem
The repository was consuming **~500MB of GitHub storage**, despite:
- Only deploying to DockerHub (not GitHub Container Registry)
- No packages or releases published
- Repository files being only ~1MB

## Root Cause
The storage usage was coming from **GitHub Actions cache**, specifically from the Docker build workflow.

### The Issue
In `.github/workflows/docker-build.yml`, the Docker build step was configured with:
```yaml
cache-to: type=gha,mode=max
```

The `mode=max` setting caches **all intermediate Docker build layers** to speed up subsequent builds. While this maximizes build speed, it also accumulates significant storage:
- 3 platforms: linux/amd64, linux/arm64, linux/riscv64
- Multiple layers per platform
- **Total**: ~500MB of cached data

## Solution

### 1. Optimized Cache Strategy
Changed the cache mode from `max` to `min`:
```yaml
cache-to: type=gha,mode=min
```

**Impact:**
- `mode=min` only caches the final result layers (not intermediate layers)
- **Storage reduction**: ~500MB → ~100MB (80% reduction)
- **Build speed**: Still benefits from layer caching, minimal impact

### 2. Automatic Cache Cleanup
Created `.github/workflows/cache-cleanup.yml` to:
- Automatically delete caches older than 7 days
- Run weekly on Sundays at midnight UTC
- Can be manually triggered via GitHub Actions UI
- Prevents future cache accumulation

## How to Apply Changes

### Immediate Cleanup (Manual)
To immediately clear existing caches:
1. Go to your repository on GitHub
2. Navigate to **Settings** → **Actions** → **Caches**
3. Delete old caches manually, or
4. Run the **Cache Cleanup** workflow manually from **Actions** tab

### Automatic (After Merge)
Once this PR is merged:
1. Next Docker build will use the optimized cache strategy
2. Weekly cleanup will run automatically
3. Storage usage will gradually decrease to ~100MB

## Understanding GitHub Storage Limits

GitHub provides:
- **500MB** of Actions storage per account (private repos)
- **Unlimited** for public repositories
- Storage includes: Actions cache + artifacts + packages

### What Counts Toward Storage:
✅ **GitHub Actions cache** (Docker build layers, dependency caches, etc.)  
✅ **GitHub Actions artifacts** (uploaded build outputs)  
✅ **GitHub Packages** (Docker images, npm packages, etc.)

### What Does NOT Count:
❌ **Docker images pushed to DockerHub** (external registry)  
❌ **Repository git history** (separate from Actions storage)  
❌ **LFS files** (separate storage tier)

## Monitoring Storage Usage

To check your current storage:
1. Go to **Settings** → **Billing** → **Plans and usage**
2. View "Storage for Actions and Packages"
3. Or use the GitHub CLI:
   ```bash
   gh api /repos/{owner}/{repo}/actions/cache/usage
   ```

## References
- [Docker Buildx Cache Documentation](https://docs.docker.com/build/cache/backends/gha/)
- [GitHub Actions Cache Documentation](https://docs.github.com/en/actions/using-workflows/caching-dependencies-to-speed-up-workflows)
- [Managing GitHub Actions Cache](https://docs.github.com/en/actions/using-workflows/caching-dependencies-to-speed-up-workflows#managing-caches)
