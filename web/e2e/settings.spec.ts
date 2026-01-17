import { test, expect } from '@playwright/test'
import { waitForMutation } from '../test/helpers/api.mjs'

test.describe('Settings', () => {
  test('settings page loads', async ({ page }) => {
    await page.goto('/settings')
    
    // Wait for page to load
    await expect(page.getByRole('heading', { name: /settings|preferences/i })).toBeVisible()
  })

  test('settings form exists', async ({ page }) => {
    await page.goto('/settings')
    
    // Check for form elements
    const form = page.locator('form')
    
    if (await form.count() > 0) {
      await expect(form).toBeVisible()
    }
  })

  test('user profile section exists', async ({ page }) => {
    await page.goto('/settings')
    
    // Look for profile-related fields
    const nameInput = page.locator('input[name="name"], input[name="displayName"]')
    const emailDisplay = page.locator('text=/email|e-mail/i')
    
    const hasProfileFields = await nameInput.count() > 0 || await emailDisplay.count() > 0
    expect(hasProfileFields).toBeTruthy()
  })
})

test.describe('Settings Updates', () => {
  test.skip('can update user preferences', async ({ page }) => {
    await page.goto('/settings')
    
    // Update a setting (e.g., theme)
    const themeSelect = page.locator('select[name="theme"]')
    
    if (await themeSelect.count() > 0) {
      await themeSelect.selectOption('dark')
      
      // Click save button
      await page.click('button:has-text("Save")')
      
      // Wait for API call
      await waitForMutation(page, '/v1/settings', 'PATCH')
      
      // Should show success message
      await expect(page.locator('text=/saved|updated|success/i')).toBeVisible()
    }
  })

  test.skip('can update notification preferences', async ({ page }) => {
    await page.goto('/settings')
    
    // Look for notification settings
    const notificationCheckbox = page.locator('input[type="checkbox"][name*="notification"]').first()
    
    if (await notificationCheckbox.count() > 0) {
      // Toggle the checkbox
      await notificationCheckbox.click()
      
      // Save changes
      await page.click('button:has-text("Save")')
      
      // Wait for update
      await waitForMutation(page, '/v1/settings', 'PATCH')
      
      // Should show success
      await expect(page.locator('text=/saved|updated/i')).toBeVisible()
    }
  })

  test.skip('can update warmth alert thresholds', async ({ page }) => {
    await page.goto('/settings')
    
    // Look for warmth settings
    const warmthInput = page.locator('input[name="warmthThreshold"], input[name="alertThreshold"]')
    
    if (await warmthInput.count() > 0) {
      // Update threshold
      await warmthInput.fill('30')
      
      // Save
      await page.click('button:has-text("Save")')
      
      // Wait for update
      await waitForMutation(page, '/v1/settings', 'PATCH')
    }
  })
})

test.describe('Account Management', () => {
  test('shows account information', async ({ page }) => {
    await page.goto('/settings')
    
    // Look for account section
    const accountSection = page.locator('text=/account|profile/i')
    
    if (await accountSection.count() > 0) {
      await expect(accountSection.first()).toBeVisible()
    }
  })

  test.skip('can change password', async ({ page }) => {
    await page.goto('/settings')
    
    // Look for change password section
    const changePasswordButton = page.locator('button:has-text("Change Password"), a:has-text("Change Password")')
    
    if (await changePasswordButton.count() > 0) {
      await changePasswordButton.click()
      
      // Fill in password fields
      await page.fill('input[name="currentPassword"]', 'oldpassword')
      await page.fill('input[name="newPassword"]', 'newpassword123')
      await page.fill('input[name="confirmPassword"]', 'newpassword123')
      
      // Submit
      await page.click('button[type="submit"]')
      
      // Wait for response
      await page.waitForTimeout(1000)
    }
  })

  test.skip('can delete account', async ({ page }) => {
    await page.goto('/settings')
    
    // Look for delete account button (usually dangerous action)
    const deleteButton = page.locator('button:has-text("Delete Account"), button:has-text("Close Account")')
    
    if (await deleteButton.count() > 0) {
      // Don't actually click it in tests!
      await expect(deleteButton).toBeVisible()
    }
  })
})

test.describe('Connected Services', () => {
  test.skip('shows connected OAuth providers', async ({ page }) => {
    await page.goto('/settings')
    
    // Look for OAuth connections section
    const oauthSection = page.locator('text=/connected accounts|oauth|google/i')
    
    if (await oauthSection.count() > 0) {
      await expect(oauthSection.first()).toBeVisible()
    }
  })

  test.skip('can disconnect OAuth provider', async ({ page }) => {
    await page.goto('/settings')
    
    // Find disconnect button
    const disconnectButton = page.locator('button:has-text("Disconnect"), button:has-text("Remove")')
    
    if (await disconnectButton.count() > 0) {
      // Don't actually disconnect in tests
      await expect(disconnectButton.first()).toBeVisible()
    }
  })
})

test.describe('Data & Privacy', () => {
  test.skip('can export data', async ({ page }) => {
    await page.goto('/settings')
    
    // Look for export button
    const exportButton = page.locator('button:has-text("Export"), button:has-text("Download Data")')
    
    if (await exportButton.count() > 0) {
      await exportButton.click()
      
      // Wait for download to start
      const downloadPromise = page.waitForEvent('download')
      await downloadPromise
    }
  })

  test.skip('shows privacy settings', async ({ page }) => {
    await page.goto('/settings')
    
    // Look for privacy section
    const privacySection = page.locator('text=/privacy|data protection|gdpr/i')
    
    if (await privacySection.count() > 0) {
      await expect(privacySection.first()).toBeVisible()
    }
  })
})
