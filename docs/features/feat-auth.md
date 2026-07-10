# Feature: Authentication

## Overview

Login (email/password, Google OAuth) and registration flows. See `src/app/login/`, `src/app/register/`, `src/lib/auth.ts`.

## Acceptance Criteria

| ID | Criterion | E2E Test |
|----|-----------|----------|
| AC-A01 | Login with email/password succeeds and redirects | auth.spec.ts |
| AC-A02 | Login with invalid credentials shows error | auth.negative.spec.ts |
| AC-A03 | Login with wrong password shows error | auth.negative.spec.ts |
| AC-A04 | Redirect after login respects `?redirect=` | auth.spec.ts |
| AC-A05 | Google OAuth redirects to provider | auth.spec.ts |
| AC-A06 | Register with valid data succeeds and redirects | auth.spec.ts |
| AC-A07 | Register with duplicate email shows error | auth.negative.spec.ts |
| AC-A08 | Register with short password fails | auth.negative.spec.ts |
| AC-A09 | Login ↔ Register navigation links work | auth.spec.ts |
| AC-A10 | Required fields enforced (email, password, name) | auth.negative.spec.ts |
| AC-A11 | Register form: Full Name, Email, Password, Region | auth.spec.ts |
| AC-A12 | Show/hide password toggle on login | auth.spec.ts |
| AC-A13 | "Lupa Password?" link on login | auth.spec.ts |

## E2E Coverage

- **Specs:** `e2e/tests/auth.spec.ts`, `e2e/tests/auth.negative.spec.ts`
- **Fixture:** `e2e/fixtures/auth.fixture.ts`
- **Run:** `npx playwright test e2e/tests/auth.spec.ts e2e/tests/auth.negative.spec.ts`
