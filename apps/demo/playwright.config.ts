// Automated accessibility audit of the demo and the reference review components it renders
// (axe-core in Chromium). It starts a scripted Teacher Gate service and the demo's Vite server,
// so it needs no model and no network. Run with `pnpm test:a11y` from the repository root.
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  timeout: 60_000,
  reporter: [["list"]],
  use: { baseURL: "http://localhost:5187", trace: "retain-on-failure" },
  projects: [
    // Full Chromium ("new headless"), not the headless shell: on some macOS hosts the shell never
    // fires requestAnimationFrame, which axe and Playwright's stability checks wait on.
    { name: "desktop", use: { ...devices["Desktop Chrome"], channel: "chromium" } },
    { name: "mobile", use: { ...devices["Pixel 7"], channel: "chromium" } },
  ],
  webServer: [
    { command: "pnpm exec tsx e2e/fake-service.ts", url: "http://localhost:8817/healthz", env: { PORT: "8817" }, reuseExistingServer: false },
    { command: "pnpm exec vite --port 5187 --strictPort", url: "http://localhost:5187", env: { TEACHER_GATE_URL: "http://localhost:8817" }, reuseExistingServer: false },
  ],
});
