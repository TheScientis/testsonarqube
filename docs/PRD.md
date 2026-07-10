# 📂 PRD: WIWOKDETOK (v1.1 - MVP)

**Codename:** *"No Omon-Omon"*
**Vision:** Turning political rhetoric into environmental accountability through AI and community action.

> **Changelog v1.1:** Gap analysis applied. Detailed specs moved to `docs/features/feat-*.md`. PRD now covers overview, architecture, and high-level requirements only.

---

## 1. Project Overview

### 1.1 Mission

To provide a "Single Source of Truth" where the *rakyat kecil* can compare what politicians *say* (The Talk) with what is actually *happening* on the ground (The Walk), while providing the legal tools to demand change.

### 1.2 Core Value Proposition

- **For the Citizen:** Easy-to-understand legal aid and a "BS-detector" for local promises.
- **For the Environment:** A public watchdog that never sleeps, highlighting inconsistencies between policy and practice.

### 1.3 Brand & Naming Conventions

| Name | Type | Definition |
|---|---|---|
| **WIWOKDETOK** | App / Product Name | The full product. Used in the navbar on all authenticated screens. |
| **The Talk Ledger** | Feature Name | The promise-tracking feed (Feature 4.1). |
| **Bang Jaga AI** | Feature + Persona Name | The AI legal assistant (Feature 4.2) and its shared AI persona across all app surfaces. |
| **Walk-o-Meter** | Feature Name | The map and evidence feed (Feature 4.3). Used as the sub-brand on the public-facing map page. |

---

## 2. Target Audience & Personas

| **Persona** | **Tech Profile** | **Primary Need** |
| --- | --- | --- |
| **Pak Budi (The Impacted)** | Android 10, Prepaid Data, Low Tech Literacy. | "How do I stop this factory from dumping waste near my house?" |
| **Siska (The Urban Watchdog)** | iPhone 17, 5G, High Tech Literacy. | "Which politician in my province is actually meeting their carbon goals?" |

---

## 3. Information Architecture & Data Model

### 3.1 Navigation Architecture

**Guest navigation:** `Logo → Command Center` · `The Talk Ledger` · `Bang Jaga AI` · `Walk-o-Meter Map` · `Walk-o-Meter Feed` · `Log In`

**Authenticated navigation:** `Logo → Command Center` · `The Talk Ledger` · `Bang Jaga AI` · `Walk-o-Meter Map` · `Walk-o-Meter Feed` · `Profile & Settings` · `[Data-Saver Toggle]` · `[User Avatar]`

**Route map:**

| Route | Screen |
|---|---|
| `/` | Command Center |
| `/promise-tracker` | The Talk Ledger |
| `/map` | Walk-o-Meter — Map view |
| `/feed` | Walk-o-Meter — Evidence Feed (List) view |
| `/chat` | Bang Jaga AI — new session `[AUTH]` |
| `/chat/:sessionId` | Bang Jaga AI — named session `[AUTH]` |
| `/profile` | Profile & Settings `[AUTH]` |

### 3.2 Authentication & Access Model

| Action | Guest | Authenticated |
|---|---|---|
| View Talk Ledger & Walk-o-Meter | ✅ Read-only | ✅ Full |
| Verify a report / Vote | ❌ → Login prompt | ✅ |
| Submit a report or complaint | ❌ → Login prompt | ✅ |
| Flag as BS / Comment / Follow | ❌ → Login prompt | ✅ |
| Bang Jaga AI chat | ❌ → Login prompt | ✅ |
| Submit a new promise | ❌ → Login prompt | ✅ |

> **Auth Guard:** A bottom-sheet modal appears for protected actions with a Sign Up CTA. After login, the user is deep-linked back to the attempted action.
> **Auth Provider:** Supabase Auth — Google OAuth + Email/Password.

### 3.3 Region Hierarchy

`Level 0 (Country) > Level 1 (Province) > Level 2 (Regency/City) > Level 3 (District) > Level 4 (Village)`

Implemented via a `regions` table with a `parent_id` for infinite drill-down. Scalable from one city to all of Southeast Asia.

### 3.4 Key Data Entities

- **The "Talk" (Promises):** Quotes, source URLs, crawl dates, AI summaries, Walk-o-Meter scores.
- **The "Walk" (Realizations):** Community votes and evidence reports linked to `promise_id`.
- **The "Gap" (Analytics):** The scored difference between Promise and Reality (see feature docs for formula).

---

## 4. Features

> ⚠️ All detailed specs, user stories, acceptance criteria, data models, and sequence diagrams are in the feature docs in `docs/`.

### 4.1 Feature 1: The Talk Ledger — Promise Tracker & Daily Webcrawl

