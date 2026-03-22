/// <reference types="node" />
import { defineConfig, devices } from "@playwright/test";

const mode = process.env.PW_E2E_MODE ?? "dev";
const isCiMode = mode === "ci";

export default defineConfig({
  testDir: "./tests",
  testMatch: ["api/**/*.spec.ts", "e2e/**/*.spec.ts"],
  globalSetup: "./tests/global-setup.ts",
  globalTeardown: "./tests/global-teardown.ts",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 4,
  reporter: [["html", { open: "never" }]],
  use: {
    baseURL: isCiMode ? "http://localhost:8080" : "http://localhost:5173",
    headless: true,
    screenshot: "only-on-failure",
    video: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: isCiMode
    ? [
        {
          command: "pnpm -C ../backend start",
          url: "http://localhost:8080/health",
          reuseExistingServer: true,
          timeout: 60_000,
        },
      ]
    : [
        {
          command: "pnpm dev -- --host 127.0.0.1 --port 5173",
          url: "http://localhost:5173",
          reuseExistingServer: true,
          timeout: 60_000,
        },
        {
          command: "pnpm -C ../backend dev",
          url: "http://localhost:8080/health",
          reuseExistingServer: true,
          timeout: 60_000,
        },
      ],
});
