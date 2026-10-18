/**
 * Test data cleanup utilities
 */

/**
 * Delete test contacts created during E2E tests
 * Note: This requires backend API access and proper authentication
 * @param {import('@playwright/test').APIRequestContext} request - Playwright API context
 * @param {string[]} contactIds - Array of contact IDs to delete
 */
export async function deleteTestContacts(request, contactIds) {
  for (const id of contactIds) {
    try {
      await request.delete(`/v1/contacts/${id}`)
    } catch (error) {
      console.warn(`Failed to delete contact ${id}:`, error.message)
    }
  }
}

/**
 * Delete test alerts
 * @param {import('@playwright/test').APIRequestContext} request - Playwright API context
 * @param {string[]} alertIds - Array of alert IDs to delete
 */
export async function deleteTestAlerts(request, alertIds) {
  for (const id of alertIds) {
    try {
      await request.delete(`/v1/alerts/${id}`)
    } catch (error) {
      console.warn(`Failed to delete alert ${id}:`, error.message)
    }
  }
}

/**
 * Clean up all test data after a test run
 * @param {import('@playwright/test').APIRequestContext} request - Playwright API context
 * @param {Object} testData - Object containing arrays of IDs to clean up
 */
export async function cleanupTestData(request, testData = {}) {
  const { contacts = [], alerts = [], voiceNotes = [] } = testData

  await Promise.all([
    deleteTestContacts(request, contacts),
    deleteTestAlerts(request, alerts),
    // Add more cleanup functions as needed
  ])
}
