import { chromium } from 'playwright';
export const siteURL = process.env.MOTION_TEST_URL || 'http://127.0.0.1:8787/';
export const labURL = new URL('web/', siteURL).href;
export const launchBrowser = () => chromium.launch({
  headless: true,
  ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH
    ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH } : {}),
});
