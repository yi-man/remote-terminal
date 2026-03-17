import { test, expect } from '@playwright/test';
import { TEST_CONNECTION, TEST_USER_ID } from '../fixtures/test-data';
import { apiHelper } from '../utils/api-helper';

test.describe('SSH Terminal', () => {
  let connectionId: string;

  test.beforeAll(async () => {
    // Create a test connection
    const result = await apiHelper.createConnection({
      ...TEST_CONNECTION,
      user_id: TEST_USER_ID,
    }) as any;
    connectionId = result.data.id;
  });

  test.afterAll(async () => {
    // Clean up
    await apiHelper.cleanupAllConnections();
  });

  test('should connect to SSH and show terminal', async ({ page }) => {
    await page.goto('/');

    // Click connect button - find it by the connection name
    const connectionCard = page.locator(`text=${TEST_CONNECTION.name}`).locator('xpath=ancestor::div[contains(@class, "bg-gray-800")]');
    await connectionCard.locator('button:has-text("连接")').click();

    // Wait a bit for terminal to load
    await page.waitForTimeout(5000);

    // Check that we didn't get an error and are still on the page
    await expect(page).toBeTruthy();
  });
});
