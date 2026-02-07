import React from 'react';
import { render, screen } from '@testing-library/react';
import { PricingCards } from '@/components/billing/pricing-cards';
import { SubscriptionTier } from '@/types/database';

// Mock the useAuth hook
jest.mock('@/hooks/use-auth', () => ({
  useAuth: jest.fn(() => ({
    user: null,
  })),
}));

// Mock the useSubscription hook
jest.mock('@/hooks/use-subscription', () => ({
  useSubscription: jest.fn(() => ({
    subscription: null,
    loading: false,
    error: null,
    hasAccess: jest.fn(() => false),
    getTierName: jest.fn(() => 'Free'),
    isActive: jest.fn(() => false),
    isPaidSubscriber: jest.fn(() => false),
  })),
}));

describe('PricingCards', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render all three pricing tiers', () => {
    render(<PricingCards />);

    // Check for all tier names
    expect(screen.getByRole('heading', { name: 'Free' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Pro' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Business' })).toBeInTheDocument();
  });

  it('should display price for each tier', () => {
    render(<PricingCards />);

    // Check for price displays
    expect(screen.getByText(/\$0/)).toBeInTheDocument();
    expect(screen.getByText(/\$9/)).toBeInTheDocument();
    expect(screen.getByText(/\$29/)).toBeInTheDocument();
  });

  it('should display features for each tier', () => {
    render(<PricingCards />);

    // Check for feature lists (should have at least basic features for free tier)
    expect(screen.getByText(/basic features/i)).toBeInTheDocument();
    expect(screen.getByText(/advanced features/i)).toBeInTheDocument();
  });

  it('should have CTA button for each tier', () => {
    render(<PricingCards />);

    // Check for action buttons - should have at least 3 buttons
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThanOrEqual(3);
  });

  it('should highlight popular tier', () => {
    render(<PricingCards />);

    // Check that the popular badge is shown (Pro tier)
    expect(screen.getByText(/most popular/i)).toBeInTheDocument();
  });

  it('should highlight current tier when user is subscribed', () => {
    const { useSubscription } = require('@/hooks/use-subscription');
    useSubscription.mockImplementation(() => ({
      subscription: {
        tier: SubscriptionTier.PRO,
        status: 'active',
      },
      loading: false,
      error: null,
      hasAccess: jest.fn(() => true),
      getTierName: jest.fn(() => 'Pro'),
      isActive: jest.fn(() => true),
      isPaidSubscriber: jest.fn(() => true),
    }));

    render(<PricingCards />);

    // Check that current plan indicator exists (appears in both badge and button)
    const currentPlanElements = screen.getAllByText(/current plan/i);
    expect(currentPlanElements.length).toBeGreaterThanOrEqual(1);
  });

  it('should handle loading state', () => {
    const { useSubscription } = require('@/hooks/use-subscription');
    useSubscription.mockImplementation(() => ({
      subscription: null,
      loading: true,
      error: null,
      hasAccess: jest.fn(() => false),
      getTierName: jest.fn(() => 'Free'),
      isActive: jest.fn(() => false),
      isPaidSubscriber: jest.fn(() => false),
    }));

    render(<PricingCards />);

    // Should still render the pricing cards during loading
    expect(screen.getByRole('heading', { name: 'Free' })).toBeInTheDocument();
  });

  it('should display period for each tier', () => {
    render(<PricingCards />);

    // Check for period labels
    expect(screen.getByText(/forever/i)).toBeInTheDocument();
    expect(screen.getAllByText(/month/i).length).toBeGreaterThan(0);
  });

  it('should have descriptions for each tier', () => {
    render(<PricingCards />);

    // Check for tier descriptions
    expect(screen.getByText(/perfect for getting started/i)).toBeInTheDocument();
    expect(screen.getByText(/for growing businesses/i)).toBeInTheDocument();
    expect(screen.getByText(/for large organizations/i)).toBeInTheDocument();
  });
});
