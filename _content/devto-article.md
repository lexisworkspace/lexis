---
title: "Why I Built Orleia — A Free, Local-First AI Productivity Suite"
published: false
description: "I built Orleia because I was tired of productivity apps that demand your data. It combines habits, notes, journal, tasks, documents, and an AI assistant — all running locally in your browser."
tags: productivity, javascript, react, opensource
canonical_url: https://lexisapp.xyz/local-first-productivity
---

# Why I Built Orleia — A Free, Local-First AI Productivity Suite

I've tried every productivity app out there. Notion, Obsidian, Todoist, Habitica, Day One — you name it. Every single one either wants my credit card, my email, or my data. Some want all three.

So I built **[Orleia](https://lexisapp.xyz)** — a free, local-first productivity suite that combines habits, notes, journal, tasks, documents, and an AI assistant into one app. No sign-up. No subscription. All data stays on your device.

## What is Orleia?

Orleia is a web app (also available as a desktop Electron app) that bundles six productivity tools into one:

- **Habits** — Track daily habits with streaks, analytics, and a calendar view
- **Notes** — Rich text notes with full markdown support
- **Journal** — Daily journaling with mood tracking
- **Tasks** — Task management with priorities, due dates, and kanban-style organization
- **Documents** — Create and manage longer-form documents
- **Noor** — An AI assistant powered by three models (Ethos 4.7, Logos 4.5, Verse 4) that can chat, generate images, and help with your productivity data

Everything runs in the browser. Your data is stored locally in IndexedDB. Nothing is sent to any server — not even us.

## Why Local-First?

The local-first movement is about giving users ownership of their data. When your notes live in Notion's servers, you're at the mercy of their pricing, their uptime, and their privacy policies.

With Orleia:

- **Your data never leaves your device** — it's stored in your browser's IndexedDB
- **No account needed** — just open the app and start using it
- **Works offline** — full functionality without an internet connection (except the AI assistant, which needs to reach NVIDIA's API)
- **GDPR compliant by design** — we literally can't see your data because it never reaches our servers

## The AI Assistant (Noor)

I wanted an AI that feels like it's *yours*, not a corporate chatbot. Noor is Orleia's built-in AI assistant with three models:

- **Ethos 4.7** — the creative, conversational model
- **Logos 4.5** — the analytical, precise model  
- **Verse 4** — the fast, efficient model

Noor can chat with you about your tasks, habits, and notes. It can generate images. It runs voice dictation through your browser's built-in speech recognition — no cloud transcription needed.

The AI requests do go through NVIDIA's API (since you can't run a 7B model in a browser), but the system prompt is minimal and no conversation history is stored server-side.

## Tech Stack

For the nerds:

- **Next.js 15** with App Router
- **TypeScript** throughout
- **Tailwind CSS** for styling
- **Framer Motion** for animations
- **Electron** for the desktop app
- **IndexedDB** for local storage
- **NVIDIA API** for the AI models
- **Vercel** for hosting
- **Thinking Orbs** for the AI thinking animation (it looks really cool)

The entire app is about 1,500 components across 50+ files. The AI pipeline handles streaming responses, image generation, and voice dictation.

## How I Handle Privacy

Since the app runs entirely in the browser, there's a few things I had to figure out:

1. **Data persistence** — All data is stored in IndexedDB with a custom storage layer. The app includes export/import so users can back up their data.

2. **PWA support** — Orleia works as a Progressive Web App. You can install it on your phone and it feels native.

3. **Service worker** — Handles offline caching so the app shell loads instantly.

4. **No analytics on user data** — We use Vercel Analytics for anonymous page views (visitors, bounce rate) but never track what users do inside the app.

## What's Next

- **Flux** — A tech accessories and lifestyle brand under the Orleia umbrella
- **More AI models** — Exploring on-device models as they get smaller
- **Collaboration** — Local-first doesn't mean solo-first. Working on real-time collaboration using CRDTs
- **Mobile apps** — Native iOS and Android apps wrapping the PWA

## Try It

**[lexisapp.xyz](https://lexisapp.xyz)** — no sign-up, no credit card, just open and use.

If you're a developer, I'd love feedback on the codebase. If you're a productivity nerd, I'd love to know what features you'd want next.

---

*Orleia is free and open. Built with care for people who believe their data belongs to them.*
