import { test, expect } from '@playwright/test';
import { TEST_CONNECTION } from '../fixtures/test-data.js';

test.describe('Full E2E Flow', () => {
  // Use a consistent test user ID
  const TEST_USER_ID = 'playwright-test-user-id';

  test.beforeEach(async ({ page }) => {
    // Set the same user ID in localStorage
    await page.goto('/');
    await page.evaluate((userId) => {
      localStorage.setItem('user_id', userId);
    }, TEST_USER_ID);
  });

  test('complete user journey from create to list', async ({ page }) => {
    const uniqueName = `E2E Test ${Date.now()}`;

    // 1. Go to app with our test user ID
    await page.goto('/');

    // 2. Create connection
    await page.click('button:has-text("+ 新连接")');

    // Fill form
    await page.fill('input[placeholder*="例如"]', uniqueName);
    await page.fill('input[placeholder*="192.168"]', TEST_CONNECTION.host);
    await page.fill('input[placeholder="22"]', TEST_CONNECTION.port.toString());
    await page.fill('input[placeholder="username"]', TEST_CONNECTION.username);
    await page.fill('input[placeholder="Enter password"]', TEST_CONNECTION.password);

    await page.click('button:has-text("保存")');

    // Verify connection exists
    await expect(page.locator(`text=${uniqueName}`)).toBeVisible({ timeout: 10000 });

    console.log('✅ Full E2E create and list flow completed!');
  });
});
