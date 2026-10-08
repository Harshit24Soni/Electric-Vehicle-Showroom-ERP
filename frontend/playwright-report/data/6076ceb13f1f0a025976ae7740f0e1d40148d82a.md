# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: scanner-integration.spec.ts >> Observable Scanner Integration E2E >> Scanner rejects Revoked, Retired, and Unknown tags in Direct Sale
- Location: e2e\scanner-integration.spec.ts:62:3

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('.text-red-700').first()
Expected: visible
Timeout: 10000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" locator('.text-red-700').first() with timeout 10000ms
  - waiting for locator('.text-red-700').first()

```

```yaml
- heading "EV Showroom ERP" [level=1]
- button:
  - img
- main:
  - heading "Spare Parts Sales" [level=2]
  - button "plus New Spare Sale":
    - img "plus"
    - text: New Spare Sale
  - table:
    - rowgroup:
      - row "Sale ID Date Status Total Amount Action":
        - columnheader "Sale ID"
        - columnheader "Date"
        - columnheader "Status"
        - columnheader "Total Amount"
        - columnheader "Action"
    - rowgroup:
      - row "No data No data":
        - cell "No data No data":
          - img "No data"
          - text: No data
  - heading "Scan Tag for Sale" [level=2]
  - button:
    - img
  - button "Hardware Scanner":
    - img
    - text: Hardware Scanner
  - button "Mobile Camera":
    - img
    - text: Mobile Camera
  - paragraph: Ensure your cursor is in the field below, then scan the tag with your USB/Bluetooth scanner.
  - textbox "Scan identifier...": TAG-REVOKED-E2E-1
