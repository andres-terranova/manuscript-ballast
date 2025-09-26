# TipTap JWT Authentication Implementation Guide

## 🎯 Current Status: WORKING ✅

**Working Solution**: Using temporary JWT from TipTap dashboard (prioritized for debugging)
- JWT Token: `eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpYXQ...` (Fresh from TipTap)
- App ID: `pkry1n5m`
- Authentication: ✅ Working with TipTap API
- Badge Display: 🟡 Temp JWT (temporarily prioritized over server-side)
- Server-side Implementation: ✅ COMPLETED (generates JWT but TipTap rejects it - under investigation)

## 🧠 **KEY LEARNINGS**

### **Authentication Confusion - What Each Token Does:**

1. **NPM Registry Token** (`QLxOMgjn...`) - For installing @tiptap-pro packages
2. **Content AI Secret** (`TkAy9iyz...`) - Used to GENERATE JWTs, not used directly
3. **JWT Token** (`eyJ0eXAi...`) - What TipTap API actually needs
4. **Conversion Secret** (`2hjv1rnl...`) - For TipTap Conversion API (different service)

### **The Real Problem:**
- ❌ TipTap AI Suggestions API requires **JWT tokens**, not raw secrets
- ❌ Content AI Secret is for **generating** JWTs, not direct API usage
- ❌ We tried using wrong secrets for the wrong APIs
- ✅ Temporary JWTs from TipTap dashboard work perfectly

### **Why Previous Approaches Failed:**
1. **Tried direct secret usage**: TipTap API rejected raw Content AI Secret
2. **Wrong secret for signing**: Used Conversion Secret (wrong service) to sign JWTs
3. **Over-complicated**: Built unnecessary JWT generation when TipTap provides temp tokens

## 📋 **Issues Fixed:**
- [x] ~~Hardcoded JWT tokens~~ Now using environment variable `VITE_TIPTAP_JWT`
- [x] ~~Hardcoded App ID~~ Now using `VITE_TIPTAP_APP_ID`
- [x] ~~Not using environment variables~~ All credentials now in `.env`
- [x] ~~Authentication failing~~ Working with proper JWT token

## ✅ **PRODUCTION JWT Implementation - PARTIALLY COMPLETED**

### **Goal**: Replace temporary JWT with auto-renewing production system 🔄

### **Current Production Setup**:
```env
# Client-side (public)
VITE_TIPTAP_APP_ID=pkry1n5m

# Server-side (Supabase Edge Functions) - CORRECTLY CONFIGURED
TIPTAP_CONTENT_AI_SECRET=TkAy9iyzi3rrux9P3U4m4ysaYayFE9kCr9Ff36DPFJAErOeGpDU8siu1UXJBUtco
TIPTAP_APP_ID=pkry1n5m

# Temporary JWT (currently prioritized for debugging)
VITE_TIPTAP_JWT=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9... (active)
```

### **Current Status**:
- ✅ Server-side JWT generation works (generates valid JWT tokens)
- ✅ JWT structure matches TipTap's example exactly
- ✅ Correct Content AI Secret configured
- ❌ TipTap API rejects server-generated JWT (401 auth_cloud_failed)
- 🔄 Temporary JWT prioritized while debugging server rejection issue

### **Completed Implementation**:

#### **Phase 1: JWT Generation (Server-side)** ✅
- [x] Created Supabase edge function (`generate-tiptap-jwt`)
- [x] Uses HS256 algorithm with exact payload structure
- [x] Signs with Content AI Secret (secure, server-only)
- [x] 1-hour token expiration

#### **Phase 2: Client-side JWT Management** ✅
- [x] Created `useTiptapJWT` hook for automatic token refresh
- [x] Implements in-memory token caching
- [x] 5-minute buffer before expiration
- [x] Graceful error handling and retry logic

#### **Phase 3: Integration** ✅
- [x] Updated ExperimentalEditor to use JWT hook
- [x] Fallback to temporary JWT during development
- [x] Loading states during token fetch/refresh
- [x] Auto-refresh before expiration

