/**
 * API test utilities for Playwright
 */

const BACKEND_BASE = process.env.NEXT_PUBLIC_BACKEND_BASE || 'https://ever-reach-be.vercel.app'

/**
 * Wait for a specific API endpoint to respond
 * @param {import('@playwright/test').Page} page - Playwright page object
 * @param {string} endpoint - API endpoint path (e.g., '/v1/contacts')
 * @param {number} status - Expected HTTP status code (default: 200)
 */
export async function waitForAPI(page, endpoint, status = 200) {
  return page.waitForResponse(
    (res) => res.url().includes(endpoint) && res.status() === status
  )
}

/**
 * Wait for a POST/PATCH/DELETE request to complete
 * @param {import('@playwright/test').Page} page - Playwright page object
 * @param {string} endpoint - API endpoint path
 * @param {string} method - HTTP method (POST, PATCH, DELETE)
 */
export async function waitForMutation(page, endpoint, method = 'POST') {
  return page.waitForResponse(
    (res) =>
      res.url().includes(endpoint) &&
      res.request().method() === method &&
      res.status() >= 200 &&
      res.status() < 300
  )
}

/**
 * Get API base URL
 */
export function getAPIBase() {
  return BACKEND_BASE
}
