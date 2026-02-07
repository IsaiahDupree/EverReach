'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useSubscription } from '@/hooks/use-subscription';
import { Check, ExternalLink, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Billing Page Component
 *
 * Displays user's current subscription plan, available upgrades, and billing management.
 *
 * Features:
 * - Current plan display with renewal date
 * - Available upgrade options
 * - Link to Stripe billing portal for paid subscribers
 * - Loading states
 *
 * Acceptance Criteria (WEB-PAGE-007):
 * - Current plan
 * - Upgrade options
 * - Portal link
 */

// Pricing tier configuration
const PRICING_TIERS = [
  {
    id: 'free',
    name: 'Free',
    price: '$0',
    period: 'forever',
    description: 'Perfect for getting started',
    features: [
      'Up to 10 items',
      'Basic support',
      'Email notifications',
      'Community access',
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    price: '$19',
    period: 'per month',
    description: 'For growing teams',
    features: [
      'Unlimited items',
      'Priority support',
      'Advanced analytics',
      'Custom integrations',
      'Team collaboration',
    ],
    stripePriceId: process.env.NEXT_PUBLIC_STRIPE_PRO_PRICE_ID,
  },
  {
    id: 'business',
    name: 'Business',
    price: '$49',
    period: 'per month',
    description: 'For large organizations',
    features: [
      'Everything in Pro',
      'Dedicated support',
      'Custom SLA',
      'SSO & SAML',
      'Advanced security',
      'Custom contracts',
    ],
    stripePriceId: process.env.NEXT_PUBLIC_STRIPE_BUSINESS_PRICE_ID,
  },
];

export default function BillingPage() {
  const { subscription, loading, isPaidSubscriber, createPortalSession } = useSubscription();
  const [isCreatingPortal, setIsCreatingPortal] = useState(false);

  // Handle portal session creation
  const handleManageBilling = async () => {
    try {
      setIsCreatingPortal(true);
      await createPortalSession();
    } catch (error) {
      console.error('Failed to open billing portal:', error);
      alert('Failed to open billing portal. Please try again.');
    } finally {
      setIsCreatingPortal(false);
    }
  };

  // Handle upgrade button click
  const handleUpgrade = async (priceId: string | undefined) => {
    if (!priceId) {
      alert('Pricing not configured. Please contact support.');
      return;
    }

    try {
      // Call checkout API
      const response = await fetch('/api/subscriptions/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ priceId }),
      });

      if (!response.ok) {
        throw new Error('Failed to create checkout session');
      }

      const { url } = await response.json();
      window.location.href = url;
    } catch (error) {
      console.error('Failed to start checkout:', error);
      alert('Failed to start checkout. Please try again.');
    }
  };

  // Format renewal date
  const formatRenewalDate = (dateString: string | null) => {
    if (!dateString) return null;

    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="flex flex-col gap-8 p-8">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <span className="ml-2 text-muted-foreground">Loading subscription details...</span>
        </div>
      </div>
    );
  }

  const currentTier = subscription?.tier || 'free';
  const renewalDate = subscription?.current_period_end;

  return (
    <div className="flex flex-col gap-8 p-8" data-testid="billing-page">
      {/* Page Header */}
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Billing & Subscription</h1>
        <p className="text-muted-foreground">
          Manage your subscription plan and billing settings
        </p>
      </div>

      {/* Current Plan Section */}
      <Card>
        <CardHeader>
          <CardTitle>Current Plan</CardTitle>
          <CardDescription>
            Your current subscription tier and billing information
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-2xl font-bold capitalize">{currentTier}</p>
              {renewalDate && subscription?.status === 'active' && (
                <p className="text-sm text-muted-foreground mt-1">
                  Renews on {formatRenewalDate(renewalDate)}
                </p>
              )}
              {subscription?.status === 'cancelled' && (
                <p className="text-sm text-destructive mt-1">
                  Subscription cancelled
                </p>
              )}
            </div>
            {isPaidSubscriber() && (
              <Button
                onClick={handleManageBilling}
                disabled={isCreatingPortal}
                variant="outline"
              >
                {isCreatingPortal ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Loading...
                  </>
                ) : (
                  <>
                    Manage Billing
                    <ExternalLink className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Available Plans Section */}
      <div>
        <h2 className="text-2xl font-semibold mb-4">Available Plans</h2>
        <div className="grid gap-6 md:grid-cols-3">
          {PRICING_TIERS.map((tier) => {
            const isCurrentPlan = tier.id === currentTier;
            const canUpgrade =
              (currentTier === 'free' && (tier.id === 'pro' || tier.id === 'business')) ||
              (currentTier === 'pro' && tier.id === 'business');

            return (
              <Card
                key={tier.id}
                className={cn(
                  'relative',
                  isCurrentPlan && 'border-primary shadow-md'
                )}
              >
                {isCurrentPlan && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="inline-flex items-center rounded-full bg-primary px-3 py-1 text-xs font-medium text-primary-foreground">
                      Current Plan
                    </span>
                  </div>
                )}
                <CardHeader>
                  <CardTitle className="text-xl">{tier.name}</CardTitle>
                  <CardDescription>{tier.description}</CardDescription>
                  <div className="mt-4">
                    <span className="text-4xl font-bold">{tier.price}</span>
                    <span className="text-muted-foreground ml-2">/ {tier.period}</span>
                  </div>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {tier.features.map((feature, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <Check className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                        <span className="text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
                <CardFooter>
                  {isCurrentPlan ? (
                    <Button className="w-full" disabled variant="outline">
                      Current Plan
                    </Button>
                  ) : canUpgrade ? (
                    <Button
                      className="w-full"
                      onClick={() => handleUpgrade(tier.stripePriceId)}
                    >
                      Upgrade to {tier.name}
                    </Button>
                  ) : (
                    <Button className="w-full" disabled variant="outline">
                      {tier.id === 'free' ? 'Downgrade' : 'Not Available'}
                    </Button>
                  )}
                </CardFooter>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Billing Portal Info */}
      {isPaidSubscriber() && (
        <Card>
          <CardHeader>
            <CardTitle>Billing Management</CardTitle>
            <CardDescription>
              Update your payment method, view invoices, and manage your subscription
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Click "Manage Billing" above to access the Stripe customer portal where you can:
            </p>
            <ul className="mt-2 space-y-1 text-sm text-muted-foreground list-disc list-inside">
              <li>Update payment methods</li>
              <li>View billing history and invoices</li>
              <li>Cancel or modify your subscription</li>
              <li>Update billing information</li>
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
