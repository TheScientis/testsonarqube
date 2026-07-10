# Architecture Overview

[Home](../README.md) > [Architecture](./README.md) > Overview

## Overview

WIWOKDETOK is a single Next.js 16 application using the App Router. No separate backend; server actions and API routes handle data and auth via Supabase.

## Directory Structure

```
src/
├── app/                    # App Router pages and routes
│   ├── page.tsx            # Dashboard (Command Center)
│   ├── layout.tsx          # Root layout, providers
│   ├── promise-tracker/    # The Talk Ledger (F-001)
│   ├── chat/               # Bang Jaga AI (F-002)
│   ├── map/                # Walk-o-Meter map (F-003)
│   ├── feed/               # Walk-o-Meter feed
│   ├── profile/            # User profile
│   ├── login/, register/   # Auth pages
│   ├── actions/            # Server actions
│   └── api/                # API routes (cron, push, notify)
├── components/             # Shared UI components
├── context/                # React contexts (Auth, Modal, DataSaver, I18n)
├── hooks/                  # Custom hooks (usePush)
└── lib/                    # Utilities, Supabase, types, Gemini
```

## Routing

| Path | Screen |
|------|--------|
| `/` | Command Center |
| `/promise-tracker` | The Talk Ledger |
| `/chat` | Bang Jaga — session list |
| `/chat/[sessionId]` | Bang Jaga — single session |
| `/map` | Walk-o-Meter map |
| `/feed` | Walk-o-Meter feed |
| `/profile` | Profile & Settings |
| `/login`, `/register` | Auth |
| `/admin/regulations` | Admin — regulations (RAG) |

## State Management

- **AuthGuardContext** — `isAuthenticated`, `user`, `requireAuth()` (shows modal if unauthenticated)
- **ModalContext** — open/close modals
- **DataSaverContext** — data saver mode toggle
- **I18nContext** — translations, locale

## Data Flow

- Server actions (`app/actions/*`) call Supabase directly
- Client fetches via `useEffect` + server actions
- Auth: Supabase Auth; `onAuthStateChange` keeps AuthGuardContext in sync

## Related

- [PRD](../PRD.md)
- [Features](../features/README.md)
- [Database ERD](../db-erd.md)

---

**Last Updated:** 2025-03-16
