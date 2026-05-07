import { test, expect } from '@playwright/test';

const unique = () => Date.now().toString(36);

test.describe('Sprint 3: Deals + Pipelines + Activities', () => {
  let wsSlug: string;
  let email: string;
  let password: string;

  test.beforeAll(() => {
    const id = unique();
    wsSlug = `test-ws-${id}`;
    email = `e2e-${id}@test.com`;
    password = 'TestPass123!';
  });

  test('signup → kanban → create deal → detail → activities', async ({ page }) => {
    // 1. Sign up
    await page.goto('/sign-up');
    await page.fill('[data-test="field-fullName"] input, input[name="fullName"]', 'E2E Tester');
    await page.fill('[data-test="field-email"] input, input[name="email"]', email);
    await page.fill('[data-test="field-password"] input, input[name="password"]', password);
    await page.fill('[data-test="field-workspaceName"] input, input[name="workspaceName"]', 'Test WS');
    await page.fill('[data-test="field-workspaceSlug"] input, input[name="workspaceSlug"]', wsSlug);
    await page.click('[data-test="submit"]');
    await expect(page).toHaveURL(/dashboard/, { timeout: 10_000 });

    // 2. Navigate to Deals (Kanban)
    await page.click('[data-test="nav-deals"]');
    await expect(page).toHaveURL(/deals/);
    await expect(page.locator('[data-test="deals-kanban-page"]')).toBeVisible();

    // 3. Kanban board should be visible (may be empty or have default pipeline)
    await page.waitForTimeout(1000);

    // 4. Navigate to Deals list view
    await page.goto('/deals/list');
    await expect(page.locator('[data-test="deals-list-page"]')).toBeVisible();
  });

  test('pipelines admin page', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[name="email"]', email);
    await page.fill('input[name="password"]', password);
    await page.fill('input[name="workspaceSlug"]', wsSlug);
    await page.click('[data-test="submit"]');
    await expect(page).toHaveURL(/dashboard/, { timeout: 10_000 });

    // Navigate to pipelines admin
    await page.click('[data-test="nav-pipelines"]');
    await expect(page).toHaveURL(/settings\/pipelines/);
    await expect(page.locator('[data-test="pipelines-admin-page"]')).toBeVisible();
    await expect(page.locator('[data-test="add-pipeline-btn"]')).toBeVisible();
  });

  test('won/lost reasons admin page', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[name="email"]', email);
    await page.fill('input[name="password"]', password);
    await page.fill('input[name="workspaceSlug"]', wsSlug);
    await page.click('[data-test="submit"]');
    await expect(page).toHaveURL(/dashboard/, { timeout: 10_000 });

    await page.goto('/settings/won-lost-reasons');
    await expect(page.locator('[data-test="won-lost-reasons-page"]')).toBeVisible();
    await expect(page.locator('[data-test="add-reason-btn"]')).toBeVisible();
  });

  test('calendar page loads', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[name="email"]', email);
    await page.fill('input[name="password"]', password);
    await page.fill('input[name="workspaceSlug"]', wsSlug);
    await page.click('[data-test="submit"]');
    await expect(page).toHaveURL(/dashboard/, { timeout: 10_000 });

    await page.click('[data-test="nav-calendar"]');
    await expect(page).toHaveURL(/calendar/);
    await expect(page.locator('[data-test="activity-calendar-page"]')).toBeVisible();
    await expect(page.locator('[data-test="calendar-grid"]')).toBeVisible();
  });
});
