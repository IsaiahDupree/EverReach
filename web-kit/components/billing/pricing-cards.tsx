'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Check } from 'lucide-react';
import { SubscriptionTier } from '@/types/database';
import { useSubscription } from '@/hooks/use-subscription';
import { Badge } from '@/components/ui/badge';

interface PricingTier {
  name: string;
  tier: SubscriptionTier;
  price: number;
  period: string;
  description: string;
  features: string[];
  popular?: boolean;
  cta: string;
}

const pricingTiers: PricingTier[] = [
  {
    name: 'Free',
    tier: SubscriptionTier.FREE,
    price: 0,
    period: 'forever',
    description: 'Perfect for getting started',
    features: [
      'Basic features',
      'Up to 10 items',
      'Community support',
      'Basic analytics',
    ],
    cta: 'Get Started',
  },
  {
    name: 'Pro',
    tier: SubscriptionTier.PRO,
    price: 9,
    period: 'month',
    description: 'For growing businesses',
    features: [
      'All Free features',
      'Advanced features',
      'Unlimited items',
      'Priority support',
      'Advanced analytics',
      'Custom integrations',
    ],
    popular: true,
    cta: 'Subscribe',
  },
  {
    name: 'Business',
    tier: SubscriptionTier.BUSINESS,
    price: 29,
    period: 'month',
    description: 'For large organizations',
    features: [
      'All Pro features',
      'Dedicated support',
      'SLA guarantee',
      'Advanced security',
      'Custom contracts',
      'Team management',
      'API access',
    ],
    cta: 'Upgrade',
  },
];

export interface PricingCardsProps {
  /**
   * Optional callback when a tier is selected
   */
  onTierSelect?: (tier: SubscriptionTier) => void;
}

/**
 * Pricing Cards Component
 *
 * Displays subscription pricing tiers with feature lists and CTAs.
 * Automatically highlights the user's current tier if they are subscribed.
 *
 * @example
 * ```tsx
 * <PricingCards onTierSelect={(tier) => console.log('Selected:', tier)} />
 * ```
 */
export function PricingCards({ onTierSelect }: PricingCardsProps) {
  const { subscription, loading } = useSubscription();

  const isCurrentTier = (tier: SubscriptionTier): boolean => {
    if (!subscription || loading) return false;
    return subscription.tier === tier && subscription.status === 'active';
  };

  const handleTierSelect = (tier: SubscriptionTier) => {
    if (onTierSelect) {
      onTierSelect(tier);
    }
  };

  return (
    <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
      {pricingTiers.map((tier) => {
        const isCurrent = isCurrentTier(tier.tier);

        return (
          <Card
            key={tier.tier}
            className={`relative flex flex-col ${
              tier.popular
                ? 'border-primary shadow-lg scale-105'
                : 'border-border'
            } ${isCurrent ? 'ring-2 ring-primary' : ''}`}
          >
            {/* Popular Badge */}
            {tier.popular && (
              <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                <span className="bg-primary text-primary-foreground px-4 py-1 rounded-full text-sm font-medium">
                  Most Popular
                </span>
              </div>
            )}

            {/* Current Plan Badge */}
            {isCurrent && (
              <div className="absolute -top-4 right-4">
                <Badge variant="secondary" className="text-xs">
                  Current Plan
                </Badge>
              </div>
            )}

            <CardHeader className="text-center pb-8">
              <CardTitle className="text-2xl mb-2">{tier.name}</CardTitle>
              <CardDescription className="text-base">
                {tier.description}
              </CardDescription>
              <div className="mt-4">
                <span className="text-4xl font-bold">${tier.price}</span>
                <span className="text-muted-foreground ml-2">
                  / {tier.period}
                </span>
              </div>
            </CardHeader>

            <CardContent className="flex-grow">
              <ul className="space-y-3">
                {tier.features.map((feature, index) => (
                  <li key={index} className="flex items-start">
                    <Check className="h-5 w-5 text-primary mr-3 mt-0.5 flex-shrink-0" />
                    <span className="text-sm">{feature}</span>
                  </li>
                ))}
              </ul>
            </CardContent>

            <CardFooter className="pt-6">
              <Button
                className="w-full"
                variant={tier.popular ? 'default' : 'outline'}
                size="lg"
                onClick={() => handleTierSelect(tier.tier)}
                disabled={isCurrent}
              >
                {isCurrent ? 'Current Plan' : tier.cta}
              </Button>
            </CardFooter>
          </Card>
        );
      })}
    </div>
  );
}
