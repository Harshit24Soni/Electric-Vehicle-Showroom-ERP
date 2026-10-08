import { test, expect } from '@playwright/test';

test.describe('Spare Parts Master Data Workflow', () => {
  test('User can navigate to Spare Parts tab and create a new part', async ({ page }) => {
    // Mock the API responses
    await page.route('**/api/v1/master/vehicles', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([])
      });
    });

    await page.route('**/api/v1/inventory/spares**', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([])
        });
      } else if (route.request().method() === 'POST') {
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({
            spare_id: 1,
            spare_name: 'Test Brake Pad',
            category: 'Brakes',
            tracking_mode: 'QUANTITY',
            status: 'ACTIVE',
            is_temporary: false,
            is_verified: true,
            codes: [
              {
                code_id: 1,
                spare_id: 1,
                code: 'BRK-001',
                is_current: true,
                effective_from: new Date().toISOString()
              }
            ]
          })
        });
      } else {
        await route.continue();
      }
    });

    // Navigate to Inventory page
    await page.goto('/inventory');

    // Ensure the page is loaded
    await expect(page.locator('text=Inventory')).toBeVisible();

    // Click on Spare Parts tab
    await page.click('button:has-text("Spare Parts")');

    // Verify Spare Parts list renders
    await expect(page.locator('text=No parts found')).toBeVisible();

    // Click Add Part
    await page.click('button:has-text("Add Part")');

    // Fill the form
    await page.fill('input[name="spare_name"]', 'Test Brake Pad');
    await page.fill('input[name="initial_code"]', 'BRK-001');
    await page.fill('input[name="category"]', 'Brakes');
    await page.selectOption('select[name="tracking_mode"]', 'QUANTITY');

    // Submit
    await page.click('button:has-text("Save Part")');

    // Should mock a success toast or similar and form closes
    await expect(page.locator('text=Add New Spare Part')).toBeHidden();
  });
});
