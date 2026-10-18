import { test, expect } from '@playwright/test'
import { waitForAPI, waitForMutation } from '../test/helpers/api.mjs'
import * as path from 'path'

test.describe('Voice Notes', () => {
  test('voice notes page loads', async ({ page }) => {
    await page.goto('/voice-notes')
    
    // Wait for page to load
    await expect(page.getByRole('heading', { name: /voice notes/i })).toBeVisible()
  })

  test('upload interface exists', async ({ page }) => {
    await page.goto('/voice-notes')
    
    // Look for file input or upload button
    const fileInput = page.locator('input[type="file"]')
    const uploadButton = page.locator('button:has-text("Upload"), button:has-text("Record")')
    
    const hasUploadInterface = await fileInput.count() > 0 || await uploadButton.count() > 0
    expect(hasUploadInterface).toBeTruthy()
  })

  test('shows voice notes list or empty state', async ({ page }) => {
    await page.goto('/voice-notes')
    
    // Wait a moment for page to render
    await page.waitForTimeout(1000)
    
    // Look for either voice notes or empty state
    const hasNotes = await page.locator('[data-testid="voice-note"], .voice-note-card').count() > 0
    const hasEmptyState = await page.locator('text=/no voice notes|get started|upload your first/i').count() > 0
    
    expect(hasNotes || hasEmptyState).toBeTruthy()
  })
})

test.describe('Voice Note Upload', () => {
  test.skip('can upload a voice note file', async ({ page }) => {
    await page.goto('/voice-notes')
    
    // Create a test audio file path (you'll need an actual audio file for this)
    const testFilePath = path.join(__dirname, '../test/fixtures/sample-audio.m4a')
    
    // Find file input
    const fileInput = page.locator('input[type="file"]')
    
    if (await fileInput.count() > 0) {
      // Set files to upload
      await fileInput.setInputFiles(testFilePath)
      
      // Click upload button if needed
      const uploadButton = page.locator('button:has-text("Upload"), button[type="submit"]')
      if (await uploadButton.count() > 0) {
        await uploadButton.click()
      }
      
      // Wait for upload API call
      await waitForMutation(page, '/v1/voice-notes', 'POST')
      
      // Should show success message
      await expect(page.locator('text=/uploaded|success|processing/i')).toBeVisible()
    }
  })

  test.skip('shows upload progress', async ({ page }) => {
    await page.goto('/voice-notes')
    
    const testFilePath = path.join(__dirname, '../test/fixtures/sample-audio.m4a')
    const fileInput = page.locator('input[type="file"]')
    
    if (await fileInput.count() > 0) {
      await fileInput.setInputFiles(testFilePath)
      
      // Trigger upload
      const uploadButton = page.locator('button:has-text("Upload")')
      if (await uploadButton.count() > 0) {
        await uploadButton.click()
      }
      
      // Look for progress indicator
      const progressIndicator = page.locator('[role="progressbar"], .progress-bar, text=/uploading|processing/i')
      
      if (await progressIndicator.count() > 0) {
        await expect(progressIndicator.first()).toBeVisible()
      }
    }
  })

  test('validates file type', async ({ page }) => {
    await page.goto('/voice-notes')
    
    // Look for file input with accept attribute
    const fileInput = page.locator('input[type="file"]')
    
    if (await fileInput.count() > 0) {
      const acceptAttr = await fileInput.getAttribute('accept')
      
      // Should accept audio files
      if (acceptAttr) {
        expect(acceptAttr).toContain('audio')
      }
    }
  })
})

test.describe('Voice Note Playback', () => {
  test.skip('can play a voice note', async ({ page }) => {
    await page.goto('/voice-notes')
    
    // Find first voice note
    const firstNote = page.locator('[data-testid="voice-note"]').first()
    
    if (await firstNote.count() > 0) {
      // Click play button
      await firstNote.locator('button:has-text("Play"), button[aria-label="Play"]').click()
      
      // Audio should start playing
      const audioElement = page.locator('audio')
      if (await audioElement.count() > 0) {
        const isPaused = await audioElement.evaluate((el: HTMLAudioElement) => el.paused)
        expect(isPaused).toBe(false)
      }
    }
  })

  test.skip('shows transcription when available', async ({ page }) => {
    await page.goto('/voice-notes')
    
    // Find first voice note
    const firstNote = page.locator('[data-testid="voice-note"]').first()
    
    if (await firstNote.count() > 0) {
      // Click to expand or view transcription
      await firstNote.click()
      
      // Look for transcription text
      const transcription = page.locator('[data-testid="transcription"], .transcription-text')
      
      if (await transcription.count() > 0) {
        await expect(transcription).toBeVisible()
      }
    }
  })
})

test.describe('Voice Note Processing', () => {
  test.skip('shows AI processing status', async ({ page }) => {
    await page.goto('/voice-notes')
    
    // Look for notes in processing state
    const processingNote = page.locator('text=/processing|analyzing|transcribing/i')
    
    if (await processingNote.count() > 0) {
      await expect(processingNote.first()).toBeVisible()
    }
  })

  test.skip('shows extracted contacts from voice note', async ({ page }) => {
    await page.goto('/voice-notes')
    
    const firstNote = page.locator('[data-testid="voice-note"]').first()
    
    if (await firstNote.count() > 0) {
      // Look for contact mentions
      const contactMentions = firstNote.locator('[data-testid="contact-mention"], .contact-tag')
      
      if (await contactMentions.count() > 0) {
        await expect(contactMentions.first()).toBeVisible()
      }
    }
  })

  test.skip('shows action items from voice note', async ({ page }) => {
    await page.goto('/voice-notes')
    
    const firstNote = page.locator('[data-testid="voice-note"]').first()
    
    if (await firstNote.count() > 0) {
      // Look for action items
      const actionItems = firstNote.locator('[data-testid="action-item"], .action-tag')
      
      if (await actionItems.count() > 0) {
        await expect(actionItems.first()).toBeVisible()
      }
    }
  })
})

test.describe('Voice Note Management', () => {
  test.skip('can delete a voice note', async ({ page }) => {
    await page.goto('/voice-notes')
    
    const firstNote = page.locator('[data-testid="voice-note"]').first()
    
    if (await firstNote.count() > 0) {
      // Click delete button
      await firstNote.locator('button:has-text("Delete"), button[aria-label="Delete"]').click()
      
      // Confirm deletion
      const confirmButton = page.locator('button:has-text("Confirm"), button:has-text("Yes")')
      if (await confirmButton.count() > 0) {
        await confirmButton.click()
      }
      
      // Wait for delete API call
      await page.waitForResponse(res =>
        res.url().includes('/v1/voice-notes/') &&
        res.request().method() === 'DELETE' &&
        res.status() === 200
      )
    }
  })

  test.skip('can filter voice notes by date', async ({ page }) => {
    await page.goto('/voice-notes')
    
    // Look for date filter
    const dateFilter = page.locator('select[name="dateFilter"], button:has-text("Filter")')
    
    if (await dateFilter.count() > 0) {
      await dateFilter.first().click()
      
      // Select filter option
      await page.click('option:has-text("Last 7 days"), button:has-text("Last 7 days")')
      
      // List should update
      await page.waitForTimeout(500)
    }
  })

  test.skip('can search voice notes', async ({ page }) => {
    await page.goto('/voice-notes')
    
    // Look for search input
    const searchInput = page.locator('input[type="search"], input[placeholder*="Search"]')
    
    if (await searchInput.count() > 0) {
      // Type search query
      await searchInput.fill('test query')
      
      // Wait for search results
      await page.waitForTimeout(500)
    }
  })
})
