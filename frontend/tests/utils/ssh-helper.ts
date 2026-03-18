import { Page, expect } from '@playwright/test';

export class SSHHelper {
  private page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  // Wait for terminal to be ready and show prompt
  async waitForTerminalReady(timeout = 10000) {
    // Wait for terminal container to be visible
    await this.page.waitForSelector('[data-testid="terminal-container"]', { timeout });

    // Wait for connection to be established (real SSH path)
    await expect(this.page.locator('[data-testid="connection-status-text"]')).toContainText('已连接', {
      timeout,
    });

    // Give server a moment to flush initial prompt
    await this.page.waitForTimeout(500);
  }

  // Send command to terminal
  async sendCommand(command: string) {
    // xterm uses a hidden textarea for input; focusing it is more reliable than focusing container.
    const input = this.page.locator('.xterm-helper-textarea');
    if (await input.count()) {
      await input.focus();
    } else {
      const terminal = this.page.locator('[data-testid="terminal-container"]');
      await terminal.focus();
    }
    await this.page.keyboard.type(command);
    await this.page.keyboard.press('Enter');
  }

  // Verify terminal contains text
  async expectTerminalContains(text: string, timeout = 10000) {
    await this.page.waitForFunction(
      (expectedText) => {
        const mirror = document.querySelector('[data-testid="terminal-output-mirror"]');
        if (mirror && (mirror.textContent || '').includes(expectedText)) {
          return true;
        }

        // Fallback: xterm.js may render rows into DOM under .xterm-rows.
        const rows = document.querySelector('.xterm-rows');
        return (rows?.textContent || '').includes(expectedText);
      },
      text,
      { timeout }
    );
  }

  // Get connection status
  async getConnectionStatus() {
    const statusEl = this.page.locator('[data-testid="connection-status"]');
    return statusEl.textContent();
  }
}