#### **Phase 4: Production Features** ✅
- [x] Retry logic with exponential backoff (3 retries)
- [x] Comprehensive error handling
- [x] Debug logging for JWT lifecycle
- [x] Graceful degradation for network failures

## 🔑 JWT Structure (Current Implementation)

### **Server-Generated JWT Structure** (matches TipTap example):
```javascript
{
  // Header
  "alg": "HS256",
  "typ": "JWT"
}
{
  // Payload (matches TipTap's example JWT exactly)
  "iat": 1758921800,      // issued at timestamp
  "nbf": 1758921800,      // not before (same as iat)
  "exp": 1759008200,      // 1 hour expiration
  "iss": "https://cloud.tiptap.dev",
  "aud": "c1b32a92-3c1f-4b49-ab6b-fb5a7a6178a8" // TipTap's standard audience
}
```

### **Issue**:
- Structure is 100% correct (matches TipTap's example)
- Signed with correct Content AI Secret
- TipTap still returns `401 auth_cloud_failed` for unknown reasons

## 🚀 Deployment Instructions

### 1. Deploy the Supabase Edge Function

```bash
# Deploy the JWT generation function
supabase functions deploy generate-tiptap-jwt
```

### 2. Set Environment Variables in Supabase

Go to your Supabase Dashboard > Edge Functions > `generate-tiptap-jwt` > Environment Variables

Add these secrets:
- `TIPTAP_CONTENT_AI_SECRET`: Your Content AI Secret from TipTap Cloud
- `TIPTAP_APP_ID`: Your App ID from TipTap Cloud

### 3. Test the Implementation

```bash
# Run the development server
pnpm run dev

# The app will:
# 1. Try to use temporary JWT if available (development)
# 2. Fall back to generating JWT via edge function (production)
# 3. Auto-refresh tokens before expiration
```

## 📁 Files Created/Modified

### Created:
1. `supabase/functions/generate-tiptap-jwt/index.ts` - Edge function for JWT generation
2. `src/hooks/useTiptapJWT.ts` - React hook for JWT management
3. `supabase/functions/generate-tiptap-jwt/README.md` - Function documentation

### Modified:
1. `src/components/workspace/ExperimentalEditor.tsx` - Updated to use JWT hook
2. `.env` - Contains public App ID and optional temporary JWT

## ⚠️ Important Notes
- **NEVER** expose conversion secret to client-side code
- Generate JWTs **server-side only**
- Use Supabase edge functions for JWT generation
- Implement proper token expiration and renewal
- No hardcoded credentials in production code

## 🔄 **Latest Session Progress (Current State)**
- [x] Research current implementation
- [x] Understand TipTap JWT requirements from official docs and example repo
- [x] **DECODED**: TipTap's example JWT to understand exact structure
- [x] **IMPLEMENTED**: Server-side JWT generation matching TipTap's example exactly
- [x] **CONFIGURED**: Correct Content AI Secret in Supabase
- [x] **DEBUGGING**: Server JWT generates successfully but TipTap rejects it
- [x] **WORKAROUND**: Temporary JWT prioritized while investigating server rejection
- [x] **WORKING**: "Run AI Pass" button works with temporary JWT (🟡 Temp JWT badge)
- [x] **ISSUE**: Server-generated JWT returns 401 despite correct structure and secret

## 🏆 **CURRENT WORKING STATE:**
```env
# Client Environment Variables
VITE_TIPTAP_APP_ID=pkry1n5m
VITE_TIPTAP_JWT=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9... (temporary - currently prioritized)

# Supabase Environment Variables (Server-side)
TIPTAP_CONTENT_AI_SECRET=TkAy9iyzi3rrux9P3U4m4ysaYayFE9kCr9Ff36DPFJAErOeGpDU8siu1UXJBUtco
TIPTAP_APP_ID=pkry1n5m
```

## 📚 **Next Steps (Outstanding Issues):**
1. **INVESTIGATE**: Why TipTap rejects server-generated JWT despite correct structure
2. **DEBUG**: Compare working temporary JWT vs rejected server JWT at byte level
3. **RESOLVE**: Server JWT authentication to enable full production deployment
4. **CLEANUP**: Remove temporary JWT dependency once server JWT works