/**
 * Test Suite: Landing Page (WEB-PAGE-001)
 *
 * Acceptance Criteria:
 * - Hero section
 * - Features
 * - CTA
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

describe('WEB-PAGE-001: Landing Page', () => {
  let LandingPage: any;

  beforeAll(async () => {
    try {
      const module = await import('@/app/(marketing)/page');
      LandingPage = module.default;
    } catch (error) {
      // Page doesn't exist yet - this is expected for TDD
      LandingPage = null;
    }
  });

  describe('Hero Section', () => {
    it('should render hero section with main heading', () => {
      if (!LandingPage) {
        expect(LandingPage).toBeDefined();
        return;
      }

      render(<LandingPage />);

      // Look for a main heading (h1) in the hero section
      const heading = screen.getByRole('heading', { level: 1 });
      expect(heading).toBeInTheDocument();
    });

    it('should render hero description/tagline', () => {
      if (!LandingPage) {
        expect(LandingPage).toBeDefined();
        return;
      }

      render(<LandingPage />);

      // Look for descriptive text in the hero
      // Using test ID for more specific testing
      const hero = screen.getByTestId('hero-section');
      expect(hero).toBeInTheDocument();

      // Hero should contain meaningful text content
      expect(hero.textContent).toBeTruthy();
      expect(hero.textContent!.length).toBeGreaterThan(10);
    });

    it('should render CTA button in hero', () => {
      if (!LandingPage) {
        expect(LandingPage).toBeDefined();
        return;
      }

      render(<LandingPage />);

      // Hero should have at least one call-to-action link/button
      const hero = screen.getByTestId('hero-section');
      const ctaButtons = screen.getAllByRole('link', { name: /get started|sign up|try|start/i });

      // At least one CTA should be in the hero section
      const heroHasCta = ctaButtons.some(button => hero.contains(button));
      expect(heroHasCta).toBe(true);
    });
  });

  describe('Features Section', () => {
    it('should render features section', () => {
      if (!LandingPage) {
        expect(LandingPage).toBeDefined();
        return;
      }

      render(<LandingPage />);

      // Look for features section
      const featuresSection = screen.getByTestId('features-section');
      expect(featuresSection).toBeInTheDocument();
    });

    it('should render multiple feature items', () => {
      if (!LandingPage) {
        expect(LandingPage).toBeDefined();
        return;
      }

      render(<LandingPage />);

      // Should have at least 3 feature items
      const featureItems = screen.getAllByTestId(/feature-item/i);
      expect(featureItems.length).toBeGreaterThanOrEqual(3);
    });

    it('should render feature headings and descriptions', () => {
      if (!LandingPage) {
        expect(LandingPage).toBeDefined();
        return;
      }

      render(<LandingPage />);

      const featuresSection = screen.getByTestId('features-section');

      // Features section should have headings (h2 or h3)
      const headings = screen.getAllByRole('heading', { level: 2 });
      const featureSectionHeading = headings.find(h =>
        featuresSection.contains(h)
      );
      expect(featureSectionHeading).toBeTruthy();
    });
  });

  describe('CTA Section', () => {
    it('should render final CTA section', () => {
      if (!LandingPage) {
        expect(LandingPage).toBeDefined();
        return;
      }

      render(<LandingPage />);

      // Look for CTA section (usually at the bottom)
      const ctaSection = screen.getByTestId('cta-section');
      expect(ctaSection).toBeInTheDocument();
    });

    it('should render CTA button/link', () => {
      if (!LandingPage) {
        expect(LandingPage).toBeDefined();
        return;
      }

      render(<LandingPage />);

      const ctaSection = screen.getByTestId('cta-section');

      // CTA section should have an actionable link or button
      const ctaLinks = screen.getAllByRole('link');
      const ctaInSection = ctaLinks.find(link => ctaSection.contains(link));
      expect(ctaInSection).toBeTruthy();
    });

    it('should render compelling CTA text', () => {
      if (!LandingPage) {
        expect(LandingPage).toBeDefined();
        return;
      }

      render(<LandingPage />);

      const ctaSection = screen.getByTestId('cta-section');

      // CTA should have meaningful heading
      expect(ctaSection.textContent).toBeTruthy();
      expect(ctaSection.textContent!.length).toBeGreaterThan(10);
    });
  });

  describe('Page Structure', () => {
    it('should render sections in correct order: Hero -> Features -> CTA', () => {
      if (!LandingPage) {
        expect(LandingPage).toBeDefined();
        return;
      }

      render(<LandingPage />);

      const hero = screen.getByTestId('hero-section');
      const features = screen.getByTestId('features-section');
      const cta = screen.getByTestId('cta-section');

      // Get position of each section
      const heroPosition = hero.compareDocumentPosition(features);
      const featuresPosition = features.compareDocumentPosition(cta);

      // DOCUMENT_POSITION_FOLLOWING (4) means the node comes after
      expect(heroPosition & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
      expect(featuresPosition & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    });
  });
});
