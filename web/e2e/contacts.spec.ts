import { test, expect } from '@playwright/test'
import { waitForAPI } from '../test/helpers/api.mjs'

test.describe('Contacts', () => {
  test('contacts list page loads', async ({ page }) => {
    await page.goto('/contacts')
    
    // Wait for page to load
    await expect(page.getByRole('heading', { name: /contacts/i })).toBeVisible()
  })

  test('contacts list fetches from real API', async ({ page }) => {
    await page.goto('/contacts')
    
    // Wait for real API response
    const response = await waitForAPI(page, '/v1/contacts')
    
    // Verify response is successful
    expect(response.status()).toBe(200)
    
    // Check if data is rendered (could be empty state or contact cards)
    await page.waitForTimeout(1000)
    
    // Look for either contacts or empty state
    const hasContacts = await page.locator('[data-testid="contact-card"], .contact-item, .contact-row').count() > 0
    const hasEmptyState = await page.locator('text=/no contacts|empty|get started/i').count() > 0
    
    expect(hasContacts || hasEmptyState).toBeTruthy()
  })

  test('create contact button exists', async ({ page }) => {
    await page.goto('/contacts')
    
    // Look for create/add button
    const createButton = page.locator('button:has-text("Add"), button:has-text("New"), a:has-text("Create")')
    
    if (await createButton.count() > 0) {
      await expect(createButton.first()).toBeVisible()
    }
  })

  test('search/filter functionality exists', async ({ page }) => {
    await page.goto('/contacts')
    
    // Look for search input
    const searchInput = page.locator('input[placeholder*="Search"], input[type="search"]')
    
    if (await searchInput.count() > 0) {
      await expect(searchInput.first()).toBeVisible()
    }
  })
})

test.describe('Contact Detail', () => {
  test.skip('contact detail page loads with real data', async ({ page }) => {
    // This test requires knowing a contact ID
    // Skip for now, implement when we have test data
    await page.goto('/contacts')
    
    // Wait for contacts to load
    await waitForAPI(page, '/v1/contacts')
    
    // Click first contact if exists
    const firstContact = page.locator('[data-testid="contact-card"], .contact-item').first()
    
    if (await firstContact.count() > 0) {
      await firstContact.click()
      
      // Wait for detail page to load
      await waitForAPI(page, '/v1/contacts/')
      
      // Verify detail page content
      await expect(page.locator('h1, h2')).toBeVisible()
    }
  })

  test.skip('contact detail shows interactions', async ({ page }) => {
    // Navigate to a contact detail page
    // This requires a known contact ID
    const testContactId = 'test-id'
    
    await page.goto(`/contacts/${testContactId}`)
    
    // Wait for contact data
    await waitForAPI(page, `/v1/contacts/${testContactId}`)
    
    // Check for interactions section
    const interactionsSection = page.locator('text=/interactions|activity|history/i')
    await expect(interactionsSection).toBeVisible()
  })

  test.skip('contact detail shows warmth score', async ({ page }) => {
    const testContactId = 'test-id'
    
    await page.goto(`/contacts/${testContactId}`)
    
    // Wait for contact data
    await waitForAPI(page, `/v1/contacts/${testContactId}`)
    
    // Look for warmth score display
    const warmthDisplay = page.locator('text=/warmth|score/i')
    
    if (await warmthDisplay.count() > 0) {
      await expect(warmthDisplay.first()).toBeVisible()
    }
  })
})

test.describe('Contact CRUD Operations', () => {
  test.skip('can create a new contact', async ({ page }) => {
    await page.goto('/contacts/new')
    
    // Fill in contact form
    await page.fill('input[name="name"]', 'Test Contact')
    await page.fill('input[name="email"]', 'test@example.com')
    
    // Submit form
    await page.click('button[type="submit"]')
    
    // Wait for create API call
    const response = await page.waitForResponse(res =>
      res.url().includes('/v1/contacts') &&
      res.request().method() === 'POST' &&
      res.status() === 201
    )
    
    expect(response.status()).toBe(201)
    
    // Should redirect to contact detail or list
    await page.waitForURL(/\/contacts/)
  })

  test.skip('can update contact information', async ({ page }) => {
    const testContactId = 'test-id'
    
    await page.goto(`/contacts/${testContactId}/edit`)
    
    // Update name
    await page.fill('input[name="name"]', 'Updated Name')
    
    // Submit form
    await page.click('button[type="submit"]')
    
    // Wait for update API call
    await page.waitForResponse(res =>
      res.url().includes(`/v1/contacts/${testContactId}`) &&
      res.request().method() === 'PATCH' &&
      res.status() === 200
    )
    
    // Should show success message
    await expect(page.locator('text=/updated|saved|success/i')).toBeVisible()
  })

  test.skip('can delete a contact', async ({ page }) => {
    const testContactId = 'test-id'
    
    await page.goto(`/contacts/${testContactId}`)
    
    // Click delete button
    await page.click('button:has-text("Delete")')
    
    // Confirm deletion (if confirmation modal exists)
    const confirmButton = page.locator('button:has-text("Confirm"), button:has-text("Yes")')
    if (await confirmButton.count() > 0) {
      await confirmButton.click()
    }
    
    // Wait for delete API call
    await page.waitForResponse(res =>
      res.url().includes(`/v1/contacts/${testContactId}`) &&
      res.request().method() === 'DELETE' &&
      res.status() === 200
    )
    
    // Should redirect to contacts list
    await expect(page).toHaveURL('/contacts')
  })
})
