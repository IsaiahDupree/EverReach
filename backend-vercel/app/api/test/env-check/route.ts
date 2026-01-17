/**
 * Environment Variables Test Endpoint
 * 
 * Tests that all required environment variables are properly configured
 * GET /api/test/env-check
 * 
 * Returns status of each environment variable (exists/missing)
 * Does NOT return actual values for security
 */

import { NextResponse } from 'next/server';

interface EnvCheck {
  name: string;
  exists: boolean;
  category: string;
}

export async function GET() {
  const envChecks: EnvCheck[] = [
    // Supabase
    { name: 'SUPABASE_URL', exists: !!process.env.SUPABASE_URL, category: 'Supabase' },
    { name: 'SUPABASE_SERVICE_ROLE_KEY', exists: !!process.env.SUPABASE_SERVICE_ROLE_KEY, category: 'Supabase' },
    { name: 'SUPABASE_ANON_KEY', exists: !!process.env.SUPABASE_ANON_KEY, category: 'Supabase' },
    
    // OpenAI
    { name: 'OPENAI_API_KEY', exists: !!process.env.OPENAI_API_KEY, category: 'OpenAI' },
    
    // Twilio
    { name: 'TWILIO_ACCOUNT_SID', exists: !!process.env.TWILIO_ACCOUNT_SID, category: 'Twilio' },
    { name: 'TWILIO_AUTH_TOKEN', exists: !!process.env.TWILIO_AUTH_TOKEN, category: 'Twilio' },
    { name: 'TWILIO_PHONE_NUMBER', exists: !!process.env.TWILIO_PHONE_NUMBER, category: 'Twilio' },
    
    // Resend
    { name: 'RESEND_API_KEY', exists: !!process.env.RESEND_API_KEY, category: 'Resend' },
    { name: 'RESEND_WEBHOOK_SECRET', exists: !!process.env.RESEND_WEBHOOK_SECRET, category: 'Resend' },
    
    // PostHog
    { name: 'NEXT_PUBLIC_POSTHOG_KEY', exists: !!process.env.NEXT_PUBLIC_POSTHOG_KEY, category: 'PostHog' },
    { name: 'NEXT_PUBLIC_POSTHOG_HOST', exists: !!process.env.NEXT_PUBLIC_POSTHOG_HOST, category: 'PostHog' },
    
    // WhatsApp
    { name: 'WHATSAPP_ACCESS_TOKEN', exists: !!process.env.WHATSAPP_ACCESS_TOKEN, category: 'WhatsApp' },
    { name: 'WHATSAPP_PHONE_NUMBER_ID', exists: !!process.env.WHATSAPP_PHONE_NUMBER_ID, category: 'WhatsApp' },
    
    // Instagram
    { name: 'INSTAGRAM_APP_ID', exists: !!process.env.INSTAGRAM_APP_ID, category: 'Instagram' },
    { name: 'INSTAGRAM_APP_SECRET', exists: !!process.env.INSTAGRAM_APP_SECRET, category: 'Instagram' },
    { name: 'INSTAGRAM_ACCESS_TOKEN', exists: !!process.env.INSTAGRAM_ACCESS_TOKEN, category: 'Instagram' },
    
    // Facebook Ads
    { name: 'FB_ADS_APP_ID', exists: !!process.env.FB_ADS_APP_ID, category: 'Facebook Ads' },
    { name: 'FB_ADS_ACCOUNT_ID', exists: !!process.env.FB_ADS_ACCOUNT_ID, category: 'Facebook Ads' },
    { name: 'FB_ADS_ACCESS_TOKEN', exists: !!process.env.FB_ADS_ACCESS_TOKEN, category: 'Facebook Ads' },
    
    // Meta Webhooks
    { name: 'META_APP_SECRET', exists: !!process.env.META_APP_SECRET, category: 'Meta' },
    { name: 'META_VERIFY_TOKEN', exists: !!process.env.META_VERIFY_TOKEN, category: 'Meta' },
    
    // Cron
    { name: 'CRON_SECRET', exists: !!process.env.CRON_SECRET, category: 'Cron' },
    
    // Optional Webhooks
    { name: 'STRIPE_WEBHOOK_SECRET', exists: !!process.env.STRIPE_WEBHOOK_SECRET, category: 'Stripe (Optional)' },
    { name: 'CLAY_WEBHOOK_SECRET', exists: !!process.env.CLAY_WEBHOOK_SECRET, category: 'Clay (Optional)' },
  ];

  // Group by category
  const byCategory = envChecks.reduce((acc, check) => {
    if (!acc[check.category]) {
      acc[check.category] = [];
    }
    acc[check.category].push({
      name: check.name,
      exists: check.exists
    });
    return acc;
  }, {} as Record<string, Array<{ name: string; exists: boolean }>>);

  // Calculate stats
  const total = envChecks.length;
  const existing = envChecks.filter(c => c.exists).length;
  const missing = envChecks.filter(c => !c.exists);
  const optional = envChecks.filter(c => c.category.includes('Optional'));
  const requiredMissing = missing.filter(m => !m.category.includes('Optional'));

  const allRequiredPresent = requiredMissing.length === 0;

  return NextResponse.json({
    status: allRequiredPresent ? 'success' : 'warning',
    message: allRequiredPresent 
      ? 'All required environment variables are configured!' 
      : `${requiredMissing.length} required environment variable(s) missing`,
    summary: {
      total,
      existing,
      missing: missing.length,
      optional: optional.length,
      required_missing: requiredMissing.length,
      percentage: Math.round((existing / total) * 100)
    },
    by_category: byCategory,
    missing_variables: missing.map(m => ({
      name: m.name,
      category: m.category,
      required: !m.category.includes('Optional')
    })),
    environment: process.env.VERCEL_ENV || 'development',
    timestamp: new Date().toISOString()
  });
}
