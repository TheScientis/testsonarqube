import { type Locator, type Page } from "@playwright/test";

/**
 * Page Object Model for authentication pages (Login and Register).
 *
 * Encapsulates locators and low-level UI actions for `/login` and `/register`.
 * Does NOT contain assertions — assertions belong in spec files.
 */
export class AuthPage {
  readonly page: Page;

  /** Register page: "Full Name" input. */
  readonly nameInput: Locator;

  /** Email input (login and register). */
  readonly emailInput: Locator;

  /** Password input (login and register). */
  readonly passwordInput: Locator;

  /** Register page: "Primary Region" select. */
  readonly regionSelect: Locator;

  /** Register page: submit button "Buat Akun". */
  readonly registerSubmitButton: Locator;

  /** Login page: submit button "Masuk". */
  readonly loginSubmitButton: Locator;

  /** Error message container (red background). */
  readonly errorMessage: Locator;

  /** Login page: "Lupa Password?" link. */
  readonly lupaPasswordLink: Locator;

  /** Login page: show/hide password toggle button. */
  readonly passwordVisibilityToggle: Locator;

  constructor(page: Page) {
    this.page = page;

    this.nameInput = page.getByTestId("auth-name-input");
    this.emailInput = page.getByTestId("auth-email-input");
    this.passwordInput = page.getByTestId("auth-password-input");
    this.regionSelect = page.getByTestId("auth-region-select");
    this.registerSubmitButton = page.getByTestId("auth-register-submit");
    this.loginSubmitButton = page.getByTestId("auth-login-submit");
    this.errorMessage = page.getByTestId("auth-error-message");
    this.lupaPasswordLink = page.getByTestId("auth-lupa-password");
    this.passwordVisibilityToggle = page.getByTestId("auth-password-visibility-toggle");
  }

  /**
   * Navigate to the register page and wait for the form.
   */
  async gotoRegister(): Promise<void> {
    await this.page.goto("/register");
    await this.page.waitForLoadState("networkidle");
    await this.nameInput.waitFor({ state: "visible", timeout: 10_000 });
  }

  /**
   * Navigate to the login page.
   */
  async gotoLogin(): Promise<void> {
    await this.page.goto("/login");
    await this.page.waitForLoadState("networkidle");
  }

  /**
   * Fill the registration form. Does not submit.
   * @param opts - name, email, password; region is optional (defaults to first option if needed).
   */
  async fillRegisterForm(opts: { name: string; email: string; password: string; region?: string }): Promise<void> {
    await this.nameInput.fill(opts.name);
    await this.emailInput.fill(opts.email);
    await this.passwordInput.fill(opts.password);
    if (opts.region !== undefined) {
      await this.regionSelect.selectOption({ label: opts.region });
    } else {
      await this.regionSelect.selectOption({ index: 1 });
    }
  }

  /**
   * Fill the login form. Does not submit.
   */
  async fillLoginForm(opts: { email: string; password: string }): Promise<void> {
    await this.emailInput.fill(opts.email);
    await this.passwordInput.fill(opts.password);
  }

  /**
   * Click the register submit button and wait for navigation away from register (success).
   */
  async submitRegister(): Promise<void> {
    await this.registerSubmitButton.click();
    await this.page.waitForURL((url) => !url.pathname.includes("/register"), { timeout: 15_000 });
  }

  /**
   * Click the login submit button and wait for navigation away from login (success).
   */
  async submitLogin(): Promise<void> {
    await this.loginSubmitButton.click();
    await this.page.waitForURL((url) => !url.pathname.includes("/login"), { timeout: 15_000 });
  }
}