📄 **Full spec:** [`docs/features/feat-promise-tracker.md`](docs/features/feat-promise-tracker.md)

| | |
|---|---|
| **Objective** | Continuously updated, publicly verifiable feed of environmental promises. |
| **Key Capabilities** | Daily web crawl (news + social media); AI summary (What/When/Budget via Gemini); Walk-o-Meter score per promise; user actions: Like, Comment, Share, Flag as BS, Follow, Submit New Promise. |
| **AI Role** | Gemini Flash: summarizes source docs into 3-bullet AI breakdown. Generates standalone Watchdog Commentary per promise card. |
| **Access** | Read: public. Write actions (Flag, Comment, Follow): authenticated only. |

### 4.2 Feature 2: Bang Jaga AI — Legal & Policy Assistant

📄 **Full spec:** [`docs/features/feat-bang-jaga.md`](docs/features/feat-bang-jaga.md)

| | |
|---|---|
| **Objective** | Educate citizens on environmental policies and guide them in drafting official complaints (Surat Pengaduan). |
| **Key Capabilities** | RAG-grounded legal chat; guided templates; image upload (up to 5); live-streaming document preview; PDF download; WhatsApp Quick-Copy; Share to Walk-o-Meter Map. |
| **AI Role** | Gemini Flash: chat, RAG retrieval, document generation (streaming), image understanding. |
| **Access** | Authenticated only. Sessions are persisted per user account. |

### 4.3 Feature 3: Walk-o-Meter — Map & Evidence Feed

📄 **Full spec:** [`docs/features/feat-walk-o-meter.md`](docs/features/feat-walk-o-meter.md)

| | |
|---|---|
| **Objective** | Surface real-world evidence on a map and feed, combining promise verifications and citizen complaints. |
| **Key Capabilities** | Interactive map + list view; two report types (Verification, Complaint); community trust tiers (Standard → Ground Truth); Walk-o-Meter score aggregation; Regional Leaderboard; Data-Saver mode. |
| **AI Role** | Gemini Flash: auto-tags evidence posts with controlled hashtag vocabulary. |
| **Access** | Read: public. Report submission and verification votes: authenticated only. |

### 4.4 Cross-Feature: User Profile & Gamification

📄 **Full spec:** [`docs/features/feat-profile.md`](docs/features/feat-profile.md)

| | |
|---|---|
| **XP / Watchdog Level** | Users earn XP for civic actions (reports, votes, comments). 7 levels from "Warga Baru" to "Penjaga Lingkungan" (Environmental Guardian). See `docs/features/feat-profile.md` and `src/lib/gamification.ts` for full list and E2E coverage. |
| **Verified Citizen Badge** | Granted after phone verification + 30-day account age + ≥3 accepted reports. Increases vote weight (1.2×). |
| **Notification Triggers** | Critical Action Gaps; New Policy Announcements; Weekly Digest. Per-promise follow notifications are deferred to the backlog. |
| **Preference Center** | Regions of Interest, notification toggles, account controls (email, password, linked accounts). |

---

## 5. Technical Stack

| Layer | Technology |
|---|---|
| **Frontend** | Next.js 16 (App Router, Server Actions) |
| **Styling** | Tailwind CSS v4 (Container Queries for older phones) |
| **Database** | Supabase (Auth, Storage, pgvector) |
| **AI** | Google Gemini Flash via `@google/generative-ai` (streaming via SSE) |
| **PDF** | Puppeteer via Vercel serverless function |
| **Map** | MapLibre GL JS + OpenStreetMap tiles |
| **Notifications** | Client-side polling + Email (via Resend). Web Push API deferred — see `backlog.md` |
| **Deployment** | Vercel (Edge Functions for regional latency) |

---

## 6. Non-Functional Requirements

| Concern | Requirement |
|---|---|
| **Performance** | Home feed FCP < 2s; evidence feed FCP < 1.5s; all on 4G. |
| **Offline / Low Connectivity** | Report drafts saved locally (IndexedDB) on failed submission. Data-Saver mode for prepaid users. |
| **Accessibility** | WCAG 2.1 AA minimum. All interactive elements keyboard-navigable. Min tap target 48×48dp. |
| **Security** | All uploads scanned for malware. Location data never exposed beyond city-level for public views. |
| **Moderation** | All UGC (comments, reports, promise submissions) subject to thresholds defined in feature docs. |
| **Localization** | Indonesian (ID) primary. English (EN) secondary, future phase. |

---

## 7. Visual Design Reference

### "The Walk" Banner (Hero Section)
![Hero Reference](https://files.catbox.moe/s4rt5o.png)