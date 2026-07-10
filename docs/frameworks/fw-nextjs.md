# Next.js Framework

[Home](../README.md) > [Frameworks](./README.md) > Next.js

## Overview

Next.js 16 with App Router. Single application; no monorepo.

## Run

```bash
npm run dev   # http://localhost:3000
```

## Configuration

- **Config:** `next.config.ts` — passes `NEXT_PUBLIC_SUPABASE_*` to env
- **Font:** Inter (via `next/font/google`) — weights 400, 500, 700, 900
- **Icons:** Material Symbols Outlined (Google Fonts)

## Environment Variables

`NEXT_PUBLIC_*` vars are inlined at build time. Set in `.env.local` before starting dev server.

## App Router

- **Layout:** `app/layout.tsx` — providers (I18n, DataSaver, AuthGuard, Modal), DataSaverBanner, SyncDrafts
- **Pages:** `app/**/page.tsx`
- **Server actions:** `app/actions/*.ts` — `"use server"`
- **API routes:** `app/api/**/route.ts`

## Styling

- Tailwind CSS
- Design tokens: `primary`, `danger`, `warning` (see DESIGN_DOCUMENT.md in main project root)

---

**Related:** [Architecture](../architecture/arch-overview.md) · [Supabase](./fw-supabase.md)

---

**Last Updated:** 2025-03-16