```

# Test source

```ts
  1   | import { test, expect } from '@playwright/test';
  2   | 
  3   | // Run tests serially to prevent database concurrency issues with inventory
  4   | test.describe.configure({ mode: 'serial' });
  5   | 
  6   | test.describe('Observable Scanner Integration E2E', () => {
  7   | 
  8   |   test('Scanner UI renders properly and handles keyboard-wedge input for Service Consumption (Active Tag)', async ({ page, isMobile }) => {
  9   |     console.log('--- Navigate to Service ---');
  10  |     await page.goto('/');
  11  |     await expect(page.locator('h1', { hasText: 'Dashboard' })).toBeVisible({ timeout: 15000 });
  12  | 
  13  |     if (isMobile) {
  14  |         await page.locator('button:has(.lucide-menu)').click({ force: true });
  15  |         await page.waitForTimeout(500);
  16  |         await page.locator('.fixed.inset-0').locator('a[href="/service"]').click({ force: true });
  17  |     } else {
  18  |         await page.locator('.hidden.lg\\:block').locator('a[href="/service"]').click({ force: true });
  19  |     }
  20  |     await expect(page.locator('h1', { hasText: 'Service' })).toBeVisible();
  21  | 
  22  |     console.log('--- Open Job Card ---');
  23  |     const row = page.locator('tr', { hasText: 'PLAYWRIGHT-EV-001' }).first();
  24  |     await expect(row).toBeVisible();
  25  |     
  26  |     const viewButton = row.locator('button[title="View Details"]');
  27  |     await viewButton.click({ force: true });
  28  |     await expect(page.locator('h1', { hasText: /Job Card/ })).toBeVisible();
  29  | 
  30  |     console.log('--- Open Scanner Modal via Add Spare ---');
  31  |     await page.getByRole('button', { name: 'Add Spare' }).click({ force: true });
  32  |     await expect(page.locator('h2', { hasText: 'Add Spare to Job Card' })).toBeVisible();
  33  |     
  34  |     // Click 'Scan Inventory Tag' inside AddSpareModal
  35  |     await page.getByRole('button', { name: 'Scan Inventory Tag' }).click({ force: true });
  36  |     
  37  |     // Expect ScannerModal to appear
  38  |     await expect(page.locator('h2', { hasText: 'Scan Tag for Service' })).toBeVisible();
  39  | 
  40  |     console.log('--- Simulate Hardware Scanner Keyboard Wedge ---');
  41  |     // The hardware scanner mode is active by default. Wait for autofocus or explicitly focus.
  42  |     const scanInput = page.getByPlaceholder('Scan identifier...');
  43  |     await expect(scanInput).toBeVisible();
  44  |     await scanInput.click({ force: true }); // Ensure focus
  45  |     
  46  |     // Rapid type to simulate barcode scanner
  47  |     const validTag = 'TAG-ACTIVE-E2E-1'; 
  48  |     await scanInput.fill(validTag);
  49  |     await scanInput.press('Enter');
  50  | 
  51  |     // Wait for the modal to close automatically upon success
  52  |     await expect(page.locator('h2', { hasText: 'Scan Tag for Service' })).toBeHidden({ timeout: 10000 });
  53  |     
  54  |     // We should be back in the AddSpareModal and see the tag populated!
  55  |     await expect(page.locator('span', { hasText: `Scanned Tag: ${validTag}` })).toBeVisible();
  56  |     
  57  |     // Actually consume it
  58  |     await page.getByRole('button', { name: 'Add to Job Card' }).click({ force: true });
  59  |     await expect(page.locator('text="Spare added as draft"').first()).toBeVisible({ timeout: 15000 });
  60  |   });
  61  | 
  62  |   test('Scanner rejects Revoked, Retired, and Unknown tags in Direct Sale', async ({ page, isMobile }) => {
  63  |     console.log('--- Navigate to Spare Sales ---');
  64  |     await page.goto('/spare-sales');
  65  |     await expect(page.locator('h2', { hasText: 'Spare Parts Sales' })).toBeVisible();
  66  | 
  67  |     // Click New Spare Sale button
  68  |     await page.getByRole('button', { name: 'New Spare Sale' }).click({ force: true });
  69  |     
  70  |     await expect(page.locator('div.ant-modal-title', { hasText: 'New Spare Sale' })).toBeVisible();
  71  |     
  72  |     // --- REVOKED TAG ---
  73  |     await page.getByRole('button', { name: 'Scan Inventory Tag' }).click();
  74  |     await expect(page.locator('h2', { hasText: 'Scan Tag for Sale' })).toBeVisible({ timeout: 10000 });
  75  |     
  76  |     let scanInput = page.getByPlaceholder('Scan identifier...');
  77  |     await scanInput.click();
  78  |     await scanInput.fill('TAG-REVOKED-E2E-1');
  79  |     await scanInput.press('Enter');
  80  |     
  81  |     // Expect visible error
  82  |     const errorLocator = page.locator('.text-red-700').first();
> 83  |     await expect(errorLocator).toBeVisible({ timeout: 10000 });
      |                                ^ Error: expect(locator).toBeVisible() failed
  84  |     await expect(errorLocator).toContainText('revoked', { ignoreCase: true });
  85  |     
  86  |     // Cancel to close scanner
  87  |     await page.getByRole('button', { name: 'Cancel' }).last().click();
  88  |     await expect(page.locator('h2', { hasText: 'Scan Tag for Sale' })).toBeHidden({ timeout: 10000 });
  89  | 
  90  |     // --- RETIRED TAG ---
  91  |     await page.getByRole('button', { name: 'Scan Inventory Tag' }).click();
  92  |     await expect(page.locator('h2', { hasText: 'Scan Tag for Sale' })).toBeVisible({ timeout: 10000 });
  93  |     
  94  |     scanInput = page.getByPlaceholder('Scan identifier...');
  95  |     await scanInput.click();
  96  |     await scanInput.fill('TAG-RETIRED-E2E-1');
  97  |     await scanInput.press('Enter');
  98  |     
  99  |     // Expect visible error
  100 |     await expect(errorLocator).toBeVisible({ timeout: 10000 });
  101 |     await expect(errorLocator).toContainText('retired', { ignoreCase: true });
  102 |     
  103 |     await page.getByRole('button', { name: 'Cancel' }).last().click();
  104 |     await expect(page.locator('h2', { hasText: 'Scan Tag for Sale' })).toBeHidden({ timeout: 10000 });
  105 | 
  106 |     // --- UNKNOWN TAG ---
  107 |     await page.getByRole('button', { name: 'Scan Inventory Tag' }).click();
  108 |     await expect(page.locator('h2', { hasText: 'Scan Tag for Sale' })).toBeVisible({ timeout: 10000 });
  109 |     
  110 |     scanInput = page.getByPlaceholder('Scan identifier...');
  111 |     await scanInput.click();
  112 |     await scanInput.fill('TAG-NONEXISTENT');
  113 |     await scanInput.press('Enter');
  114 |     
  115 |     // Expect visible error
  116 |     await expect(errorLocator).toBeVisible({ timeout: 10000 });
  117 |     await expect(errorLocator).toContainText('not found', { ignoreCase: true });
  118 |     
  119 |     await page.getByRole('button', { name: 'Cancel' }).last().click();
  120 |     await expect(page.locator('h2', { hasText: 'Scan Tag for Sale' })).toBeHidden({ timeout: 10000 });
  121 | 
  122 |     // --- DUPLICATE/CONCURRENT SCAN PREVENTION ---
  123 |     await page.getByRole('button', { name: 'Scan Inventory Tag' }).click({ force: true });
  124 |     await expect(page.locator('h2', { hasText: 'Scan Tag for Sale' })).toBeVisible();
  125 |     
  126 |     scanInput = page.getByPlaceholder('Scan identifier...');
  127 |     await scanInput.click();
  128 |     
  129 |     // We send two rapid Enter presses simulating a bouncy hardware scanner or impatient user
  130 |     await scanInput.fill('TAG-ACTIVE-E2E-1');
  131 |     // First enter
  132 |     await scanInput.press('Enter');
  133 |     // Second enter immediately (should be blocked by isProcessing)
  134 |     await scanInput.press('Enter');
  135 |     
  136 |     // Wait for the modal to close automatically upon success
  137 |     await expect(page.locator('h2', { hasText: 'Scan Tag for Sale' })).toBeHidden({ timeout: 10000 });
  138 |     
  139 |     // Ensure only 1 item added to cart!
  140 |     const cartRows = page.locator('table tbody tr.ant-table-row');
  141 |     await expect(cartRows).toHaveCount(1);
  142 |     
  143 |     // Close modal
  144 |     await page.getByRole('button', { name: 'Cancel' }).first().click({ force: true });
  145 |   });
  146 | 
  147 |   test('Scanner UI explicitly handles Mobile Camera view rendering', async ({ page, isMobile }) => {
  148 |     // We can go straight to Inventory Tags
  149 |     await page.goto('/');
  150 |     await expect(page.locator('h1', { hasText: 'Dashboard' })).toBeVisible({ timeout: 15000 });
  151 | 
  152 |     if (isMobile) {
  153 |         await page.locator('button:has(.lucide-menu)').click({ force: true });
  154 |         await page.waitForTimeout(500);
  155 |         await page.locator('.fixed.inset-0').locator('a[href="/inventory"]').click({ force: true });
  156 |     } else {
  157 |         await page.locator('.hidden.lg\\:block').locator('a[href="/inventory"]').click({ force: true });
  158 |     }
  159 |     await expect(page.locator('h1', { hasText: 'Inventory' })).toBeVisible();
  160 | 
  161 |     // Click Tags tab
  162 |     await page.getByRole('button', { name: 'Tags', exact: true }).click({ force: true });
  163 |     
  164 |     // Click Scan Tag
  165 |     await page.getByRole('button', { name: 'Scan Tag' }).click({ force: true });
  166 |     
  167 |     await expect(page.locator('h2', { hasText: 'Scan Inventory Tag' })).toBeVisible();
  168 | 
  169 |     // Switch to Camera Mode
  170 |     await page.getByRole('button', { name: 'Mobile Camera' }).click({ force: true });
  171 |     
  172 |     // Expect the #qr-reader element to be mounted
  173 |     const qrReader = page.locator('#qr-reader');
  174 |     await expect(qrReader).toBeVisible();
  175 |     
  176 |     // Verify text
  177 |     await expect(page.locator('text="Allow camera permissions"')).toBeVisible();
  178 | 
  179 |     // Note: Actual WebRTC camera permission automation is complex in Playwright headless. 
  180 |     // We verify the component rendering and logic hooks up successfully.
  181 |   });
  182 | 
  183 | });
```