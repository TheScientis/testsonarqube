# Supabase

[Home](../README.md) > [Frameworks](./README.md) > Supabase

## Overview

Supabase provides database and authentication. No local DB; all persistence is cloud.

## Configuration

- **URL:** `NEXT_PUBLIC_SUPABASE_URL`
- **Anon key:** `NEXT_PUBLIC_SUPABASE_ANON_KEY`

Both required. `getSupabase()` throws if missing.

## Client Usage

- **Server:** `@/lib/supabase` — `supabase` proxy via `getSupabase()`
- **Client:** `@/lib/supabase/client` — `createClient()` for browser
- **Server (SSR):** `@/lib/supabase/server` — for server components

## Auth

- Supabase Auth (Google OAuth + Email/Password)
- `getCurrentUser()` in `@/lib/auth.ts`
- `AuthGuardContext` subscribes to `onAuthStateChange`
- Callback: `app/auth/callback/route.ts`

## Tables (Referenced in Code)

- `promises`, `promise_comments`
- `chat_sessions`, `chat_messages`
- `regulations` — RAG corpus
- `walk_o_meter_reports`
- `profiles`, `regions`

## RLS

Row Level Security is used. Policies control access per table.

---

**Related:** [Database ERD](../db-erd.md) · [Data Types](../data-model/data-types.md)

---

**Last Updated:** 2025-03-16
