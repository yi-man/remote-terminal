import { test, expect } from '@playwright/test';

test.describe('Health Check', () => {
  test('backend health endpoint returns 200', async ({ request }) => {
    const response = await request.get('http://localhost:8080/health');
    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    expect(data).toHaveProperty('status');
    expect(data.status).toBe('ok');
  });

  test('frontend page loads successfully', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/Remote Terminal/);
    // Check that main app component is rendered
    await expect(page.locator('body')).toBeVisible();
  });
});
