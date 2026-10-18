/**
 * Test Suite: Metadata Configuration (WEB-SEO-001)
 *
 * Acceptance Criteria:
 * - Title, description: Site has proper title and description metadata
 * - OG images: Open Graph images configured for social sharing
 * - Twitter cards: Twitter card metadata configured
 */

// Mock next/font/google
jest.mock('next/font/google', () => ({
  Inter: () => ({
    className: 'inter-font',
    style: { fontFamily: 'Inter' },
  }),
}));

// Mock providers (simple pass-through functions)
jest.mock('@/components/providers/theme-provider', () => ({
  ThemeProvider: ({ children }: any) => children,
}));

jest.mock('@/components/providers/query-provider', () => ({
  QueryProvider: ({ children }: any) => children,
}));

import { metadata } from '@/app/layout';
import { siteConfig } from '@/config/site';

describe('WEB-SEO-001: Metadata Configuration', () => {
  describe('Title and Description', () => {
    it('should have a default title from site config', () => {
      expect(metadata.title).toBeDefined();
      if (typeof metadata.title === 'object' && metadata.title !== null) {
        expect(metadata.title).toHaveProperty('default');
        expect(typeof metadata.title.default).toBe('string');
        expect(metadata.title.default.length).toBeGreaterThan(0);
      }
    });

    it('should have a title template for page titles', () => {
      if (typeof metadata.title === 'object' && metadata.title !== null) {
        expect(metadata.title).toHaveProperty('template');
        expect(metadata.title.template).toContain('%s');
        expect(metadata.title.template).toContain(siteConfig.name);
      }
    });

    it('should have a description', () => {
      expect(metadata.description).toBeDefined();
      expect(typeof metadata.description).toBe('string');
      expect(metadata.description!.length).toBeGreaterThan(50);
      expect(metadata.description!.length).toBeLessThan(160);
    });

    it('should have keywords for SEO', () => {
      expect(metadata.keywords).toBeDefined();
      expect(Array.isArray(metadata.keywords)).toBe(true);
      if (Array.isArray(metadata.keywords)) {
        expect(metadata.keywords.length).toBeGreaterThan(0);
      }
    });

    it('should have creator/author metadata', () => {
      expect(metadata.creator).toBeDefined();
      expect(typeof metadata.creator).toBe('string');
    });

    it('should have authors array', () => {
      expect(metadata.authors).toBeDefined();
      expect(Array.isArray(metadata.authors)).toBe(true);
      if (Array.isArray(metadata.authors)) {
        expect(metadata.authors.length).toBeGreaterThan(0);
        expect(metadata.authors[0]).toHaveProperty('name');
      }
    });
  });

  describe('Open Graph Images and Metadata', () => {
    it('should have Open Graph metadata', () => {
      expect(metadata.openGraph).toBeDefined();
      expect(typeof metadata.openGraph).toBe('object');
    });

    it('should have Open Graph type', () => {
      expect(metadata.openGraph).toHaveProperty('type');
      expect(metadata.openGraph?.type).toBe('website');
    });

    it('should have Open Graph locale', () => {
      expect(metadata.openGraph).toHaveProperty('locale');
      expect(typeof metadata.openGraph?.locale).toBe('string');
    });

    it('should have Open Graph URL', () => {
      expect(metadata.openGraph).toHaveProperty('url');
      expect(typeof metadata.openGraph?.url).toBe('string');
      expect(metadata.openGraph?.url).toMatch(/^https?:\/\//);
    });

    it('should have Open Graph title', () => {
      expect(metadata.openGraph).toHaveProperty('title');
      expect(typeof metadata.openGraph?.title).toBe('string');
      expect(metadata.openGraph?.title?.length).toBeGreaterThan(0);
    });

    it('should have Open Graph description', () => {
      expect(metadata.openGraph).toHaveProperty('description');
      expect(typeof metadata.openGraph?.description).toBe('string');
      expect(metadata.openGraph?.description?.length).toBeGreaterThan(0);
    });

    it('should have Open Graph site name', () => {
      expect(metadata.openGraph).toHaveProperty('siteName');
      expect(typeof metadata.openGraph?.siteName).toBe('string');
    });

    it('should have Open Graph images array', () => {
      expect(metadata.openGraph).toHaveProperty('images');
      expect(Array.isArray(metadata.openGraph?.images)).toBe(true);
    });

    it('should have at least one Open Graph image', () => {
      const images = metadata.openGraph?.images;
      expect(Array.isArray(images)).toBe(true);
      if (Array.isArray(images)) {
        expect(images.length).toBeGreaterThan(0);
      }
    });

    it('should have properly formatted Open Graph image', () => {
      const images = metadata.openGraph?.images;
      if (Array.isArray(images) && images.length > 0) {
        const firstImage = images[0];
        expect(firstImage).toHaveProperty('url');
        expect(firstImage).toHaveProperty('width');
        expect(firstImage).toHaveProperty('height');
        expect(firstImage).toHaveProperty('alt');

        // Standard OG image dimensions (1200x630 is recommended)
        if (typeof firstImage === 'object' && firstImage !== null) {
          expect(firstImage.width).toBe(1200);
          expect(firstImage.height).toBe(630);
        }
      }
    });

    it('should have valid Open Graph image URL', () => {
      const images = metadata.openGraph?.images;
      if (Array.isArray(images) && images.length > 0) {
        const firstImage = images[0];
        if (typeof firstImage === 'object' && firstImage !== null) {
          expect(firstImage.url).toMatch(/^https?:\/\//);
        }
      }
    });
  });

  describe('Twitter Cards', () => {
    it('should have Twitter card metadata', () => {
      expect(metadata.twitter).toBeDefined();
      expect(typeof metadata.twitter).toBe('object');
    });

    it('should have Twitter card type', () => {
      expect(metadata.twitter).toHaveProperty('card');
      expect(metadata.twitter?.card).toBe('summary_large_image');
    });

    it('should have Twitter title', () => {
      expect(metadata.twitter).toHaveProperty('title');
      expect(typeof metadata.twitter?.title).toBe('string');
      expect(metadata.twitter?.title?.length).toBeGreaterThan(0);
    });

    it('should have Twitter description', () => {
      expect(metadata.twitter).toHaveProperty('description');
      expect(typeof metadata.twitter?.description).toBe('string');
      expect(metadata.twitter?.description?.length).toBeGreaterThan(0);
    });

    it('should have Twitter images', () => {
      expect(metadata.twitter).toHaveProperty('images');
      expect(Array.isArray(metadata.twitter?.images)).toBe(true);
    });

    it('should have at least one Twitter image', () => {
      const images = metadata.twitter?.images;
      expect(Array.isArray(images)).toBe(true);
      if (Array.isArray(images)) {
        expect(images.length).toBeGreaterThan(0);
      }
    });

    it('should have Twitter creator handle', () => {
      expect(metadata.twitter).toHaveProperty('creator');
      expect(typeof metadata.twitter?.creator).toBe('string');
      if (metadata.twitter?.creator) {
        expect(metadata.twitter.creator).toMatch(/^@/);
      }
    });

    it('should use same image as Open Graph', () => {
      const ogImages = metadata.openGraph?.images;
      const twitterImages = metadata.twitter?.images;

      if (Array.isArray(ogImages) && Array.isArray(twitterImages)) {
        expect(twitterImages[0]).toBe(ogImages[0].url);
      }
    });
  });

  describe('Icons and Manifest', () => {
    it('should have favicon configuration', () => {
      expect(metadata.icons).toBeDefined();
      expect(typeof metadata.icons).toBe('object');
    });

    it('should have standard favicon', () => {
      expect(metadata.icons).toHaveProperty('icon');
      expect(metadata.icons?.icon).toBe('/favicon.ico');
    });

    it('should have shortcut icon', () => {
      expect(metadata.icons).toHaveProperty('shortcut');
      expect(typeof metadata.icons?.shortcut).toBe('string');
    });

    it('should have Apple touch icon', () => {
      expect(metadata.icons).toHaveProperty('apple');
      expect(typeof metadata.icons?.apple).toBe('string');
    });

    it('should have web manifest', () => {
      expect(metadata.manifest).toBeDefined();
      expect(metadata.manifest).toBe('/site.webmanifest');
    });
  });

  describe('Site Config Integration', () => {
    it('should use site config for title', () => {
      if (typeof metadata.title === 'object' && metadata.title !== null) {
        expect(metadata.title.default).toBe(siteConfig.name);
      }
    });

    it('should use site config for description', () => {
      expect(metadata.description).toBe(siteConfig.description);
    });

    it('should use site config for Open Graph URL', () => {
      expect(metadata.openGraph?.url).toBe(siteConfig.url);
    });

    it('should use site config for Open Graph image', () => {
      const images = metadata.openGraph?.images;
      if (Array.isArray(images) && images.length > 0) {
        const firstImage = images[0];
        if (typeof firstImage === 'object' && firstImage !== null) {
          expect(firstImage.url).toBe(siteConfig.ogImage);
        }
      }
    });

    it('should use site config for keywords', () => {
      expect(metadata.keywords).toBe(siteConfig.keywords);
    });

    it('should use site config for creator', () => {
      expect(metadata.creator).toBe(siteConfig.creator);
    });
  });

  describe('SEO Best Practices', () => {
    it('should have description between 50-160 characters', () => {
      const desc = metadata.description;
      if (typeof desc === 'string') {
        expect(desc.length).toBeGreaterThanOrEqual(50);
        expect(desc.length).toBeLessThanOrEqual(160);
      }
    });

    it('should have at least 5 keywords', () => {
      if (Array.isArray(metadata.keywords)) {
        expect(metadata.keywords.length).toBeGreaterThanOrEqual(5);
      }
    });

    it('should have HTTPS URLs in Open Graph', () => {
      expect(metadata.openGraph?.url).toMatch(/^https:\/\//);
      const images = metadata.openGraph?.images;
      if (Array.isArray(images) && images.length > 0) {
        const firstImage = images[0];
        if (typeof firstImage === 'object' && firstImage !== null) {
          expect(firstImage.url).toMatch(/^https:\/\//);
        }
      }
    });

    it('should have consistent titles across metadata', () => {
      const defaultTitle =
        typeof metadata.title === 'object' && metadata.title !== null
          ? metadata.title.default
          : metadata.title;
      expect(metadata.openGraph?.title).toBe(defaultTitle);
      expect(metadata.twitter?.title).toBe(defaultTitle);
    });

    it('should have consistent descriptions across metadata', () => {
      expect(metadata.openGraph?.description).toBe(metadata.description);
      expect(metadata.twitter?.description).toBe(metadata.description);
    });
  });
});
