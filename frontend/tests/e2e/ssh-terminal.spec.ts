import { test, expect } from '@playwright/test';
import { TEST_CONNECTION } from '../fixtures/test-data.js';
import { APIHelper } from '../utils/api-helper.js';

test.describe('SSH Terminal', () => {
  // Use a consistent test user ID
  const TEST_USER_ID = 'playwright-test-user-id';

  test.beforeEach(async ({ page }) => {
    // Clean up before each test
    const helper = new APIHelper(TEST_USER_ID);
    await helper.cleanupAllConnections();

    // Set the same user ID in localStorage
    await page.addInitScript((userId) => {
      localStorage.setItem('user_id', userId);
    }, TEST_USER_ID);
  });

  test.afterAll(async () => {
    // Clean up after all tests
    const helper = new APIHelper(TEST_USER_ID);
    await helper.cleanupAllConnections();
  });

  test('should be able to create a connection and see it on list', async ({ page }) => {
    const uniqueName = `我的mac-${Date.now()}`;

    // Reload to ensure localStorage takes effect
    await page.goto('/');

    // Create connection via UI
    await page.click('button:has-text("+ 新连接")');

    await page.fill('input[placeholder*="例如"]', uniqueName);
    await page.fill('input[placeholder*="192.168"]', TEST_CONNECTION.host);
    await page.fill('input[placeholder="22"]', TEST_CONNECTION.port.toString());
    await page.fill('input[placeholder="username"]', TEST_CONNECTION.username);
    await page.fill('input[placeholder="Enter password"]', TEST_CONNECTION.password);

    await page.click('button:has-text("保存")');

    // Verify connection exists
    await expect(page.locator(`text=${uniqueName}`)).toBeVisible({ timeout: 10000 });
    console.log('✅ Connection creation verified!');
  });
});
