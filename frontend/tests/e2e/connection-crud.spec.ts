import { test, expect } from "@playwright/test";
import { TEST_CONNECTION } from "../fixtures/test-data.js";
import { APIHelper } from "../utils/api-helper.js";

test.describe("Connection CRUD", () => {
  // Use a consistent test user ID
  const TEST_USER_ID = "playwright-test-user-id";

  test.beforeEach(async ({ page }) => {
    // Clean up before each test
    const helper = new APIHelper(TEST_USER_ID);
    await helper.cleanupAllConnections();

    // 在页面加载前设置 localStorage 中的 user_id
    await page.addInitScript((userId) => {
      localStorage.setItem("user_id", userId);
    }, TEST_USER_ID);
  });

  test.afterAll(async () => {
    // Clean up after all tests
    const helper = new APIHelper(TEST_USER_ID);
    await helper.cleanupAllConnections();
  });

  test("should create a new SSH connection", async ({ page }) => {
    const uniqueName = `我的mac-${Date.now()}`;

    // Reload to ensure localStorage takes effect
    await page.goto("/");

    // Click "新连接" button
    await page.click('button:has-text("+ 新连接")');

    // Fill form - using placeholder or label selectors
    await page.fill('input[placeholder*="例如"]', uniqueName);
    await page.fill('input[placeholder*="192.168"]', TEST_CONNECTION.host);
    await page.fill('input[placeholder="22"]', TEST_CONNECTION.port.toString());
    await page.fill('input[placeholder="username"]', TEST_CONNECTION.username);

    // Select password auth (already selected by default)
    await page.fill(
      'input[placeholder="Enter password"]',
      TEST_CONNECTION.password,
    );

    // Submit
    await page.click('button:has-text("保存")');

    // Verify we're back to list and connection exists
    await expect(page).toHaveURL(/\/$/);
    await expect(page.locator(`text=${uniqueName}`)).toBeVisible({
      timeout: 10000,
    });
  });

  test("should list all connections", async ({ page }) => {
    const helper = new APIHelper(TEST_USER_ID);

    // 创建测试连接
    await helper.createConnection({
      ...TEST_CONNECTION,
      user_id: TEST_USER_ID,
      name: "Test Connection List",
    });

    // 在页面加载前设置 localStorage，避免 useUserId 钩子生成新指纹
    await page.addInitScript((userId) => {
      localStorage.setItem("user_id", userId);
    }, TEST_USER_ID);

    // 访问页面
    await page.goto("/");

    // 验证连接是否显示在列表中
    await expect(page.locator("text=Test Connection List")).toBeVisible({
      timeout: 10000,
    });
  });
});
