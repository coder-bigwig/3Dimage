import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests/e2e', timeout: 30_000, fullyParallel: true,
  use: { baseURL: process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:8088', trace: 'retain-on-failure' },
  projects: [
    { name: 'desktop-chrome', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 1000 } } },
    { name: 'mobile-chrome', use: { ...devices['Pixel 7'] } },
    { name: 'mobile-safari', use: { ...devices['iPhone 15'] } },
  ],
})
