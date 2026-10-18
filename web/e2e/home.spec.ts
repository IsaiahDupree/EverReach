import { test, expect } from '@playwright/test'

test.describe('Home Page', () => {
  test('loads successfully', async ({ page }) => {
    await page.goto('/')
    
    // Wait for page to load
    await expect(page).toHaveTitle(/EverReach/)
    
    // Check for main navigation
    await expect(page.locator('nav')).toBeVisible()
    await expect(page.getByRole('link', { name: 'Contacts' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Alerts' })).toBeVisible()
  })

  test('has working navigation links', async ({ page }) => {
    await page.goto('/')
    
    // Click on Contacts link
    await page.click('text=Contacts')
    await expect(page).toHaveURL(/\/contacts/)
    
    // Navigate back to home
    await page.goto('/')
    
    // Click on Alerts link
    await page.click('text=Alerts')
    await expect(page).toHaveURL(/\/alerts/)
  })

  test('PostHog tracking initializes', async ({ page }) => {
    await page.goto('/')
    
    // Wait for PostHog to initialize
    await page.waitForTimeout(1000)
    
    // Check if PostHog pageview was tracked
    // Note: In a real scenario, you might check network requests
    const hasPostHog = await page.evaluate(() => {
      return typeof window.posthog !== 'undefined'
    })
    
    expect(hasPostHog).toBe(true)
  })
})
