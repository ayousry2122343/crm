import { test, expect } from '@playwright/test';

const unique = () => Date.now().toString(36);

test.describe('Sprint 4: Email + Forms + Workflows + Webhooks', () => {
  let wsSlug: string;
  let email: string;
  let password: string;

  test.beforeAll(() => {
    const id = unique();
    wsSlug = `test-ws-${id}`;
    email = `e2e-${id}@test.com`;
    password = 'TestPass123!';
  });

  test('signup → email templates → forms → workflows → webhooks', async ({ page }) => {
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

    // 2. Email Templates
    await page.click('[data-test="nav-email-templates"]');
    await expect(page.locator('[data-test="email-templates-page"]')).toBeVisible();
    await page.click('[data-test="add-template-btn"]');
    await page.locator('[data-test="template-name"]').fill('Welcome');
    await page.locator('[data-test="template-subject"]').fill('Welcome {{ person.fullName }}');
    await page
      .locator('[data-test="template-body"]')
      .fill('Hello {{ person.fullName }}, welcome!');
    await page.getByRole('button', { name: /save/i }).click();
    await expect(page.locator('[data-test="templates-table"]')).toContainText('Welcome');

    // 3. Forms
    await page.click('[data-test="nav-forms"]');
    await expect(page.locator('[data-test="forms-index-page"]')).toBeVisible();
    await page.click('[data-test="add-form-btn"]');
    await page.locator('[data-test="form-name-input"]').fill('Contact Us');
    await page.locator('[data-test="form-slug-input"]').fill('contact-us');
    await page.getByRole('button', { name: /save/i }).click();
    await expect(page).toHaveURL(/forms\/.+/);

    // 4. Workflows
    await page.click('[data-test="nav-workflows"]');
    await expect(page.locator('[data-test="workflows-index-page"]')).toBeVisible();
    await page.click('[data-test="add-workflow-btn"]');
    await expect(page.locator('[data-test="workflow-editor-page"]')).toBeVisible();
    await page.locator('[data-test="workflow-name"]').fill('Auto-assign new leads');
    await page.locator('[data-test="save-workflow-btn"]').click();

    // 5. Webhooks
    await page.click('[data-test="nav-webhooks"]');
    await expect(page.locator('[data-test="webhooks-admin-page"]')).toBeVisible();
    await page.click('[data-test="add-webhook-btn"]');
    await page.locator('[data-test="webhook-url-input"]').fill('https://example.com/webhook');
  });

  test('forms page renders independently', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[name="email"]', email);
    await page.fill('input[name="password"]', password);
    await page.fill('input[name="workspaceSlug"]', wsSlug);
    await page.click('[data-test="submit"]');
    await expect(page).toHaveURL(/dashboard/, { timeout: 10_000 });

    await page.click('[data-test="nav-forms"]');
    await expect(page.locator('[data-test="forms-index-page"]')).toBeVisible();
  });

  test('workflows page renders independently', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[name="email"]', email);
    await page.fill('input[name="password"]', password);
    await page.fill('input[name="workspaceSlug"]', wsSlug);
    await page.click('[data-test="submit"]');
    await expect(page).toHaveURL(/dashboard/, { timeout: 10_000 });

    await page.click('[data-test="nav-workflows"]');
    await expect(page.locator('[data-test="workflows-index-page"]')).toBeVisible();
  });
});
