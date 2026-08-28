# Lexis Security Runbook

Operational playbook for the worst-case scenarios. Keep this current.
Version: 1.9.2 - Last reviewed: August 21, 2026

> This document is the operational companion to TRADEMARK-POSTURE.md (brand risk).
> This one covers security incidents. If something bad happens, start here.

---

## 1. Map of where things live

| Asset | Where it lives |
|---|---|
| App code | `E:\lexis` (local). No git remote - **your machine is the only source of truth** |
| Deployed app | Vercel project (aliases: `app.lexisapp.xyz`, `lexisapp.xyz`) |
| Secrets | 1. Vercel dashboard > Project > Settings > Environment Variables (`NVIDIA_API_KEY`, Production + Development) 2. Local `E:\lexis\.env.local` |
| Server logs | Vercel dashboard > Project > Logs (Runtime Logs, ~1h retention) |
| User data | **Only in each user's browser** (localStorage / IndexedDB). Lexis has no database, no accounts, no server storage |
| Email | `lexis.workspace@gmail.com` (contact surfaces use Gmail compose links) |

## 2. API key exposed? (10-minute fix)

If the NVIDIA key appeared in a chat, a screenshot, a log, anywhere public - treat it as compromised and rotate:

1. **NVIDIA dashboard** (build.nvidia.com) > API keys > **Regenerate** the key. The old key dies immediately.
2. **Vercel**: Project > Settings > Environment Variables > update `NVIDIA_API_KEY` (Production **and** Development) > redeploy (or use `npx vercel --prod`).
3. **Local**: update `E:\lexis\.env.local` to the same new value.
4. Done - no code changes needed. The key is only read server-side per-request.

> Golden rule: the key lives in exactly two places - Vercel env store and local `.env.local`. Never paste it into a chat, an issue, or a shared machine. Never add a `NEXT_PUBLIC_` prefix to it (that ships secrets to the browser).

## 3. Service compromised or attacked? (take it offline)

Priority order - do the first one that fits:

1. **Rollback** (fastest, usually best): Vercel dashboard > Deployments > find the last known-good deployment > **three-dot menu > Promote to Production**. Site is back in under a minute.
2. **Redeploy a fixed version**: if a code fix is ready, `npx vercel --prod --yes` from `E:\lexis`.
3. **Disable a single endpoint**: if only one route is being abused (e.g. `/api/chat`), the origin guard (`src/lib/apiGuard.ts`) already 403s non-browser requests and rate-limits per IP - check its limits first; raise or tighten them there.
4. **Kill the whole app** (nuclear): Vercel dashboard > Project > Settings > **pause the project**, or remove the domain aliases. The app becomes unreachable instantly.
5. **Vercel account itself compromised**: change the account password, enable 2FA, revoke all sessions, check Deployments for unauthorized pushes, then review env vars (rotate anything that looks touched).

## 4. Logs and data - where to look

- **Runtime errors / abuse attempts**: Vercel > Logs. The API routes log errors server-side (`console.error`) - e.g. transcribe/TTS failures. These are server-side only and never shown to users.
- **Did a user's data get compromised?** Lexis stores nothing server-side, so there is no central breach to contain. The realistic cases:
  - *Their own device is compromised*: their browser storage is theirs to secure; recommend clearing site data.
  - *Our code shipped a bug that leaked*: fix it in `E:\lexis`, redeploy, and update this file's changelog below.

## 5. Incident response checklist (run this in order)

1. **Assess**: What happened? (key leak / account compromise / code bug / abuse). Use section 2-4 to locate the asset.
2. **Contain**: rotate the key, rollback/promote a good deployment, or pause the project.
3. **Notify**: update the privacy/legal pages only if the incident affects the (very limited) data flow. Because Lexis stores no user data, most incidents need no user notification.
4. **Document**: add an entry to the changelog below so future-you knows what happened and how it was fixed.
5. **Prevent recurrence**: if it was a key leak, re-read section 2's golden rule. If it was a code bug, fix + test + deploy.

## 6. Changelog

- **2026-08-10** - Created this runbook. Fixed password-lockout bug (v1.9.1): PBKDF2 hash was stored without `$` separators; store + tolerant verify now handle both old and new formats.
