/**
 * Playwright authentication helpers
 */

/**
 * Login helper for Playwright tests
 * @param {import('@playwright/test').Page} page - Playwright page object
 * @param {string} email - User email
 * @param {string} password - User password
 */
export async function login(page, email = 'test@example.com', password = 'testpassword123') {
  await page.goto('/login')
  await page.fill('[name="email"]', email)
  await page.fill('[name="password"]', password)
  await page.click('button[type="submit"]')
  
  // Wait for redirect after successful login
  await page.waitForURL('/')
}

/**
 * Setup authenticated state for tests
 * @param {import('@playwright/test').Page} page - Playwright page object
 */
export async function setupAuth(page) {
  // This can be extended to use Supabase session tokens
  // for faster authentication in tests
  await login(page)
}

/**
 * Logout helper
 * @param {import('@playwright/test').Page} page - Playwright page object
 */
export async function logout(page) {
  // Implement logout flow when available
  await page.goto('/logout')
}
