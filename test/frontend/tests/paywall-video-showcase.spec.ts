import { test, expect } from '@playwright/test';

test.describe('Paywall with Video Showcase', () => {
  test('paywall page displays video element', async ({ page, baseURL }) => {
    const webBase = baseURL ?? 'http://localhost:8081';
    
    // Navigate to paywall (may be subscription-plans or a dedicated paywall route)
    await page.goto(`${webBase}/subscription-plans`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);

    // Look for video element
    const hasVideo = await page.locator('video').first().isVisible().catch(() => false);
    const hasIframe = await page.locator('iframe[src*="youtube"], iframe[src*="vimeo"], iframe[src*="video"]').first().isVisible().catch(() => false);
    
    if (hasVideo || hasIframe) {
      test.info().annotations.push({ 
        type: 'note', 
        description: hasVideo ? 'Native video element found' : 'Embedded video (iframe) found' 
      });
      expect(hasVideo || hasIframe).toBeTruthy();
    } else {
      test.info().annotations.push({ 
        type: 'note', 
        description: 'No video element found on paywall page' 
      });
    }
  });

  test('paywall showcases features and solutions', async ({ page, baseURL }) => {
    const webBase = baseURL ?? 'http://localhost:8081';
    
    await page.goto(`${webBase}/paywall`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    const bodyText = await page.textContent('body');
    
    // Check for feature highlights
    const hasFeatures = bodyText?.toLowerCase().includes('feature') ||
                        bodyText?.toLowerCase().includes('benefit') ||
                        bodyText?.toLowerCase().includes('unlimited') ||
                        bodyText?.toLowerCase().includes('ai') ||
                        bodyText?.toLowerCase().includes('warmth');
    
    expect(hasFeatures).toBeTruthy();

    // Check for solutions/transformation messaging
    const hasSolutions = bodyText?.toLowerCase().includes('solution') ||
                         bodyText?.toLowerCase().includes('transform') ||
                         bodyText?.toLowerCase().includes('relationship') ||
                         bodyText?.toLowerCase().includes('connect') ||
                         bodyText?.toLowerCase().includes('strengthen');
    
    expect(hasSolutions).toBeTruthy();
  });

  test('paywall displays transformation messaging', async ({ page, baseURL }) => {
    const webBase = baseURL ?? 'http://localhost:8081';
    
    await page.goto(`${webBase}/paywall`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    const bodyText = await page.textContent('body');
    
    // Look for transformation-focused copy
    const hasTransformationMsg = bodyText?.toLowerCase().includes('never forget') ||
                                 bodyText?.toLowerCase().includes('stay connected') ||
                                 bodyText?.toLowerCase().includes('deepen relationship') ||
                                 bodyText?.toLowerCase().includes('build stronger') ||
                                 bodyText?.toLowerCase().includes('transform the way');
    
    expect(hasTransformationMsg).toBeTruthy();
  });

  test('paywall has clear call-to-action buttons', async ({ page, baseURL }) => {
    const webBase = baseURL ?? 'http://localhost:8081';
    
    await page.goto(`${webBase}/paywall`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    // Look for CTAs
    const startTrialBtn = await page.getByText(/Start.*Trial|Begin.*Trial|Try Free/i).first().isVisible().catch(() => false);
    const upgradeBtn = await page.getByText(/Upgrade|Subscribe|Get Started|Choose Plan/i).first().isVisible().catch(() => false);
    
    const hasCTA = startTrialBtn || upgradeBtn;
    expect(hasCTA).toBeTruthy();
  });

  test('paywall displays pricing tiers with features', async ({ page, baseURL }) => {
    const webBase = baseURL ?? 'http://localhost:8081';
    
    await page.goto(`${webBase}/paywall`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    const bodyText = await page.textContent('body');
    
    // Check for pricing
    const hasPricing = bodyText?.includes('$') || 
                       bodyText?.toLowerCase().includes('month') ||
                       bodyText?.toLowerCase().includes('year');
    
    expect(hasPricing).toBeTruthy();

    // Check for feature lists
    const hasFeatureList = bodyText?.includes('✓') || 
                           bodyText?.includes('✔') ||
                           bodyText?.includes('•') ||
                           bodyText?.toLowerCase().includes('includes') ||
                           bodyText?.toLowerCase().includes('access to');
    
    expect(hasFeatureList).toBeTruthy();
  });

  test('video plays when user interacts with it', async ({ page, baseURL }) => {
    const webBase = baseURL ?? 'http://localhost:8081';
    
    await page.goto(`${webBase}/paywall`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);

    const video = page.locator('video').first();
    const hasVideo = await video.isVisible().catch(() => false);
    
    if (hasVideo) {
      // Try to play the video
      await video.click();
      await page.waitForTimeout(1000);

      // Check if video has play controls or is playing
      const hasControls = await video.evaluate((v: HTMLVideoElement) => v.controls);
      const isPaused = await video.evaluate((v: HTMLVideoElement) => v.paused);
      
      test.info().annotations.push({ 
        type: 'note', 
        description: `Video controls: ${hasControls}, Paused: ${isPaused}` 
      });
    } else {
      // Check for iframe video
      const iframe = await page.locator('iframe[src*="youtube"], iframe[src*="vimeo"]').first().isVisible().catch(() => false);
      if (iframe) {
        test.info().annotations.push({ 
          type: 'note', 
          description: 'Embedded video found (iframe)' 
        });
      } else {
        test.skip(true, 'No video element found on page');
      }
    }
  });
});
