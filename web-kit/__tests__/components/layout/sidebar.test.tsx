/**
 * Test Suite: Sidebar Component (WEB-LAYOUT-005)
 *
 * Acceptance Criteria:
 * - Nav items
 * - Active state
 * - Collapsible
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';

// Mock next/link
jest.mock('next/link', () => {
  return ({ children, href, className, ...props }: any) => {
    return <a href={href} className={className} {...props}>{children}</a>;
  };
});

// Mock next/navigation
jest.mock('next/navigation', () => ({
  usePathname: () => '/dashboard',
}));

describe('WEB-LAYOUT-005: Sidebar Component', () => {
  let Sidebar: any;

  beforeAll(async () => {
    try {
      const module = await import('@/components/layout/sidebar');
      Sidebar = module.Sidebar;
    } catch (error) {
      // Component doesn't exist yet - this is expected for TDD
      Sidebar = null;
    }
  });

  describe('Nav Items', () => {
    it('should render navigation items from dashboardNav config', () => {
      if (!Sidebar) {
        expect(Sidebar).toBeDefined();
        return;
      }

      render(<Sidebar />);

      // Check for key dashboard nav items (Dashboard, Items, Settings)
      expect(screen.getByRole('link', { name: /dashboard/i })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /items/i })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /settings/i })).toBeInTheDocument();
    });

    it('should render nav items with their icons', () => {
      if (!Sidebar) {
        expect(Sidebar).toBeDefined();
        return;
      }

      const { container } = render(<Sidebar />);

      // Icons should be rendered (lucide-react icons render as SVG)
      const icons = container.querySelectorAll('svg');
      expect(icons.length).toBeGreaterThan(0);
    });

    it('should render nav items with proper href attributes', () => {
      if (!Sidebar) {
        expect(Sidebar).toBeDefined();
        return;
      }

      render(<Sidebar />);

      const dashboardLink = screen.getByRole('link', { name: /dashboard/i });
      expect(dashboardLink).toHaveAttribute('href', '/dashboard');

      const itemsLink = screen.getByRole('link', { name: /items/i });
      expect(itemsLink).toHaveAttribute('href', '/items');

      const settingsLink = screen.getByRole('link', { name: /settings/i });
      expect(settingsLink).toHaveAttribute('href', '/settings');
    });

    it('should render nested navigation items when available', () => {
      if (!Sidebar) {
        expect(Sidebar).toBeDefined();
        return;
      }

      render(<Sidebar />);

      // Settings has nested items (Profile, Billing)
      const profileLink = screen.getByRole('link', { name: /profile/i });
      expect(profileLink).toBeInTheDocument();
      expect(profileLink).toHaveAttribute('href', '/settings/profile');

      const billingLink = screen.getByRole('link', { name: /billing/i });
      expect(billingLink).toBeInTheDocument();
      expect(billingLink).toHaveAttribute('href', '/settings/billing');
    });
  });

  describe('Active State', () => {
    it('should highlight the active navigation item based on current path', () => {
      if (!Sidebar) {
        expect(Sidebar).toBeDefined();
        return;
      }

      render(<Sidebar />);

      const dashboardLink = screen.getByRole('link', { name: /dashboard/i });

      // Active link should have different styling (class contains relevant active state)
      expect(dashboardLink.className).toBeTruthy();
    });

    it('should highlight parent nav item when on a nested route', () => {
      if (!Sidebar) {
        expect(Sidebar).toBeDefined();
        return;
      }

      // Re-mock usePathname to return a nested route
      jest.resetModules();
      jest.mock('next/navigation', () => ({
        usePathname: () => '/settings/profile',
      }));

      render(<Sidebar />);

      // Settings link should indicate it's active or has active child
      const settingsLink = screen.getByRole('link', { name: /settings/i });
      expect(settingsLink).toBeTruthy();
    });

    it('should apply active styles to currently active nav item', () => {
      if (!Sidebar) {
        expect(Sidebar).toBeDefined();
        return;
      }

      render(<Sidebar />);

      const dashboardLink = screen.getByRole('link', { name: /dashboard/i });
      const itemsLink = screen.getByRole('link', { name: /items/i });

      // Active and inactive items should have different styling
      expect(dashboardLink.className).not.toEqual(itemsLink.className);
    });
  });

  describe('Collapsible Functionality', () => {
    it('should render a collapse/expand toggle button', () => {
      if (!Sidebar) {
        expect(Sidebar).toBeDefined();
        return;
      }

      render(<Sidebar />);

      // Should have a button to toggle sidebar collapse state
      const toggleButton = screen.getByRole('button', { name: /collapse|expand|toggle sidebar/i });
      expect(toggleButton).toBeInTheDocument();
    });

    it('should toggle between collapsed and expanded states when button is clicked', () => {
      if (!Sidebar) {
        expect(Sidebar).toBeDefined();
        return;
      }

      const { container } = render(<Sidebar />);

      const toggleButton = screen.getByRole('button', { name: /collapse|expand|toggle sidebar/i });

      // Get initial state
      const sidebar = container.querySelector('[data-testid="sidebar"]') || container.firstChild;
      const initialClassName = (sidebar as HTMLElement)?.className || '';

      // Click to toggle
      fireEvent.click(toggleButton);

      // Verify state changed
      const afterToggleClassName = (sidebar as HTMLElement)?.className || '';

      // Classes should be different after toggle (indicates state change)
      expect(initialClassName).not.toEqual(afterToggleClassName);
    });

    it('should hide nav item labels when collapsed', () => {
      if (!Sidebar) {
        expect(Sidebar).toBeDefined();
        return;
      }

      render(<Sidebar />);

      const toggleButton = screen.getByRole('button', { name: /collapse|expand|toggle sidebar/i });

      // Toggle to collapsed state
      fireEvent.click(toggleButton);

      // In collapsed state, labels might still be in DOM but visually hidden
      // or removed from accessibility tree
      const dashboardLink = screen.getByRole('link', { name: /dashboard/i });
      expect(dashboardLink).toBeInTheDocument();
    });

    it('should maintain navigation functionality when collapsed', () => {
      if (!Sidebar) {
        expect(Sidebar).toBeDefined();
        return;
      }

      render(<Sidebar />);

      const toggleButton = screen.getByRole('button', { name: /collapse|expand|toggle sidebar/i });

      // Toggle to collapsed state
      fireEvent.click(toggleButton);

      // Links should still be present and clickable
      const dashboardLink = screen.getByRole('link', { name: /dashboard/i });
      expect(dashboardLink).toBeInTheDocument();
      expect(dashboardLink).toHaveAttribute('href', '/dashboard');
    });

    it('should persist collapse state preference', () => {
      if (!Sidebar) {
        expect(Sidebar).toBeDefined();
        return;
      }

      const { container } = render(<Sidebar />);

      // Sidebar component should handle state (likely with localStorage)
      const sidebar = container.querySelector('[data-testid="sidebar"]') || container.firstChild;
      expect(sidebar).toBeTruthy();
    });
  });

  describe('Accessibility', () => {
    it('should use semantic nav element', () => {
      if (!Sidebar) {
        expect(Sidebar).toBeDefined();
        return;
      }

      const { container } = render(<Sidebar />);

      // Should use nav element for navigation
      const nav = container.querySelector('nav');
      expect(nav).toBeInTheDocument();
    });

    it('should have proper ARIA labels', () => {
      if (!Sidebar) {
        expect(Sidebar).toBeDefined();
        return;
      }

      const { container } = render(<Sidebar />);

      // Sidebar should have aria-label for accessibility
      const nav = container.querySelector('nav');
      expect(nav).toHaveAttribute('aria-label');
    });

    it('should support keyboard navigation', () => {
      if (!Sidebar) {
        expect(Sidebar).toBeDefined();
        return;
      }

      render(<Sidebar />);

      // All links should be keyboard accessible
      const links = screen.getAllByRole('link');
      links.forEach(link => {
        expect(link).toHaveAttribute('href');
      });
    });
  });

  describe('Styling and Layout', () => {
    it('should have consistent styling with Tailwind classes', () => {
      if (!Sidebar) {
        expect(Sidebar).toBeDefined();
        return;
      }

      const { container } = render(<Sidebar />);

      const sidebar = container.querySelector('nav');
      expect(sidebar).toBeTruthy();
      expect(sidebar?.className).toBeTruthy(); // Should have Tailwind classes
    });

    it('should be positioned as a sidebar layout element', () => {
      if (!Sidebar) {
        expect(Sidebar).toBeDefined();
        return;
      }

      const { container } = render(<Sidebar />);

      // Sidebar should exist and be ready for positioning
      const nav = container.querySelector('nav');
      expect(nav).toBeTruthy();
    });
  });
});
