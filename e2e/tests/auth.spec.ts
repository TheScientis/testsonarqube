/**
 * Feature: Authentication (Login, Register, OAuth)
 * Related: AGENTS.md, src/lib/auth.ts
 *
 * Scope:
 * - Positive Cases: Register with valid data, Login with email after register,
 *   Google OAuth redirects to provider, Redirect after login respects ?redirect=
 * - Negative Cases: (see auth.negative.spec.ts)
 * - Edge Cases: Navigate login↔register links
 */

import { test, expect } from "../fixtures/auth.fixture";

test.describe("Auth — Positive Scenarios", () => {
  test("Should successfully register a new user and redirect away from register", async ({
    authPage,
    freshUser,
    page,
  }) => {
    await test.step("1. Navigate to register page", async () => {
      await authPage.gotoRegister();
    });

    await test.step("2. Fill form with valid data", async () => {
      await authPage.fillRegisterForm(freshUser);
    });

    await test.step("3. Submit and verify redirect away from /register", async () => {
      await authPage.submitRegister();
      await expect(page).not.toHaveURL(/\/register/);
    });

    await test.step("4. Verify no error message is shown", async () => {
      await expect(authPage.errorMessage).not.toBeVisible();
    });
  });

  test("Should successfully login with email after registering", async ({
    authPage,
    freshUser,
    page,
  }) => {
    await test.step("1. Register first", async () => {
      await authPage.gotoRegister();
      await authPage.fillRegisterForm(freshUser);
      await authPage.submitRegister();
      await expect(page).not.toHaveURL(/\/register/);
    });

    await test.step("2. Sign out via profile", async () => {
      await page.goto("/profile");
      await page.getByTestId("profile-loading-spinner").waitFor({ state: "hidden", timeout: 10_000 }).catch(() => {});
      await page.getByTestId("profile-sign-out").click();
      await expect(page).toHaveURL(/\/login/);
    });

    await test.step("3. Fill login form and submit", async () => {
      await authPage.fillLoginForm({ email: freshUser.email, password: freshUser.password });
      await authPage.submitLogin();
      await expect(page).not.toHaveURL(/\/login/);
    });

    await test.step("4. Verify no error message is shown", async () => {
      await expect(authPage.errorMessage).not.toBeVisible();
    });
  });

  test("Should redirect to ?redirect= path after successful login", async ({
    authPage,
    freshUser,
    page,
  }) => {
    await test.step("1. Register and sign out", async () => {
      await authPage.gotoRegister();
      await authPage.fillRegisterForm(freshUser);
      await authPage.submitRegister();
      await page.goto("/profile");
      await page.getByTestId("profile-loading-spinner").waitFor({ state: "hidden", timeout: 10_000 }).catch(() => {});
      await page.getByTestId("profile-sign-out").click();
      await expect(page).toHaveURL(/\/login/);
    });

    await test.step("2. Navigate to login with redirect param", async () => {
      await page.goto("/login?redirect=/promise-tracker");
      await authPage.fillLoginForm({ email: freshUser.email, password: freshUser.password });
    });

    await test.step("3. Submit and verify redirect to /promise-tracker", async () => {
      await authPage.submitLogin();
      await expect(page).toHaveURL(/\/promise-tracker/);
    });
  });

  test("Google login button redirects to Supabase OAuth provider", async ({
    page,
    authPage,
  }) => {
    await test.step("1. Navigate to login page", async () => {
      await authPage.gotoLogin();
    });

    await test.step("2. Click Google button and verify OAuth redirect", async () => {
      const googleButton = page.locator("button", { hasText: "Google" }).first();
      await expect(googleButton).toBeVisible();

      await Promise.all([
        page.waitForURL(/supabase\.co|google\.com\/o\/oauth2|accounts\.google\.com/),
        googleButton.click(),
      ]);

      expect(page.url()).toMatch(/supabase\.co|google\.com\/o\/oauth2|accounts\.google\.com/);
    });
  });
});

test.describe("Auth — Edge Cases", () => {
  test("Should toggle password visibility on login page (AC-A12)", async ({
    authPage,
    page,
  }) => {
    await test.step("1. Open login page", async () => {
      await authPage.gotoLogin();
    });

    await test.step("2. Fill password and verify input is type=password initially", async () => {
      await authPage.fillLoginForm({ email: "test@test.com", password: "secret123" });
      await expect(authPage.passwordInput).toHaveAttribute("type", "password");
    });

    await test.step("3. Click visibility toggle and verify input becomes type=text", async () => {
      await authPage.passwordVisibilityToggle.click();
      await expect(authPage.passwordInput).toHaveAttribute("type", "text");
    });

    await test.step("4. Click toggle again and verify input is type=password", async () => {
      await authPage.passwordVisibilityToggle.click();
      await expect(authPage.passwordInput).toHaveAttribute("type", "password");
    });
  });

  test("Should display Lupa Password link on login page (AC-A13)", async ({
    authPage,
  }) => {
    await test.step("1. Open login page", async () => {
      await authPage.gotoLogin();
    });

    await test.step("2. Verify Lupa Password link is visible", async () => {
      await expect(authPage.lupaPasswordLink).toBeVisible();
      await expect(authPage.lupaPasswordLink).toContainText(/lupa password/i);
    });
  });

  test("Should navigate from login to register via link", async ({ authPage, page }) => {
    await test.step("1. Open login page", async () => {
      await authPage.gotoLogin();
    });

    await test.step("2. Click Daftar sekarang link", async () => {
      await page.getByRole("link", { name: /daftar sekarang/i }).click();
    });

    await test.step("3. Verify register page loaded", async () => {
      await expect(page).toHaveURL(/\/register/);
      await expect(authPage.nameInput).toBeVisible();
      await expect(authPage.registerSubmitButton).toBeVisible();
    });
  });

  test("Should navigate from register to login via link", async ({ authPage, page }) => {
    await test.step("1. Open register page", async () => {
      await authPage.gotoRegister();
    });

    await test.step("2. Click Sign in link", async () => {
      await page.getByRole("link", { name: /sign in/i }).click();
    });

    await test.step("3. Verify login page loaded", async () => {
      await expect(page).toHaveURL(/\/login/);
      await expect(authPage.loginSubmitButton).toBeVisible();
    });
  });
});
