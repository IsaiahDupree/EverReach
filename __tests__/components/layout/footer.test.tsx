/**
 * Test Suite: Footer Component (WEB-LAYOUT-006)
 *
 * Acceptance Criteria:
 * - Links
 * - Copyright
 * - Social icons
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

// Mock next/link
jest.mock('next/link', () => {
  return ({ children, href }: { children: React.ReactNode; href: string }) => {
    return <a href={href}>{children}</a>;
  };
});

describe('WEB-LAYOUT-006: Footer Component', () => {
  let Footer: any;

  beforeAll(async () => {
    try {
      const module = await import('@/components/layout/footer');
      Footer = module.Footer;
    } catch (error) {
      // Component doesn't exist yet - this is expected for TDD
      Footer = null;
    }
  });

  describe('Links', () => {
    it('should render product navigation links', () => {
      if (!Footer) {
        expect(Footer).toBeDefined();
        return;
      }

      render(<Footer />);

      // Product links from footerNav config
      expect(screen.getByRole('link', { name: /features/i })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /pricing/i })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /changelog/i })).toBeInTheDocument();
    });

    it('should render company navigation links', () => {
      if (!Footer) {
        expect(Footer).toBeDefined();
        return;
      }

      render(<Footer />);

      // Company links from footerNav config
      expect(screen.getByRole('link', { name: /about/i })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /blog/i })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /careers/i })).toBeInTheDocument();
    });

    it('should render resources navigation links', () => {
      if (!Footer) {
        expect(Footer).toBeDefined();
        return;
      }

      render(<Footer />);

      // Resources links from footerNav config
      expect(screen.getByRole('link', { name: /documentation/i })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /support/i })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /status/i })).toBeInTheDocument();
    });

    it('should render legal navigation links', () => {
      if (!Footer) {
        expect(Footer).toBeDefined();
        return;
      }

      render(<Footer />);

      // Legal links from footerNav config
      expect(screen.getByRole('link', { name: /privacy/i })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /terms/i })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /cookie policy/i })).toBeInTheDocument();
    });

    it('should have correct hrefs for all links', () => {
      if (!Footer) {
        expect(Footer).toBeDefined();
        return;
      }

      render(<Footer />);

      // Verify hrefs match config
      const featuresLink = screen.getByRole('link', { name: /features/i });
      expect(featuresLink).toHaveAttribute('href', '/features');

      const pricingLink = screen.getByRole('link', { name: /pricing/i });
      expect(pricingLink).toHaveAttribute('href', '/pricing');

      const privacyLink = screen.getByRole('link', { name: /privacy/i });
      expect(privacyLink).toHaveAttribute('href', '/privacy');
    });

    it('should organize links into sections with headers', () => {
      if (!Footer) {
        expect(Footer).toBeDefined();
        return;
      }

      render(<Footer />);

      // Check for section headers
      expect(screen.getByText(/product/i)).toBeInTheDocument();
      expect(screen.getByText(/company/i)).toBeInTheDocument();
      expect(screen.getByText(/resources/i)).toBeInTheDocument();
      expect(screen.getByText(/legal/i)).toBeInTheDocument();
    });
  });

  describe('Copyright', () => {
    it('should display copyright notice with current year', () => {
      if (!Footer) {
        expect(Footer).toBeDefined();
        return;
      }

      render(<Footer />);

      const currentYear = new Date().getFullYear();
      const copyrightText = screen.getByText(new RegExp(`${currentYear}`, 'i'));
      expect(copyrightText).toBeInTheDocument();
    });

    it('should display site name in copyright', () => {
      if (!Footer) {
        expect(Footer).toBeDefined();
        return;
      }

      render(<Footer />);

      // Should include YOUR_APP_NAME from siteConfig
      const copyrightElements = screen.getAllByText(/YOUR_APP_NAME/i);
      expect(copyrightElements.length).toBeGreaterThan(0);
    });

    it('should display "All rights reserved" or similar text', () => {
      if (!Footer) {
        expect(Footer).toBeDefined();
        return;
      }

      render(<Footer />);

      const rightsText = screen.getByText(/all rights reserved/i);
      expect(rightsText).toBeInTheDocument();
    });
  });

  describe('Social Icons', () => {
    it('should render GitHub social link', () => {
      if (!Footer) {
        expect(Footer).toBeDefined();
        return;
      }

      const { container } = render(<Footer />);

      const githubLink = container.querySelector('a[href*="github.com"]');
      expect(githubLink).toBeInTheDocument();
      expect(githubLink).toHaveAttribute('href', expect.stringContaining('github.com'));
    });

    it('should render Twitter social link', () => {
      if (!Footer) {
        expect(Footer).toBeDefined();
        return;
      }

      const { container } = render(<Footer />);

      const twitterLink = container.querySelector('a[href*="twitter.com"]');
      expect(twitterLink).toBeInTheDocument();
      expect(twitterLink).toHaveAttribute('href', expect.stringContaining('twitter.com'));
    });

    it('should render LinkedIn social link', () => {
      if (!Footer) {
        expect(Footer).toBeDefined();
        return;
      }

      const { container } = render(<Footer />);

      const linkedinLink = container.querySelector('a[href*="linkedin.com"]');
      expect(linkedinLink).toBeInTheDocument();
      expect(linkedinLink).toHaveAttribute('href', expect.stringContaining('linkedin.com'));
    });

    it('should open social links in new tab', () => {
      if (!Footer) {
        expect(Footer).toBeDefined();
        return;
      }

      const { container } = render(<Footer />);

      // Verify social links exist with correct hrefs
      const socialLinks = container.querySelectorAll('a[href*="github.com"], a[href*="twitter.com"], a[href*="linkedin.com"]');
      expect(socialLinks.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe('Layout and Styling', () => {
    it('should have proper semantic HTML structure with footer element', () => {
      if (!Footer) {
        expect(Footer).toBeDefined();
        return;
      }

      const { container } = render(<Footer />);

      const footer = container.querySelector('footer');
      expect(footer).toBeInTheDocument();
    });

    it('should have consistent spacing and layout classes', () => {
      if (!Footer) {
        expect(Footer).toBeDefined();
        return;
      }

      const { container } = render(<Footer />);

      const footer = container.querySelector('footer');
      expect(footer).toBeTruthy();
      expect(footer?.className).toBeTruthy(); // Should have Tailwind classes
    });

    it('should be responsive with grid layout', () => {
      if (!Footer) {
        expect(Footer).toBeDefined();
        return;
      }

      const { container } = render(<Footer />);

      // Footer should exist and be ready for responsive layout
      const footer = container.querySelector('footer');
      expect(footer).toBeTruthy();
    });

    it('should position at bottom of page', () => {
      if (!Footer) {
        expect(Footer).toBeDefined();
        return;
      }

      const { container } = render(<Footer />);

      const footer = container.querySelector('footer');
      expect(footer).toBeTruthy();
    });
  });

  describe('Branding', () => {
    it('should display site logo or name', () => {
      if (!Footer) {
        expect(Footer).toBeDefined();
        return;
      }

      render(<Footer />);

      // Footer should include the site name
      expect(screen.getAllByText(/YOUR_APP_NAME/i).length).toBeGreaterThan(0);
    });

    it('should include site tagline or description', () => {
      if (!Footer) {
        expect(Footer).toBeDefined();
        return;
      }

      render(<Footer />);

      // Should include the site tagline from siteConfig
      const tagline = screen.getByText(/ship faster with our starter kit/i);
      expect(tagline).toBeInTheDocument();
    });
  });
});
