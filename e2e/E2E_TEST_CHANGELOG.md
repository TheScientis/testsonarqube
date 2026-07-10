# E2E Test Improvements — Changelog

Summary of new and changed tests, and what each validates.

**Acceptance criteria docs:** `docs/features/feat-promise-tracker.md`, `feat-profile-watchdog.md`, `feat-auth.md`

---

## Auth

### New Tests

| Test | File | Validates |
|------|------|-----------|
| Should successfully register a new user and redirect away from register | auth.spec.ts | Full registration flow; redirect on success; no error shown |
| Should successfully login with email after registering | auth.spec.ts | Register → Sign out → Login flow; redirect on success |
| Should redirect to ?redirect= path after successful login | auth.spec.ts | `?redirect=/promise-tracker` is honored after login |
| Should navigate from login to register via link | auth.spec.ts | "Daftar sekarang" link navigates to /register |
| Should navigate from register to login via link | auth.spec.ts | "Sign in" link navigates to /login |
| Should display error when login with invalid credentials | auth.negative.spec.ts | Error message shown; stays on /login |
| Should display error when login with wrong password for valid email | auth.negative.spec.ts | Wrong password shows error; stays on /login |
| Should display error when registering with duplicate email | auth.negative.spec.ts | Duplicate email shows error; stays on /register |
| Should display error when register with short password | auth.negative.spec.ts | Password &lt; 6 chars triggers validation or error |
| Should have required attribute on email and password fields (AC-A10) | auth.negative.spec.ts | HTML5 required validation on login form |
| Should toggle password visibility on login page (AC-A12) | auth.spec.ts | Show/hide password toggle works |
| Should display Lupa Password link on login page (AC-A13) | auth.spec.ts | Link visible and contains "Lupa Password" |

### Changed Tests

| Test | Change | Validates |
|------|--------|-----------|
| Google login button redirects to Supabase OAuth provider | Uses auth fixture; wrapped in test.step | Same behavior; uses POM and steps |

### New Fixture

- **auth.fixture.ts**: `authPage` (AuthPage POM), `freshUser` (generated credentials)

---

## Promise Tracker

### New Tests

| Test | File | Validates |
|------|------|-----------|
| Should display Region, Year, and Status filter dropdowns (AC-04) | promise-tracker.spec.ts | Filter dropdowns visible; Status has Active, 404, Paywalled |
| Should filter promises when selecting Status 'Source unavailable' (AC-04) | promise-tracker.spec.ts | Status filter updates feed |
| Should show auth guard when clicking Submit New Promise while logged out (AC-09) | promise-tracker.spec.ts | Auth modal on Submit New Promise when unauthenticated |
| Should show Load More or end-of-feed message when feed has cards (AC-14) | promise-tracker.spec.ts | Pagination UI (Load More or "You've seen all") |
| Should handle search with special characters without breaking | promise-tracker.negative.spec.ts | Search with `"quotes" & <html> [brackets]` causes no JS errors; clear restores feed |

### Changed Tests

| Test | Change | Validates |
|------|--------|-----------|
| Should filter promises when selecting 'Fulfillment' tab | Asserts first visible card has Fulfillment badge | Filtered results match selected category |
| Should toggle the Like button state on click | Replaced with auth guard test | Auth guard modal appears when unauthenticated user clicks Like |
| Should show auth guard when clicking Follow button while logged out | Stronger assertions | Modal visible; "Sign in required" or "sign in to" text; Follow button stays "Follow" |

### Removed Tests

| Test | Reason |
|------|--------|
| Should not toggle Follow state for unauthenticated users | Redundant with "Should show auth guard when clicking Follow" |

### POM / Fixture Changes

- **PromiseTrackerPage.waitForFeedLoaded()**: Uses `Promise.race` of skeleton hidden and content (cards or empty) ready; handles empty state and fast loads.
- **Clear Filters test**: Waits for first card to be visible before asserting count.

---

## Profile / Watchdog

### New Tests

| Test | File | Validates |
|------|------|-----------|
| Should redirect to login when clicking Sign Out (AC-P12) | profile-watchdog.spec.ts | Sign Out button redirects to /login |

### New Assertions

| Test | Change | Validates |
|------|--------|-----------|
| Should show baseline Watchdog Level for a fresh user | Step 6: empty engagement history | Fresh user sees empty Engagement History message |

### Changed Tests

| Test | Change | Validates |
|------|--------|-----------|
| Should prompt auth when unauthenticated user tries to like/comment/flag | Single assertion; `.first()` for strict mode | Auth guard modal visible; sign-in prompt text; no redirect-or-modal branching |

### App Change

- **profile/page.tsx**: `data-testid="profile-sign-out"` on Sign Out button for E2E.

---

## Mock-Required Tests (promise-tracker.mock.spec.ts, profile-watchdog.mock.spec.ts)

| Test | AC | Mock/Stub | Notes |
|------|-----|-----------|-------|
| Share triggers share or clipboard | AC-08 | navigator.share, clipboard.writeText | Stubbed via addInitScript |
| Verify Evidence modal opens | AC-12 | None | Uses profile fixture (authenticated) |
| Pending banner after submit | AC-15 | None | Real submit; may require backend |
| Verified Citizen badge | AC-P09 | Skipped | Requires 3+ reports or mock API |

See `docs/testing/e2e-ac-coverage.md` for full documentation.

---

## Assertion Fixes (No New Tests)

- Auth guard tests: Use `.first()` on multi-match locators to satisfy Playwright strict mode.
- Follow auth guard: Assert modal + sign-in text + Follow button unchanged.
- Category filter: Assert badge matches selected category.
- Clear Filters: Wait for cards before asserting count.

---

## Test Count Summary

| Area | Before | After |
|------|--------|-------|
| Auth | 1 | 10 |
| Auth negative | 0 | 4 |
| Promise Tracker | 18 | 18 (2 renamed, 1 removed, 1 added) |
| Promise Tracker negative | 6 | 7 |
| Profile positive | 9 | 9 (1 assertion added) |
| Profile negative | 5 | 5 (assertions tightened) |
