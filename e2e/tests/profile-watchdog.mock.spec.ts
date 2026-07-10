/**
 * Feature: Profile / Watchdog — Tests requiring MOCK DATA
 * Related: docs/testing/e2e-ac-coverage.md
 *
 * AC-P09 (Verified Citizen badge) requires 3+ reports. Creating real reports in E2E
 * is slow and brittle. This test is skipped by default; run with mock API when available.
 *
 * Run: npx playwright test e2e/tests/profile-watchdog.mock.spec.ts
 */

import { test, expect } from "../fixtures/profile.fixture";

test.describe("Profile — Verified Citizen badge (AC-P09) [MOCK: requires 3+ reports or mock API]", () => {
  test.skip(
    "Should display Verified Citizen badge when user has 3+ reports — requires mock API or seeded data",
    async ({ profilePage, freshUser }) => {
      // To run this test, either:
      // 1. Seed the DB with 3+ walk_o_meter_reports for the user
      // 2. Intercept the profile/activity API to return mock { reports: 3 }
      await profilePage.goto();
      await expect(profilePage.watchdogLevelCard).toBeVisible();
      const verifiedBadge = profilePage.page.getByTitle(/verified citizen/i);
      await expect(verifiedBadge).toBeVisible();
    }
  );
});
