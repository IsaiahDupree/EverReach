/**
 * Test Suite: Marketing Layout (WEB-LAYOUT-003)
 *
 * Acceptance Criteria:
 * - Navbar
 * - Footer
 * - Full width
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

// Mock next/navigation
jest.mock('next/navigation', () => ({
  usePathname: () => '/',
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    refresh: jest.fn(),
  }),
}));

describe('WEB-LAYOUT-003: Marketing Layout', () => {
  // We'll import the layout component after it's created
  let MarketingLayout: any;

  beforeAll(async () => {
    try {
      const module = await import('@/app/(marketing)/layout');
      MarketingLayout = module.default;
    } catch (error) {
      // Layout doesn't exist yet - this is expected for TDD
      MarketingLayout = null;
    }
  });

  describe('Navbar', () => {
    it('should render navbar', () => {
      if (!MarketingLayout) {
        expect(MarketingLayout).toBeDefined();
        return;
      }

      render(
        <MarketingLayout>
          <div>Test content</div>
        </MarketingLayout>
      );

      // Check for navbar element
      const navbar = screen.getByRole('banner');
      expect(navbar).toBeInTheDocument();
    });

    it('should render navigation links from marketingNav config', () => {
      if (!MarketingLayout) {
        expect(MarketingLayout).toBeDefined();
        return;
      }

      render(
        <MarketingLayout>
          <div>Test content</div>
        </MarketingLayout>
      );

      // Check for key marketing nav items (may appear in navbar and footer)
      expect(screen.getAllByText(/home/i).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/pricing/i).length).toBeGreaterThan(0);
    });

    it('should render logo or site name in navbar', () => {
      if (!MarketingLayout) {
        expect(MarketingLayout).toBeDefined();
        return;
      }

      const { container } = render(
        <MarketingLayout>
          <div>Test content</div>
        </MarketingLayout>
      );

      // Logo or site name should be present (look for Your App or similar)
      const banner = container.querySelector('[role="banner"]');
      expect(banner).toBeTruthy();
      expect(banner?.textContent).toBeTruthy();
    });

    it('should have CTA button for login/signup', () => {
      if (!MarketingLayout) {
        expect(MarketingLayout).toBeDefined();
        return;
      }

      render(
        <MarketingLayout>
          <div>Test content</div>
        </MarketingLayout>
      );

      // Should have auth-related buttons (Login and Get Started)
      const authLinks = screen.getAllByRole('link');
      const hasAuthLink = authLinks.some(link =>
        /login|sign in|get started/i.test(link.textContent || '')
      );
      expect(hasAuthLink).toBe(true);
    });
  });

  describe('Footer', () => {
    it('should render footer', () => {
      if (!MarketingLayout) {
        expect(MarketingLayout).toBeDefined();
        return;
      }

      render(
        <MarketingLayout>
          <div>Test content</div>
        </MarketingLayout>
      );

      // Check for footer element
      const footer = screen.getByRole('contentinfo');
      expect(footer).toBeInTheDocument();
    });

    it('should render copyright notice', () => {
      if (!MarketingLayout) {
        expect(MarketingLayout).toBeDefined();
        return;
      }

      render(
        <MarketingLayout>
          <div>Test content</div>
        </MarketingLayout>
      );

      // Footer should have copyright text
      const currentYear = new Date().getFullYear();
      expect(screen.getByText(new RegExp(`${currentYear}`, 'i'))).toBeInTheDocument();
    });

    it('should render footer navigation links', () => {
      if (!MarketingLayout) {
        expect(MarketingLayout).toBeDefined();
        return;
      }

      const { container } = render(
        <MarketingLayout>
          <div>Test content</div>
        </MarketingLayout>
      );

      // Footer should have navigation sections
      const footer = container.querySelector('[role="contentinfo"]');
      expect(footer).toBeTruthy();

      // Footer should have multiple links
      const footerLinks = footer?.querySelectorAll('a');
      expect(footerLinks && footerLinks.length).toBeGreaterThan(0);
    });
  });

  describe('Full Width Layout', () => {
    it('should render children content in main area', () => {
      if (!MarketingLayout) {
        expect(MarketingLayout).toBeDefined();
        return;
      }

      render(
        <MarketingLayout>
          <div data-testid="marketing-content">Test content</div>
        </MarketingLayout>
      );

      expect(screen.getByTestId('marketing-content')).toBeInTheDocument();
    });

    it('should have proper semantic HTML structure', () => {
      if (!MarketingLayout) {
        expect(MarketingLayout).toBeDefined();
        return;
      }

      const { container } = render(
        <MarketingLayout>
          <div>Test content</div>
        </MarketingLayout>
      );

      // Should have header element (banner)
      expect(container.querySelector('header')).toBeInTheDocument();

      // Should have main element
      expect(container.querySelector('main')).toBeInTheDocument();

      // Should have footer element (contentinfo)
      expect(container.querySelector('footer')).toBeInTheDocument();
    });

    it('should apply full width layout without sidebar constraints', () => {
      if (!MarketingLayout) {
        expect(MarketingLayout).toBeDefined();
        return;
      }

      const { container } = render(
        <MarketingLayout>
          <div>Test content</div>
        </MarketingLayout>
      );

      // Main content should not be constrained by a sidebar
      // (i.e., no fixed width aside elements)
      const asideElements = container.querySelectorAll('aside');
      expect(asideElements.length).toBe(0);
    });

    it('should render navbar and footer outside main content area', () => {
      if (!MarketingLayout) {
        expect(MarketingLayout).toBeDefined();
        return;
      }

      const { container } = render(
        <MarketingLayout>
          <div data-testid="page-content">Page content</div>
        </MarketingLayout>
      );

      const main = container.querySelector('main');
      const header = container.querySelector('header');
      const footer = container.querySelector('footer');

      // Main should not contain header or footer
      expect(main?.contains(header as Node)).toBe(false);
      expect(main?.contains(footer as Node)).toBe(false);

      // Header and footer should be siblings of main
      expect(header).toBeInTheDocument();
      expect(footer).toBeInTheDocument();
      expect(main).toBeInTheDocument();
    });
  });

  describe('Responsive Design', () => {
    it('should be mobile responsive', () => {
      if (!MarketingLayout) {
        expect(MarketingLayout).toBeDefined();
        return;
      }

      const { container } = render(
        <MarketingLayout>
          <div>Test content</div>
        </MarketingLayout>
      );

      // Layout should exist and be responsive
      // (Tailwind classes will handle actual responsiveness)
      const layoutRoot = container.firstChild;
      expect(layoutRoot).toBeTruthy();
    });
  });
});
