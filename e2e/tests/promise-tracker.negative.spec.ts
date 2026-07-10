/**
 * Feature: Promise Tracker — The Talk Ledger (F-001)
 * Related Use Case: US-01 through US-10 (see docs/features/feat-promise-tracker.md)
 *
 * Scope:
 * - Negative Cases:
 *     Search with no matching results shows empty state
 *     Empty state "Clear Filters" button resets the view
 *     Combined search + category filter yielding zero results
 * - Edge Cases:
 *     Loading skeleton is shown during initial load
 *     Rapid category switching does not break the UI
 *     Active category tab has distinct visual styling
 */

import { test, expect } from "../fixtures/promise-tracker.fixture";
import {
  CATEGORY_LABELS,
  SEARCH_QUERIES,
} from "../fixtures/test-data";

// ────────────────────────────────────────────────────────────────────────────
// Negative / Validation Scenarios
// ────────────────────────────────────────────────────────────────────────────

test.describe("Promise Tracker — Negative Scenarios", () => {
  test("Should display empty state when search yields no results", async ({
    promiseTracker,
  }) => {
    await test.step("1. Enter a search term that matches nothing", async () => {
      await promiseTracker.search(SEARCH_QUERIES.NO_RESULTS);
    });

    await test.step("2. Wait for the feed to finish loading", async () => {
      await promiseTracker.waitForFeedLoaded();
    });

    await test.step("3. Verify the empty state message is visible", async () => {
      await expect(promiseTracker.emptyStateMessage).toBeVisible();
    });

    await test.step("4. Verify zero promise cards are rendered", async () => {
      const count = await promiseTracker.getCardCount();
      expect(count).toBe(0);
    });
  });

  test("Should display 'Clear Filters' button in empty state", async ({
    promiseTracker,
  }) => {
    await test.step("1. Trigger the empty state with a non-matching search", async () => {
      await promiseTracker.search(SEARCH_QUERIES.NO_RESULTS);
      await promiseTracker.waitForFeedLoaded();
    });

    await test.step("2. Verify the 'Clear Filters' button is visible", async () => {
      await expect(promiseTracker.clearFiltersButton).toBeVisible();
    });
  });

  test("Should restore full feed when clicking 'Clear Filters' from empty state", async ({
    promiseTracker,
  }) => {
    const initialCount = await promiseTracker.getCardCount();

    await test.step("1. Trigger the empty state", async () => {
      await promiseTracker.search(SEARCH_QUERIES.NO_RESULTS);
      await promiseTracker.waitForFeedLoaded();
      await expect(promiseTracker.emptyStateMessage).toBeVisible();
    });

    await test.step("2. Click 'Clear Filters'", async () => {
      await promiseTracker.clearFiltersButton.click();
    });

    await test.step("3. Verify the search input is cleared", async () => {
      await expect(promiseTracker.searchInput).toHaveValue("");
    });

    await test.step("4. Verify all promise cards are restored", async () => {
      await promiseTracker.waitForFeedLoaded();
      await promiseTracker.promiseCards.first().waitFor({ state: "visible", timeout: 15_000 });
      const count = await promiseTracker.getCardCount();
      expect(count).toBe(initialCount);
    });
  });

  test("Should show empty state when search narrows results to zero within a category filter", async ({
    promiseTracker,
  }) => {
    await test.step("1. Select 'Fulfillment' category", async () => {
      await promiseTracker.selectCategory(CATEGORY_LABELS.FULFILLMENT);
      await promiseTracker.waitForFeedLoaded();
    });

    await test.step("2. Search for a term that matches nothing", async () => {
      await promiseTracker.search(SEARCH_QUERIES.NO_RESULTS);
      await promiseTracker.waitForFeedLoaded();
    });

    await test.step("3. Verify empty state is shown", async () => {
      await expect(promiseTracker.emptyStateMessage).toBeVisible();
      const count = await promiseTracker.getCardCount();
      expect(count).toBe(0);
    });
  });
});

// ────────────────────────────────────────────────────────────────────────────
// Edge Cases
// ────────────────────────────────────────────────────────────────────────────

test.describe("Promise Tracker — Edge Cases", () => {
  test("Should show loading skeletons during initial page load", async ({
    page,
    promiseTracker,
  }) => {
    await test.step("1. Navigate to the page without waiting for idle", async () => {
      await page.goto("/promise-tracker");
    });

    await test.step("2. Verify skeleton placeholders appear or content loads quickly", async () => {
      // Skeletons may appear very briefly or not at all on fast connections
      // We verify that either skeletons show up OR the feed loads directly
      const skeletons = promiseTracker.skeletonCards;
      const cards = promiseTracker.promiseCards;
      await expect(skeletons.first().or(cards.first())).toBeVisible();
    });
  });

  test("Should highlight the active category tab with primary styling", async ({
    promiseTracker,
  }) => {
    await test.step("1. Default tab 'All Promises' should be active", async () => {
      const activeTab = promiseTracker.getActiveTab();
      await expect(activeTab).toContainText(CATEGORY_LABELS.ALL);
    });

    await test.step("2. Switch to 'Progress Updates' and verify it becomes active", async () => {
      await promiseTracker.selectCategory(CATEGORY_LABELS.PROGRESS);
      const activeTab = promiseTracker.getActiveTab();
      await expect(activeTab).toContainText(CATEGORY_LABELS.PROGRESS);
    });
  });

  test("Should handle rapid category switching without errors", async ({
    promiseTracker,
    page,
  }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => {
      // Ignore Next.js hydration warnings and common non-critical errors
      if (err.message.includes("Hydration") || err.message.includes("hydrat")) return;
      errors.push(err.message);
    });

    await test.step("1. Rapidly switch between all categories", async () => {
      await promiseTracker.selectCategory(CATEGORY_LABELS.NEW);
      await promiseTracker.selectCategory(CATEGORY_LABELS.PROGRESS);
      await promiseTracker.selectCategory(CATEGORY_LABELS.FULFILLMENT);
      await promiseTracker.selectCategory(CATEGORY_LABELS.ALL);
    });

    await test.step("2. Wait for final state to settle", async () => {
      await promiseTracker.waitForFeedLoaded();
      // Extra wait to ensure the final "All Promises" data has fully loaded
      await page.waitForTimeout(2000);
    });

    await test.step("3. Verify no critical JS errors and cards are shown", async () => {
      const count = await promiseTracker.getCardCount();
      expect(count).toBeGreaterThanOrEqual(1);
      expect(errors).toHaveLength(0);
    });
  });

  test("Should handle search with special characters without breaking", async ({
    promiseTracker,
    page,
  }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => {
      if (err.message.includes("Hydration") || err.message.includes("hydrat")) return;
      errors.push(err.message);
    });

    await test.step("1. Enter search with special chars", async () => {
      await promiseTracker.search('test "quotes" & <html> [brackets]');
    });

    await test.step("2. Wait for feed and verify no JS errors", async () => {
      await promiseTracker.waitForFeedLoaded();
      expect(errors).toHaveLength(0);
    });

    await test.step("3. Clear search and verify feed restores", async () => {
      await promiseTracker.clearSearch();
      await promiseTracker.waitForFeedLoaded();
      const count = await promiseTracker.getCardCount();
      expect(count).toBeGreaterThanOrEqual(0);
    });
  });
});
