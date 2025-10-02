# Vercel Deployment Guide

**Status**: Ready to Deploy
**Last Updated**: September 30, 2025
**Estimated Time**: 30 minutes

## Overview

This guide walks through deploying the Manuscript Ballast application to Vercel. The app is a Vite + React SPA with:
- React Router for client-side routing
- Supabase for backend (auth, database, edge functions)
- TipTap Pro (private npm registry requiring authentication)
- Environment variables for configuration

## Prerequisites

- Vercel account connected to your GitHub/GitLab (or use Vercel CLI)
- Access to Supabase project (`etybjqtfkclugpahsgcj`)
- TipTap Pro registry token (already in `.env` as `VITE_TIPTAP_NPM_TOKEN`)

## Security Assessment ✅

**Your application is properly secured:**
- ✅ `TIPTAP_CONTENT_AI_SECRET` is NOT exposed client-side
- ✅ Only used in Supabase edge function `generate-tiptap-jwt/index.ts`
- ✅ JWT generation happens server-side
- ✅ Client receives time-limited JWTs (1-hour expiry)
- ✅ Sensitive operations happen via Supabase edge functions

**Client-side Environment Variables:**
- Only `VITE_TIPTAP_APP_ID` is embedded in client bundle
- This is safe - it's a public identifier, not a secret
- Supabase anon key is also client-safe (protected by RLS policies)

## Step-by-Step Deployment

### Step 1: Create `vercel.json` Configuration

Create a new file at the project root:

**File:** `/vercel.json`

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```

**Why:** This ensures all routes are handled by React Router. Without it, direct navigation to `/dashboard` or `/manuscript/:id` would return 404.

**Note:** Vercel's `rewrites` include an implicit filesystem check, so static assets (JS, CSS, images) are served normally before the rewrite applies.

### Step 2: Configure Environment Variables in Vercel

Go to Vercel Dashboard → Your Project → Settings → Environment Variables

#### Build-Time Variable (Critical)

**Variable:** `NPM_RC`
**Value:** (Multi-line text)
```
@tiptap-pro:registry=https://registry.tiptap.dev/
//registry.tiptap.dev/:_authToken=QLxOMgjn+Z5uquMFX65CRaL8Ean+rHtWPLVFF7DYMV82e8R912c5YNRkB3huUN33
```
**Environments:** Production, Preview, Development (all)
**Why:** Vercel creates a `.npmrc` file from this variable during build, allowing `pnpm install` to authenticate with TipTap's private registry.

**⚠️ Important:** Use the actual token value from your `.env` file (`VITE_TIPTAP_NPM_TOKEN`), not a variable reference.

#### Runtime Variables (Required)

**Variable:** `VITE_SUPABASE_PROJECT_ID`
**Value:** `etybjqtfkclugpahsgcj`
**Environments:** All

**Variable:** `VITE_SUPABASE_PUBLISHABLE_KEY`
**Value:** `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV0eWJqcXRma2NsdWdwYWhzZ2NqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTczNzUzMjEsImV4cCI6MjA3Mjk1MTMyMX0.Z6ZHe-payb1H9whI-VP5Dr12mCWews-5yD_l6cl8yAc`
**Environments:** All

**Variable:** `VITE_SUPABASE_URL`
**Value:** `https://etybjqtfkclugpahsgcj.supabase.co`
**Environments:** All

**Variable:** `VITE_TIPTAP_APP_ID`
**Value:** `pkry1n5m`
**Environments:** All

**Note:** While `src/integrations/supabase/client.ts` has hardcoded values, setting environment variables provides flexibility and follows best practices.

### Step 3: Deploy to Vercel

#### Option A: Vercel CLI (Recommended for First Deploy)

```bash
# Install Vercel CLI if needed
npm i -g vercel

# Login to Vercel
vercel login

# Deploy (creates preview)
vercel

# Deploy to production
vercel --prod
```

#### Option B: GitHub Integration (Recommended for CI/CD)

1. Push your code to GitHub
2. Go to Vercel Dashboard → Add New Project
3. Import your GitHub repository
4. Configure:
   - **Framework Preset:** Vite
   - **Build Command:** `pnpm run build` (auto-detected)
   - **Output Directory:** `dist` (auto-detected)
   - **Install Command:** `pnpm install` (auto-detected)
