# TipTap JWT Authentication Implementation Guide

### NOTE:
This document can probably be revised or removed altogether. This is solved and probably has no need to consume any tokens or memory.

**Last Updated**: October 5, 2025

## 🎯 Current Status: ✅ PRODUCTION READY

**Solution**: Simplified JWT generation with server-side edge function
- JWT Generation: ✅ Server-generated JWT working
- App ID: `<your-app-id>`
- Authentication: ✅ Working with TipTap API
- UI Integration: ✅ Transparent loading state (no debugging badges)
- Server-side Implementation: ✅ PRODUCTION READY

## 🧠 **KEY LEARNINGS**

### **Authentication Confusion - What Each Token Does:**

1. **NPM Registry Token** - For installing @tiptap-pro packages
2. **Content AI Secret** - Used to GENERATE JWTs, not used directly
3. **JWT Token** (`eyJ0eXAi...`) - What TipTap API actually needs
4. **Conversion Secret** - For TipTap Conversion API (different service)

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

## ✅ **PRODUCTION JWT Implementation - COMPLETED**

### **Goal**: Auto-renewing production JWT system ✅ ACHIEVED

### **Production Setup**:
```env
# Client-side (public)
VITE_TIPTAP_APP_ID=<your-app-id>

# Server-side (Supabase Edge Functions)
TIPTAP_CONTENT_AI_SECRET=<your-content-ai-secret>
TIPTAP_APP_ID=<your-app-id>
```

### **Current Status**:
- ✅ Server-side JWT generation working perfectly
- ✅ Simplified JWT structure accepted by TipTap API
- ✅ Correct Content AI Secret configured
- ✅ Production JWT in use (no temporary JWT needed)
- ✅ Auto-refresh working with 5-minute buffer
- ✅ Transparent UI integration (automatic initialization)

### **Completed Implementation**:

#### **Phase 1: JWT Generation (Server-side)** ✅
- [x] Created Supabase edge function (`generate-tiptap-jwt`)
- [x] Uses HS256 algorithm with exact payload structure
- [x] Signs with Content AI Secret (secure, server-only)
- [x] 24-hour token expiration (prevents editor reload during long AI Pass operations)

#### **Phase 2: Client-side JWT Management** ✅
- [x] Created `useTiptapJWT` hook for automatic token refresh
- [x] Implements in-memory token caching
- [x] 5-minute buffer before expiration (refresh at 23h 55m)
- [x] Graceful error handling and retry logic

#### **Phase 3: Integration** ✅
- [x] Updated Editor to use JWT hook
- [x] Loading state prevents editor initialization until JWT ready
- [x] "Initializing editor..." spinner shown during JWT fetch
- [x] Error state with retry button for JWT failures
- [x] Auto-refresh before expiration (transparent to users)

#### **Phase 4: Production Features** ✅
- [x] Retry logic with exponential backoff (3 retries)
- [x] Comprehensive error handling
- [x] Debug logging for JWT lifecycle
- [x] Graceful degradation for network failures

## 🔑 JWT Structure (Production Implementation)

### **Server-Generated JWT Structure** (Simplified & Working):
```javascript
{
  // Header
  "alg": "HS256",
  "typ": "JWT"
}
{
  // Payload (Simple structure)
  "iss": "https://cloud.tiptap.dev",
  "iat": 1758921800,      // issued at timestamp
  "exp": 1759008200,      // 24 hour expiration (prevents editor reload during long operations)
  "sub": "user-session-identifier"
}
```

### **Key Discovery**:
- ✅ TipTap accepts **ANY valid JWT** signed with the Content AI Secret
- ✅ Claim values don't need to match specific formats
- ✅ Simpler payload structure works perfectly
- ✅ No need for complex `nbf` or specific `aud` values
- 📖 See archived documentation for the breakthrough discovery

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
# 1. Fetch JWT from edge function on startup
# 2. Show "Initializing editor..." while JWT loads
# 3. Initialize editor once JWT is ready
# 4. Auto-refresh tokens before expiration (transparent)
```

## 📁 Files Created/Modified

### Created:
1. `supabase/functions/generate-tiptap-jwt/index.ts` - Edge function for JWT generation
2. `src/hooks/useTiptapJWT.ts` - React hook for JWT management
3. `supabase/functions/generate-tiptap-jwt/README.md` - Function documentation

### Modified:
1. `src/components/workspace/Editor.tsx` - Updated to use JWT hook with loading state
2. `.env` - Contains public App ID

## ⚠️ Important Notes
- **NEVER** expose conversion secret to client-side code
- Generate JWTs **server-side only**
- Use Supabase edge functions for JWT generation
- Implement proper token expiration and renewal
- No hardcoded credentials in production code

## 🔄 **Resolution Timeline**
- [x] Research current implementation
- [x] Understand TipTap JWT requirements from official docs and example repo
- [x] **DECODED**: TipTap's example JWT to understand exact structure
- [x] **IMPLEMENTED**: Server-side JWT generation matching TipTap's example exactly
- [x] **CONFIGURED**: Correct Content AI Secret in Supabase
- [x] **DEBUGGING**: Server JWT generated successfully but TipTap rejected it
- [x] **DISCOVERY**: Tested with online JWT builder (http://jwtbuilder.jamiekurtz.com/)
- [x] **BREAKTHROUGH**: TipTap accepts ANY valid JWT signed with Content AI Secret
- [x] **SIMPLIFIED**: Removed overly-specific claims from JWT payload
- [x] **RESOLVED**: Server JWT now working in production
- [x] **CLEANUP**: Removed temporary JWT fallback code
- [x] **UI POLISH**: Removed debugging JWT badge from editor header
- [x] **LOADING STATE**: Added transparent JWT initialization with spinner

## 🏆 **PRODUCTION WORKING STATE:**
```env
# Client Environment Variables
VITE_TIPTAP_APP_ID=<your-app-id>

# Supabase Environment Variables (Server-side)
TIPTAP_CONTENT_AI_SECRET=<your-content-ai-secret>
TIPTAP_APP_ID=<your-app-id>
```

### **User Experience:**
- ✅ **Seamless**: Users never see JWT status - it works automatically
- ✅ **Fast**: JWT fetches in background during app startup
- ✅ **Reliable**: Auto-refresh ensures tokens never expire during use
- ✅ **Error Handling**: Clear error messages with retry if JWT fetch fails
- ✅ **No Debugging UI**: Production-ready, no status badges needed

## 🎓 **Key Lessons Learned:**

### What We Discovered
1. **TipTap's JWT validation is lenient**: Accepts any valid JWT signed with Content AI Secret
2. **Claim values don't matter much**: Even placeholder values from online tools work
3. **Simpler is better**: Over-complicated payloads caused the issue
4. **The `jose` library was fine**: Problem was our JWT payload structure, not the signing library

### What Was Wrong
- ❌ We were trying to match TipTap's example JWT structure too precisely
- ❌ Used overly-specific claim values (`iss`, `aud`, `nbf`)
- ❌ Overthought the validation requirements

### What Fixed It
- ✅ Simplified payload: just `iss`, `iat`, `exp`, `sub`
- ✅ Removed unnecessary claims (`nbf`, specific `aud` values)
- ✅ Kept using HS256 algorithm with Content AI Secret
- ✅ Removed temporary JWT fallback logic
- ✅ Removed debugging UI (JWT badge) for production cleanliness
- ✅ Added loading state to prevent race conditions

## 📚 **Resolution Complete - No Outstanding Issues** ✅

---

## Tags

#tiptap #JWT #authentication #token #edge_function #supabase #backend #security #AIpass #bug #resolved #production #react #hook #api #content_ai #deployment