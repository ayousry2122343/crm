import { test, expect } from '@playwright/test';

const unique = () => Date.now().toString(36);

test.describe('Sprint 2: People Management', () => {
  let wsSlug: string;
  let email: string;
  let password: string;

  test.beforeAll(() => {
    const id = unique();
    wsSlug = `test-ws-${id}`;
    email = `e2e-${id}@test.com`;
    password = 'TestPass123!';
  });

  test('signup → create person → tag → search → view detail', async ({ page }) => {
    // 1. Sign up
    await page.goto('/sign-up');
    await page.fill('[data-test="field-fullName"] input, input[name="fullName"]', 'E2E Tester');
    await page.fill('[data-test="field-email"] input, input[name="email"]', email);
    await page.fill('[data-test="field-password"] input, input[name="password"]', password);
    await page.fill('[data-test="field-workspaceName"] input, input[name="workspaceName"]', 'Test WS');
    await page.fill('[data-test="field-workspaceSlug"] input, input[name="workspaceSlug"]', wsSlug);
    await page.click('[data-test="submit"]');
    await expect(page).toHaveURL(/dashboard/, { timeout: 10_000 });

    // 2. Navigate to People
    await page.click('[data-test="nav-people"]');
    await expect(page).toHaveURL(/people/);

    // 3. Create a Person
    await page.click('[data-test="add-btn"]');
    await expect(page.locator('[data-test="create-dialog"]')).toBeVisible();

    // Fill in person form (fields depend on metadata; use first/last name if available)
    const form = page.locator('[data-test="create-dialog"]');
    const inputs = form.locator('input[type="text"]');
    const inputCount = await inputs.count();
    if (inputCount > 0) {
      await inputs.first().fill('Sara Mohamed');
    }
    await form.locator('[data-test="submit"]').click();

    // Wait for dialog to close and list to refresh
    await expect(page.locator('[data-test="create-dialog"]')).not.toBeVisible({ timeout: 5_000 });

    // 4. Verify person appears in the list
    await expect(page.locator('[data-test="data-table"]')).toContainText('Sara');

    // 5. Search for the person
    await page.fill('[data-test="search-input"]', 'Sara');
    await page.click('[data-test="search-btn"]');
    await expect(page.locator('[data-test="data-table"]')).toContainText('Sara');

    // 6. Click on the person to view detail
    await page.locator('[data-test="data-table"] tr').filter({ hasText: 'Sara' }).first().click();
    await expect(page).toHaveURL(/people\/.+/);
    await expect(page.locator('[data-test="display-name"]')).toContainText('Sara');

    // 7. Verify tabs exist
    await expect(page.locator('[data-test="overview-tab"]')).toBeVisible();

    // 8. Go back to list
    await page.click('[data-test="back-btn"]');
    await expect(page).toHaveURL(/people$/);
  });

  test('navigate to companies view', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[name="email"]', email);
    await page.fill('input[name="password"]', password);
    await page.fill('input[name="workspaceSlug"]', wsSlug);
    await page.click('[data-test="submit"]');
    await expect(page).toHaveURL(/dashboard/, { timeout: 10_000 });

    await page.click('[data-test="nav-companies"]');
    await expect(page).toHaveURL(/companies/);
    await expect(page.locator('[data-test="people-list-page"]')).toContainText('Companies');
  });

  test('global search via Cmd-K', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[name="email"]', email);
    await page.fill('input[name="password"]', password);
    await page.fill('input[name="workspaceSlug"]', wsSlug);
    await page.click('[data-test="submit"]');
    await expect(page).toHaveURL(/dashboard/, { timeout: 10_000 });

    // Open search with keyboard shortcut
    await page.keyboard.press('Control+k');
    await expect(page.locator('[data-test="global-search-dialog"]')).toBeVisible();

    // Type search query
    await page.fill('[data-test="search-query-input"]', 'Sara');

    // Wait for debounced results
    await page.waitForTimeout(500);

    // Close search
    await page.keyboard.press('Escape');
  });

  test('lists page loads and shows create button', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[name="email"]', email);
    await page.fill('input[name="password"]', password);
    await page.fill('input[name="workspaceSlug"]', wsSlug);
    await page.click('[data-test="submit"]');
    await expect(page).toHaveURL(/dashboard/, { timeout: 10_000 });

    await page.click('[data-test="nav-lists"]');
    await expect(page).toHaveURL(/lists/);
    await expect(page.locator('[data-test="add-list-btn"]')).toBeVisible();
  });
});
