# E2E Acceptance Criteria Coverage

Maps feature acceptance criteria to E2E tests. Tests that require **mock data or stubs** are marked and documented below.

## Promise Tracker

| AC | Criterion | Test | Mock Required? |
|----|-----------|------|-----------------|
| AC-01 | Feed loads; cards show quote, source, date, Walk-o-Meter | promise-tracker.spec.ts | No |
| AC-02 | Search and filter work | promise-tracker.spec.ts | No |
| AC-03 | AI Summary (What, When, Budget) | promise-tracker.spec.ts | No |
| AC-04 | Region, Year, Status filters | promise-tracker.spec.ts | No |
| AC-05 | Like requires auth | promise-tracker.spec.ts | No |
| AC-06 | Follow requires auth | promise-tracker.spec.ts | No |
| AC-07 | Flag with confirmation; requires auth | profile-watchdog.negative.spec.ts | No |
| AC-08 | Share copies link or uses Web Share API | promise-tracker.mock.spec.ts | **Yes** — `navigator.share` / `clipboard` stubbed |
| AC-09 | Submit New Promise; requires auth | promise-tracker.spec.ts | No |
| AC-10 | Watchdog Commentary | promise-tracker.spec.ts | No |
| AC-11 | Source 404 badge | promise-tracker.spec.ts | No |
| AC-12 | Verify Evidence modal | promise-tracker.mock.spec.ts | **Yes** — modal opens; photo/GPS not exercised |
| AC-13 | Empty state; Clear Filters | promise-tracker.negative.spec.ts | No |
| AC-14 | Load More pagination | promise-tracker.spec.ts | No |
| AC-15 | Pending submissions shown | promise-tracker.mock.spec.ts | **Yes** — API returns mock pending promises |

## Profile / Watchdog

| AC | Criterion | Test | Mock Required? |
|----|-----------|------|-----------------|
| AC-P01 | Not logged in state | profile-watchdog.negative.spec.ts | No |
| AC-P02 | Baseline 0 XP, Warga Baru | profile-watchdog.spec.ts | No |
| AC-P03 | XP increases after actions | profile-watchdog.spec.ts | No |
| AC-P04 | Level transition at 100 XP | profile-watchdog.spec.ts | No |
| AC-P05 | Progress bar | profile-watchdog.spec.ts | No |
| AC-P06 | XP persists after reload | profile-watchdog.spec.ts | No |
| AC-P07 | Engagement History | profile-watchdog.spec.ts | No |
| AC-P08 | Empty engagement state | profile-watchdog.spec.ts | No |
| AC-P09 | Verified Citizen badge (3+ reports) | profile-watchdog.mock.spec.ts | **Yes** — API returns mock activity with 3+ reports |
| AC-P10 | Preference Center | (deferred) | — |
| AC-P11 | Account Controls | (deferred) | — |
| AC-P12 | Sign Out redirects | profile-watchdog.spec.ts | No |
| AC-P13 | Go to Login redirects | profile-watchdog.negative.spec.ts | No |

## Auth

| AC | Criterion | Test | Mock Required? |
|----|-----------|------|-----------------|
| AC-A01–A13 | Login, register, validation, links | auth.spec.ts, auth.negative.spec.ts | No |

---

## Mock-Required Tests

These tests **only run correctly with mocked data or stubbed APIs**. Run with:

```bash
npx playwright test e2e/tests/*.mock.spec.ts
```

### AC-08: Share

- **Why mock:** `navigator.share` and `navigator.clipboard` are browser APIs that require user gesture or specific context; E2E cannot reliably trigger real share dialogs.
- **What we mock:** `navigator.share` and `navigator.clipboard.writeText` via `page.addInitScript`.
- **What we assert:** Share button click triggers the stubbed function; "Link Copied" or share success path is exercised.

### AC-12: Verify Evidence Modal

- **Why mock:** Full verification flow requires photo upload, GPS, and backend; we only validate modal opens.
- **What we mock:** None for modal-open test; photo/GPS flows are not exercised.
- **What we assert:** Clicking "Verify" opens the Verification modal; form fields are present.

### AC-15: Pending Submissions

- **Why mock:** Pending promises come from `getPendingPromises()`; test DB rarely has pending items.
- **What we mock:** Intercept `/api/` or server action to return mock pending promises.
- **What we assert:** "Under review" banner and pending card are visible when mock data is returned.

### AC-P09: Verified Citizen Badge

- **Why mock:** Badge requires 3+ reports; creating real reports in E2E is slow and brittle.
- **What we mock:** Intercept profile/activity API to return mock `reports >= 3`, or seed DB with 3+ `walk_o_meter_reports`.
- **What we assert:** Verified Citizen icon/badge is visible when mock data indicates verified status.
- **Current state:** Test is skipped in `profile-watchdog.mock.spec.ts`; implement route interception or use seeded test DB to enable.
