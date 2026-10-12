import { test } from '@playwright/test';

test('Debug service page', async ({ page }) => {
  await page.goto('http://127.0.0.1:3000/dashboard');
  
  await page.locator('.hidden.lg\\:block').getByRole('link', { name: 'Service', exact: true }).click();
  
  await page.waitForTimeout(3000);
});
