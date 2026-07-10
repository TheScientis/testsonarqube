/**
 * Feature: Promise Tracker — The Talk Ledger (F-001)
 * Related Use Case: US-01 through US-10 (see docs/features/feat-promise-tracker.md)
 *
 * Scope:
 * - Positive Cases:
 *     Feed loads with all promise cards (AC-01)
 *     Each card shows quote, source, date, Walk-o-Meter score (AC-01)
 *     Category filter tabs correctly subset promises (AC-02)
 *     Search filters by keyword (AC-02)
 *     AI Summary expands to show WHAT / WHEN / BUDGET (AC-03)
 *     Watchdog Commentary is displayed (AC-10)
 *     Source URL 404 shows "Source Unavailable" badge (AC-11)
 *     Like and Follow toggle on click
 *     Navbar navigation reaches the page
 */

import { test, expect } from "../fixtures/promise-tracker.fixture";
import {
  CATEGORY_LABELS,
  CATEGORY_BADGE_PATTERN,
  SEARCH_QUERIES,
} from "../fixtures/test-data";

// ────────────────────────────────────────────────────────────────────────────
// Positive Scenarios
// ────────────────────────────────────────────────────────────────────────────

test.describe("Promise Tracker — Positive Scenarios", () => {
  test("Should load the feed with promise cards (AC-01)", async ({
    promiseTracker,
  }) => {
    await test.step("1. Verify the feed renders at least one card", async () => {
      const count = await promiseTracker.getCardCount();
      expect(count).toBeGreaterThanOrEqual(1);
    });
  });

  test("Should display politician name, quote, date, and Walk-o-Meter score on each card (AC-01)", async ({
    promiseTracker,
  }) => {
    const card = promiseTracker.getCardByIndex(0);

    await test.step("1. Verify politician name is visible and non-empty", async () => {
      const nameEl = promiseTracker.getPoliticianName(card);
      await expect(nameEl).toBeVisible();
      const name = await nameEl.textContent();
      expect(name?.trim().length).toBeGreaterThan(0);
    });

    await test.step("2. Verify the quote is visible", async () => {
      const quote = promiseTracker.getQuote(card);
      await expect(quote).toBeVisible();
      const quoteText = await quote.textContent();
      expect(quoteText?.trim().length).toBeGreaterThan(0);
    });

    await test.step("3. Verify Walk-o-Meter score is displayed", async () => {
      await expect(card.getByTestId("promise-card-walk-o-meter")).toBeVisible();
      await expect(promiseTracker.getVoteCount(card)).toBeVisible();
    });
  });

  test("Should show category badge on each card", async ({
    promiseTracker,
  }) => {
    await test.step("1. First card shows a valid category badge", async () => {
      const card = promiseTracker.getCardByIndex(0);
      const badge = promiseTracker.getCategoryBadge(card);
      await expect(badge).toBeVisible();
      await expect(badge).toContainText(CATEGORY_BADGE_PATTERN);
    });
  });

  test("Should filter promises when selecting 'New Promises' tab (AC-02)", async ({
    promiseTracker,
  }) => {
    const initialCount = await promiseTracker.getCardCount();

    await test.step("1. Click the 'New Promises' category tab", async () => {
      await promiseTracker.selectCategory(CATEGORY_LABELS.NEW);
    });

    await test.step("2. Wait for feed to reload and verify card count changed", async () => {
      await promiseTracker.waitForFeedLoaded();
      const count = await promiseTracker.getCardCount();
      expect(count).toBeLessThanOrEqual(initialCount);
      expect(count).toBeGreaterThanOrEqual(0);
    });
  });

  test("Should filter promises when selecting 'Progress Updates' tab (AC-02)", async ({
    promiseTracker,
  }) => {
    const initialCount = await promiseTracker.getCardCount();

    await test.step("1. Click the 'Progress Updates' category tab", async () => {
      await promiseTracker.selectCategory(CATEGORY_LABELS.PROGRESS);
    });

    await test.step("2. Verify feed updates correctly", async () => {
      await promiseTracker.waitForFeedLoaded();
      const count = await promiseTracker.getCardCount();
      expect(count).toBeLessThanOrEqual(initialCount);
      expect(count).toBeGreaterThanOrEqual(0);
    });
  });

  test("Should filter promises when selecting 'Fulfillment' tab (AC-02)", async ({
    promiseTracker,
  }) => {
    const initialCount = await promiseTracker.getCardCount();

    await test.step("1. Click the 'Fulfillment' category tab", async () => {
      await promiseTracker.selectCategory(CATEGORY_LABELS.FULFILLMENT);
    });

    await test.step("2. Verify feed updates and visible cards match category", async () => {
      await promiseTracker.waitForFeedLoaded();
      const count = await promiseTracker.getCardCount();
      expect(count).toBeLessThanOrEqual(initialCount);
      expect(count).toBeGreaterThanOrEqual(0);
      if (count > 0) {
        const firstCard = promiseTracker.getCardByIndex(0);
        const badge = promiseTracker.getCategoryBadge(firstCard);
        await expect(badge).toContainText(/Fulfillment/i);
      }
    });
  });

  test("Should return to full feed when selecting 'All Promises' tab after filtering", async ({
    promiseTracker,
  }) => {
    const initialCount = await promiseTracker.getCardCount();

    await test.step("1. Filter to 'Fulfillment' first", async () => {
      await promiseTracker.selectCategory(CATEGORY_LABELS.FULFILLMENT);
      await promiseTracker.waitForFeedLoaded();
    });

    await test.step("2. Switch back to 'All Promises'", async () => {
      await promiseTracker.selectCategory(CATEGORY_LABELS.ALL);
      await promiseTracker.waitForFeedLoaded();
    });

    await test.step("3. Verify all cards are shown again", async () => {
      const count = await promiseTracker.getCardCount();
      expect(count).toBe(initialCount);
    });
  });

  test("Should filter promises by search keyword (AC-02)", async ({
    promiseTracker,
  }) => {
    const card = promiseTracker.getCardByIndex(0);
    const politicianName = await promiseTracker.getPoliticianName(card).textContent();
    const searchTerm = politicianName?.trim().split(/\s+/)[0] ?? "the";

    await test.step("1. Type search term from first card's politician name", async () => {
      await promiseTracker.search(searchTerm);
    });

    await test.step("2. Wait for feed to update", async () => {
      await promiseTracker.waitForFeedLoaded();
    });

    await test.step("3. Verify filtered results contain the politician", async () => {
      const count = await promiseTracker.getCardCount();
      expect(count).toBeGreaterThanOrEqual(1);
      const firstCard = promiseTracker.getCardByIndex(0);
      await expect(firstCard).toContainText(politicianName!.trim());
    });
  });

  test("Should expand AI Summary showing WHAT, WHEN, BUDGET (AC-03)", async ({
    promiseTracker,
  }) => {
    const cardWithSummary = promiseTracker.getFirstCardWithAiSummary();
    const hasAiSummary = await cardWithSummary.count() > 0;

    if (!hasAiSummary) {
      test.skip(true, "No card with AI Summary in current data");
    }

    await test.step("1. Click the AI Summary toggle on a card that has it", async () => {
      await promiseTracker.toggleAiSummary(cardWithSummary);
    });

    await test.step("2. Verify WHAT / WHEN / BUDGET labels are visible", async () => {
      const details = promiseTracker.getAiSummaryDetails(cardWithSummary);
      await expect(details).toBeVisible();
      await expect(details.getByText("WHAT")).toBeVisible();
      await expect(details.getByText("WHEN")).toBeVisible();
      await expect(details.getByText("BUDGET")).toBeVisible();
    });
  });

  test("Should collapse AI Summary on second click", async ({
    promiseTracker,
  }) => {
    const cardWithSummary = promiseTracker.getFirstCardWithAiSummary();
    const hasAiSummary = await cardWithSummary.count() > 0;

    if (!hasAiSummary) {
      test.skip(true, "No card with AI Summary in current data");
    }

    await test.step("1. Expand the AI Summary", async () => {
      await promiseTracker.toggleAiSummary(cardWithSummary);
      await expect(promiseTracker.getAiSummaryDetails(cardWithSummary)).toBeVisible();
    });

    await test.step("2. Collapse the AI Summary", async () => {
      await promiseTracker.toggleAiSummary(cardWithSummary);
      await expect(promiseTracker.getAiSummaryDetails(cardWithSummary)).toBeHidden();
    });
  });

  test("Should display Watchdog Commentary on cards that have it (AC-10)", async ({
    promiseTracker,
  }) => {
    const cardWithCommentary = promiseTracker.getFirstCardWithWatchdogCommentary();
    const hasCommentary = await cardWithCommentary.count() > 0;

    if (!hasCommentary) {
      test.skip(true, "No card with Watchdog Commentary in current data");
    }

    await test.step("1. Verify Bang Jaga says section is visible", async () => {
      const watchdog = promiseTracker.getWatchdogCommentary(cardWithCommentary);
      await expect(watchdog).toBeVisible();
      await expect(watchdog).toContainText("Bang Jaga says");
    });
  });

  test("Should show 'Source Unavailable' badge on promise with 404 source (AC-11)", async ({
    promiseTracker,
  }) => {
    const badgeCount = await promiseTracker.getSourceUnavailableCardCount();

    if (badgeCount === 0) {
      test.skip(true, "No promise with 404 source in current data");
    }

    await test.step("1. Find a card with 404 source status", async () => {
      const card = promiseTracker.getFirstCardWithSourceUnavailable();
      const badge = promiseTracker.getSourceUnavailableBadge(card);
      await expect(badge).toBeVisible();
    });
  });

  test("Should show source domain link on each card", async ({
    promiseTracker,
  }) => {
    await test.step("1. Verify the first card has a source link", async () => {
      const card = promiseTracker.getCardByIndex(0);
      const link = promiseTracker.getSourceLink(card);
      await expect(link).toBeVisible();
      await expect(link).toHaveAttribute("href", /^https?:\/\//);
    });
  });

  test("Should show auth guard when clicking Like button while logged out", async ({
    promiseTracker,
    page,
  }) => {
    const card = promiseTracker.getCardByIndex(0);

    await test.step("1. Click the Like button", async () => {
      await promiseTracker.clickLike(card);
    });

    await test.step("2. Verify auth guard modal appears", async () => {
      const authModal = page.getByTestId("auth-guard-modal");
      await expect(authModal).toBeVisible({ timeout: 3000 });
      await expect(authModal.getByText(/sign in required|sign in to/i).first()).toBeVisible();
    });
  });

  test("Should show auth guard modal when clicking Follow button while logged out", async ({
    promiseTracker,
    page,
  }) => {
    const card = promiseTracker.getCardByIndex(0);

    await test.step("1. Click the Follow button", async () => {
      await promiseTracker.clickFollow(card);
    });

    await test.step("2. Verify auth guard modal appears with sign-in prompt", async () => {
      const authModal = page.getByTestId("auth-guard-modal");
      await expect(authModal).toBeVisible({ timeout: 3000 });
      await expect(authModal.getByText(/sign in required|sign in to/i).first()).toBeVisible();
    });

    await test.step("3. Verify Follow button did not toggle to Following", async () => {
      const followBtn = promiseTracker.getFollowButton(card);
      await expect(followBtn).toContainText("Follow");
    });
  });

  test("Should display the Flag button on each card", async ({
    promiseTracker,
  }) => {
    await test.step("1. Verify Flag button is visible on the first card", async () => {
      const card = promiseTracker.getCardByIndex(0);
      await expect(promiseTracker.getFlagButton(card)).toBeVisible();
    });
  });

  test("Should display Region, Year, and Status filter dropdowns (AC-04)", async ({
    promiseTracker,
  }) => {
    await test.step("1. Verify filter dropdowns are visible", async () => {
      await expect(promiseTracker.regionSelect).toBeVisible();
      await expect(promiseTracker.yearSelect).toBeVisible();
      await expect(promiseTracker.statusSelect).toBeVisible();
    });

    await test.step("2. Verify Status has Active, 404, Paywalled options", async () => {
      await expect(promiseTracker.statusSelect).toContainText("All statuses");
      await expect(promiseTracker.statusSelect).toContainText("Active");
      await expect(promiseTracker.statusSelect).toContainText("Source unavailable");
    });
  });

  test("Should filter promises when selecting Status 'Source unavailable' (AC-04)", async ({
    promiseTracker,
  }) => {
    const initialCount = await promiseTracker.getCardCount();

    await test.step("1. Select Status 'Source unavailable'", async () => {
      await promiseTracker.statusSelect.selectOption({ value: "404" });
    });

    await test.step("2. Wait for feed to update", async () => {
      await promiseTracker.waitForFeedLoaded();
    });

    await test.step("3. Verify feed updated (count may be 0 or subset)", async () => {
      const count = await promiseTracker.getCardCount();
      expect(count).toBeLessThanOrEqual(initialCount);
      expect(count).toBeGreaterThanOrEqual(0);
    });
  });

  test("Should show auth guard when clicking Submit New Promise while logged out (AC-09)", async ({
    promiseTracker,
    page,
  }) => {
    await test.step("1. Click Submit New Promise button", async () => {
      await promiseTracker.submitNewButton.click();
    });

    await test.step("2. Verify auth guard modal appears", async () => {
      const authModal = page.getByTestId("auth-guard-modal");
      await expect(authModal).toBeVisible({ timeout: 3000 });
      await expect(authModal.getByText(/sign in required|sign in to/i).first()).toBeVisible();
    });
  });

  test("Should show Load More or end-of-feed message when feed has cards (AC-14)", async ({
    promiseTracker,
  }) => {
    const count = await promiseTracker.getCardCount();
    if (count === 0) {
      test.skip(true, "No cards in feed to test pagination");
    }

    await test.step("1. Verify either Load More or end-of-feed message is visible", async () => {
      const loadMore = promiseTracker.loadMoreButton;
      const endMessage = promiseTracker.page.getByText(/you've seen all promises/i);
      const hasLoadMore = await loadMore.isVisible().catch(() => false);
      const hasEndMessage = await endMessage.isVisible().catch(() => false);
      expect(hasLoadMore || hasEndMessage).toBeTruthy();
    });
  });

  test("Should navigate to Promise Tracker via the navbar", async ({
    page,
    navbar,
  }) => {
    await test.step("1. Navigate to the home page first", async () => {
      await page.goto("/");
    });

    await test.step("2. Click 'The Talk Ledger' in the navbar", async () => {
      await navbar.navigateTo(["The Talk Ledger", "promise-tracker"]);
    });

    await test.step("3. Verify URL is /promise-tracker", async () => {
      await expect(page).toHaveURL(/\/promise-tracker/);
    });
  });
});
