import { test, expect } from '@playwright/test'

test.describe('Inventory Tags E2E (Fullstack)', () => {
  // We'll create a spare part in the DB for our tests first, or use the UI
  test.beforeEach(async ({ page, request }) => {
    // Navigate to Inventory page
    await page.goto('/inventory')
  })

  test('can open tags tab and view UI', async ({ page }) => {
    // 1. Click Tags tab
    await page.getByRole('button', { name: 'Tags' }).click()
    
    // 2. Verify Tag UI is visible
    await expect(page.getByText('Generate Tag')).toBeVisible()
    await expect(page.getByText('Scan Tag')).toBeVisible()
    await expect(page.getByPlaceholder('Search by tag identifier...')).toBeVisible()
  })

  test('can open Generate Tag modal', async ({ page }) => {
    await page.getByRole('button', { name: 'Tags' }).click()
    await page.getByRole('button', { name: 'Generate Tag' }).click()

    await expect(page.getByRole('heading', { name: 'Generate Tags' })).toBeVisible()
    await expect(page.getByText('Spare Part')).toBeVisible()
    await page.getByRole('button', { name: 'Cancel' }).click()
  })

  test('can prompt for scan tag', async ({ page }) => {
    await page.getByRole('button', { name: 'Tags' }).click()
    
    // Playwright dialog handler
    page.on('dialog', async dialog => {
      expect(dialog.message()).toContain('Enter Tag Identifier')
      await dialog.dismiss()
    })

    await page.getByRole('button', { name: 'Scan Tag' }).click()
  })
})
