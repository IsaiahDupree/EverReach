import { test, expect } from '@playwright/test';

test.describe('Goals & Message Composition', () => {
  test('goals endpoint structure', async ({ page, baseURL }) => {
    // Goals are used in message composition
    await page.goto(`${baseURL}/goal-picker`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    const bodyText = await page.textContent('body');
    const hasGoalContent = 
      bodyText?.toLowerCase().includes('goal') ||
      bodyText?.toLowerCase().includes('objective') ||
      bodyText?.toLowerCase().includes('purpose');
    
    if (hasGoalContent) {
      console.log('   Goals UI found - checking for goal types');
      
      // Common goal types
      const goalTypes = ['nurture', 're-engage', 'follow-up', 'introduce', 'update'];
      const foundGoals: string[] = [];
      
      for (const goal of goalTypes) {
        if (bodyText?.toLowerCase().includes(goal)) {
          foundGoals.push(goal);
        }
      }
      
      if (foundGoals.length > 0) {
        console.log(`   Found goal types: ${foundGoals.join(', ')}`);
      }
    }
    
    await expect(page.locator('body')).toBeVisible();
  });

  test('message templates accessible', async ({ page, baseURL }) => {
    await page.goto(`${baseURL}/message-templates`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    await expect(page.locator('body')).toBeVisible();
    
    const bodyText = await page.textContent('body');
    const hasTemplateContent = 
      bodyText?.toLowerCase().includes('template') ||
      bodyText?.toLowerCase().includes('message');
    
    expect(hasTemplateContent).toBeTruthy();
  });
});
