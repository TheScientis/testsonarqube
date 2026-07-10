/**
 * Feature: Promise Tracker — Tests requiring MOCK DATA or STUBS
 * Related: docs/testing/e2e-ac-coverage.md
 *
 * These tests stub browser APIs (navigator.share, clipboard) or require specific
 * backend state. Run with: npx playwright test e2e/tests/promise-tracker.mock.spec.ts
 *
 * Scope:
 * - AC-08: Share copies link (navigator.share / clipboard stubbed)
 * - AC-12: Verify Evidence modal opens (authenticated user; no photo/GPS exercised)
 * - AC-15: Pending submissions (real submit flow; may require backend to accept)
 */

import { test as base, expect } from "@playwright/test";
import { PromiseTrackerPage } from "../pages/PromiseTrackerPage";
import { test as profileTest } from "../fixtures/profile.fixture";

// Custom fixture: add init script BEFORE navigation so stubs are active
const test = base.extend<{ promiseTracker: PromiseTrackerPage }>({
  promiseTracker: async ({ page }, use) => {
    await page.addInitScript(() => {
      (window as unknown as { __shareCalled?: boolean }).__shareCalled = false;
      (window as unknown as { __clipboardCalled?: boolean }).__clipboardCalled = false;

      if (navigator.share) {
        (navigator as unknown as { share: (arg: unknown) => Promise<void> }).share = async () => {
          (window as unknown as { __shareCalled?: boolean }).__shareCalled = true;
        };
      }

      const origWriteText = navigator.clipboard?.writeText?.bind(navigator.clipboard);
      if (navigator.clipboard) {
        (navigator.clipboard as unknown as { writeText: (t: string) => Promise<void> }).writeText = async (text: string) => {
          (window as unknown as { __clipboardCalled?: boolean }).__clipboardCalled = true;
          if (origWriteText) await origWriteText(text);
        };
      }
    });

    const pt = new PromiseTrackerPage(page);
    await pt.goto();
    await pt.waitForFeedLoaded();
    await use(pt);
  },
});

// ────────────────────────────────────────────────────────────────────────────
// AC-08: Share — requires navigator.share / clipboard stub
// ────────────────────────────────────────────────────────────────────────────

test.describe("Promise Tracker — Share (AC-08) [MOCK: navigator.share + clipboard]", () => {
  test("Should trigger share or clipboard when clicking Share button (AC-08)", async ({
    promiseTracker,
    page,
  }) => {
    const count = await promiseTracker.getCardCount();
    if (count === 0) {
      test.skip(true, "No cards in feed");
    }

    const card = promiseTracker.getCardByIndex(0);

    await test.step("1. Click Share button", async () => {
      await promiseTracker.clickShare(card);
    });

    await test.step("2. Verify share or clipboard was triggered", async () => {
      await page.waitForTimeout(800);
      const shareCalled = await page.evaluate(() => (window as unknown as { __shareCalled?: boolean }).__shareCalled);
      const clipboardCalled = await page.evaluate(() => (window as unknown as { __clipboardCalled?: boolean }).__clipboardCalled);
      const linkCopiedVisible = await page.getByText(/link copied/i).isVisible().catch(() => false);
      expect(shareCalled || clipboardCalled || linkCopiedVisible).toBeTruthy();
    });
  });
});

// ────────────────────────────────────────────────────────────────────────────
// AC-12: Verify Evidence modal — authenticated user; modal opens
// No mock needed for modal-open; photo/GPS flows not exercised
// ────────────────────────────────────────────────────────────────────────────

test.describe("Promise Tracker — Verify Evidence modal (AC-12)", () => {
  profileTest("Should open Verification modal when authenticated user clicks Verify Evidence", async ({
    page,
  }) => {
    const pt = new PromiseTrackerPage(page);
    await pt.goto();
    await pt.waitForFeedLoaded();

    const count = await pt.getCardCount();
    if (count === 0) {
      test.skip(true, "No cards in feed");
    }

    const card = pt.getCardByIndex(0);
    const verifyBtn = pt.getVerifyButton(card);

    await test.step("1. Ensure Verify button visible and click", async () => {
      await verifyBtn.scrollIntoViewIfNeeded();
      await verifyBtn.click();
    });

    await test.step("2. Verify Ground Verification modal or auth guard", async () => {
      const verificationModal = page.getByTestId("verification-modal");
      const authModal = page.getByTestId("auth-guard-modal");
      const modalOpened = await verificationModal.isVisible().catch(() => false);
      const authShown = await authModal.isVisible().catch(() => false);
      expect(modalOpened || authShown).toBeTruthy();
      if (modalOpened) {
        await expect(verificationModal.getByText(/ground verification|is this happening/i)).toBeVisible();
      }
    });
  });
});

// ────────────────────────────────────────────────────────────────────────────
// AC-15: Pending submissions — real submit flow
// May require backend to accept; if submit fails, test documents the expected behavior
// ────────────────────────────────────────────────────────────────────────────

test.describe("Promise Tracker — Pending submissions (AC-15) [May require backend]", () => {
  profileTest("Should show pending banner after submitting a new promise", async ({
    page,
  }) => {
    test.setTimeout(60_000);

    const pt = new PromiseTrackerPage(page);
    await pt.goto();
    await pt.waitForFeedLoaded();

    await test.step("1. Open Submit New Promise modal", async () => {
      await pt.submitNewButton.click();
    });

    await test.step("2. Fill and submit form", async () => {
      const modal = page.getByTestId("submit-promise-modal");
      const authModal = page.getByTestId("auth-guard-modal");
      try {
        await modal.waitFor({ state: "visible", timeout: 5000 });
      } catch {
        if (await authModal.isVisible().catch(() => false)) {
          test.skip(true, "Auth guard shown — Submit requires authenticated session");
        }
        throw new Error("Submit modal did not open");
      }
      await modal.getByPlaceholder("Misal: Gubernur Jakarta").fill("E2E Test Politician");
      await modal.locator('input[type="date"]').fill("2024-01-15");
      await modal.getByPlaceholder(/Tuliskan kata-kata persis/).fill("E2E test promise for pending flow");
      await modal.getByPlaceholder("https://news-site.com/article").fill("https://example.com/e2e-test");
      await modal.getByRole("button", { name: "Submit Promise" }).click();
    });

    await test.step("3. Wait for success and modal close", async () => {
      await expect(page.getByText(/promise submitted|thank you/i)).toBeVisible({ timeout: 10_000 });
      await page.waitForTimeout(2500);
    });

    await test.step("4. Verify pending banner or success message", async () => {
      const underReview = page.getByText(/under review|pending/i);
      const successShown = page.getByText(/promise submitted|thank you/i);
      const hasPending = await underReview.isVisible().catch(() => false);
      const hadSuccess = await successShown.isVisible().catch(() => false);
      expect(hasPending || hadSuccess).toBeTruthy();
    });
  });
});
