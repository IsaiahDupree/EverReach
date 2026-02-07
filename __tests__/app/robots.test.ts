/**
 * Test Suite: Robots.txt Generation (WEB-SEO-003)
 *
 * Acceptance Criteria:
 * - Allows indexing: Robots.txt allows all search engines to index the site
 * - Sitemap reference: Includes reference to the sitemap.xml file
 */

import robots from '@/app/robots';
import { MetadataRoute } from 'next';

describe('WEB-SEO-003: Robots.txt Generation', () => {
  let robotsResult: MetadataRoute.Robots;

  beforeAll(async () => {
    robotsResult = await Promise.resolve(robots());
  });

  describe('Robots.txt Structure', () => {
    it('should return an object', () => {
      expect(typeof robotsResult).toBe('object');
      expect(robotsResult).not.toBeNull();
    });

    it('should have rules property', () => {
      expect(robotsResult).toHaveProperty('rules');
    });

    it('should have sitemap property', () => {
      expect(robotsResult).toHaveProperty('sitemap');
    });
  });

  describe('Allows Indexing', () => {
    it('should have at least one rule', () => {
      expect(robotsResult.rules).toBeDefined();
      if (Array.isArray(robotsResult.rules)) {
        expect(robotsResult.rules.length).toBeGreaterThan(0);
      } else {
        expect(robotsResult.rules).toBeDefined();
      }
    });

    it('should allow all user agents by default', () => {
      const rules = Array.isArray(robotsResult.rules)
        ? robotsResult.rules
        : [robotsResult.rules];

      const allUserAgentRule = rules.find((rule) => rule.userAgent === '*');
      expect(allUserAgentRule).toBeDefined();
    });

    it('should allow crawling (allow: /)', () => {
      const rules = Array.isArray(robotsResult.rules)
        ? robotsResult.rules
        : [robotsResult.rules];

      const allUserAgentRule = rules.find((rule) => rule.userAgent === '*');
      expect(allUserAgentRule).toBeDefined();

      if (allUserAgentRule) {
        expect(allUserAgentRule.allow).toBeDefined();
        if (typeof allUserAgentRule.allow === 'string') {
          expect(allUserAgentRule.allow).toBe('/');
        } else if (Array.isArray(allUserAgentRule.allow)) {
          expect(allUserAgentRule.allow).toContain('/');
        }
      }
    });

    it('should not block root path', () => {
      const rules = Array.isArray(robotsResult.rules)
        ? robotsResult.rules
        : [robotsResult.rules];

      rules.forEach((rule) => {
        if (rule.disallow) {
          if (typeof rule.disallow === 'string') {
            expect(rule.disallow).not.toBe('/');
          } else if (Array.isArray(rule.disallow)) {
            expect(rule.disallow).not.toContain('/');
          }
        }
      });
    });
  });

  describe('Sitemap Reference', () => {
    it('should include sitemap URL', () => {
      expect(robotsResult.sitemap).toBeDefined();
      expect(robotsResult.sitemap).toBeTruthy();
    });

    it('should be a valid URL', () => {
      if (typeof robotsResult.sitemap === 'string') {
        expect(robotsResult.sitemap).toMatch(/^https?:\/\//);
      } else if (Array.isArray(robotsResult.sitemap)) {
        robotsResult.sitemap.forEach((url) => {
          expect(url).toMatch(/^https?:\/\//);
        });
      }
    });

    it('should reference sitemap.xml', () => {
      const sitemapUrl = Array.isArray(robotsResult.sitemap)
        ? robotsResult.sitemap[0]
        : robotsResult.sitemap;

      expect(sitemapUrl).toContain('sitemap.xml');
    });

    it('should use the site domain', () => {
      const sitemapUrl = Array.isArray(robotsResult.sitemap)
        ? robotsResult.sitemap[0]
        : robotsResult.sitemap;

      // Should include domain, not relative path
      expect(sitemapUrl).toMatch(/https?:\/\/[^\/]+\/sitemap\.xml/);
    });
  });

  describe('Security and Privacy', () => {
    it('should block sensitive paths if any', () => {
      const rules = Array.isArray(robotsResult.rules)
        ? robotsResult.rules
        : [robotsResult.rules];

      // Check if any sensitive paths are blocked
      // API routes and private pages should be blocked from indexing
      const hasDisallow = rules.some((rule) => rule.disallow);

      // It's okay if there are no disallows for a simple public site
      // But if there are, they should be strings or arrays
      if (hasDisallow) {
        rules.forEach((rule) => {
          if (rule.disallow) {
            expect(
              typeof rule.disallow === 'string' ||
                Array.isArray(rule.disallow)
            ).toBe(true);
          }
        });
      }
    });

    it('should disallow API routes from being indexed', () => {
      const rules = Array.isArray(robotsResult.rules)
        ? robotsResult.rules
        : [robotsResult.rules];

      const allUserAgentRule = rules.find((rule) => rule.userAgent === '*');

      if (allUserAgentRule?.disallow) {
        const disallowPaths = Array.isArray(allUserAgentRule.disallow)
          ? allUserAgentRule.disallow
          : [allUserAgentRule.disallow];

        // API routes should be blocked
        expect(disallowPaths.some((path) => path.includes('/api'))).toBe(true);
      }
    });
  });

  describe('User Agent Handling', () => {
    it('should have valid user agent values', () => {
      const rules = Array.isArray(robotsResult.rules)
        ? robotsResult.rules
        : [robotsResult.rules];

      rules.forEach((rule) => {
        expect(rule.userAgent).toBeDefined();
        expect(typeof rule.userAgent === 'string' || Array.isArray(rule.userAgent)).toBe(true);
      });
    });

    it('should not have empty user agents', () => {
      const rules = Array.isArray(robotsResult.rules)
        ? robotsResult.rules
        : [robotsResult.rules];

      rules.forEach((rule) => {
        if (typeof rule.userAgent === 'string') {
          expect(rule.userAgent.length).toBeGreaterThan(0);
        } else if (Array.isArray(rule.userAgent)) {
          rule.userAgent.forEach((agent) => {
            expect(agent.length).toBeGreaterThan(0);
          });
        }
      });
    });
  });

  describe('Auto-generation', () => {
    it('should be a function that returns robots data', () => {
      expect(typeof robots).toBe('function');
    });

    it('should generate consistent results', async () => {
      const secondResult = await Promise.resolve(robots());
      expect(secondResult).toEqual(robotsResult);
    });

    it('should have proper TypeScript types', () => {
      // Verify the structure matches MetadataRoute.Robots
      expect(robotsResult).toHaveProperty('rules');
      expect(robotsResult).toHaveProperty('sitemap');
    });
  });

  describe('Best Practices', () => {
    it('should not have conflicting rules', () => {
      const rules = Array.isArray(robotsResult.rules)
        ? robotsResult.rules
        : [robotsResult.rules];

      rules.forEach((rule) => {
        if (rule.allow && rule.disallow) {
          // If both exist, they should be for different paths
          const allowPaths = Array.isArray(rule.allow)
            ? rule.allow
            : [rule.allow];
          const disallowPaths = Array.isArray(rule.disallow)
            ? rule.disallow
            : [rule.disallow];

          // No path should be in both allow and disallow
          allowPaths.forEach((allowPath) => {
            disallowPaths.forEach((disallowPath) => {
              if (allowPath === disallowPath) {
                fail(`Conflicting rule: ${allowPath} is both allowed and disallowed`);
              }
            });
          });
        }
      });
    });

    it('should have crawl-delay if rate limiting is needed', () => {
      const rules = Array.isArray(robotsResult.rules)
        ? robotsResult.rules
        : [robotsResult.rules];

      // crawl-delay is optional, just check if present it's valid
      rules.forEach((rule) => {
        if (rule.crawlDelay !== undefined) {
          expect(typeof rule.crawlDelay).toBe('number');
          expect(rule.crawlDelay).toBeGreaterThanOrEqual(0);
        }
      });
    });

    it('should be production-ready', () => {
      // Verify all required properties are present
      expect(robotsResult.rules).toBeDefined();
      expect(robotsResult.sitemap).toBeDefined();

      // Verify sitemap is accessible
      const sitemapUrl = Array.isArray(robotsResult.sitemap)
        ? robotsResult.sitemap[0]
        : robotsResult.sitemap;
      expect(sitemapUrl).toBeTruthy();
    });
  });

  describe('Edge Cases', () => {
    it('should handle multiple sitemaps if needed', () => {
      if (Array.isArray(robotsResult.sitemap)) {
        expect(robotsResult.sitemap.length).toBeGreaterThan(0);
        robotsResult.sitemap.forEach((url) => {
          expect(typeof url).toBe('string');
          expect(url).toContain('sitemap');
        });
      }
    });

    it('should not have empty or invalid paths', () => {
      const rules = Array.isArray(robotsResult.rules)
        ? robotsResult.rules
        : [robotsResult.rules];

      rules.forEach((rule) => {
        if (rule.allow) {
          const allowPaths = Array.isArray(rule.allow)
            ? rule.allow
            : [rule.allow];
          allowPaths.forEach((path) => {
            expect(path).toBeTruthy();
            expect(path.length).toBeGreaterThan(0);
          });
        }

        if (rule.disallow) {
          const disallowPaths = Array.isArray(rule.disallow)
            ? rule.disallow
            : [rule.disallow];
          disallowPaths.forEach((path) => {
            expect(path).toBeTruthy();
            expect(path.length).toBeGreaterThan(0);
          });
        }
      });
    });
  });
});
