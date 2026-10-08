import { test, expect } from '@playwright/test';

test.describe('Responsive Baseline', () => {
  test('Main application loads without horizontal overflow', async ({ page }) => {
    // Navigate to the dashboard or main page
    await page.goto('/');

    // Ensure the page is loaded
    await expect(page.locator('body')).toBeVisible();

    // Check for horizontal overflow
    const hasHorizontalScroll = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth;
    });

    expect(hasHorizontalScroll).toBe(false);
  });
});
