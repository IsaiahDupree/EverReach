import { siteConfig } from '@/config/site';

describe('Site Configuration', () => {
  it('should export siteConfig object', () => {
    expect(siteConfig).toBeDefined();
    expect(typeof siteConfig).toBe('object');
  });

  describe('Basic Information', () => {
    it('should have a site name', () => {
      expect(siteConfig.name).toBeDefined();
      expect(typeof siteConfig.name).toBe('string');
      expect(siteConfig.name.length).toBeGreaterThan(0);
    });

    it('should have a site description', () => {
      expect(siteConfig.description).toBeDefined();
      expect(typeof siteConfig.description).toBe('string');
      expect(siteConfig.description.length).toBeGreaterThan(0);
    });

    it('should have a site tagline', () => {
      expect(siteConfig.tagline).toBeDefined();
      expect(typeof siteConfig.tagline).toBe('string');
    });
  });

  describe('URLs', () => {
    it('should have a valid site URL', () => {
      expect(siteConfig.url).toBeDefined();
      expect(typeof siteConfig.url).toBe('string');
      // Should be a placeholder or valid URL format
      expect(siteConfig.url).toMatch(/^https?:\/\//);
    });

    it('should have an optional app URL', () => {
      if (siteConfig.appUrl) {
        expect(typeof siteConfig.appUrl).toBe('string');
        expect(siteConfig.appUrl).toMatch(/^https?:\/\//);
      }
    });

    it('should have social media links', () => {
      expect(siteConfig.links).toBeDefined();
      expect(typeof siteConfig.links).toBe('object');
    });

    it('should have a GitHub link', () => {
      expect(siteConfig.links.github).toBeDefined();
      expect(typeof siteConfig.links.github).toBe('string');
    });

    it('should have a Twitter link', () => {
      expect(siteConfig.links.twitter).toBeDefined();
      expect(typeof siteConfig.links.twitter).toBe('string');
    });
  });

  describe('Metadata', () => {
    it('should have OpenGraph metadata', () => {
      expect(siteConfig.ogImage).toBeDefined();
      expect(typeof siteConfig.ogImage).toBe('string');
    });

    it('should have creator information', () => {
      if (siteConfig.creator) {
        expect(typeof siteConfig.creator).toBe('string');
      }
    });

    it('should have keywords', () => {
      expect(siteConfig.keywords).toBeDefined();
      expect(Array.isArray(siteConfig.keywords)).toBe(true);
      expect(siteConfig.keywords.length).toBeGreaterThan(0);
    });
  });

  describe('Placeholder Values', () => {
    it('should use YOUR_APP_NAME placeholder pattern', () => {
      // The site name should be customizable
      expect(typeof siteConfig.name).toBe('string');
      // Either a placeholder or already customized
      const hasValidName =
        siteConfig.name.includes('YOUR_') ||
        siteConfig.name.length > 0;
      expect(hasValidName).toBe(true);
    });

    it('should have placeholder URL that developers should update', () => {
      // URL should either be a placeholder or a real URL
      expect(siteConfig.url).toBeDefined();
      const isPlaceholderOrReal =
        siteConfig.url.includes('localhost') ||
        siteConfig.url.includes('vercel.app') ||
        siteConfig.url.includes('YOUR_DOMAIN') ||
        siteConfig.url.startsWith('https://');
      expect(isPlaceholderOrReal).toBe(true);
    });
  });

  describe('Type Safety', () => {
    it('should have consistent types for all required fields', () => {
      const requiredFields = {
        name: 'string',
        description: 'string',
        url: 'string',
        links: 'object',
        keywords: 'object', // array is typeof object
      };

      Object.entries(requiredFields).forEach(([field, expectedType]) => {
        expect(typeof siteConfig[field as keyof typeof siteConfig]).toBe(expectedType);
      });
    });
  });
});
