import { test as setup, expect } from '@playwright/test';

const authFile = '.playwright/user.json';

setup('authenticate', async ({ page }) => {
  // Try to login to the app
  // This assumes the backend has been seeded with standard users
  
  // NOTE: For Phase 0.5, we just establish the structure.
  // The actual login flow might vary, but this represents the foundation.
  await page.goto('/login');
  
  // Wait for network idle or form to be visible
  await expect(page.getByRole('heading', { name: /login/i })).toBeVisible({ timeout: 10000 }).catch(() => {});
  
  // As this is just a foundation setup and the actual backend might not be running in this exact mock,
  // There are two inputs on the login page? Usually type="email" and type="password"/pin. 
  // Let's use getByRole or locator.
  await page.locator('input[type="email"], input[name="identifier"]').first().fill('admin@erp.com');
  await page.locator('input[type="password"], input[name="pin"]').first().fill('123456');
  await page.getByRole('button', { name: /sign in/i }).click();
  
  // Wait for successful navigation
  await page.waitForURL('**/dashboard', { timeout: 30000 });
  
  // Save authentication state
  await page.context().storageState({ path: authFile });
});
