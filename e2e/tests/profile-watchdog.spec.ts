/**
 * Feature: Profile — Watchdog Level (Gamification)
 * Related: docs/feature-profile.md, src/lib/gamification.ts
 *
 * Scope:
 * - Positive: Fresh user sees baseline (0 XP, Warga Baru); XP increases after actions;
 *   level transition at 100 XP (Warga Aktif); session persistence after reload.
 */

import { test, expect } from "../fixtures/profile.fixture";
import {
  BASELINE,
  LEVEL_WARGA_BARU,
  LEVEL_WARGA_AKTIF,
  XP_REWARDS,
  XP_TO_WARGA_AKTIF,
} from "../fixtures/profile-test-data";

test.describe("Profile Watchdog Level — Positive Scenarios", () => {
  test("Should show baseline Watchdog Level for a fresh user (0 XP, Warga Baru)", async ({
    profilePage,
    freshUser,
  }) => {
    await test.step("1. Open profile after registration", async () => {
      await profilePage.goto();
    });

    await test.step("2. Verify Watchdog Level card shows baseline", async () => {
      await expect(profilePage.watchdogLevelCard).toBeVisible();
      await expect(profilePage.watchdogLevelLabel).toBeVisible();
      await expect(profilePage.levelNameId).toContainText(BASELINE.levelNameId);
      await expect(profilePage.levelNameEn).toContainText(BASELINE.levelNameEn);
    });

    await test.step("3. Verify progress bar track and level icon are present", async () => {
      await expect(profilePage.progressBarTrack).toBeVisible();
      await expect(profilePage.watchdogLevelCard.locator(".material-symbols-outlined").first()).toBeVisible();
    });

    await test.step("4. Verify 0 XP and next level text", async () => {
      const xp = await profilePage.getXpNumber();
      expect(xp).toBe(BASELINE.xp);
      const nextText = await profilePage.getNextLevelText();
      expect(nextText).toContain(LEVEL_WARGA_AKTIF);
      expect(nextText).toContain("100 XP left");
    });

    await test.step("5. Verify Engagement History section exists when logged in", async () => {
      await expect(profilePage.engagementHistoryHeading).toBeVisible();
    });

    await test.step("6. Verify empty engagement state for fresh user", async () => {
      await expect(profilePage.engagementHistoryEmptyMessage).toBeVisible();
    });
  });

  test("Should increase XP after adding comments and show updated level progress", async ({
    profilePage,
    freshUser,
    xpActions,
  }) => {
    test.setTimeout(60_000);
    await test.step("1. Open profile and confirm baseline XP", async () => {
      await profilePage.goto();
      const xp = await profilePage.getXpNumber();
      expect(xp).toBe(0);
    });

    await test.step("2. Add one comment on Promise Tracker", async () => {
      await xpActions.addCommentOnFirstPromise(`E2E comment ${Date.now()}`);
    });

    await test.step("3. Open profile again and verify XP increased", async () => {
      await profilePage.goto();
      const xp = await profilePage.getXpNumber();
      expect(xp).toBe(XP_REWARDS.comment);
    });

    await test.step("4. Verify next-level text shows reduced XP left", async () => {
      const nextText = await profilePage.getNextLevelText();
      expect(nextText).toContain("90 XP left");
    });

    await test.step("5. Verify Next level still shows Warga Aktif", async () => {
      const nextText = await profilePage.getNextLevelText();
      expect(nextText).toContain(LEVEL_WARGA_AKTIF);
    });

    await test.step("6. Verify progress bar track is visible after XP gain", async () => {
      await expect(profilePage.progressBarTrack).toBeVisible();
    });
  });

  test("Should transition to Warga Aktif at 100 XP after enough comments", async ({
    profilePage,
    freshUser,
    xpActions,
  }) => {
    test.setTimeout(90_000);
    const commentsNeeded = Math.ceil(XP_TO_WARGA_AKTIF / XP_REWARDS.comment);
    await test.step("1. Add XP via comments until total reaches 100+ (comments-only for reliability)", async () => {
      for (let i = 0; i < commentsNeeded; i++) {
        await xpActions.addCommentOnFirstPromise(`E2E level-up ${Date.now()}-${i}`);
        await new Promise((r) => setTimeout(r, 300));
      }
    });

    await test.step("2. Open profile and verify level is Warga Aktif", async () => {
      await profilePage.goto();
      const xp = await profilePage.getXpNumber();
      expect(xp).toBeGreaterThanOrEqual(XP_TO_WARGA_AKTIF);
      await expect(profilePage.levelNameId).toContainText(LEVEL_WARGA_AKTIF);
    });

    await test.step("3. Verify next level text shows next band (Agen Lapangan or XP left)", async () => {
      const nextText = await profilePage.getNextLevelText();
      expect(nextText).toMatch(/Next:.*\d+ XP left|MAX LEVEL/);
    });

    await test.step("4. Verify English level label is Active Citizen", async () => {
      await expect(profilePage.levelNameEn).toContainText("Active Citizen");
    });

    await test.step("5. Verify progress bar track visible and fill has width style", async () => {
      await expect(profilePage.progressBarTrack).toBeVisible();
      const width = await profilePage.progressBarFill.getAttribute("style");
      expect(width).toMatch(/width:\s*[\d.]+%/);
    });
  });

  test("Should persist Watchdog Level and XP after hard reload", async ({
    profilePage,
    freshUser,
    xpActions,
  }) => {
    await test.step("1. Add one comment and open profile", async () => {
      await xpActions.addCommentOnFirstPromise(`E2E persist ${Date.now()}`);
      await profilePage.goto();
    });

    await test.step("2. Record current XP and level", async () => {
      const xpBefore = await profilePage.getXpNumber();
      expect(xpBefore).toBeGreaterThanOrEqual(XP_REWARDS.comment);
    });

    const xpBefore = await profilePage.getXpNumber();
    const levelBefore = await profilePage.levelNameId.textContent();

    await test.step("3. Hard reload and revisit profile", async () => {
      await profilePage.reload();
    });

    await test.step("4. Verify XP and level are unchanged", async () => {
      await expect(profilePage.watchdogLevelCard).toBeVisible();
      const xpAfter = await profilePage.getXpNumber();
      const levelAfter = await profilePage.levelNameId.textContent();
      expect(xpAfter).toBe(xpBefore);
      expect(levelAfter?.trim()).toBe(levelBefore?.trim());
    });

    await test.step("5. Verify progress bar track still visible after reload", async () => {
      await expect(profilePage.progressBarTrack).toBeVisible();
    });
  });

  test("Should include like XP when user likes a promise", async ({
    profilePage,
    freshUser,
    xpActions,
  }) => {
    test.setTimeout(60_000);
    await test.step("1. Add one comment and one like on Promise Tracker", async () => {
      await xpActions.addCommentOnFirstPromise(`E2E like-test ${Date.now()}`);
      await xpActions.likeFirstPromise();
    });

    await test.step("2. Open profile and verify total XP is comment + like reward", async () => {
      await profilePage.goto();
      const xp = await profilePage.getXpNumber();
      const expected = XP_REWARDS.comment + XP_REWARDS.like;
      expect(xp).toBe(expected);
    });

    await test.step("3. Verify next XP left reflects new total", async () => {
      const nextText = await profilePage.getNextLevelText();
      expect(nextText).toContain(`${100 - (XP_REWARDS.comment + XP_REWARDS.like)} XP left`);
    });
  });

  test("Should show Engagement History with activity after commenting", async ({
    profilePage,
    freshUser,
    xpActions,
  }) => {
    test.setTimeout(60_000);
    await test.step("1. Add a comment on Promise Tracker", async () => {
      await xpActions.addCommentOnFirstPromise(`E2E history ${Date.now()}`);
    });

    await test.step("2. Open profile and verify Engagement History section is present", async () => {
      await profilePage.goto();
      await expect(profilePage.engagementHistoryHeading).toBeVisible();
    });

    await test.step("3. Verify recent activity is shown (no empty state)", async () => {
      await expect(profilePage.engagementHistoryEmptyMessage).not.toBeVisible();
    });

    await test.step("4. Verify at least one activity entry is visible", async () => {
      await expect(profilePage.page.getByTestId("profile-activity-item").first()).toBeVisible();
    });
  });

  test("Should redirect to login when clicking Sign Out (AC-P12)", async ({
    page,
    profilePage,
    freshUser,
  }) => {
    await test.step("1. Ensure logged in and open profile", async () => {
      await profilePage.goto();
      await expect(profilePage.watchdogLevelCard).toBeVisible();
    });

    await test.step("2. Click Sign Out", async () => {
      await page.getByTestId("profile-sign-out").click();
    });

    await test.step("3. Verify redirect to login page", async () => {
      await expect(page).toHaveURL(/\/login/);
    });
  });

  test("Should reach profile from navbar when logged in", async ({
    page,
    profilePage,
    freshUser,
  }) => {
    await test.step("1. Start on home and ensure logged in", async () => {
      await page.goto("/");
      await page.waitForLoadState("networkidle");
    });

    await test.step("2. Click profile link in header (avatar or profile link)", async () => {
      const profileLink = page.getByTestId("navbar-profile");
      await profileLink.waitFor({ state: "visible", timeout: 5000 });
      await profileLink.click();
    });

    await test.step("3. Verify profile page loaded and Watchdog Level card is visible", async () => {
      await expect(page).toHaveURL(/\/profile/);
      await expect(profilePage.watchdogLevelCard).toBeVisible();
    });

    await test.step("4. Verify level and XP are shown", async () => {
      await expect(profilePage.levelNameId).toContainText(LEVEL_WARGA_BARU);
      const xp = await profilePage.getXpNumber();
      expect(xp).toBe(0);
    });
  });

  test("Should show progress bar reflecting progress to next level at 50 XP", async ({
    profilePage,
    freshUser,
    xpActions,
  }) => {
    test.setTimeout(90_000);
    const commentsFor50 = 5;
    await test.step("1. Add 5 comments to reach 50 XP", async () => {
      for (let i = 0; i < commentsFor50; i++) {
        await xpActions.addCommentOnFirstPromise(`E2E progress ${Date.now()}-${i}`);
        await new Promise((r) => setTimeout(r, 300));
      }
    });

    await test.step("2. Open profile and verify 50 XP", async () => {
      await profilePage.goto();
      const xp = await profilePage.getXpNumber();
      expect(xp).toBe(commentsFor50 * XP_REWARDS.comment);
    });

    await test.step("3. Verify still Warga Baru and 50 XP left to Warga Aktif", async () => {
      await expect(profilePage.levelNameId).toContainText(LEVEL_WARGA_BARU);
      const nextText = await profilePage.getNextLevelText();
      expect(nextText).toContain("50 XP left");
    });

    await test.step("4. Verify progress bar track visible and fill has width style", async () => {
      await expect(profilePage.progressBarTrack).toBeVisible();
      const style = await profilePage.progressBarFill.getAttribute("style");
      expect(style).toMatch(/width:\s*[\d.]+%/);
    });
  });
});
