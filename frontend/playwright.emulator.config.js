const { defineConfig, devices } = require("@playwright/test");
const { appOrigin } = require("./tests/fixtures/synthetic-auth.cjs");

module.exports = defineConfig({
  testDir: "./tests",
  testMatch: ["bugfix-jun04.spec.js", "equipment-health-eh8.spec.js"],
  outputDir: "../.tools/production-source-sync/playwright-emulator-results",
  workers: 1,
  reporter: "list",
  use: {
    ...devices["Desktop Chrome"],
    channel: process.env.PLAYWRIGHT_BROWSER_CHANNEL || undefined,
    baseURL: appOrigin,
    serviceWorkers: "block",
    trace: "off",
    screenshot: "off",
    video: "off",
  },
});
