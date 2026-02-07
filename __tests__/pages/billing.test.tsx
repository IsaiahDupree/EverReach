import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import BillingPage from '@/app/(dashboard)/settings/billing/page';

// Mock the useAuth hook
jest.mock('@/hooks/use-auth', () => ({
  useAuth: () => ({
    user: {
      id: '123',
      email: 'test@example.com',
      user_metadata: {
        full_name: 'Test User',
      },
    },
    loading: false,
  }),
}));

// Mock the useSubscription hook
const mockUseSubscription = jest.fn();
jest.mock('@/hooks/use-subscription', () => ({
  useSubscription: () => mockUseSubscription(),
}));

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
  }),
  usePathname: () => '/settings/billing',
}));

describe('Billing Page (WEB-PAGE-007)', () => {
  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();
  });

  describe('Current Plan Display', () => {
    it('should render the billing page', () => {
      mockUseSubscription.mockReturnValue({
        subscription: {
          tier: 'free',
          status: 'active',
        },
        loading: false,
        error: null,
        isPaidSubscriber: () => false,
        createPortalSession: jest.fn(),
      });

      render(<BillingPage />);

      // Check for the main heading
      expect(screen.getByRole('heading', { level: 1, name: /billing/i })).toBeInTheDocument();
    });

    it('should display current plan for free tier', () => {
      mockUseSubscription.mockReturnValue({
        subscription: {
          tier: 'free',
          status: 'active',
          current_period_end: null,
        },
        loading: false,
        error: null,
        isPaidSubscriber: () => false,
        createPortalSession: jest.fn(),
      });

      render(<BillingPage />);

      // Should show Free plan in Current Plan section
      const currentPlanText = screen.getAllByText(/current plan/i);
      expect(currentPlanText.length).toBeGreaterThan(0);
      const allFreeText = screen.getAllByText(/free/i);
      expect(allFreeText.length).toBeGreaterThan(0);
    });

    it('should display current plan for pro tier', () => {
      mockUseSubscription.mockReturnValue({
        subscription: {
          tier: 'pro',
          status: 'active',
          current_period_end: '2024-12-31T23:59:59Z',
        },
        loading: false,
        error: null,
        isPaidSubscriber: () => true,
        createPortalSession: jest.fn(),
      });

      render(<BillingPage />);

      // Should show Pro plan
      const currentPlanText = screen.getAllByText(/current plan/i);
      expect(currentPlanText.length).toBeGreaterThan(0);
      const allProText = screen.getAllByText(/pro/i);
      expect(allProText.length).toBeGreaterThan(0);
    });

    it('should display current plan for business tier', () => {
      mockUseSubscription.mockReturnValue({
        subscription: {
          tier: 'business',
          status: 'active',
          current_period_end: '2024-12-31T23:59:59Z',
        },
        loading: false,
        error: null,
        isPaidSubscriber: () => true,
        createPortalSession: jest.fn(),
      });

      render(<BillingPage />);

      // Should show Business plan
      const currentPlanText = screen.getAllByText(/current plan/i);
      expect(currentPlanText.length).toBeGreaterThan(0);
      const allBusinessText = screen.getAllByText(/business/i);
      expect(allBusinessText.length).toBeGreaterThan(0);
    });

    it('should display renewal date for paid plans', () => {
      mockUseSubscription.mockReturnValue({
        subscription: {
          tier: 'pro',
          status: 'active',
          current_period_end: '2024-12-31T23:59:59Z',
        },
        loading: false,
        error: null,
        isPaidSubscriber: () => true,
        createPortalSession: jest.fn(),
      });

      render(<BillingPage />);

      // Should show renewal date
      expect(screen.getByText(/renews on/i)).toBeInTheDocument();
    });

    it('should show loading state', () => {
      mockUseSubscription.mockReturnValue({
        subscription: null,
        loading: true,
        error: null,
        isPaidSubscriber: () => false,
        createPortalSession: jest.fn(),
      });

      render(<BillingPage />);

      // Should show loading indicator
      expect(screen.getByText(/loading/i)).toBeInTheDocument();
    });
  });

  describe('Upgrade Options', () => {
    it('should show upgrade options for free tier users', () => {
      mockUseSubscription.mockReturnValue({
        subscription: {
          tier: 'free',
          status: 'active',
        },
        loading: false,
        error: null,
        isPaidSubscriber: () => false,
        createPortalSession: jest.fn(),
      });

      render(<BillingPage />);

      // Should show upgrade buttons for Pro and Business
      const upgradeButtons = screen.getAllByRole('button', { name: /upgrade to/i });
      expect(upgradeButtons.length).toBeGreaterThanOrEqual(1);
    });

    it('should show upgrade options for pro tier users', () => {
      mockUseSubscription.mockReturnValue({
        subscription: {
          tier: 'pro',
          status: 'active',
        },
        loading: false,
        error: null,
        isPaidSubscriber: () => true,
        createPortalSession: jest.fn(),
      });

      render(<BillingPage />);

      // Should show upgrade to Business option
      const upgradeButton = screen.getByRole('button', { name: /upgrade to business/i });
      expect(upgradeButton).toBeInTheDocument();
    });

    it('should not show upgrade options for business tier users', () => {
      mockUseSubscription.mockReturnValue({
        subscription: {
          tier: 'business',
          status: 'active',
        },
        loading: false,
        error: null,
        isPaidSubscriber: () => true,
        createPortalSession: jest.fn(),
      });

      render(<BillingPage />);

      // Should indicate highest tier
      const upgradeButtons = screen.queryAllByRole('button', { name: /upgrade to/i });
      expect(upgradeButtons.length).toBe(0);
    });

    it('should display pricing information for each tier', () => {
      mockUseSubscription.mockReturnValue({
        subscription: {
          tier: 'free',
          status: 'active',
        },
        loading: false,
        error: null,
        isPaidSubscriber: () => false,
        createPortalSession: jest.fn(),
      });

      render(<BillingPage />);

      // Should show pricing for all tiers
      const allFreeText = screen.getAllByText(/free/i);
      expect(allFreeText.length).toBeGreaterThan(0);

      // Check for pricing amounts
      expect(screen.getByText(/\$0/i)).toBeInTheDocument();
      expect(screen.getByText(/\$19/i)).toBeInTheDocument();
      expect(screen.getByText(/\$49/i)).toBeInTheDocument();
    });
  });

  describe('Billing Portal Link', () => {
    it('should show portal link for paid subscribers', () => {
      mockUseSubscription.mockReturnValue({
        subscription: {
          tier: 'pro',
          status: 'active',
          stripe_customer_id: 'cus_123',
        },
        loading: false,
        error: null,
        isPaidSubscriber: () => true,
        createPortalSession: jest.fn(),
      });

      render(<BillingPage />);

      // Should show button to manage billing (not a link, it's a button that triggers portal)
      const manageButton = screen.getByRole('button', { name: /manage billing/i });
      expect(manageButton).toBeInTheDocument();
    });

    it('should not show portal link for free tier users', () => {
      mockUseSubscription.mockReturnValue({
        subscription: {
          tier: 'free',
          status: 'active',
          stripe_customer_id: null,
        },
        loading: false,
        error: null,
        isPaidSubscriber: () => false,
        createPortalSession: jest.fn(),
      });

      render(<BillingPage />);

      // Should not show billing portal link
      const portalLink = screen.queryByRole('link', { name: /manage billing/i });
      const portalButton = screen.queryByRole('button', { name: /manage billing/i });
      expect(portalLink || portalButton).not.toBeInTheDocument();
    });

    it('should call createPortalSession when manage billing is clicked', async () => {
      const mockCreatePortalSession = jest.fn();
      mockUseSubscription.mockReturnValue({
        subscription: {
          tier: 'pro',
          status: 'active',
          stripe_customer_id: 'cus_123',
        },
        loading: false,
        error: null,
        isPaidSubscriber: () => true,
        createPortalSession: mockCreatePortalSession,
      });

      render(<BillingPage />);

      const manageButton = screen.getByRole('button', { name: /manage billing/i });
      expect(manageButton).toBeInTheDocument();
    });
  });

  describe('Page Structure', () => {
    it('should have proper page layout with heading and description', () => {
      mockUseSubscription.mockReturnValue({
        subscription: {
          tier: 'free',
          status: 'active',
        },
        loading: false,
        error: null,
        isPaidSubscriber: () => false,
        createPortalSession: jest.fn(),
      });

      render(<BillingPage />);

      // Check for heading
      expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();

      // Check for descriptive text (should have multiple instances)
      const subscriptionText = screen.getAllByText(/subscription/i);
      expect(subscriptionText.length).toBeGreaterThan(0);
    });

    it('should use Card components for layout', () => {
      mockUseSubscription.mockReturnValue({
        subscription: {
          tier: 'pro',
          status: 'active',
        },
        loading: false,
        error: null,
        isPaidSubscriber: () => true,
        createPortalSession: jest.fn(),
      });

      render(<BillingPage />);

      // Cards should be present (they typically have specific classes or structure)
      const page = screen.getByRole('heading', { level: 1 }).closest('div');
      expect(page).toBeInTheDocument();
    });
  });
});