5. Add environment variables (from Step 2)
6. Click "Deploy"

#### Option C: Vercel MCP Tool

```bash
# From Claude Code
Use mcp__vercel__deploy_to_vercel tool
```

### Step 4: Verify Deployment

After deployment completes, test these critical paths:

#### 1. Homepage
- ✅ Visit deployment URL
- ✅ Page loads without errors
- ✅ No console errors in browser DevTools

#### 2. Authentication
- ✅ Navigate to `/login`
- ✅ Login with Supabase credentials
- ✅ Redirects to `/dashboard`

#### 3. Client-Side Routing
- ✅ Navigate to `/dashboard` (should not 404)
- ✅ Refresh page at `/dashboard` (should not 404)
- ✅ Browser back/forward buttons work

#### 4. TipTap AI Features
- ✅ Open a manuscript in ExperimentalEditor
- ✅ Check browser console for JWT generation
- ✅ Should see: `🟢 Server-side JWT generated successfully`
- ✅ AI suggestions should work (if enabled)

#### 5. DOCX Upload/Processing
- ✅ Upload a DOCX file
- ✅ Check that processing queue job is created
- ✅ Verify document content appears after processing

### Step 5: Configure Custom Domain (Optional)

1. Vercel Dashboard → Your Project → Settings → Domains
2. Add your custom domain (e.g., `app.manuscript-ballast.com`)
3. Configure DNS records as instructed by Vercel
4. Wait for SSL certificate provisioning (~5 minutes)

## Preview Deployments for Clients

Every branch and PR gets a unique preview URL:
- **Format:** `https://manuscript-ballast-<git-branch-hash>.vercel.app`
- **Automatic:** Deployed on every push to non-main branches
- **Shareable:** No authentication required to view
- **Isolated:** Each preview has its own URL, safe for client review

**To share with clients:**
1. Push your feature branch to GitHub
2. Copy the preview URL from Vercel Dashboard or GitHub PR
3. Share URL directly with client

## Build Configuration

Current build settings (from `package.json`):
```json
{
  "scripts": {
    "build": "vite build",
    "preview": "vite preview"
  }
}
```

Vercel auto-detects:
- **Package Manager:** pnpm (from `pnpm-lock.yaml`)
- **Framework:** Vite
- **Node Version:** 18.x (Vercel default, can override in Settings)
- **Build Output:** `dist/`

## Common Issues & Troubleshooting

### Issue: "404 on Direct Navigation to Routes"

**Symptom:** `/dashboard` works when navigating from homepage, but returns 404 on direct visit or refresh.

**Solution:** Ensure `vercel.json` rewrites are configured (Step 1).

### Issue: "pnpm install fails with 401 on @tiptap-pro packages"

**Symptom:** Build logs show authentication error for TipTap registry.

**Solution:**
1. Verify `NPM_RC` environment variable is set
2. Ensure token value is correct (not a variable reference like `${TIPTAP_PRO_TOKEN}`)
3. Check token hasn't expired

### Issue: "Environment variables not defined at runtime"

**Symptom:** `import.meta.env.VITE_*` returns undefined in browser console.

**Solution:**
1. Environment variables must be set in Vercel Dashboard before deployment
2. Variables must start with `VITE_` to be embedded by Vite
3. Redeploy after adding environment variables

### Issue: "Supabase edge functions return errors"

**Symptom:** JWT generation fails, DOCX processing fails.

**Solution:**
- Edge functions are separate from Vercel deployment
- Verify Supabase secrets are set: `supabase secrets list`
- Check edge function logs: `supabase functions logs generate-tiptap-jwt`
- Ensure CORS headers are configured correctly

### Issue: "Build bundle too large (>500KB warning)"

**Current Status:** Build produces 1.2MB main bundle (warning shown).

**Impact:** Not critical, but affects initial load time.

**Future Optimization (Optional):**
- Implement code splitting with `React.lazy()`
- Use dynamic imports for routes
- Configure `build.rollupOptions.output.manualChunks` in `vite.config.ts`

## Performance Optimization

### Caching Strategy

Vercel automatically caches:
- **Static Assets:** Immutable (JS, CSS) cached forever with content hashes
- **HTML:** `index.html` cached briefly, revalidated frequently
- **API Routes:** Not applicable (using Supabase edge functions)

