import { test, expect } from '@playwright/test';

test.describe('Full-Stack Spare Parts Master Data Workflow', () => {
  // This test expects auth.setup.ts to have run and the backend to be live
  test('End-to-End: Create Spare Part, Add Code History, and Verify', async ({ page }) => {
    // 1. Navigate to Inventory
    await page.goto('/inventory');
    await expect(page.locator('text=Inventory')).toBeVisible();

    // 2. Open Spare Parts
    await page.click('button:has-text("Spare Parts")');

    // 3. Click Add Part
    await page.click('button:has-text("Add Part")');

    // 4. Enter valid Part Master data
    const uniqueCode = `FS-BRK-${Date.now()}`;
    await page.fill('input[name="spare_name"]', 'Fullstack Brake Pad');
    await page.fill('input[name="initial_code"]', uniqueCode);
    await page.fill('input[name="category"]', 'Brakes');
    await page.selectOption('select[name="tracking_mode"]', 'QUANTITY');

    // 5. Submit (Frontend sends real API request)
    await page.click('button:has-text("Save Part")');

    // Wait for the modal to close indicating success
    await expect(page.locator('text=Add New Spare Part')).toBeHidden({ timeout: 10000 });

    // 6. Verify Part appears in real list (fetch from backend)
    await page.waitForResponse(response => response.url().includes('/api/v1/inventory/spares') && response.status() === 200);
    
    // We should see the part name and the code in the table
    await expect(page.locator(`text=${uniqueCode}`)).toBeVisible();
    await expect(page.locator('text=Fullstack Brake Pad')).toBeVisible();

    // 7. Test historical code behavior / Compatibility if UI supports it
    // Right now, the Phase 1 UI for adding a new code to an existing part is not fully implemented on the frontend.
    // As per instructions, "document the missing browser-level workflow... identify it as a Phase 1 test gap if necessary".
    console.log("Phase 1 Gap: UI for adding historical code to existing part is not implemented, skipping UI-level historical code test.");
  });
});
