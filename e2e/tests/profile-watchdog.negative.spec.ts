/**
 * Feature: Profile — Watchdog Level (Negative / Guard)
 * Related: docs/feature-profile.md
 *
 * Scope:
 * - Negative: Unauthenticated user does not see Watchdog Level card; sees not-logged-in state.
 * - Guard: Protected actions (e.g. comment on promise) prompt auth when not logged in.
 */

import { test, expect } from "../fixtures/profile.fixture";

test.describe("Profile Watchdog Level — Negative Scenarios", () => {
  test("Should show not-logged-in state when opening profile without auth", async ({
    profilePage,
  }) => {
    await test.step("1. Open profile without logging in", async () => {
      await profilePage.goto();
    });

    await test.step("2. Verify Watchdog Level card is not visible", async () => {
      await expect(profilePage.notLoggedInMessage).toBeVisible();
      await expect(profilePage.watchdogLevelCard).not.toBeVisible();
    });

    await test.step("3. Verify Sign in to view message is shown", async () => {
      await expect(profilePage.signInToViewMessage).toBeVisible();
    });

    await test.step("4. Verify Go to Login is offered", async () => {
      await expect(profilePage.goToLoginButton).toBeVisible();
    });

    await test.step("5. Verify no main profile content is present (unauthenticated view has no main)", async () => {
      expect(await profilePage.page.locator("main").count()).toBe(0);
    });
  });

  test("Should redirect to login when clicking Go to Login from profile", async ({
    page,
    profilePage,
  }) => {
    await test.step("1. Open profile unauthenticated", async () => {
      await profilePage.goto();
      await expect(profilePage.notLoggedInMessage).toBeVisible();
    });

    await test.step("2. Click Go to Login", async () => {
      await profilePage.goToLoginButton.click();
    });

    await test.step("3. Verify login page is shown", async () => {
      await expect(page).toHaveURL(/\/login/);
      await expect(page.getByTestId("auth-login-submit")).toBeVisible();
    });

    await test.step("4. Verify login form has email and password fields", async () => {
      await expect(page.getByTestId("auth-email-input")).toBeVisible();
      await expect(page.getByTestId("auth-password-input")).toBeVisible();
    });
  });
});

test.describe("Profile Watchdog Level — Auth Guard on XP Actions", () => {
  test("Should prompt auth when unauthenticated user tries to like a promise", async ({
    page,
  }) => {
    await test.step("1. Open Promise Tracker without logging in", async () => {
      await page.goto("/promise-tracker");
      await page.waitForLoadState("networkidle");
    });

    await test.step("2. Wait for feed and click Like on first card", async () => {
      const card = page.getByTestId("promise-tracker-card").first();
      await card.waitFor({ state: "visible", timeout: 15_000 });
      await card.getByTestId("promise-card-like").click();
    });

    await test.step("3. Verify auth guard modal appears with sign-in prompt", async () => {
      const authModal = page.getByTestId("auth-guard-modal");
      await expect(authModal).toBeVisible({ timeout: 3000 });
      await expect(authModal.getByText(/sign in required|sign in to/i).first()).toBeVisible();
    });
  });

  test("Should prompt auth when unauthenticated user tries to comment on a promise", async ({
    page,
  }) => {
    await test.step("1. Open Promise Tracker without logging in", async () => {
      await page.goto("/promise-tracker");
      await page.waitForLoadState("networkidle");
    });

    await test.step("2. Open comment thread on first card and type a comment", async () => {
      const card = page.getByTestId("promise-tracker-card").first();
      await card.waitFor({ state: "visible", timeout: 15_000 });
      await card.getByTestId("promise-card-comment").click();
      await page.getByPlaceholder("Add a comment...").fill("E2E unauthenticated comment");
    });

    await test.step("3. Click Post and verify auth guard modal appears", async () => {
      await page.getByRole("button", { name: "Post" }).click();
      const authModal = page.getByTestId("auth-guard-modal");
      await expect(authModal).toBeVisible({ timeout: 3000 });
      await expect(authModal.getByText(/sign in required|sign in to/i).first()).toBeVisible();
    });
  });

  test("Should prompt auth when unauthenticated user tries to flag a promise", async ({
    page,
  }) => {
    await test.step("1. Open Promise Tracker without logging in", async () => {
      await page.goto("/promise-tracker");
      await page.waitForLoadState("networkidle");
    });

    await test.step("2. Wait for feed and click Flag on first card", async () => {
      const card = page.getByTestId("promise-tracker-card").first();
      await card.waitFor({ state: "visible", timeout: 15_000 });
      await card.getByTestId("promise-card-flag").click();
    });

    await test.step("3. Verify auth guard modal appears", async () => {
      const authModal = page.getByTestId("auth-guard-modal");
      await expect(authModal).toBeVisible({ timeout: 3000 });
      await expect(authModal.getByText(/sign in required|sign in to/i).first()).toBeVisible();
    });
  });
});
