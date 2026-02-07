import { dashboardNav, marketingNav } from '@/config/nav';

describe('Navigation Configuration', () => {
  describe('Dashboard Navigation', () => {
    it('should export dashboardNav array', () => {
      expect(dashboardNav).toBeDefined();
      expect(Array.isArray(dashboardNav)).toBe(true);
    });

    it('should have at least 3 dashboard navigation items', () => {
      // Based on PRD: Dashboard, Items, Settings at minimum
      expect(dashboardNav.length).toBeGreaterThanOrEqual(3);
    });

    it('should have navigation items with required properties', () => {
      dashboardNav.forEach((item) => {
        expect(item).toHaveProperty('title');
        expect(item).toHaveProperty('href');
        expect(item).toHaveProperty('icon');

        expect(typeof item.title).toBe('string');
        expect(typeof item.href).toBe('string');
        expect(item.href).toMatch(/^\//); // Should start with /
      });
    });

    it('should include Dashboard nav item', () => {
      const dashboardItem = dashboardNav.find((item) =>
        item.title.toLowerCase().includes('dashboard')
      );
      expect(dashboardItem).toBeDefined();
      expect(dashboardItem?.href).toBe('/dashboard');
    });

    it('should include Items nav item', () => {
      const itemsItem = dashboardNav.find((item) =>
        item.title.toLowerCase().includes('item')
      );
      expect(itemsItem).toBeDefined();
      expect(itemsItem?.href).toBe('/items');
    });

    it('should include Settings nav item', () => {
      const settingsItem = dashboardNav.find((item) =>
        item.title.toLowerCase().includes('settings')
      );
      expect(settingsItem).toBeDefined();
      expect(settingsItem?.href).toBe('/settings');
    });

    it('should have valid icon components', () => {
      dashboardNav.forEach((item) => {
        // Icon should be a React component (function or object with $$typeof)
        const isValidIcon =
          typeof item.icon === 'function' ||
          (typeof item.icon === 'object' && item.icon !== null);
        expect(isValidIcon).toBe(true);
      });
    });

    it('should support optional nested items', () => {
      dashboardNav.forEach((item) => {
        if (item.items) {
          expect(Array.isArray(item.items)).toBe(true);
          item.items.forEach((subItem) => {
            expect(subItem).toHaveProperty('title');
            expect(subItem).toHaveProperty('href');
            expect(typeof subItem.title).toBe('string');
            expect(typeof subItem.href).toBe('string');
          });
        }
      });
    });
  });

  describe('Marketing Navigation', () => {
    it('should export marketingNav array', () => {
      expect(marketingNav).toBeDefined();
      expect(Array.isArray(marketingNav)).toBe(true);
    });

    it('should have at least 3 marketing navigation items', () => {
      // Based on PRD: Home, Pricing, About at minimum
      expect(marketingNav.length).toBeGreaterThanOrEqual(3);
    });

    it('should have navigation items with required properties', () => {
      marketingNav.forEach((item) => {
        expect(item).toHaveProperty('title');
        expect(item).toHaveProperty('href');

        expect(typeof item.title).toBe('string');
        expect(typeof item.href).toBe('string');
        expect(item.href).toMatch(/^\//); // Should start with /
      });
    });

    it('should include Home nav item', () => {
      const homeItem = marketingNav.find(
        (item) => item.href === '/' || item.title.toLowerCase().includes('home')
      );
      expect(homeItem).toBeDefined();
    });

    it('should include Pricing nav item', () => {
      const pricingItem = marketingNav.find((item) =>
        item.title.toLowerCase().includes('pricing')
      );
      expect(pricingItem).toBeDefined();
      expect(pricingItem?.href).toBe('/pricing');
    });

    it('should include About nav item', () => {
      const aboutItem = marketingNav.find((item) =>
        item.title.toLowerCase().includes('about')
      );
      expect(aboutItem).toBeDefined();
      expect(aboutItem?.href).toBe('/about');
    });

    it('should support optional icon property', () => {
      marketingNav.forEach((item) => {
        if (item.icon) {
          // Icon should be a React component (function or object with $$typeof)
          const isValidIcon =
            typeof item.icon === 'function' ||
            (typeof item.icon === 'object' && item.icon !== null);
          expect(isValidIcon).toBe(true);
        }
      });
    });
  });

  describe('Type Safety', () => {
    it('should have consistent structure across all nav items', () => {
      const allNavItems = [...dashboardNav, ...marketingNav];

      allNavItems.forEach((item) => {
        expect(item).toHaveProperty('title');
        expect(item).toHaveProperty('href');
        expect(typeof item.title).toBe('string');
        expect(typeof item.href).toBe('string');
        expect(item.title.length).toBeGreaterThan(0);
        expect(item.href.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Route Structure', () => {
    it('should have valid route paths', () => {
      const allNavItems = [...dashboardNav, ...marketingNav];

      allNavItems.forEach((item) => {
        // Should be a valid route path
        expect(item.href).toMatch(/^\/[a-z0-9\-\/]*$/);

        // If it has sub-items, check those too
        if (item.items) {
          item.items.forEach((subItem) => {
            expect(subItem.href).toMatch(/^\/[a-z0-9\-\/]*$/);
          });
        }
      });
    });

    it('should not have duplicate hrefs within same nav group', () => {
      const dashboardHrefs = dashboardNav.map((item) => item.href);
      const dashboardUnique = new Set(dashboardHrefs);
      expect(dashboardUnique.size).toBe(dashboardHrefs.length);

      const marketingHrefs = marketingNav.map((item) => item.href);
      const marketingUnique = new Set(marketingHrefs);
      expect(marketingUnique.size).toBe(marketingHrefs.length);
    });
  });
});
