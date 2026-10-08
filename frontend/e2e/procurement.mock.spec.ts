import { test, expect } from '@playwright/test';

test.describe('Procurement Spare Parts Workflow', () => {
  test('User can navigate to Procurement and see list, then go to new receipt', async ({ page }) => {
    // Mock the API responses
    await page.route('**/api/procurement/purchases/spares', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            spare_purchase_id: 1,
            vendor_id: 1,
            vendor_name: 'Test Vendor',
            vendor_invoice_no: 'INV-123',
            purchase_date: new Date().toISOString(),
            status: 'OCR_PROCESSED',
            is_deleted: false,
            items: []
          }
        ])
      });
    });

    await page.route('**/api/procurement/purchases/vehicles', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([])
      });
    });

    await page.route('**/api/master/vendors', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([
              { vendor_id: 1, vendor_name: 'Test Vendor', is_active: true }
          ])
        });
      });

    // Navigate to Procurement page
    await page.goto('/procurement');

    // Ensure the page is loaded
    await expect(page.locator('text=Procurement')).toBeVisible();
    await expect(page.locator('text=OCR PROCESSED')).toBeVisible();

    // Click on New Entry
    await page.click('button:has-text("New Entry")');

    // Should navigate to new receipt page
    await expect(page.url()).toContain('/procurement/spares/new');
    await expect(page.locator('text=New Purchase Receipt')).toBeVisible();
    await expect(page.locator('text=Upload vendor invoice for automated OCR processing')).toBeVisible();
  });
});
