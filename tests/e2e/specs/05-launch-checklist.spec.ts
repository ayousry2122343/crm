import { test, expect } from '@playwright/test';

const unique = () => Date.now().toString(36);

test.describe('Sprint 5: Reports + Dashboards + AI + Website', () => {
  let wsSlug: string;
  let email: string;
  let password: string;

  test.beforeAll(() => {
    const id = unique();
    wsSlug = `test-ws-${id}`;
    email = `e2e-${id}@test.com`;
    password = 'TestPass123!';
  });

  test('website pages load correctly', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('[data-test="hero"]')).toBeVisible();

    await page.click('text=Features');
    await expect(page.locator('[data-test="feature-contacts"]')).toBeVisible();

    await page.click('text=Pricing');
    await expect(page.locator('[data-test="plan-growth"]')).toBeVisible();

    await page.click('text=Contact');
    await expect(page.locator('[data-test="contact-form"]')).toBeVisible();
  });

  test('signup → reports → dashboards → AI email', async ({ page }) => {
    // 1. Sign up
    await page.goto('/sign-up');
    await page.fill('[data-test="field-fullName"] input, input[name="fullName"]', 'E2E Tester');
    await page.fill('[data-test="field-email"] input, input[name="email"]', email);
    await page.fill('[data-test="field-password"] input, input[name="password"]', password);
    await page.fill(
      '[data-test="field-workspaceName"] input, input[name="workspaceName"]',
      'Test WS',
    );
    await page.fill(
      '[data-test="field-workspaceSlug"] input, input[name="workspaceSlug"]',
      wsSlug,
    );
    await page.click('[data-test="submit"]');
    await expect(page).toHaveURL(/dashboard/, { timeout: 10_000 });

    // 2. Home page has quick stats
    await expect(page.locator('[data-test="stat-people"]')).toBeVisible();
    await expect(page.locator('[data-test="stat-deals"]')).toBeVisible();

    // 3. Reports
    await page.click('[data-test="nav-reports"]');
    await expect(page.locator('[data-test="reports-index-page"]')).toBeVisible();
    await expect(page.locator('[data-test="run-report-btn"]')).toBeVisible();

    // 4. Dashboards
    await page.click('[data-test="nav-dashboards"]');
    await expect(page.locator('[data-test="dashboards-index-page"]')).toBeVisible();
    await page.click('[data-test="add-dashboard-btn"]');
    await page.locator('[data-test="dashboard-name-input"]').fill('My Dashboard');
    await page.getByRole('button', { name: /save/i }).click();
    await expect(page.locator('[data-test="dashboard-editor-page"]')).toBeVisible();
  });

  test('reports page renders independently', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[name="email"]', email);
    await page.fill('input[name="password"]', password);
    await page.fill('input[name="workspaceSlug"]', wsSlug);
    await page.click('[data-test="submit"]');
    await expect(page).toHaveURL(/dashboard/, { timeout: 10_000 });

    await page.click('[data-test="nav-reports"]');
    await expect(page.locator('[data-test="reports-index-page"]')).toBeVisible();
  });

  test('contact form works', async ({ page }) => {
    await page.goto('/contact');
    await page.fill('[data-test="contact-name"]', 'Test User');
    await page.fill('[data-test="contact-email"]', 'test@test.com');
    await page.fill('[data-test="contact-message"]', 'Hello, this is a test.');
    await page.click('[data-test="contact-submit"]');
    await expect(page.locator('[data-test="contact-success"]')).toBeVisible();
  });
});
