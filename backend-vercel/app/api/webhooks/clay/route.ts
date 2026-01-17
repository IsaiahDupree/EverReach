/**
 * Clay / Enrichment Webhook Handler
 * 
 * Receives enriched contact data from Clay or other enrichment services:
 * - Person enrichment (name, company, title, LinkedIn, etc.)
 * - Company enrichment (domain, industry, size, funding, etc.)
 * - Social profiles (Twitter, LinkedIn, GitHub, etc.)
 * - Intent signals and buying signals
 * 
 * POST /api/webhooks/clay
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

function getSupabase() {
  return createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

interface EnrichmentWebhookPayload {
  request_id: string;
  user_id: string;
  email: string;
  status: 'completed' | 'failed' | 'partial';
  enrichment_source: 'clay' | 'clearbit' | 'apollo' | 'zoominfo' | 'manual';
  timestamp: string;
  data?: {
    // Person data
    full_name?: string;
    first_name?: string;
    last_name?: string;
    
    // Professional info
    company?: string;
    role_title?: string;
    seniority?: string;
    department?: string;
    
    // Social profiles
    linkedin?: string;
    twitter?: string;
    github?: string;
    
    // Company data
    company_domain?: string;
    company_industry?: string;
    company_size?: string;
    company_funding?: string;
    company_founded_year?: number;
    
    // Location
    city?: string;
    state?: string;
    country?: string;
    timezone?: string;
    
    // Additional data
    bio?: string;
    skills?: string[];
    interests?: string[];
    technologies?: string[];
    
    // Audience/reach
    linkedin_connections?: number;
    twitter_followers?: number;
    github_followers?: number;
    
    // Confidence scores
    confidence_score?: number;
    data_quality_score?: number;
    
    // Raw data for debugging
    raw_response?: any;
  };
  error?: {
    code: string;
    message: string;
    details?: any;
  };
}

function verifySignature(body: string, signature: string | null): boolean {
  if (!signature) {
    console.error('[clay-webhook] No signature provided');
    return false;
  }

  const secret = process.env.CLAY_WEBHOOK_SECRET || process.env.ENRICHMENT_WEBHOOK_SECRET;
  if (!secret) {
    console.warn('[clay-webhook] No webhook secret configured');
    return true; // Allow in development
  }

  try {
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(body)
      .digest('hex');

    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  } catch (error) {
    console.error('[clay-webhook] Signature verification failed:', error);
    return false;
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = getSupabase();
    const signature = req.headers.get('x-clay-signature') || 
                     req.headers.get('x-enrichment-signature');
    const body = await req.text();
    
    // Verify webhook signature
    if (!verifySignature(body, signature)) {
      console.error('[clay-webhook] Invalid signature');
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 401 }
      );
    }

    const payload: EnrichmentWebhookPayload = JSON.parse(body);
    
    console.log('[clay-webhook] Received enrichment result:', {
      request_id: payload.request_id,
      user_id: payload.user_id,
      status: payload.status,
      source: payload.enrichment_source
    });

    // Check for duplicate webhook
    const webhookId = `clay_${payload.request_id}`;
    const { data: existing } = await supabase
      .from('webhook_log')
      .select('id')
      .eq('webhook_id', webhookId)
      .single();

    if (existing) {
      console.log('[clay-webhook] Duplicate webhook, skipping');
      return NextResponse.json({ received: true, duplicate: true });
    }

    // Log webhook event
    await supabase.from('webhook_log').insert({
      webhook_id: webhookId,
      provider: payload.enrichment_source,
      event_type: 'enrichment.' + payload.status,
      payload: payload,
      processed_at: new Date().toISOString()
    });

    // Process enrichment based on status
    if (payload.status === 'completed' && payload.data) {
      await processEnrichmentData(supabase, payload);
    } else if (payload.status === 'failed') {
      await handleEnrichmentFailure(supabase, payload);
    } else if (payload.status === 'partial') {
      await processEnrichmentData(supabase, payload);
      console.warn('[clay-webhook] Enrichment partially complete, some data missing');
    }

    console.log('[clay-webhook] Enrichment processed successfully');

    return NextResponse.json({
      received: true,
      request_id: payload.request_id,
      status: payload.status
    });

  } catch (error) {
    console.error('[clay-webhook] Error processing webhook:', error);
    return NextResponse.json(
      { error: 'Failed to process webhook', details: (error as Error).message },
      { status: 500 }
    );
  }
}

async function processEnrichmentData(supabase: any, payload: EnrichmentWebhookPayload) {
  const { user_id, data, enrichment_source, timestamp } = payload;

  if (!data) return;

  // Update user_identity table with enriched data
  const identityData = {
    user_id,
    full_name: data.full_name,
    first_name: data.first_name,
    last_name: data.last_name,
    company: data.company,
    role_title: data.role_title,
    linkedin: data.linkedin,
    twitter: data.twitter,
    github: data.github,
    city: data.city,
    state: data.state,
    country: data.country,
    bio: data.bio,
    last_enriched_at: timestamp,
    enrichment_source,
    raw_enrichment: {
      ...data.raw_response,
      confidence_score: data.confidence_score,
      data_quality_score: data.data_quality_score,
      enriched_fields: Object.keys(data).filter(k => data[k as keyof typeof data] !== undefined)
    },
    updated_at: new Date().toISOString()
  };

  await supabase
    .from('user_identity')
    .upsert(identityData, { onConflict: 'user_id' });

  // Track enrichment event
  await supabase.from('user_event').insert({
    user_id,
    etype: 'identity_enriched',
    source: enrichment_source,
    props: {
      enrichment_source,
      fields_enriched: Object.keys(data).length,
      confidence_score: data.confidence_score,
      data_quality_score: data.data_quality_score,
      has_linkedin: !!data.linkedin,
      has_company: !!data.company,
      has_title: !!data.role_title
    },
    occurred_at: timestamp,
    created_at: new Date().toISOString()
  });

  // If persona assignment enabled, trigger persona calculation
  if (data.role_title || data.seniority || data.company_size) {
    console.log('[clay-webhook] Enrichment includes persona signals, may trigger persona assignment');
    // Could trigger persona assignment logic here
  }

  console.log('[clay-webhook] User identity updated with enriched data');
}

async function handleEnrichmentFailure(supabase: any, payload: EnrichmentWebhookPayload) {
  const { user_id, error, enrichment_source } = payload;

  console.error('[clay-webhook] Enrichment failed:', {
    user_id,
    error_code: error?.code,
    error_message: error?.message
  });

  // Log failure event
  await supabase.from('user_event').insert({
    user_id,
    etype: 'enrichment_failed',
    source: enrichment_source,
    props: {
      enrichment_source,
      error_code: error?.code,
      error_message: error?.message,
      error_details: error?.details
    },
    occurred_at: payload.timestamp,
    created_at: new Date().toISOString()
  });

  // Update user_identity to mark enrichment attempt
  await supabase
    .from('user_identity')
    .upsert({
      user_id,
      last_enrichment_attempt_at: payload.timestamp,
      enrichment_status: 'failed',
      enrichment_error: error?.message,
      updated_at: new Date().toISOString()
    }, { onConflict: 'user_id' });
}

// Health check
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    service: 'clay-enrichment-webhook',
    timestamp: new Date().toISOString(),
    supported_sources: ['clay', 'clearbit', 'apollo', 'zoominfo']
  });
}
