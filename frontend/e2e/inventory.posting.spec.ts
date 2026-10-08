import { test, expect } from '@playwright/test';

test.describe('Purchase to Inventory Posting Workflow', () => {
  test('Mocked End-to-End: View Approved Purchase and Post to Inventory', async ({ page }) => {
    // 1. Mock API Responses
    await page.route('**/api/v1/auth/me', async route => {
      await route.fulfill({ json: { id: 1, email: 'admin@test.com', role: 'ADMIN' } });
    });

    await page.route('**/api/v1/inventory/spares', async route => {
      await route.fulfill({
        json: [
          { spare_id: 1, spare_name: 'Engine Oil', spare_code: 'ENG01', tracking_mode: 'BATCH', is_serialized: false },
          { spare_id: 2, spare_name: 'Brake Pad', spare_code: 'BRK01', tracking_mode: 'QUANTITY', is_serialized: false }
        ]
      });
    });

    await page.route('**/api/v1/procurement/purchases/spares/1', async route => {
      await route.fulfill({
        json: {
          spare_purchase_id: 1,
          status: 'APPROVED',
          vendor_name: 'Test Vendor',
          items: [
            { purchase_item_id: 101, spare_id: 1, spare_name: 'Engine Oil', quantity: 2, unit_cost: 100 },
            { purchase_item_id: 102, spare_id: 2, spare_name: 'Brake Pad', quantity: 5, unit_cost: 50 }
          ]
        }
      });
    });

    let postedPayload: any = null;
    await page.route('**/api/v1/procurement/purchases/spares/1/post', async route => {
      postedPayload = route.request().postDataJSON();
      await route.fulfill({
        json: { message: 'Successfully posted to inventory' }
      });
    });

    // 2. Navigate to Spare Purchase Detail Page
    await page.goto('/procurement/spares/1');
    
    // 3. Verify Page Loaded and Button Exists
    await expect(page.locator('text=Invoice Review')).toBeVisible();
    await expect(page.locator('text=Post to Inventory')).toBeVisible();

    // 4. Click Post to Inventory
    await page.click('button:has-text("Post to Inventory")');

    // 5. Verify Modal Opens
    await expect(page.locator('text=Confirm Inventory Posting')).toBeVisible();

    // 6. Fill in required batch information
    // Engine Oil requires batch info.
    const batchInput = page.locator('input[placeholder="Batch ID"]');
    await expect(batchInput).toBeVisible();
    await batchInput.fill('BATCH-001');

    // 7. Submit Posting
    await page.click('button:has-text("Confirm & Post")');

    // 8. Verify Payload
    await page.waitForTimeout(500); // Give time for request to complete
    expect(postedPayload).toBeTruthy();
    expect(postedPayload.location).toBe('MAIN_WAREHOUSE');
    expect(postedPayload.items).toHaveLength(2);
    
    const engineOilItem = postedPayload.items.find((i: any) => i.purchase_item_id === 101);
    expect(engineOilItem.batch_number).toBe('BATCH-001');
    
    const brakePadItem = postedPayload.items.find((i: any) => i.purchase_item_id === 102);
    expect(brakePadItem.batch_number).toBeUndefined();
  });
});
