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

    // Wait a bit for connection to establish and prompt to appear
    await this.page.waitForTimeout(2000);
  }

  // Send command to terminal
  async sendCommand(command: string) {
    const terminal = this.page.locator('[data-testid="terminal-container"]');
    await terminal.focus();
    await this.page.keyboard.type(command);
    await this.page.keyboard.press('Enter');
  }

  // Verify terminal contains text
  async expectTerminalContains(text: string, timeout = 10000) {
    // Check the terminal output - this is simplified
    // xterm.js renders to canvas, so we might need a different approach
    await this.page.waitForFunction(
      (expectedText) => {
        return document.body.textContent?.includes(expectedText);
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
