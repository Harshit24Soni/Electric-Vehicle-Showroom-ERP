import { test, expect } from '@playwright/test';

test.describe('Service Spare Consumption Fullstack E2E', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to dashboard and wait for network idle
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
  });

  test('should create job card, add draft spare, consume, and reverse', async ({ page }) => {
    // 1. Navigate to Service page
    await page.click('text="Service"');
    
    // Check page header
    await expect(page.locator('h1', { hasText: 'Service' })).toBeVisible();

    // 2. Open New Job Card Modal
    await page.click('button:has-text("New Job Card")');
    await expect(page.locator('h2', { hasText: 'Create Job Card' })).toBeVisible();

    // 3. Fill in Job Card details (Chassis No)
    await page.fill('input[name="chassis_no"]', 'CH123'); // Example chassis number
    await page.fill('textarea[name="remarks"]', 'E2E Test Job Card');
    
    // 4. Create Job Card
    await page.click('button:has-text("Create Job Card")');
    
    // Wait for the modal to close and job card to appear in the list
    await expect(page.locator('h2', { hasText: 'Create Job Card' })).not.toBeVisible();
    
    // Check if a row with CH123 exists
    const row = page.locator('tr', { hasText: 'CH123' }).first();
    await expect(row).toBeVisible();

    // 5. Go to Job Card details
    const viewButton = row.locator('button[title="View Details"]');
    await viewButton.click();
    
    await expect(page.locator('h3', { hasText: 'Spare Parts Consumption' })).toBeVisible();

    // 6. Add Draft Spare
    await page.click('button:has-text("Add Spare")');
    await expect(page.locator('h2', { hasText: 'Add Spare to Job Card' })).toBeVisible();

    // Select spare from dropdown
    await page.click('.input.w-full'); // select element for spares
    await page.waitForTimeout(1000);
    // Since it's a native select, we can use selectOption
    const select = page.locator('select').nth(0);
    // Select the second option (first real option after "-- Select Spare --")
    await select.selectOption({ index: 1 });

    // Click Add to Job Card
    await page.click('button:has-text("Add to Job Card")');
    
    // Should see success toast and item in list as DRAFT
    await expect(page.locator('text="Spare added as draft"')).toBeVisible();
    await expect(page.locator('span', { hasText: 'DRAFT' })).toBeVisible();

    // 7. Consume Spare
    const confirmBtn = page.locator('button[title="Confirm Consumption"]').first();
    await confirmBtn.click();
    
    // Should see success toast and item status change to CONSUMED
    await expect(page.locator('text="Spare consumed successfully"')).toBeVisible();
    await expect(page.locator('span', { hasText: 'CONSUMED' })).toBeVisible();

    // 8. Reverse Consumption
    const reverseBtn = page.locator('button[title="Reverse Consumption"]').first();
    await reverseBtn.click();

    // Should see success toast and item status change to REVERSED
    await expect(page.locator('text="Spare reversed successfully"')).toBeVisible();
    await expect(page.locator('span', { hasText: 'REVERSED' })).toBeVisible();
  });
});
