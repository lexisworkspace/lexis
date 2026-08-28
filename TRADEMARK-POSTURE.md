# Lexis - Trademark Posture

**Last updated:** August 21, 2026 (v2.0.0)

This file is the living record of Lexis's trademark risk posture and the plan to execute if that risk ever becomes real. Read it before doing any branding, marketing, or SEO work.

---

## 1. The risk, honestly

- LexisNexis (RELX Group) owns the LEXIS mark in the US, EU (EUTM, covering Poland), and other jurisdictions, for legal-research software and legal information services.
- "Lexis" (our productivity app) is a different product in a different market (personal productivity: habits, notes, journal, tasks, AI assistant - **not** legal research).
- The legal merits are in our favor: likelihood of confusion requires consumers to believe our app comes from or is connected to LexisNexis, which is implausible across these categories. "Lexis" is also a weak/descriptive root (from *lex/lexicon*), which narrows the protection scope.
- **The real risk is not a lawsuit - it is a cease-and-desist letter**, and the cost of responding (even to a letter) when you are a solo non-profit developer. Being free or non-profit is **not** a legal defense.
- Operator is based in **Poland** - enforcement would come via EU law (EUTMR, Polish Industrial Property Law, Polish Unfair Competition Act). Actual litigation against a free app is unlikely; a C&D is the realistic worst case.

**Bottom line:** keep the name, take the cheap mitigations below seriously, and never bait the bear.

## 2. The "don't bait the bear" rules (non-negotiable)

These are the actions most likely to attract LexisNexis's brand-watch. Do not do them:

1. **No SEO campaigns for the bare word "lexis".** We may rank for it organically, but never *target* "lexis" as a keyword, buy ads on it, or write pages titled just "Lexis". Use compound phrases: "Lexis - local-first productivity app", "Lexis - habits and notes app".
2. **No legal-research-adjacent features or copy.** No "legal", "case law", "court", "attorney" features, no claims of competing with legal databases, no legal-advice positioning.
3. **No "Lexis+ <product>" naming.** LexisNexis markets "Lexis+ AI"; never name any Lexis feature "Lexis+ ...".
4. **No registered-mark claims.** Never print "®" next to Lexis (we have no registration) and never claim in copy that "Lexis" is a registered trademark.
5. **Keep the affiliation disclaimers in place** (landing footer, SEO pages footer, Terms §6, Settings → Legal). Do not remove them.

## 3. If a cease-and-desist ever lands

1. **Do not ignore it.** Reply within the deadline (even a holding reply) so it does not escalate to default.
2. **Do not argue with them.** One polite reply: we are an independent non-profit, not affiliated, and happy to discuss. Ask for their specific concerns.
3. **Assess the demand.** Most C&Ds ask to (a) stop using the mark and/or (b) transfer the domain. If it is a form letter, a polite reply often ends it. If they insist, **plan for the rebrand below rather than fighting** - for a free app, rebranding costs far less than a lawyer.
4. **Get a Polish IP attorney** (*radca prawny* specialising in IP) for a 30-minute consult (~PLN 300-600) before any litigation response.

## 4. Rebrand playbook (execute in ~1 day, only if needed)

Pick a candidate name first (uniqueness check: Google, EUIPO tmview, USPTO TESS, domain availability, no legal-tech meaning). Then change:

| Where | What to change |
|---|---|
| Domains | `lexisapp.xyz`, `app.lexisapp.xyz` → new domain; set up Vercel redirects from old to new (301) |
| App strings | `src/app/landing/page.tsx`, `src/components/seo-shell.tsx`, sidebar/logo (`NoorMark`-related), settings About text, `src/lib/i18n.ts` (all 12 languages) |
| Legal pages | Terms §1, §6; Privacy; EULA; Disclaimer - swap the name, keep the disclaimers |
| SEO | `public/sitemap.xml`, meta titles/descriptions, Google Search Console property (add new domain, remove old) |
| Brand assets | Buy Me a Coffee page, social accounts, any screenshots/OG images |
| Docs | `README.md`, this file |
| Old domain | Keep it alive for at least 6 months with a 301 to the new domain |

**After any branding change:** bump the version (Default bump), typecheck, build, deploy, verify both domains.

## 5. When to get professional advice

- Before **monetizing** (donations are fine; paid tiers change the risk calculus).
- Before **any feature that touches legal/regulatory content**.
- Before **filing our own trademark** (EUIPO or UPRP) - likely to collide with earlier LEXIS marks in software classes; get an opinion first.
- The day a C&D arrives (see section 3).

---

*This is a pragmatic risk-management note, not legal advice. When the stakes rise, spend the PLN on a real IP lawyer.*
