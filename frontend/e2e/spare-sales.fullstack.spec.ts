import { test, expect } from '@playwright/test';

test.describe('Spare Sales Fullstack E2E', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to dashboard and wait for network idle
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
  });

  test('should create, cancel, and then create & confirm a spare sale', async ({ page }) => {
    // 1. Navigate to Spare Sales page
    await page.click('text="Spare Sales"');
    
    // Check page header
    await expect(page.locator('h2', { hasText: 'Spare Parts Sales' })).toBeVisible();

    // 2. Open New Spare Sale Modal
    await page.click('button:has-text("New Spare Sale")');
    await expect(page.locator('.ant-modal-title', { hasText: 'New Spare Sale' })).toBeVisible();

    // 3. Select a Customer
    await page.click('.ant-select-selector');
    await page.waitForTimeout(1000); // Wait for dropdown to open and data to load
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');

    // 4. Manually add a spare part from the dropdown
    await page.click('.ant-select-selection-search-input >> nth=-1'); // The bottom select for manual addition
    await page.waitForTimeout(1000);
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');

    // Verify it was added to the cart table
    const tableRows = page.locator('.ant-table-tbody .ant-table-row');
    await expect(tableRows).toHaveCount(1);

    // 5. Create Draft Sale
    await page.click('button:has-text("Create Draft Sale")');
    
    // Modal should close and success message should appear
    await expect(page.locator('text="Draft sale created successfully!"')).toBeVisible();

    // The sale should now be listed in the table. Let's find the first row and Cancel it.
    await page.waitForTimeout(2000);
    const firstRowCancelBtn = page.locator('.ant-table-row').first().locator('button:has-text("Cancel")');
    await firstRowCancelBtn.click();
    
    // Expect cancelled message
    await expect(page.locator('text="Sale cancelled"')).toBeVisible();
    await page.waitForTimeout(2000);

    // 6. Create another sale and Confirm it
    await page.click('button:has-text("New Spare Sale")');
    await expect(page.locator('.ant-modal-title', { hasText: 'New Spare Sale' })).toBeVisible();

    await page.click('.ant-select-selector');
    await page.waitForTimeout(1000);
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');

    await page.click('.ant-select-selection-search-input >> nth=-1');
    await page.waitForTimeout(1000);
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');

    await page.click('button:has-text("Create Draft Sale")');
    await expect(page.locator('text="Draft sale created successfully!"')).toBeVisible();

    // Confirm it
    await page.waitForTimeout(2000);
    const firstRowConfirmBtn = page.locator('.ant-table-row').first().locator('button:has-text("Confirm")');
    await firstRowConfirmBtn.click();
    
    await expect(page.locator('text="Sale confirmed and stock updated"')).toBeVisible();
  });
});
