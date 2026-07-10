# AGENTS.md

## Cursor Cloud specific instructions

### Project overview

WIWOKDETOK is a single Next.js 16 app (not a monorepo) — an Indonesian civic accountability platform tracking political promises against environmental realities. See `docs/PRD.md` for full product details.

### Running the dev server

```bash
npm run dev          # starts Next.js on http://localhost:3000
```

The app requires these env vars (set them in `.env.local` or as process env):
- `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` — **required** for data/auth
- `GOOGLE_GEMINI_API_KEY` — optional, AI features degrade gracefully without it
- `RESEND_API_KEY` — optional, email notifications only
- `WAHA_BASE_URL` / `WAHA_API_KEY` / `NOTIFY_DEVELOPER_CHAT_ID` — optional, used for developer WhatsApp notifications via WAHA

### Testing (E2E)

**Where test code lives:**
- `e2e/tests/` — spec files (`*.spec.ts`, `*.negative.spec.ts`)
- `e2e/pages/` — Page Objects (POM)
- `e2e/fixtures/` — workflows, test data

**Rules file:** `.cursor/rules/testing.mdc` — defines testing style (POM, fixtures, naming, coverage). Read it before writing or modifying tests.

**How to run:**
```bash
npx playwright test                              # all tests
npx playwright test e2e/tests/auth.spec.ts       # one file
npx playwright test -g "Should navigate"          # one test (by name)
npx playwright test --project=chromium            # chromium only (default)
```

**Caveats:**
- Browsers must be installed first: `npx playwright install chromium --with-deps`
- Config auto-starts dev server; tests target `localhost:3000`
- Known flaky test: `Should navigate to Promise Tracker via the navbar` — times out consistently; not an environment issue

### Linting

```bash
npm run lint   # runs eslint (flat config in eslint.config.mjs)
```

### Caveats

- No `.env.example` exists in the repo. You must create `.env.local` from the secrets above.
- The `NEXT_PUBLIC_*` vars must be available when the dev server starts — they are inlined into the client bundle at compile time.
- No Docker or local database needed — the app uses Supabase cloud for all persistence.
