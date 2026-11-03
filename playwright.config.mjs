import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "e2e",
  fullyParallel: true,
  reporter: "list",
  use: { channel: "chrome", trace: "retain-on-failure" },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"], channel: "chrome", viewport: { width: 1440, height: 900 } }, grepInvert: /@phone/ },
    { name: "phone", use: { ...devices["Pixel 7"], channel: "chrome" }, grep: /@phone/ },
  ],
});
