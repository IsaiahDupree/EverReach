/**
 * Tests for Stripe Client Setup (WEB-PAY-001)
 *
 * This test ensures:
 * - Stripe client loads correctly with publishable key
 * - Checkout functionality is available
 * - Client is properly initialized
 */

import { loadStripe } from '@stripe/stripe-js';
import { getStripe, resetStripeInstance } from '@/lib/stripe/client';

// Mock the Stripe.js library
jest.mock('@stripe/stripe-js');

describe('Stripe Client Setup', () => {
  const mockStripePublishableKey = 'pk_test_mock_key_12345';
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset the Stripe instance cache
    resetStripeInstance();
    // Set up environment variable
    process.env = {
      ...originalEnv,
      NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: mockStripePublishableKey,
    };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('getStripe', () => {
    it('should load Stripe with the publishable key', async () => {
      const mockStripeInstance = {
        elements: jest.fn(),
        confirmPayment: jest.fn(),
        confirmSetup: jest.fn(),
      };

      (loadStripe as jest.Mock).mockResolvedValue(mockStripeInstance);

      const stripe = await getStripe();

      expect(loadStripe).toHaveBeenCalledWith(mockStripePublishableKey);
      expect(stripe).toBe(mockStripeInstance);
    });

    it('should return cached Stripe instance on subsequent calls', async () => {
      const mockStripeInstance = {
        elements: jest.fn(),
        confirmPayment: jest.fn(),
      };

      (loadStripe as jest.Mock).mockResolvedValue(mockStripeInstance);

      // First call
      const stripe1 = await getStripe();
      // Second call
      const stripe2 = await getStripe();

      // loadStripe should only be called once due to caching
      expect(loadStripe).toHaveBeenCalledTimes(1);
      expect(stripe1).toBe(stripe2);
    });

    it('should throw error if publishable key is missing', async () => {
      delete process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;

      await expect(getStripe()).rejects.toThrow(
        'Stripe publishable key is not defined'
      );
    });

    it('should throw error if publishable key is empty', async () => {
      process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY = '';

      await expect(getStripe()).rejects.toThrow(
        'Stripe publishable key is not defined'
      );
    });

    it('should return null if Stripe fails to load', async () => {
      (loadStripe as jest.Mock).mockResolvedValue(null);

      const stripe = await getStripe();

      expect(stripe).toBeNull();
    });

    it('should handle Stripe loading errors gracefully', async () => {
      const loadError = new Error('Failed to load Stripe.js');
      (loadStripe as jest.Mock).mockRejectedValue(loadError);

      await expect(getStripe()).rejects.toThrow('Failed to load Stripe.js');
    });
  });

  describe('Stripe checkout functionality', () => {
    it('should provide access to checkout capabilities', async () => {
      const mockStripeInstance = {
        redirectToCheckout: jest.fn(),
        elements: jest.fn(),
        confirmPayment: jest.fn(),
      };

      (loadStripe as jest.Mock).mockResolvedValue(mockStripeInstance);

      const stripe = await getStripe();

      expect(stripe).toHaveProperty('redirectToCheckout');
      expect(typeof stripe?.redirectToCheckout).toBe('function');
    });

    it('should support Stripe Elements for custom forms', async () => {
      const mockStripeInstance = {
        elements: jest.fn(),
        confirmPayment: jest.fn(),
      };

      (loadStripe as jest.Mock).mockResolvedValue(mockStripeInstance);

      const stripe = await getStripe();

      expect(stripe).toHaveProperty('elements');
      expect(typeof stripe?.elements).toBe('function');
    });
  });
});
