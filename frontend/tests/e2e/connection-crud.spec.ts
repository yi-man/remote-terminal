import { test, expect } from '@playwright/test';
import { TEST_CONNECTION, TEST_USER_ID } from '../fixtures/test-data';
import { apiHelper } from '../utils/api-helper';

test.describe('Connection CRUD', () => {
  test.beforeEach(async () => {
    // Clean up before each test
    await apiHelper.cleanupAllConnections();
  });

  test.afterAll(async () => {
    // Clean up after all tests
    await apiHelper.cleanupAllConnections();
  });

  test('should create a new SSH connection', async ({ page }) => {
    await page.goto('/');

    // Click "新连接" button
    await page.click('button:has-text("+ 新连接")');

    // Fill form - using placeholder or label selectors
    await page.fill('input[placeholder*="例如"]', TEST_CONNECTION.name);
    await page.fill('input[placeholder*="192.168"]', TEST_CONNECTION.host);
    await page.fill('input[placeholder="22"]', TEST_CONNECTION.port.toString());
    await page.fill('input[placeholder="username"]', TEST_CONNECTION.username);

    // Select password auth (already selected by default)
    await page.fill('input[placeholder="Enter password"]', TEST_CONNECTION.password);

    // Submit
    await page.click('button:has-text("保存")');

    // Verify we're back to list and connection exists
    await expect(page).toHaveURL(/\/$/);
    await expect(page.locator(`text=${TEST_CONNECTION.name}`)).toBeVisible({ timeout: 10000 });
  });

  test('should list all connections', async ({ page }) => {
    // Create a connection via API first
    await apiHelper.createConnection({
      ...TEST_CONNECTION,
      user_id: TEST_USER_ID,
      name: 'Test Connection List',
    });

    await page.goto('/');

    // Verify connection appears in list
    await expect(page.locator('text=Test Connection List')).toBeVisible({ timeout: 10000 });
  });
});
