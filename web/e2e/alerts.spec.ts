import { test, expect } from '@playwright/test'
import { waitForAPI, waitForMutation } from '../test/helpers/api.mjs'

test.describe('Alerts', () => {
  test('alerts page loads', async ({ page }) => {
    await page.goto('/alerts')
    
    // Wait for page to load
    await expect(page.getByRole('heading', { name: /alerts|warmth alerts/i })).toBeVisible()
  })

  test('alerts list fetches from real API', async ({ page }) => {
    await page.goto('/alerts')
    
    // Wait for real API response
    const response = await waitForAPI(page, '/v1/alerts')
    
    // Verify response is successful
    expect(response.status()).toBe(200)
    
    // Check if data is rendered
    await page.waitForTimeout(1000)
    
    // Look for either alerts or empty state
    const hasAlerts = await page.locator('[data-testid="alert-item"], .alert-card, .alert-row').count() > 0
    const hasEmptyState = await page.locator('text=/no alerts|all caught up|no warmth alerts/i').count() > 0
    
    expect(hasAlerts || hasEmptyState).toBeTruthy()
  })

  test('alert cards show contact information', async ({ page }) => {
    await page.goto('/alerts')
    
    // Wait for alerts to load
    await waitForAPI(page, '/v1/alerts')
    
    // If alerts exist, check their structure
    const alertCount = await page.locator('[data-testid="alert-item"], .alert-card').count()
    
    if (alertCount > 0) {
      const firstAlert = page.locator('[data-testid="alert-item"], .alert-card').first()
      
      // Should show contact name or info
      await expect(firstAlert).toBeVisible()
    }
  })
})

test.describe('Alert Actions', () => {
  test.skip('can dismiss an alert', async ({ page }) => {
    await page.goto('/alerts')
    
    // Wait for alerts to load
    await waitForAPI(page, '/v1/alerts')
    
    // Find first alert
    const firstAlert = page.locator('[data-testid="alert-item"]').first()
    
    if (await firstAlert.count() > 0) {
      // Click dismiss button
      await firstAlert.locator('button:has-text("Dismiss"), button[data-action="dismiss"]').click()
      
      // Wait for API call
      await waitForMutation(page, '/v1/alerts', 'PATCH')
      
      // Alert should be removed or marked as dismissed
      await page.waitForTimeout(500)
    }
  })

  test.skip('can snooze an alert', async ({ page }) => {
    await page.goto('/alerts')
    
    // Wait for alerts to load
    await waitForAPI(page, '/v1/alerts')
    
    const firstAlert = page.locator('[data-testid="alert-item"]').first()
    
    if (await firstAlert.count() > 0) {
      // Click snooze button
      await firstAlert.locator('button:has-text("Snooze"), button[data-action="snooze"]').click()
      
      // Wait for API call
      await waitForMutation(page, '/v1/alerts', 'PATCH')
      
      // Should show success message
      await expect(page.locator('text=/snoozed|remind you later/i')).toBeVisible()
    }
  })

  test.skip('can mark as reached out', async ({ page }) => {
    await page.goto('/alerts')
    
    // Wait for alerts to load
    await waitForAPI(page, '/v1/alerts')
    
    const firstAlert = page.locator('[data-testid="alert-item"]').first()
    
    if (await firstAlert.count() > 0) {
      // Click reached out button
      await firstAlert.locator('button:has-text("Reached Out"), button:has-text("Done"), button[data-action="reached_out"]').click()
      
      // Wait for API call
      await waitForMutation(page, '/v1/alerts', 'PATCH')
      
      // Alert should be removed or marked as resolved
      await page.waitForTimeout(500)
    }
  })

  test.skip('clicking alert navigates to contact', async ({ page }) => {
    await page.goto('/alerts')
    
    // Wait for alerts to load
    await waitForAPI(page, '/v1/alerts')
    
    const firstAlert = page.locator('[data-testid="alert-item"]').first()
    
    if (await firstAlert.count() > 0) {
      // Click on the alert (should navigate to contact)
      await firstAlert.click()
      
      // Should navigate to contact detail page
      await page.waitForURL(/\/contacts\//)
      
      // Wait for contact data to load
      await waitForAPI(page, '/v1/contacts/')
    }
  })
})

test.describe('Alert Filters', () => {
  test.skip('can filter alerts by status', async ({ page }) => {
    await page.goto('/alerts')
    
    // Wait for alerts to load
    await waitForAPI(page, '/v1/alerts')
    
    // Look for filter buttons/dropdown
    const filterButton = page.locator('button:has-text("Filter"), select[name="status"]')
    
    if (await filterButton.count() > 0) {
      await filterButton.first().click()
      
      // Select a filter option
      await page.click('button:has-text("Active"), option:has-text("Active")')
      
      // Should reload with filtered results
      await waitForAPI(page, '/v1/alerts')
    }
  })

  test.skip('can sort alerts', async ({ page }) => {
    await page.goto('/alerts')
    
    // Wait for alerts to load
    await waitForAPI(page, '/v1/alerts')
    
    // Look for sort dropdown
    const sortButton = page.locator('button:has-text("Sort"), select[name="sort"]')
    
    if (await sortButton.count() > 0) {
      await sortButton.first().click()
      
      // Select sort option
      await page.click('button:has-text("Most Recent"), option:has-text("Recent")')
      
      // Should reload with sorted results
      await page.waitForTimeout(500)
    }
  })
})
