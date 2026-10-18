import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { CheckoutButton } from '@/components/billing/checkout-button';
import { SubscriptionTier } from '@/types/database';

// Mock the Stripe client
jest.mock('@/lib/stripe/client', () => ({
  redirectToCheckout: jest.fn(),
}));

// Mock the useAuth hook
jest.mock('@/hooks/use-auth', () => ({
  useAuth: jest.fn(() => ({
    user: { id: 'test-user-id', email: 'test@example.com' },
  })),
}));

describe('CheckoutButton', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should render button with provided text', () => {
    render(
      <CheckoutButton tier={SubscriptionTier.PRO}>Subscribe Now</CheckoutButton>
    );

    expect(
      screen.getByRole('button', { name: /subscribe now/i })
    ).toBeInTheDocument();
  });

  it('should show loading state when clicked', async () => {
    (global.fetch as jest.Mock).mockImplementation(() =>
      new Promise((resolve) => setTimeout(resolve, 100))
    );

    render(
      <CheckoutButton tier={SubscriptionTier.PRO}>Subscribe</CheckoutButton>
    );

    const button = screen.getByRole('button', { name: /subscribe/i });
    fireEvent.click(button);

    // Button should be disabled during loading
    expect(button).toBeDisabled();

    await waitFor(() => {
      expect(button).toBeDisabled();
    });
  });

  it('should create checkout session and redirect to Stripe', async () => {
    const mockSessionId = 'cs_test_123456789';
    const { redirectToCheckout } = require('@/lib/stripe/client');

    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ sessionId: mockSessionId }),
    });

    (redirectToCheckout as jest.Mock).mockResolvedValue(undefined);

    render(
      <CheckoutButton tier={SubscriptionTier.PRO}>Subscribe</CheckoutButton>
    );

    const button = screen.getByRole('button', { name: /subscribe/i });
    fireEvent.click(button);

    // Wait for API call to complete
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/subscriptions/checkout',
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ tier: SubscriptionTier.PRO }),
        })
      );
    });

    // Wait for redirect to be called
    await waitFor(() => {
      expect(redirectToCheckout).toHaveBeenCalledWith(mockSessionId);
    });
  });

  it('should handle API errors gracefully', async () => {
    const consoleErrorSpy = jest
      .spyOn(console, 'error')
      .mockImplementation(() => {});

    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      statusText: 'Internal Server Error',
    });

    render(
      <CheckoutButton tier={SubscriptionTier.PRO}>Subscribe</CheckoutButton>
    );

    const button = screen.getByRole('button', { name: /subscribe/i });
    fireEvent.click(button);

    await waitFor(() => {
      expect(consoleErrorSpy).toHaveBeenCalled();
    });

    // Button should be re-enabled after error
    await waitFor(() => {
      expect(button).not.toBeDisabled();
    });

    consoleErrorSpy.mockRestore();
  });

  it('should handle Stripe redirect errors', async () => {
    const mockSessionId = 'cs_test_123456789';
    const { redirectToCheckout } = require('@/lib/stripe/client');
    const consoleErrorSpy = jest
      .spyOn(console, 'error')
      .mockImplementation(() => {});

    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ sessionId: mockSessionId }),
    });

    (redirectToCheckout as jest.Mock).mockRejectedValue(
      new Error('Stripe error')
    );

    render(
      <CheckoutButton tier={SubscriptionTier.PRO}>Subscribe</CheckoutButton>
    );

    const button = screen.getByRole('button', { name: /subscribe/i });
    fireEvent.click(button);

    await waitFor(() => {
      expect(consoleErrorSpy).toHaveBeenCalled();
    });

    // Button should be re-enabled after error
    await waitFor(() => {
      expect(button).not.toBeDisabled();
    });

    consoleErrorSpy.mockRestore();
  });

  it('should handle different subscription tiers', async () => {
    const mockSessionId = 'cs_test_business';
    const { redirectToCheckout } = require('@/lib/stripe/client');

    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ sessionId: mockSessionId }),
    });

    (redirectToCheckout as jest.Mock).mockResolvedValue(undefined);

    render(
      <CheckoutButton tier={SubscriptionTier.BUSINESS}>
        Upgrade to Business
      </CheckoutButton>
    );

    const button = screen.getByRole('button', {
      name: /upgrade to business/i,
    });
    fireEvent.click(button);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/subscriptions/checkout',
        expect.objectContaining({
          body: JSON.stringify({ tier: SubscriptionTier.BUSINESS }),
        })
      );
    });
  });

  it('should be disabled when disabled prop is true', () => {
    render(
      <CheckoutButton tier={SubscriptionTier.PRO} disabled>
        Subscribe
      </CheckoutButton>
    );

    const button = screen.getByRole('button', { name: /subscribe/i });
    expect(button).toBeDisabled();
  });

  it('should apply custom className', () => {
    render(
      <CheckoutButton
        tier={SubscriptionTier.PRO}
        className="custom-class"
      >
        Subscribe
      </CheckoutButton>
    );

    const button = screen.getByRole('button', { name: /subscribe/i });
    expect(button).toHaveClass('custom-class');
  });

  it('should call onSuccess callback after successful checkout', async () => {
    const mockSessionId = 'cs_test_success';
    const onSuccessMock = jest.fn();
    const { redirectToCheckout } = require('@/lib/stripe/client');

    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ sessionId: mockSessionId }),
    });

    (redirectToCheckout as jest.Mock).mockResolvedValue(undefined);

    render(
      <CheckoutButton tier={SubscriptionTier.PRO} onSuccess={onSuccessMock}>
        Subscribe
      </CheckoutButton>
    );

    const button = screen.getByRole('button', { name: /subscribe/i });
    fireEvent.click(button);

    await waitFor(() => {
      expect(onSuccessMock).toHaveBeenCalled();
    });
  });

  it('should call onError callback after failed checkout', async () => {
    const onErrorMock = jest.fn();

    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      statusText: 'Internal Server Error',
    });

    render(
      <CheckoutButton tier={SubscriptionTier.PRO} onError={onErrorMock}>
        Subscribe
      </CheckoutButton>
    );

    const button = screen.getByRole('button', { name: /subscribe/i });
    fireEvent.click(button);

    await waitFor(() => {
      expect(onErrorMock).toHaveBeenCalledWith(expect.any(Error));
    });
  });
});
