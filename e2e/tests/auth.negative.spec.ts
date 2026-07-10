/**
 * Feature: Authentication — Negative / Validation Scenarios
 * Related: AGENTS.md, src/lib/auth.ts
 *
 * Scope:
 * - Negative Cases: Invalid credentials, wrong password, validation errors,
 *   short password on register, empty required fields (browser validation)
 */

import { test, expect } from "../fixtures/auth.fixture";

test.describe("Auth — Login Negative Scenarios", () => {
  test("Should have required attribute on email and password fields (AC-A10)", async ({
    authPage,
  }) => {
    await test.step("1. Open login page", async () => {
      await authPage.gotoLogin();
    });

    await test.step("2. Verify email and password inputs are required", async () => {
      const emailRequired = await authPage.emailInput.getAttribute("required");
      const passwordRequired = await authPage.passwordInput.getAttribute("required");
      expect(emailRequired).not.toBeNull();
      expect(passwordRequired).not.toBeNull();
    });
  });
  test("Should display error when login with invalid credentials", async ({
    authPage,
    page,
  }) => {
    await test.step("1. Navigate to login", async () => {
      await authPage.gotoLogin();
    });

    await test.step("2. Fill invalid email and password", async () => {
      await authPage.fillLoginForm({
        email: "nonexistent@example.com",
        password: "WrongPass123!",
      });
    });

    await test.step("3. Submit and verify error message", async () => {
      await authPage.loginSubmitButton.click();
      await expect(authPage.errorMessage).toBeVisible({ timeout: 5000 });
      await expect(authPage.errorMessage).not.toHaveText("");
    });

    await test.step("4. Verify still on login page", async () => {
      await expect(page).toHaveURL(/\/login/);
    });
  });

  test("Should display error when login with wrong password for valid email", async ({
    authPage,
    freshUser,
    page,
  }) => {
    await test.step("1. Register a user first", async () => {
      await authPage.gotoRegister();
      await authPage.fillRegisterForm(freshUser);
      await authPage.submitRegister();
      await expect(page).not.toHaveURL(/\/register/);
    });

    await test.step("2. Navigate to login with correct email, wrong password", async () => {
      await authPage.gotoLogin();
      await authPage.fillLoginForm({
        email: freshUser.email,
        password: "WrongPassword123!",
      });
    });

    await test.step("3. Submit and verify error message", async () => {
      await authPage.loginSubmitButton.click();
      await expect(authPage.errorMessage).toBeVisible({ timeout: 5000 });
    });

    await test.step("4. Verify still on login page", async () => {
      await expect(page).toHaveURL(/\/login/);
    });
  });
});

test.describe("Auth — Register Negative Scenarios", () => {
  test("Should display error when registering with duplicate email", async ({
    authPage,
    freshUser,
    page,
  }) => {
    await test.step("1. Register first time successfully", async () => {
      await authPage.gotoRegister();
      await authPage.fillRegisterForm(freshUser);
      await authPage.submitRegister();
      await expect(page).not.toHaveURL(/\/register/);
    });

    await test.step("2. Navigate to register again with same email", async () => {
      await authPage.gotoRegister();
      await authPage.fillRegisterForm(freshUser);
    });

    await test.step("3. Submit and verify error message", async () => {
      await authPage.registerSubmitButton.click();
      await expect(authPage.errorMessage).toBeVisible({ timeout: 5000 });
    });

    await test.step("4. Verify still on register page", async () => {
      await expect(page).toHaveURL(/\/register/);
    });
  });

  test("Should display error when register with short password", async ({
    authPage,
    freshUser,
    page,
  }) => {
    await test.step("1. Navigate to register", async () => {
      await authPage.gotoRegister();
    });

    await test.step("2. Fill form with password under 6 chars", async () => {
      await authPage.fillRegisterForm({
        ...freshUser,
        password: "12345",
      });
    });

    await test.step("3. Submit - HTML5 minLength or Supabase validation", async () => {
      await authPage.registerSubmitButton.click();
      await page.waitForTimeout(2000);
      // Either stays on register (validation) or shows error
      const onRegister = page.url().includes("/register");
      const hasError = await authPage.errorMessage.isVisible().catch(() => false);
      expect(onRegister || hasError).toBeTruthy();
    });
  });
});
