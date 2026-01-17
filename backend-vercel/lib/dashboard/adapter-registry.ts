/**
 * Service Adapter Registry
 * Central registry for all service adapters
 */

import type { ServiceAdapter } from './types';
import { StripeAdapter } from './adapters/stripe-adapter';
import { RevenueCatAdapter } from './adapters/revenuecat-adapter';
import { PostHogAdapter } from './adapters/posthog-adapter';
import { ResendAdapter } from './adapters/resend-adapter';
import { SupabaseAdapter } from './adapters/supabase-adapter';
import { BackendAdapter } from './adapters/backend-adapter';
import { TwilioAdapter } from './adapters/twilio-adapter';
import { OpenAIAdapter } from './adapters/openai-adapter';
import { MetaAdapter } from './adapters/meta-adapter';
import { GoogleAdapter } from './adapters/google-adapter';
import { AppleAdapter } from './adapters/apple-adapter';
import { SuperwallAdapter } from './adapters/superwall-adapter';
import { MobileAppAdapter } from './adapters/mobile-app-adapter';

// Registry of all available adapters
const adapters = new Map<string, ServiceAdapter>();

// Register all adapters
adapters.set('stripe', new StripeAdapter());
adapters.set('revenuecat', new RevenueCatAdapter());
adapters.set('posthog', new PostHogAdapter());
adapters.set('resend', new ResendAdapter());
adapters.set('supabase', new SupabaseAdapter());
adapters.set('backend', new BackendAdapter());
adapters.set('twilio', new TwilioAdapter());
adapters.set('openai', new OpenAIAdapter());
adapters.set('meta', new MetaAdapter());
adapters.set('google', new GoogleAdapter());
adapters.set('apple', new AppleAdapter());
adapters.set('superwall', new SuperwallAdapter());
adapters.set('mobile_app', new MobileAppAdapter());

/**
 * Get adapter for a service
 */
export function getAdapter(service: string): ServiceAdapter | null {
  return adapters.get(service) || null;
}

/**
 * Get all registered adapters
 */
export function getAllAdapters(): ServiceAdapter[] {
  return Array.from(adapters.values());
}

/**
 * Get all registered service names
 */
export function getRegisteredServices(): string[] {
  return Array.from(adapters.keys());
}

/**
 * Check if a service has an adapter
 */
export function hasAdapter(service: string): boolean {
  return adapters.has(service);
}
