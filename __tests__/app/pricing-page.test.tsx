import React from 'react';
import { render, screen } from '@testing-library/react';
import PricingPage from '@/app/(marketing)/pricing/page';

// Mock the subscription types
jest.mock('@/types/database', () => ({
  SubscriptionTier: {
    FREE: 'free',
    PRO: 'pro',
    BUSINESS: 'business',
  },
}));

describe('Pricing Page', () => {
  it('should render the pricing page', () => {
    render(<PricingPage />);
    expect(screen.getByRole('heading', { name: /pricing/i })).toBeInTheDocument();
  });

  it('should display pricing cards for all tiers', () => {
    render(<PricingPage />);

    // Check for tier names (using getAllByText since they appear multiple times)
    expect(screen.getAllByText(/free/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/pro/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/business/i).length).toBeGreaterThan(0);
  });

  it('should display pricing amounts', () => {
    render(<PricingPage />);

    // Check for pricing display (should show $0, $9, $29 or similar)
    expect(screen.getByText(/\$0/)).toBeInTheDocument();
    expect(screen.getByText(/\$9/)).toBeInTheDocument();
    expect(screen.getByText(/\$29/)).toBeInTheDocument();
  });

  it('should display feature comparison for each tier', () => {
    render(<PricingPage />);

    // Check for common features (using getAllByText since they appear in both cards and comparison table)
    expect(screen.getAllByText(/basic features/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/advanced features/i).length).toBeGreaterThan(0);
  });

  it('should have checkout/subscribe buttons for each tier', () => {
    render(<PricingPage />);

    const buttons = screen.getAllByRole('button', { name: /get started|subscribe|upgrade/i });
    expect(buttons.length).toBeGreaterThanOrEqual(3);
  });

  it('should have a descriptive heading and subheading', () => {
    render(<PricingPage />);

    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
    // Should have some description text
    expect(screen.getByText(/choose the plan/i)).toBeInTheDocument();
  });
});
