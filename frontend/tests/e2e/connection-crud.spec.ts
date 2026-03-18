import { test, expect } from "@playwright/test";
import { TEST_CONNECTION } from "../fixtures/test-data";
import { APIHelper } from "../utils/api-helper.js";

test.describe("Connection CRUD", () => {
  // Use a consistent test user ID
  const TEST_USER_ID = `pw-e2e-connection-crud-${Date.now()}`;

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

  test("should edit an existing connection", async ({ page }) => {
    const helper = new APIHelper(TEST_USER_ID);
    const created = await helper.createConnection({
      ...TEST_CONNECTION,
      user_id: TEST_USER_ID,
      name: `pw-edit-src-${Date.now()}`,
    });

    await page.goto("/");
    await expect(page.locator(`text=${created.name}`)).toBeVisible({ timeout: 10000 });

    const connectionCard = page
      .locator(`text=${created.name}`)
      .locator('xpath=ancestor::div[contains(@class, "bg-gray-800")]');
    await connectionCard.locator('button:has-text("编辑")').click();

    const updatedName = `pw-edit-dst-${Date.now()}`;
    await page.fill('input[placeholder*="例如"]', updatedName);
    await page.fill('input[placeholder*="192.168"]', "1.2.3.4:2222");
    await page.fill('input[placeholder="username"]', "updated_user");
    await page.fill('input[placeholder="Enter password"]', TEST_CONNECTION.password);
    await page.click('button:has-text("保存")');

    await expect(page).toHaveURL(/\/$/, { timeout: 10000 });
    await expect(page.locator(`text=${updatedName}`)).toBeVisible({ timeout: 10000 });
    await expect(page.locator("text=updated_user@1.2.3.4:2222")).toBeVisible({ timeout: 10000 });
  });

  test("should delete an existing connection", async ({ page }) => {
    const helper = new APIHelper(TEST_USER_ID);
    const created = await helper.createConnection({
      ...TEST_CONNECTION,
      user_id: TEST_USER_ID,
      name: `pw-delete-src-${Date.now()}`,
    });

    await page.goto("/");
    await expect(page.locator(`text=${created.name}`)).toBeVisible({ timeout: 10000 });

    page.once("dialog", (dialog) => dialog.accept());

    const connectionCard = page
      .locator(`text=${created.name}`)
      .locator('xpath=ancestor::div[contains(@class, "bg-gray-800")]');
    const deleteResponse = page.waitForResponse((res) => {
      return (
        res.url().includes(`/api/connections/${created.id}`) &&
        res.request().method() === "DELETE"
      );
    });
    await connectionCard.locator('button:has-text("删除")').click();
    const res = await deleteResponse;
    expect(res.status()).toBe(200);

    await expect(page.locator(`h3:text-is("${created.name}")`)).toHaveCount(0, { timeout: 10000 });

    const list = (await helper.getConnections()) as any;
    const ids = (list.data ?? []).map((c: any) => c.id);
    expect(ids).not.toContain(created.id);
  });

  test("should show frontend validation errors and not submit", async ({ page }) => {
    await page.goto("/");
    await page.click('button:has-text("+ 新连接")');

    const name = `pw-invalid-${Date.now()}`;
    await page.fill('input[placeholder*="例如"]', name);
    await page.fill('input[placeholder*="192.168"]', "invalid@host");
    await page.fill('input[placeholder="22"]', "0");
    await page.fill('input[placeholder="username"]', "bad name");
    await page.fill('input[placeholder="Enter password"]', "");

    await page.click('button:has-text("保存")');

    await expect(page).toHaveURL(/\/create$/);
    await expect(page.locator('p:text-is("主机地址格式无效")')).toBeVisible();
    await expect(page.locator("text=Too small: expected number to be >=1").first()).toBeVisible();
    await expect(page.locator('p:text-is("用户名格式无效")')).toBeVisible();
  });

  test("should surface backend 400 error message on submit", async ({ page }) => {
    await page.route("**/api/connections", async (route) => {
      await route.fulfill({
        status: 400,
        contentType: "application/json",
        body: JSON.stringify({
          error: "Validation error",
          details: [{ message: "backend says no" }],
        }),
      });
    });

    await page.goto("/");
    await page.click('button:has-text("+ 新连接")');

    await page.fill('input[placeholder*="例如"]', `pw-backend-400-${Date.now()}`);
    await page.fill('input[placeholder*="192.168"]', "1.2.3.4");
    await page.fill('input[placeholder="22"]', "22");
    await page.fill('input[placeholder="username"]', "ok_user");
    await page.fill('input[placeholder="Enter password"]', "ok_password");
    await page.click('button:has-text("保存")');

    await expect(page.locator("text=Validation error")).toBeVisible();
  });
});
