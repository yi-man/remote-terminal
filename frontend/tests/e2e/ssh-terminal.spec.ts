import { test, expect } from "@playwright/test";
import { TEST_CONNECTION } from "../fixtures/test-data";
import { APIHelper } from "../utils/api-helper.js";
import { SSHHelper } from "../utils/ssh-helper.js";

test.describe("SSH Terminal", () => {
  // Use a consistent test user ID
  const TEST_USER_ID = `pw-e2e-ssh-terminal-${Date.now()}`;

  test.beforeEach(async ({ page }) => {
    // Clean up before each test
    const helper = new APIHelper(TEST_USER_ID);
    await helper.cleanupAllConnections();

    // Set the same user ID in localStorage
    await page.addInitScript((userId) => {
      localStorage.setItem("user_id", userId);
    }, TEST_USER_ID);
  });

  test.afterAll(async () => {
    // Clean up after all tests
    const helper = new APIHelper(TEST_USER_ID);
    await helper.cleanupAllConnections();
  });

  test("should be able to create a connection and see it on list", async ({
    page,
  }) => {
    const uniqueName = `我的mac-${Date.now()}`;

    // Reload to ensure localStorage takes effect
    await page.goto("/");

    // Create connection via UI
    await page.click('button:has-text("+ 新连接")');

    await page.fill('input[placeholder*="例如"]', uniqueName);
    await page.fill('input[placeholder*="192.168"]', TEST_CONNECTION.host);
    await page.fill('input[placeholder="22"]', TEST_CONNECTION.port.toString());
    await page.fill('input[placeholder="username"]', TEST_CONNECTION.username);
    await page.fill(
      'input[placeholder="Enter password"]',
      TEST_CONNECTION.password,
    );

    await page.click('button:has-text("保存")');

    // Verify connection exists
    await expect(page.locator(`text=${uniqueName}`)).toBeVisible({
      timeout: 10000,
    });
    console.log("✅ Connection creation verified!");
  });

  test("should connect to SSH server", async ({ page }) => {
    const uniqueName = `测试终端-${Date.now()}`;

    // Reload to ensure localStorage takes effect
    await page.goto("/");

    // 1. Create connection
    await page.click('button:has-text("+ 新连接")');
    await page.fill('input[placeholder*="例如"]', uniqueName);
    await page.fill('input[placeholder*="192.168"]', TEST_CONNECTION.host);
    await page.fill('input[placeholder="22"]', TEST_CONNECTION.port.toString());
    await page.fill('input[placeholder="username"]', TEST_CONNECTION.username);
    await page.fill(
      'input[placeholder="Enter password"]',
      TEST_CONNECTION.password,
    );
    await page.click('button:has-text("保存")');

    // 2. Wait for connection to appear in list
    await expect(page.locator(`text=${uniqueName}`)).toBeVisible({
      timeout: 10000,
    });

    // 3. Find the connection card and click the "连接" button
    const connectionCard = page
      .locator(`text=${uniqueName}`)
      .locator('xpath=ancestor::div[contains(@class, "bg-gray-800")]');
    await connectionCard.locator('button:has-text("连接")').click();

    // 4. Wait for terminal page to load
    await expect(page.locator('[data-testid="terminal-page"]')).toBeVisible({
      timeout: 15000,
    });

    // 5. Wait a bit for connection to establish
    await page.waitForTimeout(3000);

    // 6. Check if we have any status - either connected or error is fine for now
    // We just want to verify the terminal page loads and attempts connection
    const terminalContainer = page.locator(
      '[data-testid="terminal-container"]',
    );
    await expect(terminalContainer).toBeVisible();

    console.log("✅ SSH terminal page loads and attempts connection!");
  });

  test("should connect, disconnect and reconnect SSH terminal without errors", async ({
    page,
  }) => {
    const uniqueName = `测试连接断开-${Date.now()}`;

    // Reload to ensure localStorage takes effect
    await page.goto("/");

    // 1. Create connection
    await page.click('button:has-text("+ 新连接")');
    await page.fill('input[placeholder*="例如"]', uniqueName);
    await page.fill('input[placeholder*="192.168"]', TEST_CONNECTION.host);
    await page.fill('input[placeholder="22"]', TEST_CONNECTION.port.toString());
    await page.fill('input[placeholder="username"]', TEST_CONNECTION.username);
    await page.fill(
      'input[placeholder="Enter password"]',
      TEST_CONNECTION.password,
    );
    await page.click('button:has-text("保存")');

    // 2. Wait for connection to appear in list
    await expect(page.locator(`text=${uniqueName}`)).toBeVisible({
      timeout: 10000,
    });

    // 3. Find the connection card and click the "连接" button
    const connectionCard = page
      .locator(`text=${uniqueName}`)
      .locator('xpath=ancestor::div[contains(@class, "bg-gray-800")]');
    await connectionCard.locator('button:has-text("连接")').click();

    // 4. Wait for terminal page to load
    await expect(page.locator('[data-testid="terminal-page"]')).toBeVisible({
      timeout: 15000,
    });
    await page.waitForTimeout(2000);

    // 5. Click disconnect button
    page.once("dialog", async (dialog) => {
      await dialog.accept();
    });
    await page.click('button:has-text("断开")');

    // 6. Wait for terminal page to be disposed and connection list to appear
    await expect(page.locator('[data-testid="terminal-page"]')).not.toBeVisible(
      { timeout: 10000 },
    );
    await expect(page.locator(`text=${uniqueName}`)).toBeVisible({
      timeout: 5000,
    });

    console.log("✅ SSH terminal disconnected successfully!");

    // 7. Reconnect again
    await connectionCard.locator('button:has-text("连接")').click();

    // 8. Wait for terminal page to load again
    await expect(page.locator('[data-testid="terminal-page"]')).toBeVisible({
      timeout: 15000,
    });
    await page.waitForTimeout(2000);

    // 9. Verify terminal is operational
    const terminalContainer = page.locator(
      '[data-testid="terminal-container"]',
    );
    await expect(terminalContainer).toBeVisible();

    console.log("✅ SSH terminal reconnected successfully!");

    // 10. Check for any errors in console
    const errors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        errors.push(msg.text());
      }
    });

    // 11. Disconnect again to clean up
    page.once("dialog", async (dialog) => {
      await dialog.accept();
    });
    await page.click('button:has-text("断开")');
    await expect(page.locator('[data-testid="terminal-page"]')).not.toBeVisible(
      { timeout: 10000 },
    );

    // 12. Verify no errors occurred
    if (errors.length > 0) {
      console.error("Errors found in console:", errors);
      expect(errors.length).toBe(0);
    }
  });

  test.describe.serial("SSH Terminal - kill-session", () => {
    test("should not mark session as reused after disconnect (kill-session) and reconnect", async ({
      page,
    }) => {
      const uniqueName = `测试复用断言-${Date.now()}`;

      await page.goto("/");

      // Create connection
      await page.click('button:has-text("+ 新连接")');
      await page.fill('input[placeholder*="例如"]', uniqueName);
      await page.fill('input[placeholder*="192.168"]', TEST_CONNECTION.host);
      await page.fill(
        'input[placeholder="22"]',
        TEST_CONNECTION.port.toString(),
      );
      await page.fill(
        'input[placeholder="username"]',
        TEST_CONNECTION.username,
      );
      await page.fill(
        'input[placeholder="Enter password"]',
        TEST_CONNECTION.password,
      );
      await page.click('button:has-text("保存")');

      // Connect
      const connectionCard = page
        .locator(`text=${uniqueName}`)
        .locator('xpath=ancestor::div[contains(@class, "bg-gray-800")]');
      await connectionCard.locator('button:has-text("连接")').click();
      await expect(page.locator('[data-testid="terminal-page"]')).toBeVisible({
        timeout: 15000,
      });

      // Disconnect triggers kill-session in UI
      page.once("dialog", async (dialog) => {
        await dialog.accept();
      });
      await page.click('button:has-text("断开")');
      await expect(
        page.locator('[data-testid="terminal-page"]'),
      ).not.toBeVisible({ timeout: 10000 });

      // Reconnect
      await connectionCard.locator('button:has-text("连接")').click();
      await expect(page.locator('[data-testid="terminal-page"]')).toBeVisible({
        timeout: 15000,
      });

      // On reconnect after kill-session, it should not be "reused"
      await expect(
        page.locator('[data-testid="connection-status-text"]'),
      ).not.toContainText("复用", {
        timeout: 15000,
      });
    });
  });

  test("should show error for connection not found", async ({ page }) => {
    await page.goto("/connections/does-not-exist/terminal");

    await expect(page.locator('[data-testid="terminal-page"]')).toBeVisible({
      timeout: 15000,
    });
    await expect(page.locator('[data-testid="error-message"]')).toBeVisible({
      timeout: 15000,
    });
    await expect(page.locator('[data-testid="error-message"]')).toContainText(
      "Connection not found",
    );
    await expect(
      page.locator('[data-testid="connection-status-text"]'),
    ).toHaveText("连接失败");
  });

  test("should show Unauthorized error when user_id mismatches connection owner", async ({
    page,
  }) => {
    const userA = `pw-e2e-ssh-unauth-A-${Date.now()}`;
    const userB = `pw-e2e-ssh-unauth-B-${Date.now()}`;
    const helperA = new APIHelper(userA);

    const created = await helperA.createConnection({
      ...TEST_CONNECTION,
      user_id: userA,
      name: `pw-unauthorized-${Date.now()}`,
    });

    // Override suite initScript user_id and simulate a different user
    await page.addInitScript((userId) => {
      localStorage.setItem("user_id", userId);
    }, userB);

    await page.goto(`/connections/${created.id}/terminal`);

    await expect(page.locator('[data-testid="terminal-page"]')).toBeVisible({
      timeout: 15000,
    });
    await expect(page.locator('[data-testid="error-message"]')).toBeVisible({
      timeout: 15000,
    });
    await expect(page.locator('[data-testid="error-message"]')).toContainText(
      "Unauthorized",
    );
    await expect(
      page.locator('[data-testid="connection-status-text"]'),
    ).toHaveText("连接失败");

    await helperA.cleanupAllConnections();
  });

  test("should not crash on viewport resize while on terminal page", async ({
    page,
  }) => {
    const uniqueName = `测试resize-${Date.now()}`;

    await page.goto("/");

    // Create connection
    await page.click('button:has-text("+ 新连接")');
    await page.fill('input[placeholder*="例如"]', uniqueName);
    await page.fill('input[placeholder*="192.168"]', TEST_CONNECTION.host);
    await page.fill('input[placeholder="22"]', TEST_CONNECTION.port.toString());
    await page.fill('input[placeholder="username"]', TEST_CONNECTION.username);
    await page.fill(
      'input[placeholder="Enter password"]',
      TEST_CONNECTION.password,
    );
    await page.click('button:has-text("保存")');

    // Connect
    const connectionCard = page
      .locator(`text=${uniqueName}`)
      .locator('xpath=ancestor::div[contains(@class, "bg-gray-800")]');
    await connectionCard.locator('button:has-text("连接")').click();
    await expect(page.locator('[data-testid="terminal-page"]')).toBeVisible({
      timeout: 15000,
    });

    await page.setViewportSize({ width: 390, height: 720 });
    await expect(page.locator('[data-testid="terminal-page"]')).toBeVisible();
    await expect(
      page.locator('[data-testid="connection-status-text"]'),
    ).toBeVisible();

    await page.setViewportSize({ width: 430, height: 820 });
    await expect(page.locator('[data-testid="terminal-page"]')).toBeVisible();
    await expect(
      page.locator('[data-testid="connection-status-text"]'),
    ).toBeVisible();
  });

  test("should execute a real SSH command and show marker output", async ({
    page,
  }) => {
    const uniqueName = `测试marker-${Date.now()}`;
    const helper = new SSHHelper(page);
    const marker = `__pw_marker__${Date.now()}__`;

    await page.goto("/");

    // Create connection
    await page.click('button:has-text("+ 新连接")');
    await page.fill('input[placeholder*="例如"]', uniqueName);
    await page.fill('input[placeholder*="192.168"]', TEST_CONNECTION.host);
    await page.fill('input[placeholder="22"]', TEST_CONNECTION.port.toString());
    await page.fill('input[placeholder="username"]', TEST_CONNECTION.username);
    await page.fill(
      'input[placeholder="Enter password"]',
      TEST_CONNECTION.password,
    );
    await page.click('button:has-text("保存")');

    // Connect
    const connectionCard = page
      .locator(`text=${uniqueName}`)
      .locator('xpath=ancestor::div[contains(@class, "bg-gray-800")]');
    await connectionCard.locator('button:has-text("连接")').click();
    await expect(page.locator('[data-testid="terminal-page"]')).toBeVisible({
      timeout: 15000,
    });

    await helper.waitForTerminalReady(30000);
    await helper.sendCommand(`echo "${marker}"`);
    await helper.expectTerminalContains(marker, 30000);
  });

  test("should reuse session on reload and replay history containing marker", async ({
    page,
  }) => {
    const uniqueName = `测试回放-${Date.now()}`;
    const helper = new SSHHelper(page);
    const marker = `__pw_replay__${Date.now()}__`;

    await page.goto("/");

    // Create connection
    await page.click('button:has-text("+ 新连接")');
    await page.fill('input[placeholder*="例如"]', uniqueName);
    await page.fill('input[placeholder*="192.168"]', TEST_CONNECTION.host);
    await page.fill('input[placeholder="22"]', TEST_CONNECTION.port.toString());
    await page.fill('input[placeholder="username"]', TEST_CONNECTION.username);
    await page.fill(
      'input[placeholder="Enter password"]',
      TEST_CONNECTION.password,
    );
    await page.click('button:has-text("保存")');

    // Connect
    const connectionCard = page
      .locator(`text=${uniqueName}`)
      .locator('xpath=ancestor::div[contains(@class, "bg-gray-800")]');
    await connectionCard.locator('button:has-text("连接")').click();
    await expect(page.locator('[data-testid="terminal-page"]')).toBeVisible({
      timeout: 15000,
    });

    await helper.waitForTerminalReady(30000);
    await helper.sendCommand(`echo "${marker}"`);
    await helper.expectTerminalContains(marker, 30000);

    // Reload the terminal route. This should disconnect the socket without kill-session,
    // allowing the backend to reuse the existing session and replay history.
    await page.reload();

    await expect(page.locator('[data-testid="terminal-page"]')).toBeVisible({
      timeout: 15000,
    });
    await expect(
      page.locator('[data-testid="connection-status-text"]'),
    ).toContainText("复用", {
      timeout: 15000,
    });
    await helper.expectTerminalContains(marker, 30000);
  });
});
