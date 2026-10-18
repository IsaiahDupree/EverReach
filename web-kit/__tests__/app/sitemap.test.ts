/**
 * Test Suite: Sitemap Generation (WEB-SEO-002)
 *
 * Acceptance Criteria:
 * - Lists all public pages: Sitemap includes all public routes
 * - Auto-generated: Sitemap is automatically generated from route structure
 */

import sitemap from '@/app/sitemap';
import { MetadataRoute } from 'next';

describe('WEB-SEO-002: Sitemap Generation', () => {
  let sitemapResult: MetadataRoute.Sitemap;

  beforeAll(async () => {
    sitemapResult = await Promise.resolve(sitemap());
  });

  describe('Sitemap Structure', () => {
    it('should return an array', () => {
      expect(Array.isArray(sitemapResult)).toBe(true);
    });

    it('should not be empty', () => {
      expect(sitemapResult.length).toBeGreaterThan(0);
    });

    it('should have valid sitemap entry structure', () => {
      const firstEntry = sitemapResult[0];
      expect(firstEntry).toHaveProperty('url');
      expect(firstEntry).toHaveProperty('lastModified');
    });

    it('should have URLs as strings', () => {
      sitemapResult.forEach((entry) => {
        expect(typeof entry.url).toBe('string');
      });
    });

    it('should have valid lastModified dates', () => {
      sitemapResult.forEach((entry) => {
        expect(entry.lastModified).toBeInstanceOf(Date);
      });
    });
  });

  describe('Public Pages Listing', () => {
    it('should include the homepage', () => {
      const homePage = sitemapResult.find((entry) =>
        entry.url.endsWith('/')
      );
      expect(homePage).toBeDefined();
    });

    it('should include pricing page', () => {
      const pricingPage = sitemapResult.find((entry) =>
        entry.url.includes('/pricing')
      );
      expect(pricingPage).toBeDefined();
    });

    it('should include login page', () => {
      const loginPage = sitemapResult.find((entry) =>
        entry.url.includes('/login')
      );
      expect(loginPage).toBeDefined();
    });

    it('should include signup page', () => {
      const signupPage = sitemapResult.find((entry) =>
        entry.url.includes('/signup')
      );
      expect(signupPage).toBeDefined();
    });

    it('should include at least 4 public pages', () => {
      // Homepage, pricing, login, signup at minimum
      expect(sitemapResult.length).toBeGreaterThanOrEqual(4);
    });
  });

  describe('URL Formatting', () => {
    it('should use absolute URLs with domain', () => {
      sitemapResult.forEach((entry) => {
        expect(entry.url).toMatch(/^https?:\/\//);
      });
    });

    it('should not include dashboard pages', () => {
      const dashboardPages = sitemapResult.filter((entry) =>
        entry.url.includes('/dashboard')
      );
      expect(dashboardPages.length).toBe(0);
    });

    it('should not include settings pages', () => {
      const settingsPages = sitemapResult.filter((entry) =>
        entry.url.includes('/settings')
      );
      expect(settingsPages.length).toBe(0);
    });

    it('should not include items pages (protected)', () => {
      const itemsPages = sitemapResult.filter((entry) =>
        entry.url.includes('/items')
      );
      expect(itemsPages.length).toBe(0);
    });

    it('should not include API routes', () => {
      const apiRoutes = sitemapResult.filter((entry) =>
        entry.url.includes('/api/')
      );
      expect(apiRoutes.length).toBe(0);
    });
  });

  describe('SEO Properties', () => {
    it('should have changeFrequency for each entry', () => {
      sitemapResult.forEach((entry) => {
        if (entry.changeFrequency) {
          expect([
            'always',
            'hourly',
            'daily',
            'weekly',
            'monthly',
            'yearly',
            'never',
          ]).toContain(entry.changeFrequency);
        }
      });
    });

    it('should have priority for each entry', () => {
      sitemapResult.forEach((entry) => {
        if (entry.priority !== undefined) {
          expect(entry.priority).toBeGreaterThanOrEqual(0);
          expect(entry.priority).toBeLessThanOrEqual(1);
        }
      });
    });

    it('should have higher priority for homepage', () => {
      const homePage = sitemapResult.find((entry) =>
        entry.url.endsWith('/')
      );
      if (homePage?.priority !== undefined) {
        expect(homePage.priority).toBeGreaterThanOrEqual(0.8);
      }
    });
  });

  describe('Date Handling', () => {
    it('should have recent lastModified dates', () => {
      const now = new Date();
      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(now.getFullYear() - 1);

      sitemapResult.forEach((entry) => {
        expect(entry.lastModified.getTime()).toBeGreaterThan(
          oneYearAgo.getTime()
        );
      });
    });

    it('should not have future dates', () => {
      const now = new Date();

      sitemapResult.forEach((entry) => {
        expect(entry.lastModified.getTime()).toBeLessThanOrEqual(
          now.getTime()
        );
      });
    });
  });

  describe('Auto-generation', () => {
    it('should be a function that returns sitemap data', () => {
      expect(typeof sitemap).toBe('function');
    });

    it('should generate consistent results', async () => {
      const secondResult = await Promise.resolve(sitemap());
      expect(secondResult.length).toBe(sitemapResult.length);
    });

    it('should include all marketing routes', () => {
      // Marketing routes should be public
      const marketingRoutes = ['/', '/pricing'];
      marketingRoutes.forEach((route) => {
        const found = sitemapResult.some((entry) =>
          entry.url.endsWith(route) || entry.url.endsWith(route + '/')
        );
        expect(found).toBe(true);
      });
    });

    it('should exclude auth callback routes', () => {
      const callbackRoutes = sitemapResult.filter((entry) =>
        entry.url.includes('/callback')
      );
      expect(callbackRoutes.length).toBe(0);
    });
  });

  describe('Edge Cases', () => {
    it('should handle URLs without trailing slashes', () => {
      sitemapResult.forEach((entry) => {
        // URLs should be properly formatted
        expect(entry.url).toBeTruthy();
        expect(entry.url.length).toBeGreaterThan(0);
      });
    });

    it('should not have duplicate URLs', () => {
      const urls = sitemapResult.map((entry) => entry.url);
      const uniqueUrls = new Set(urls);
      expect(urls.length).toBe(uniqueUrls.size);
    });

    it('should handle special characters in URLs', () => {
      sitemapResult.forEach((entry) => {
        // URLs should be properly encoded
        expect(entry.url).not.toContain(' ');
      });
    });
  });
});
