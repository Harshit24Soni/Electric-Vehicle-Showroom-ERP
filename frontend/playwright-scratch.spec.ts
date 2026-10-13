import { test } from '@playwright/test';

test('Debug service page', async ({ page }) => {
  await page.goto('/dashboard');
  
  await page.locator('.hidden.lg\\:block').getByRole('link', { name: 'Service', exact: true }).click();
  
  await page.waitForTimeout(3000);
});
