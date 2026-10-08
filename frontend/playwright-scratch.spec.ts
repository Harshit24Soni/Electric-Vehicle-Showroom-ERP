import { test, expect } from '@playwright/test';

test('Debug service page', async ({ page }) => {
  page.on('pageerror', error => console.error('PAGE ERROR:', error.message));
  page.on('console', msg => {
    if (msg.type() === 'error') console.error('CONSOLE ERROR:', msg.text());
  });

  console.log('Navigating to dashboard...');
  await page.goto('http://127.0.0.1:3000/dashboard');
  
  console.log('Clicking Service...');
  await page.locator('.hidden.lg\\\\:block').getByRole('link', { name: 'Service', exact: true }).click();
  
  console.log('Waiting for Service page...');
  await page.waitForTimeout(3000);
});
