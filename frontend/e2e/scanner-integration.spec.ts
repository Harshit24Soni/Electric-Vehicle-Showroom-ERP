import { test, expect } from '@playwright/test';

// Run tests serially to prevent database concurrency issues with inventory
test.describe.configure({ mode: 'serial' });

test.describe('Observable Scanner Integration E2E', () => {

  test('Scanner UI renders properly and handles keyboard-wedge input for Service Consumption (Active Tag)', async ({ page, isMobile }) => {
    console.log('--- Navigate to Service ---');
    await page.goto('/');
    await expect(page.locator('h1', { hasText: 'Dashboard' })).toBeVisible({ timeout: 15000 });

    if (isMobile) {
        await page.locator('button:has(.lucide-menu)').click({ force: true });
        await page.waitForTimeout(500);
        await page.locator('.fixed.inset-0').locator('a[href="/service"]').click({ force: true });
    } else {
        await page.locator('.hidden.lg\\:block').locator('a[href="/service"]').click({ force: true });
    }
    await expect(page.locator('h1', { hasText: 'Service' })).toBeVisible();

    console.log('--- Open Job Card ---');
    const row = page.locator('tr', { hasText: 'PLAYWRIGHT-EV-001' }).first();
    await expect(row).toBeVisible();
    
    const viewButton = row.locator('button[title="View Details"]');
    await viewButton.click({ force: true });
    await expect(page.locator('h1', { hasText: /Job Card/ })).toBeVisible();

    console.log('--- Open Scanner Modal via Add Spare ---');
    await page.getByRole('button', { name: 'Add Spare' }).click({ force: true });
    await expect(page.locator('h2', { hasText: 'Add Spare to Job Card' })).toBeVisible();
    
    // Click 'Scan Inventory Tag' inside AddSpareModal
    await page.getByRole('button', { name: 'Scan Inventory Tag' }).click({ force: true });
    
    // Expect ScannerModal to appear
    await expect(page.locator('h2', { hasText: 'Scan Tag for Service' })).toBeVisible();

    console.log('--- Simulate Hardware Scanner Keyboard Wedge ---');
    // The hardware scanner mode is active by default. Wait for autofocus or explicitly focus.
    const scanInput = page.getByPlaceholder('Scan identifier...');
    await expect(scanInput).toBeVisible();
    await scanInput.click({ force: true }); // Ensure focus
    
    // Rapid type to simulate barcode scanner
    const validTag = 'TAG-ACTIVE-E2E-1'; 
    await scanInput.fill(validTag);
    await scanInput.press('Enter');

    // Wait for the modal to close automatically upon success
    await expect(page.locator('h2', { hasText: 'Scan Tag for Service' })).toBeHidden({ timeout: 10000 });
    
    // We should be back in the AddSpareModal and see the tag populated!
    await expect(page.locator('span', { hasText: `Scanned Tag: ${validTag}` })).toBeVisible();
    
    // Actually consume it
    await page.getByRole('button', { name: 'Add to Job Card' }).click({ force: true });
    await expect(page.locator('text="Spare added as draft"').first()).toBeVisible({ timeout: 15000 });
  });

  test('Scanner rejects Revoked, Retired, and Unknown tags in Direct Sale', async ({ page, isMobile }) => {
    console.log('--- Navigate to Spare Sales ---');
    await page.goto('/spare-sales');
    await expect(page.locator('h2', { hasText: 'Spare Parts Sales' })).toBeVisible();

    // Click New Spare Sale button
    await page.getByRole('button', { name: 'New Spare Sale' }).click({ force: true });
    
    await expect(page.locator('div.ant-modal-title', { hasText: 'New Spare Sale' })).toBeVisible();
    
    // --- REVOKED TAG ---
    await page.getByRole('button', { name: 'Scan Inventory Tag' }).click();
    await expect(page.locator('h2', { hasText: 'Scan Tag for Sale' })).toBeVisible({ timeout: 10000 });
    
    let scanInput = page.getByPlaceholder('Scan identifier...');
    await scanInput.click();
    await scanInput.fill('TAG-REVOKED-E2E-1');
    await scanInput.press('Enter');
    
    // Expect visible error
    const errorLocator = page.locator('.text-red-700').first();
    await expect(errorLocator).toBeVisible({ timeout: 10000 });
    await expect(errorLocator).toContainText('revoked', { ignoreCase: true });
    
    // Cancel to close scanner
    await page.getByRole('button', { name: 'Cancel' }).last().click();
    await expect(page.locator('h2', { hasText: 'Scan Tag for Sale' })).toBeHidden({ timeout: 10000 });

    // --- RETIRED TAG ---
    await page.getByRole('button', { name: 'Scan Inventory Tag' }).click();
    await expect(page.locator('h2', { hasText: 'Scan Tag for Sale' })).toBeVisible({ timeout: 10000 });
    
    scanInput = page.getByPlaceholder('Scan identifier...');
    await scanInput.click();
    await scanInput.fill('TAG-RETIRED-E2E-1');
    await scanInput.press('Enter');
    
    // Expect visible error
    await expect(errorLocator).toBeVisible({ timeout: 10000 });
    await expect(errorLocator).toContainText('retired', { ignoreCase: true });
    
    await page.getByRole('button', { name: 'Cancel' }).last().click();
    await expect(page.locator('h2', { hasText: 'Scan Tag for Sale' })).toBeHidden({ timeout: 10000 });

    // --- UNKNOWN TAG ---
    await page.getByRole('button', { name: 'Scan Inventory Tag' }).click();
    await expect(page.locator('h2', { hasText: 'Scan Tag for Sale' })).toBeVisible({ timeout: 10000 });
    
    scanInput = page.getByPlaceholder('Scan identifier...');
    await scanInput.click();
    await scanInput.fill('TAG-NONEXISTENT');
    await scanInput.press('Enter');
    
    // Expect visible error
    await expect(errorLocator).toBeVisible({ timeout: 10000 });
    await expect(errorLocator).toContainText('not found', { ignoreCase: true });
    
    await page.getByRole('button', { name: 'Cancel' }).last().click();
    await expect(page.locator('h2', { hasText: 'Scan Tag for Sale' })).toBeHidden({ timeout: 10000 });

    // --- DUPLICATE/CONCURRENT SCAN PREVENTION ---
    await page.getByRole('button', { name: 'Scan Inventory Tag' }).click({ force: true });
    await expect(page.locator('h2', { hasText: 'Scan Tag for Sale' })).toBeVisible();
    
    scanInput = page.getByPlaceholder('Scan identifier...');
    await scanInput.click();
    
    // We send two rapid Enter presses simulating a bouncy hardware scanner or impatient user
    await scanInput.fill('TAG-ACTIVE-E2E-1');
    // First enter
    await scanInput.press('Enter');
    // Second enter immediately (should be blocked by isProcessing)
    await scanInput.press('Enter');
    
    // Wait for the modal to close automatically upon success
    await expect(page.locator('h2', { hasText: 'Scan Tag for Sale' })).toBeHidden({ timeout: 10000 });
    
    // Ensure only 1 item added to cart!
    const cartRows = page.locator('table tbody tr.ant-table-row');
    await expect(cartRows).toHaveCount(1);
    
    // Close modal
    await page.getByRole('button', { name: 'Cancel' }).first().click({ force: true });
  });

  test('Scanner UI explicitly handles Mobile Camera view rendering', async ({ page, isMobile }) => {
    // We can go straight to Inventory Tags
    await page.goto('/');
    await expect(page.locator('h1', { hasText: 'Dashboard' })).toBeVisible({ timeout: 15000 });

    if (isMobile) {
        await page.locator('button:has(.lucide-menu)').click({ force: true });
        await page.waitForTimeout(500);
        await page.locator('.fixed.inset-0').locator('a[href="/inventory"]').click({ force: true });
    } else {
        await page.locator('.hidden.lg\\:block').locator('a[href="/inventory"]').click({ force: true });
    }
    await expect(page.locator('h1', { hasText: 'Inventory' })).toBeVisible();

    // Click Tags tab
    await page.getByRole('button', { name: 'Tags', exact: true }).click({ force: true });
    
    // Click Scan Tag
    await page.getByRole('button', { name: 'Scan Tag' }).click({ force: true });
    
    await expect(page.locator('h2', { hasText: 'Scan Inventory Tag' })).toBeVisible();

    // Switch to Camera Mode
    await page.getByRole('button', { name: 'Mobile Camera' }).click({ force: true });
    
    // Expect the #qr-reader element to be mounted
    const qrReader = page.locator('#qr-reader');
    await expect(qrReader).toBeVisible();
    
    // Verify text
    await expect(page.locator('text="Allow camera permissions"')).toBeVisible();

    // Note: Actual WebRTC camera permission automation is complex in Playwright headless. 
    // We verify the component rendering and logic hooks up successfully.
  });

});
