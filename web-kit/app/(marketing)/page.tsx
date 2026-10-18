import React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { siteConfig } from '@/config/site';

/**
 * Landing Page Component (WEB-PAGE-001)
 *
 * Marketing homepage with:
 * - Hero section: Main headline, tagline, and primary CTA
 * - Features section: Showcase key features/benefits
 * - CTA section: Final call-to-action before footer
 *
 * CUSTOMIZATION GUIDE:
 * 1. Hero Section (lines 30-60):
 *    - Update main headline and tagline
 *    - Modify CTA button text and destination
 *    - Add hero image or illustration
 *
 * 2. Features Section (lines 62-140):
 *    - Edit feature titles and descriptions
 *    - Add/remove feature items (currently 6)
 *    - Update feature icons (using emojis for simplicity)
 *
 * 3. CTA Section (lines 142-170):
 *    - Update final pitch text
 *    - Modify CTA button destination
 *
 * Acceptance Criteria:
 * - Hero section with heading and CTA
 * - Features section with multiple items
 * - Final CTA section
 */
export default function LandingPage() {
  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <section
        data-testid="hero-section"
        className="container flex flex-col items-center justify-center gap-6 py-24 md:py-32 text-center"
      >
        <div className="flex max-w-[980px] flex-col items-center gap-4">
          <h1 className="text-4xl font-extrabold leading-tight tracking-tighter md:text-6xl lg:text-7xl">
            {siteConfig.name}
            <br className="hidden sm:inline" />
            <span className="bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              {' '}
              {siteConfig.tagline}
            </span>
          </h1>
          <p className="max-w-[750px] text-lg text-muted-foreground sm:text-xl">
            {siteConfig.description}
          </p>
        </div>

        <div className="flex gap-4">
          <Button size="lg" asChild>
            <Link href="/signup">Get Started</Link>
          </Button>
          <Button size="lg" variant="outline" asChild>
            <Link href="/pricing">View Pricing</Link>
          </Button>
        </div>
      </section>

      {/* Features Section */}
      <section
        data-testid="features-section"
        className="container py-24 md:py-32 bg-muted/50"
      >
        <div className="mx-auto flex max-w-[980px] flex-col items-center gap-4 text-center">
          <h2 className="text-3xl font-bold leading-tight tracking-tighter md:text-5xl lg:text-6xl">
            Everything you need to ship faster
          </h2>
          <p className="max-w-[750px] text-lg text-muted-foreground sm:text-xl">
            Stop building authentication, payments, and UI from scratch. Focus on your unique features.
          </p>
        </div>

        <div className="mx-auto grid max-w-6xl grid-cols-1 gap-6 pt-12 md:grid-cols-2 lg:grid-cols-3">
          {/* Feature 1: Authentication */}
          <Card data-testid="feature-item-1">
            <CardHeader>
              <div className="mb-2 text-4xl">🔐</div>
              <CardTitle>Authentication Ready</CardTitle>
              <CardDescription>
                Email/password, OAuth, and magic links powered by Supabase. User management included.
              </CardDescription>
            </CardHeader>
          </Card>

          {/* Feature 2: Payments */}
          <Card data-testid="feature-item-2">
            <CardHeader>
              <div className="mb-2 text-4xl">💳</div>
              <CardTitle>Stripe Integration</CardTitle>
              <CardDescription>
                Complete payment flow with subscriptions, checkout, and billing portal out of the box.
              </CardDescription>
            </CardHeader>
          </Card>

          {/* Feature 3: Modern UI */}
          <Card data-testid="feature-item-3">
            <CardHeader>
              <div className="mb-2 text-4xl">🎨</div>
              <CardTitle>Beautiful UI Components</CardTitle>
              <CardDescription>
                shadcn/ui components with Tailwind CSS. Dark mode and responsive design included.
              </CardDescription>
            </CardHeader>
          </Card>

          {/* Feature 4: Database */}
          <Card data-testid="feature-item-4">
            <CardHeader>
              <div className="mb-2 text-4xl">🗄️</div>
              <CardTitle>Database & Backend</CardTitle>
              <CardDescription>
                PostgreSQL database with Supabase. Real-time subscriptions and row-level security.
              </CardDescription>
            </CardHeader>
          </Card>

          {/* Feature 5: Type Safety */}
          <Card data-testid="feature-item-5">
            <CardHeader>
              <div className="mb-2 text-4xl">⚡</div>
              <CardTitle>TypeScript & Next.js 14</CardTitle>
              <CardDescription>
                Full type safety with TypeScript. App Router, Server Components, and Server Actions.
              </CardDescription>
            </CardHeader>
          </Card>

          {/* Feature 6: Developer Experience */}
          <Card data-testid="feature-item-6">
            <CardHeader>
              <div className="mb-2 text-4xl">🚀</div>
              <CardTitle>Production Ready</CardTitle>
              <CardDescription>
                SEO optimized, performance tuned, and ready to deploy on Vercel in minutes.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </section>

      {/* CTA Section */}
      <section
        data-testid="cta-section"
        className="container flex flex-col items-center justify-center gap-6 py-24 md:py-32 text-center"
      >
        <div className="flex max-w-[980px] flex-col items-center gap-4">
          <h2 className="text-3xl font-bold leading-tight tracking-tighter md:text-5xl lg:text-6xl">
            Ready to ship your product?
          </h2>
          <p className="max-w-[750px] text-lg text-muted-foreground sm:text-xl">
            Join developers who are shipping faster with our production-ready starter kit.
            Start building your product today.
          </p>
        </div>

        <div className="flex gap-4">
          <Button size="lg" asChild>
            <Link href="/signup">Start Building Now</Link>
          </Button>
          <Button size="lg" variant="outline" asChild>
            <Link href="/pricing">See Pricing</Link>
          </Button>
        </div>
      </section>
    </div>
  );
}
