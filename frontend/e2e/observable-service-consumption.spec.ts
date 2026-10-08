import { test, expect } from '@playwright/test';

// Run tests serially to prevent race conditions within the same project
test.describe.configure({ mode: 'serial' });

test.describe('Observable Service Spare Consumption Fullstack E2E', () => {
  test.beforeEach(async ({ page }) => {
    // Log console errors to debug blank page
    page.on('pageerror', error => console.error('PAGE ERROR:', error.message));
    page.on('console', msg => {
      if (msg.type() === 'error') console.error('CONSOLE ERROR:', msg.text());
    });
    
    // Navigate to dashboard
    await page.goto('/dashboard');
  });

  test('Observable Service Consumption Demonstration', async ({ page, isMobile }) => {
    console.log('--- Step 1: Open ERP & Login ---');
    await expect(page.locator('h1', { hasText: 'Dashboard' })).toBeVisible();
    await page.screenshot({ path: 'playwright-report/1-dashboard.png' });

    console.log('--- Step 3: Navigate to Service ---');
    if (isMobile) {
        await page.locator('button:has(.lucide-menu)').click({ force: true });
        await page.waitForTimeout(500);
        await page.locator('.fixed.inset-0').locator('a[href="/service"]').click({ force: true });
    } else {
        await page.locator('.hidden.lg\\:block').locator('a[href="/service"]').click({ force: true });
    }
    await expect(page.locator('h1', { hasText: 'Service' })).toBeVisible();
    await page.screenshot({ path: 'playwright-report/2-service-dashboard.png' });

    console.log('--- Step 4: Open Job Card ---');
    const row = page.locator('tr', { hasText: 'PLAYWRIGHT-EV-001' }).first();
    await expect(row).toBeVisible();
    
    const viewButton = row.locator('button[title="View Details"]');
    await viewButton.click({ force: true });
    
    await expect(page.locator('h3', { hasText: 'Spare Parts Consumption' })).toBeVisible();
    await page.screenshot({ path: 'playwright-report/3-job-card.png' });

    console.log('--- Step 5: Add Spare ---');
    await page.getByRole('button', { name: 'Add Spare' }).click({ force: true });
    await expect(page.locator('h2', { hasText: 'Add Spare to Job Card' })).toBeVisible();
    await page.screenshot({ path: 'playwright-report/4-add-spare-modal.png' });

    console.log('--- Step 6: Search Spare ---');
    const select = page.locator('select').first();
    await select.waitFor({ state: 'visible' });
    
    // Wait for React Query to populate the select dropdown with the target spare
    await expect(select.locator('option[value="1"]')).toHaveCount(1, { timeout: 15000 });

    // DIAGNOSTIC INFO
    const isVisible = await select.isVisible();
    const isEnabled = await select.isEnabled();
    const options = await select.locator('option').all();
    console.log('SERVICE SPARE SELECT');
    console.log(`visible: ${isVisible}`);
    console.log(`enabled: ${isEnabled}`);
    console.log(`options count: ${options.length}`);
    
    let expectedOptionFound = false;
    let initialStock = 0;
    
    for (const opt of options) {
      const val = await opt.getAttribute('value');
      const text = await opt.textContent() || '';
      console.log(`Option - value: ${val}, text: ${text}`);
      if (val === '1' && text.includes('SPARE-E2E-001')) {
         expectedOptionFound = true;
         const match = text.match(/In Stock: (\d+)/);
         if (match) {
             initialStock = parseInt(match[1], 10);
         }
      }
    }
    
    console.log(`expected spare id: 1`);
    console.log(`expected option found: ${expectedOptionFound}`);
    console.log(`initial stock extracted: ${initialStock}`);
    
    expect(expectedOptionFound).toBe(true);
    expect(initialStock).toBeGreaterThan(0);

    // Select by stable value, forcefully to bypass any visibility issues on tablet
    await select.selectOption('1', { force: true });

    console.log('--- Step 7: Confirm Draft ---');
    await page.getByRole('button', { name: 'Add to Job Card' }).click({ force: true });
    
    await expect(page.locator('text="Spare added as draft"').first()).toBeVisible({ timeout: 15000 });
    await expect(page.locator('span', { hasText: 'DRAFT' }).first()).toBeVisible({ timeout: 15000 });
    await page.screenshot({ path: 'playwright-report/5-draft-spare.png' });

    console.log('--- Step 8: Confirm Consumption ---');
    const confirmBtn = page.locator('button[title="Confirm Consumption"]').first();
    await confirmBtn.click({ force: true });
    
    await expect(page.locator('text="Spare consumed successfully"').first()).toBeVisible({ timeout: 15000 });
    
    console.log('--- Step 9: Verify Job Card ---');
    await expect(page.locator('span', { hasText: 'CONSUMED' }).first()).toBeVisible({ timeout: 15000 });
    await page.screenshot({ path: 'playwright-report/6-confirmed-consumption.png' });

    console.log('--- Step 10: Navigate to Inventory ---');
    if (isMobile) {
        await page.locator('button:has(.lucide-menu)').click({ force: true });
        await page.waitForTimeout(500);
        await page.locator('.fixed.inset-0').locator('a[href="/inventory"]').click({ force: true });
    } else {
        await page.locator('.hidden.lg\\:block').locator('a[href="/inventory"]').click({ force: true });
    }
    await expect(page.locator('h1', { hasText: 'Inventory' })).toBeVisible();
    
    // Switch to Stock tab
    await page.getByRole('button', { name: 'Stock', exact: true }).click({ force: true });

    // Relative Stock Assertion
    const expectedStock = initialStock - 1;
    const inventoryRow = page.locator('tr', { hasText: 'SPARE-E2E-001' }).first();
    await expect(inventoryRow).toBeVisible();
    await expect(inventoryRow.locator('td', { hasText: expectedStock.toString() }).first()).toBeVisible();
    await page.screenshot({ path: 'playwright-report/7-inventory-after-consumption.png' });

    console.log('--- Step 11: Open Movement History ---');
    // Ensure the Movements tab is clicked securely by using a more resilient locator
    await page.getByRole('button', { name: 'Movements' }).click({ force: true });
    await expect(page.locator('td', { hasText: 'CONSUMPTION' }).first()).toBeVisible({ timeout: 15000 });
    await expect(page.locator('td', { hasText: 'SERVICE' }).first()).toBeVisible({ timeout: 15000 });
    await page.screenshot({ path: 'playwright-report/8-movement-history.png' });

    console.log('--- Step 12: Reverse Consumption ---');
    if (isMobile) {
        await page.locator('button:has(.lucide-menu)').click({ force: true });
        await page.waitForTimeout(500);
        await page.locator('.fixed.inset-0').locator('a[href="/service"]').click({ force: true });
    } else {
        await page.locator('.hidden.lg\\:block').locator('a[href="/service"]').click({ force: true });
    }
    
    const serviceRow = page.locator('tr', { hasText: 'PLAYWRIGHT-EV-001' }).first();
    await expect(serviceRow).toBeVisible({ timeout: 15000 });
    await serviceRow.locator('button[title="View Details"]').click({ force: true });
    
    const reverseBtn = page.locator('button[title="Reverse Consumption"]').first();
    await reverseBtn.click({ force: true });

    await expect(page.locator('text="Spare reversed successfully"').first()).toBeVisible({ timeout: 15000 });
    await expect(page.locator('span', { hasText: 'REVERSED' }).first()).toBeVisible({ timeout: 15000 });
    await page.screenshot({ path: 'playwright-report/9-reversal.png' });

    console.log('--- Step 13: Verify Inventory Restoration ---');
    if (isMobile) {
        await page.locator('button:has(.lucide-menu)').click({ force: true });
        await page.waitForTimeout(500);
        await page.locator('.fixed.inset-0').locator('a[href="/inventory"]').click({ force: true });
    } else {
        await page.locator('.hidden.lg\\:block').locator('a[href="/inventory"]').click({ force: true });
    }
    await expect(page.locator('h1', { hasText: 'Inventory' })).toBeVisible();
    
    // Switch to Stock tab
    await page.getByRole('button', { name: 'Stock', exact: true }).click({ force: true });

    // Final Relative Stock Assertion
    const finalInventoryRow = page.locator('tr', { hasText: 'SPARE-E2E-001' }).first();
    await expect(finalInventoryRow).toBeVisible();
    await expect(finalInventoryRow.locator('td', { hasText: initialStock.toString() }).first()).toBeVisible();
    await page.screenshot({ path: 'playwright-report/10-inventory-after-reversal.png' });
    
    await page.getByRole('button', { name: 'Movements' }).click({ force: true });
    await expect(page.locator('td', { hasText: 'SERVICE_JOB_CARD' }).first()).toBeVisible({ timeout: 15000 });
  });
});
