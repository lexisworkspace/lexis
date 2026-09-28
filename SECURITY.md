# Orleia Security Audit - August 21, 2026

Scope: the entire `/e/orleia` codebase (Next.js 15 app), its 3 server routes, headers,
client storage, and dependencies. Every finding below was either fixed and verified
live, or is documented with a clear recommendation.

## ✅ Fixed & verified live

### 1. HIGH - Unauthenticated AI endpoints (quota abuse / DoS)
**Before:** `/api/chat`, `/api/tts`, `/api/transcribe` were publicly callable by anyone
with the URL. Attackers could burn your paid NVIDIA quota, stream unlimited tokens,
or submit arbitrarily large audio - a real cost + availability risk.

**Fix (`src/lib/apiGuard.ts` + all 3 routes):**
- **Origin/Referer allowlist** - the app is browser-only, so every legit request carries
  an Origin matching your domains. Scripts, curl, and scrapers don't → **403**.
- **Per-IP rate limits** - sliding 60s window + calendar-day cap per route
  (chat 20/min·300/day, tts 60/min·800/day, transcribe 20/min·300/day).
- **Input caps** - chat: ≤80 messages, ≤12k chars each, ≤60k total, `maxTokens` ≤ 2500,
  temperature clamped 0-2; transcribe: audio ≤ ~4 MB, sample rate 8k-48k.
- **Model allowlist** - only the 3 models Orleia actually uses can be requested.
- **Malformed-message guard** - non-object / non-string entries rejected with 400.

**Verified live:** no-Origin → `403 Forbidden` · real browser Origin → `200` with a real
AI reply · `evil.example.com` → `403` · disallowed model → `400` · `maxTokens: 1000000`
→ clamped · TTS: no-Origin → `403`, real Origin → `200` WAV.

### 2. MEDIUM - Plaintext password in localStorage
**Before:** the local password was stored raw in `localStorage["orleia-password"]` -
anyone with device access (or an XSS) could read the actual password, which users often
reuse across sites.

**Fix (`PasswordGate.tsx`):** stored as a **SHA-256 hash** (Web Crypto) - never the
plaintext. Legacy plaintext values are auto-migrated to hashes on next successful unlock.
A cyrb53 fallback keeps password setup working even on plain-http LAN access (no
`crypto.subtle`). Minimum length raised 3 → 4.

### 3. MEDIUM - Weak Content Security Policy
**Before:** `script-src 'self' 'unsafe-inline' 'unsafe-eval'` - `unsafe-eval` lets an
XSS payload execute `eval()`-based attacks; no restrictions on objects/frames/forms.

**Fix (`next.config.mjs`):** removed `'unsafe-eval'`; added `object-src 'none'`,
`base-uri 'self'`, `form-action 'self'`, `frame-ancestors 'none'`, `worker-src 'self' blob:`.
**Browser-verified: 0 console errors / 0 CSP violations** on the live site.

### 4. LOW-MEDIUM - Missing security headers
Added: `Permissions-Policy` (only `microphone=(self)` allowed - camera/geo/payment/USB
denied), `Cross-Origin-Opener-Policy: same-origin`, `Cross-Origin-Resource-Policy: same-origin`
(alongside existing `X-Frame-Options: DENY`, `nosniff`, `Referrer-Policy`).

### 5. LOW - Input-validation gaps
Unbounded `maxTokens`, unbounded temperature, no audio size cap, non-object messages -
all capped/rejected server-side (see #1).

## 📋 Reviewed & clean (no action needed)

- **XSS in chat rendering:** `react-markdown` without `rehype-raw` - the LLM cannot inject
  raw HTML. Links get `rel="noopener noreferrer" target="_blank"`. The only
  `dangerouslySetInnerHTML` is a static theme-injection script (no user input).
- **`eval()` / `new Function`:** zero usages.
- **Hardcoded secrets in source:** none. `.env*.local` is gitignored.
- **API keys:** NVIDIA key lives only server-side; NVCF function IDs in routes are
  identifiers, not credentials.
- **CORS:** no CORS headers → cross-origin browsers can't even read responses; the
  Origin check covers non-browser clients.

## ⚠️ Documented limitations & recommendations

1. **The Origin check is a deterrent, not a hard boundary.** The `Origin` header is
   client-controlled - a determined attacker can spoof it (e.g.
   `curl -H "Origin: https://orleia-workspace.vercel.app"`). It stops casual abuse and
   scrapers; rate limits are the backstop. For hard quota protection at scale:
   - **Vercel Firewall / rate limiting** on the 3 API routes (platform-level, per-IP
     across instances), or
   - **Password is the only auth** (by design, per project owner) - the leftover
     Clerk keys were removed from `.env.local` (dead code, no longer present).
2. **Rate limits are in-memory per serverless instance** - effective capacity scales
   with cold instances. Fine for a personal app; see #1 for scale.
3. **npm audit: 2 HIGH flags, not exploitable here:**
   - `GHSA-955p-x3mx-jcvp` (Next.js server-action disclosure, Moderate) - **requires
     Server Actions; Orleia has none** (route handlers only). Fix = Next 15.5.21, which
     needs React 19 - deferred; revisit when upgrading.
   - PostCSS advisories - build-time/dev tooling only; never exposed in the deployed
     bundle.
4. **SHA-256 is unsalted.** Adequate for a local convenience lock; not a replacement
   for real auth. Data never leaves the device except AI prompts to NVIDIA (documented
   in Privacy Policy).
5. **Password is a local lock, not authentication** - anyone with the browser profile
   can reset it. This is inherent to the privacy-first local design and documented in
   the Terms/Privacy pages.

## Verification commands

```bash
# guard behavior (after deploy):
curl -X POST https://orleia-workspace.vercel.app/api/chat -H 'Content-Type: application/json' \
  -d '{"model":"meta/llama-3.1-8b-instruct","messages":[{"role":"user","content":"hi"}]}'   # -> 403
curl -X POST ... -H 'Origin: https://orleia-workspace.vercel.app' ...                          # -> 200
# headers:
curl -sI https://orleia-workspace.vercel.app/assistant | grep -iE 'content-security|permissions'
```
