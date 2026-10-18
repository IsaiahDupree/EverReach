import React from 'react';
import { Metadata } from 'next';
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

export const metadata: Metadata = {
  title: 'Pricing - Choose Your Plan',
  description: 'Choose the perfect plan for your needs. Start free and upgrade anytime.',
};

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

export default function PricingPage() {
  return (
    <div className="container mx-auto py-16 px-4">
      {/* Header */}
      <div className="text-center mb-16">
        <h1 className="text-4xl font-bold tracking-tight mb-4">
          Pricing
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          Choose the plan that works best for you. All plans include a 14-day free trial.
        </p>
      </div>

      {/* Pricing Cards */}
      <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
        {pricingTiers.map((tier) => (
          <Card
            key={tier.tier}
            className={`relative flex flex-col ${
              tier.popular
                ? 'border-primary shadow-lg scale-105'
                : 'border-border'
            }`}
          >
            {tier.popular && (
              <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                <span className="bg-primary text-primary-foreground px-4 py-1 rounded-full text-sm font-medium">
                  Most Popular
                </span>
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
              >
                {tier.cta}
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>

      {/* Feature Comparison Section */}
      <div className="mt-24 max-w-4xl mx-auto">
        <h2 className="text-3xl font-bold text-center mb-12">
          Feature Comparison
        </h2>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b">
                <th className="text-left py-4 px-4">Feature</th>
                <th className="text-center py-4 px-4">Free</th>
                <th className="text-center py-4 px-4">Pro</th>
                <th className="text-center py-4 px-4">Business</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b">
                <td className="py-3 px-4">Basic features</td>
                <td className="text-center py-3 px-4">
                  <Check className="h-5 w-5 text-primary mx-auto" />
                </td>
                <td className="text-center py-3 px-4">
                  <Check className="h-5 w-5 text-primary mx-auto" />
                </td>
                <td className="text-center py-3 px-4">
                  <Check className="h-5 w-5 text-primary mx-auto" />
                </td>
              </tr>
              <tr className="border-b">
                <td className="py-3 px-4">Advanced features</td>
                <td className="text-center py-3 px-4">-</td>
                <td className="text-center py-3 px-4">
                  <Check className="h-5 w-5 text-primary mx-auto" />
                </td>
                <td className="text-center py-3 px-4">
                  <Check className="h-5 w-5 text-primary mx-auto" />
                </td>
              </tr>
              <tr className="border-b">
                <td className="py-3 px-4">Priority support</td>
                <td className="text-center py-3 px-4">-</td>
                <td className="text-center py-3 px-4">
                  <Check className="h-5 w-5 text-primary mx-auto" />
                </td>
                <td className="text-center py-3 px-4">
                  <Check className="h-5 w-5 text-primary mx-auto" />
                </td>
              </tr>
              <tr className="border-b">
                <td className="py-3 px-4">Dedicated support</td>
                <td className="text-center py-3 px-4">-</td>
                <td className="text-center py-3 px-4">-</td>
                <td className="text-center py-3 px-4">
                  <Check className="h-5 w-5 text-primary mx-auto" />
                </td>
              </tr>
              <tr className="border-b">
                <td className="py-3 px-4">API access</td>
                <td className="text-center py-3 px-4">-</td>
                <td className="text-center py-3 px-4">-</td>
                <td className="text-center py-3 px-4">
                  <Check className="h-5 w-5 text-primary mx-auto" />
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* FAQ or Additional Info */}
      <div className="mt-16 text-center">
        <p className="text-muted-foreground">
          All plans include access to our core features. Need a custom plan?{' '}
          <a href="/contact" className="text-primary hover:underline">
            Contact us
          </a>
        </p>
      </div>
    </div>
  );
}
