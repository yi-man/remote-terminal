import { test, expect } from '@playwright/test';
import { TEST_CONNECTION, TEST_USER_ID } from '../fixtures/test-data';
import { apiHelper } from '../utils/api-helper';

test.describe('Full E2E Flow', () => {
  test.afterAll(async () => {
    await apiHelper.cleanupAllConnections();
  });

  test('complete user journey from create to connect', async ({ page }) => {
    const uniqueName = `E2E Test ${Date.now()}`;

    // 1. Go to app
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

    console.log('✅ E2E create flow completed!');
  });
});
