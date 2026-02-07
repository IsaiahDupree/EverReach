/**
 * Subscription Tiers Endpoint Tests
 * GET /api/subscriptions/tiers
 *
 * Tests the public endpoint that returns available subscription tiers
 */

import { GET } from '@/app/api/subscriptions/tiers/route';
import { NextRequest } from 'next/server';
import { SubscriptionTier } from '@/types/subscription';

describe('GET /api/subscriptions/tiers', () => {
  it('should return available subscription tiers without authentication', async () => {
    // Create a mock request (no auth required for this endpoint)
    const request = new NextRequest('http://localhost:3000/api/subscriptions/tiers', {
      method: 'GET',
    });

    // Call the handler
    const response = await GET(request);

    // Should return 200 OK
    expect(response.status).toBe(200);

    // Parse response body
    const data = await response.json();

    // Should have a tiers array
    expect(data).toHaveProperty('tiers');
    expect(Array.isArray(data.tiers)).toBe(true);

    // Should have at least 3 tiers (free, basic, pro)
    expect(data.tiers.length).toBeGreaterThanOrEqual(3);
  });

  it('should return tiers with all required fields', async () => {
    const request = new NextRequest('http://localhost:3000/api/subscriptions/tiers', {
      method: 'GET',
    });

    const response = await GET(request);
    const data = await response.json();

    // Check each tier has required fields
    data.tiers.forEach((tier: any) => {
      expect(tier).toHaveProperty('id');
      expect(tier).toHaveProperty('name');
      expect(tier).toHaveProperty('description');
      expect(tier).toHaveProperty('price_monthly');
      expect(tier).toHaveProperty('price_yearly');
      expect(tier).toHaveProperty('features');
      expect(tier).toHaveProperty('limits');

      // Validate types
      expect(typeof tier.id).toBe('string');
      expect(typeof tier.name).toBe('string');
      expect(typeof tier.description).toBe('string');
      expect(typeof tier.price_monthly).toBe('number');
      expect(typeof tier.price_yearly).toBe('number');
      expect(Array.isArray(tier.features)).toBe(true);
      expect(typeof tier.limits).toBe('object');
    });
  });

  it('should include FREE tier with zero pricing', async () => {
    const request = new NextRequest('http://localhost:3000/api/subscriptions/tiers', {
      method: 'GET',
    });

    const response = await GET(request);
    const data = await response.json();

    // Find the FREE tier
    const freeTier = data.tiers.find((tier: any) => tier.id === SubscriptionTier.FREE);

    // FREE tier should exist
    expect(freeTier).toBeDefined();

    // FREE tier should have zero pricing
    expect(freeTier.price_monthly).toBe(0);
    expect(freeTier.price_yearly).toBe(0);
  });

  it('should include BASIC and PRO tiers with pricing', async () => {
    const request = new NextRequest('http://localhost:3000/api/subscriptions/tiers', {
      method: 'GET',
    });

    const response = await GET(request);
    const data = await response.json();

    // Find BASIC and PRO tiers
    const basicTier = data.tiers.find((tier: any) => tier.id === SubscriptionTier.BASIC);
    const proTier = data.tiers.find((tier: any) => tier.id === SubscriptionTier.PRO);

    // Both should exist
    expect(basicTier).toBeDefined();
    expect(proTier).toBeDefined();

    // Both should have pricing > 0
    expect(basicTier.price_monthly).toBeGreaterThan(0);
    expect(proTier.price_monthly).toBeGreaterThan(0);
  });

  it('should return tiers in order: FREE, BASIC, PRO, ENTERPRISE', async () => {
    const request = new NextRequest('http://localhost:3000/api/subscriptions/tiers', {
      method: 'GET',
    });

    const response = await GET(request);
    const data = await response.json();

    // Check the order of tiers
    const tierIds = data.tiers.map((tier: any) => tier.id);

    // Find indices
    const freeIndex = tierIds.indexOf(SubscriptionTier.FREE);
    const basicIndex = tierIds.indexOf(SubscriptionTier.BASIC);
    const proIndex = tierIds.indexOf(SubscriptionTier.PRO);

    // FREE should come before BASIC, BASIC before PRO
    expect(freeIndex).toBeLessThan(basicIndex);
    expect(basicIndex).toBeLessThan(proIndex);
  });

  it('should include feature lists for each tier', async () => {
    const request = new NextRequest('http://localhost:3000/api/subscriptions/tiers', {
      method: 'GET',
    });

    const response = await GET(request);
    const data = await response.json();

    // Each tier should have at least one feature
    data.tiers.forEach((tier: any) => {
      expect(tier.features.length).toBeGreaterThan(0);

      // Each feature should be a string
      tier.features.forEach((feature: any) => {
        expect(typeof feature).toBe('string');
      });
    });
  });

  it('should include limits for each tier', async () => {
    const request = new NextRequest('http://localhost:3000/api/subscriptions/tiers', {
      method: 'GET',
    });

    const response = await GET(request);
    const data = await response.json();

    // Each tier should have limits defined
    data.tiers.forEach((tier: any) => {
      expect(Object.keys(tier.limits).length).toBeGreaterThan(0);
    });
  });
});