### CDN Distribution

- Vercel serves from 100+ edge locations globally
- Static assets served from nearest edge node
- No additional configuration needed

## Monitoring & Analytics

### Vercel Analytics (Optional)

Enable in Vercel Dashboard → Analytics:
- Real User Monitoring (RUM)
- Web Vitals (LCP, FID, CLS)
- Page views and unique visitors

**Cost:** Free tier includes basic analytics, paid plans for advanced features.

### Error Tracking (Recommended)

Consider integrating:
- **Sentry:** Error tracking and performance monitoring
- **LogRocket:** Session replay for debugging user issues
- **Supabase Logs:** Already configured for edge function errors

## CI/CD Workflow

### Recommended Git Strategy

```
main            → Production (auto-deploy)
  ↓
develop         → Preview (auto-deploy)
  ↓
feature/*       → Preview (auto-deploy)
```

### Automatic Deployments

**Production:** Every push to `main` branch
**Preview:** Every push to non-main branches
**PR Comments:** Vercel bot comments on PRs with preview URL

### Manual Deployments

```bash
# Deploy current branch as preview
vercel

# Deploy to production (requires confirmation)
vercel --prod

# Deploy specific branch
git checkout feature/new-editor
vercel
```

## Environment-Specific Configuration

### Production vs Preview Differences

Currently, the app uses the same Supabase instance for all environments. Consider:

**Future Enhancement:** Separate Supabase projects
- `manuscript-ballast-prod` → Production Vercel deployment
- `manuscript-ballast-preview` → Preview Vercel deployments
- Use `VITE_VERCEL_ENV` to detect environment:

```typescript
const supabaseUrl = import.meta.env.VITE_VERCEL_ENV === 'production'
  ? import.meta.env.VITE_SUPABASE_URL_PROD
  : import.meta.env.VITE_SUPABASE_URL_PREVIEW;
```

## Rollback Strategy

### Quick Rollback

1. Vercel Dashboard → Deployments
2. Find previous successful deployment
3. Click "..." → "Promote to Production"

### Git-Based Rollback

```bash
# Revert last commit and push
git revert HEAD
git push origin main

# Or force push to previous commit (use with caution)
git reset --hard <previous-commit-hash>
git push --force origin main
```

## Cost Estimation

### Vercel Pricing (as of 2025)

**Hobby Plan (Free):**
- ✅ Unlimited deployments
- ✅ 100GB bandwidth/month
- ✅ Preview deployments
- ✅ Custom domains
- ✅ SSL certificates
- ❌ No team collaboration
- ❌ No analytics

**Pro Plan ($20/month per user):**
- Everything in Hobby, plus:
- Team collaboration
- Analytics
- Password protection for previews
- Larger bandwidth allowance

**Current Project:** Hobby plan should be sufficient for client previews.

## Next Steps After Deployment

1. ✅ Share preview URLs with clients
2. ✅ Test all critical user flows
3. ⚠️ Monitor error logs (Vercel + Supabase)
4. ⚠️ Set up custom domain (if needed)
5. 💡 Consider implementing:
   - Error tracking (Sentry)
   - Analytics (Vercel Analytics or Google Analytics)
   - Separate preview/production Supabase instances

## Related Documentation

- [Vercel Documentation](https://vercel.com/docs)
- [Vite Deployment Guide](https://vitejs.dev/guide/static-deploy.html#vercel)
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)
- [TipTap JWT Guide](../authentication/tiptap-jwt.md)
- [Queue System Architecture](../../04-backend/queue-system.md)

## Cleanup Tasks

After successful deployment, you can optionally:

1. **Remove local env vars from client-side:**
   - `VITE_TIPTAP_NPM_TOKEN` - only needed during build (move to Vercel's `NPM_RC`)
   - `VITE_TIPTAP_CONTENT_AI_SECRET` - not used client-side (already secure ✅)

2. **Update `.env.example`:**
   - Remove build-only variables
   - Add documentation about Vercel environment variables

3. **Add `.vercel` to `.gitignore`:**
   - Already ignored via `/dist` pattern
   - Vercel CLI creates `.vercel/` directory locally

---

**Ready to deploy?** Follow the steps above, starting with creating `vercel.json`.

**Questions or issues?** Check Troubleshooting section or Vercel deployment logs.
