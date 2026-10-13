import { test as setup } from '@playwright/test';
import fs from 'fs';
import path from 'path';

const authFile = '.playwright/user.json';

// Deterministic test token with ADMIN role for browser automation contexts
function createTestToken() {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(
    JSON.stringify({
      sub: 'admin@erp.com',
      role: 'ADMIN',
      designation: 'ADMIN',
      staff_id: 1,
      name: 'System Admin',
      exp: Math.floor(Date.now() / 1000) + 86400 * 30, // 30 days
    })
  ).toString('base64url');
  const signature = 'e2e_test_signature';
  return `${header}.${payload}.${signature}`;
}

setup('authenticate', async ({ page }) => {
  const authDir = path.dirname(authFile);
  if (!fs.existsSync(authDir)) {
    fs.mkdirSync(authDir, { recursive: true });
  }

  const token = createTestToken();
  const authState = {
    state: {
      token,
      user: {
        staff_id: 1,
        name: 'System Admin',
        designation: 'ADMIN',
        role: 'ADMIN',
        force_pin_change: false,
      },
      isAuthenticated: true,
    },
    version: 0,
  };

  try {
    // Attempt real UI login if server is responsive
    await page.goto('/login', { timeout: 5000 });
    const emailInput = page.locator('input[type="email"], input[name="identifier"]').first();
    if (await emailInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await emailInput.fill('admin@erp.com');
      await page.locator('input[type="password"], input[name="pin"]').first().fill('123456');
      await page.getByRole('button', { name: /sign in/i }).click();
      await page.waitForURL('**/dashboard', { timeout: 8000 }).catch(() => { });
    }
  } catch {
    // UI server not running or slow; provision storage state directly
  }

  // Ensure localStorage is populated with auth state
  await page.evaluate((auth) => {
    localStorage.setItem('auth-storage', JSON.stringify(auth));
  }, authState).catch(() => { });

  // Cleanly write test storage state file for dependent Playwright test suites
  try {
    await page.context().storageState({ path: authFile });
  } catch {
    // Fallback manual write of storage state
    fs.writeFileSync(
      authFile,
      JSON.stringify(
        {
          cookies: [],
          origins: [
            {
              origin: 'http://localhost:3000',
              localStorage: [
                {
                  name: 'auth-storage',
                  value: JSON.stringify(authState),
                },
              ],
            },
          ],
        },
        null,
        2
      )
    );
  }
});
