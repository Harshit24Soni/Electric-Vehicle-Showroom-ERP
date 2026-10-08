import { test, expect } from '@playwright/test';

test.use({ storageState: '.playwright/user.json' });

test.describe('Diagnostic Focus', () => {
  test('Diagnose select options', async ({ page }) => {
    // 1. Setup API interception
    const inventoryResponses: any[] = [];
    page.on('response', async (response) => {
      if (response.url().includes('/api/inventory/stock') && response.request().method() === 'GET') {
        try {
          const json = await response.json();
          inventoryResponses.push(json);
          console.log('\n=== API RESPONSE INTERCEPTED (/api/inventory/stock) ===');
          console.log(JSON.stringify(json, null, 2));
          console.log('======================================================\n');
        } catch (e) {
          console.log('Failed to parse API response');
        }
      }
    });

    // Login is handled by storageState, just go straight to dashboard
    await page.goto('/');
    await expect(page.locator('h1', { hasText: 'Dashboard' })).toBeVisible();

    // Navigate to Service
    await page.click('a[href="/service"]');
    await expect(page.locator('h1', { hasText: 'Service' })).toBeVisible();

    // Open Job Card
    const row = page.locator('tr', { hasText: 'PLAYWRIGHT-EV-001' }).first();
    await expect(row).toBeVisible();
    await row.locator('button[title="View Details"]').click();
    await expect(page.locator('h3', { hasText: 'Spare Parts Consumption' })).toBeVisible();

    // Add Spare Modal
    await page.click('button:has-text("Add Spare")');
    await expect(page.locator('h2', { hasText: 'Add Spare to Job Card' })).toBeVisible();

    // Wait a bit to ensure rendering
    await page.waitForTimeout(2000);

    // Diagnostics: Print all selects on the page
    console.log('\n=== SELECT DIAGNOSTICS ===');
    const selects = page.locator('select');
    const selectCount = await selects.count();
    console.log(`Found ${selectCount} <select> elements on the page.`);
    
    for (let i = 0; i < selectCount; i++) {
      const select = selects.nth(i);
      const isVisible = await select.isVisible();
      const isEnabled = await select.isEnabled();
      const value = await select.inputValue();
      const id = await select.getAttribute('id');
      const name = await select.getAttribute('name');
      const ariaLabel = await select.getAttribute('aria-label');
      
      console.log(`\nSELECT #${i}`);
      console.log(`id: ${id}, name: ${name}, aria-label: ${ariaLabel}`);
      console.log(`visible: ${isVisible}`);
      console.log(`enabled: ${isEnabled}`);
      console.log(`value: ${value}`);

      const options = select.locator('option');
      const optCount = await options.count();
      console.log(`options: ${optCount}`);

      for (let j = 0; j < optCount; j++) {
        const opt = options.nth(j);
        const optVal = await opt.getAttribute('value');
        const optText = await opt.innerText();
        const isDisabled = await opt.getAttribute('disabled') !== null;
        console.log(`  OPTION #${j} | value: ${optVal} | disabled: ${isDisabled} | text: "${optText}"`);
      }
    }
    console.log('==========================\n');

    expect(inventoryResponses.length).toBeGreaterThan(0);
    console.log('Diagnostic test complete. Failing intentionally to halt.');
    expect(false).toBe(true);
  });
});
