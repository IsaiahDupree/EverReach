/**
 * Marketing Enrichment Endpoint
 * 
 * Triggers the unified enrichment system (RapidAPI + Perplexity + OpenAI)
 * for a new user after email capture.
 * 
 * POST /api/v1/marketing/enrich
 * Body: { email, user_id, trigger: 'email_submitted' | 'manual' }
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServiceClient } from '@/lib/supabase';
import { UnifiedEnrichmentClient } from '@/lib/enrichment/unified-enrichment-client';

function getSupabase() { return getServiceClient(); }

interface EnrichmentRequest {
  email: string;
  user_id: string;
  trigger?: 'email_submitted' | 'manual' | 'retry';
  include_company?: boolean;
  include_persona?: boolean;
}

export async function POST(req: NextRequest) {
  try {
    const supabase = getSupabase();
    const body: EnrichmentRequest = await req.json();
    const { email, user_id, trigger = 'manual', include_company = true, include_persona = true } = body;

    // Validate inputs
    if (!email || !user_id) {
      return NextResponse.json(
        { error: 'Missing required fields: email, user_id' },
        { status: 400 }
      );
    }

    // Check if already enriched (prevent duplicates)
    const { data: existing } = await supabase
      .from('user_identity')
      .select('enriched_at, status')
      .eq('user_id', user_id)
      .single();

    if (existing && existing.status === 'completed') {
      return NextResponse.json({
        success: true,
        message: 'User already enriched',
        enriched_at: existing.enriched_at,
        skipped: true
      });
    }

    // Create or update user_identity record
    const { error: identityError } = await supabase
      .from('user_identity')
      .upsert({
        user_id,
        email_hash: hashEmail(email),
        status: 'pending',
        trigger_source: trigger,
        started_at: new Date().toISOString()
      }, {
        onConflict: 'user_id'
      });

    if (identityError) {
      console.error('Failed to create identity record:', identityError);
      return NextResponse.json(
        { error: 'Database error', details: identityError.message },
        { status: 500 }
      );
    }

    // Initialize enrichment client
    const enrichmentClient = new UnifiedEnrichmentClient({
      rapidApiKey: process.env.RAPIDAPI_KEY,
      perplexityApiKey: process.env.PERPLEXITY_API_KEY,
      openAiApiKey: process.env.OPENAI_API_KEY
    });

    // Perform enrichment (async, doesn't block response)
    performEnrichment(
      enrichmentClient,
      email,
      user_id,
      include_company,
      include_persona,
      supabase
    ).catch(error => {
      console.error('Enrichment failed:', error);
      // Update status to failed
      supabase.from('user_identity').update({
        status: 'failed',
        error_message: String(error),
        completed_at: new Date().toISOString()
      }).eq('user_id', user_id);
    });

    return NextResponse.json({
      success: true,
      message: 'Enrichment started',
      user_id,
      status: 'processing'
    });

  } catch (error) {
    console.error('Enrichment request error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: String(error) },
      { status: 500 }
    );
  }
}

/**
 * Perform enrichment (runs async)
 */
async function performEnrichment(
  client: UnifiedEnrichmentClient,
  email: string,
  userId: string,
  includeCompany: boolean,
  includePersona: boolean,
  supabase: ReturnType<typeof getSupabase>
) {
  try {
    // Run enrichment
    const result = await (client as any).enrichContact({
      email,
      includeCompany,
      includePersona
    });

    // Store social profiles
    if (result.social && result.social.length > 0) {
      const socialProfiles = result.social.reduce((acc: Record<string, any>, platform: any) => {
        acc[platform.platform] = {
          url: platform.url,
          username: platform.username,
          verified: platform.verified,
          followers: platform.followers
        };
        return acc;
      }, {} as Record<string, any>);

      await supabase.from('user_identity').update({
        social_profiles: socialProfiles
      }).eq('user_id', userId);
    }

    // Store company info
    if (result.company) {
      await supabase.from('user_identity').update({
        company_name: result.company.name,
        company_domain: result.company.domain,
        company_industry: result.company.industry,
        company_size: result.company.size,
        company_location: result.company.location
      }).eq('user_id', userId);
    }

    // Store persona analysis
    if (result.persona) {
      // Find or create persona bucket
      const { data: bucket } = await supabase
        .from('persona_bucket')
        .select('persona_bucket_id')
        .eq('slug', result.persona.bucket)
        .single();

      if (bucket) {
        // Assign user to persona
        await supabase.from('user_persona').upsert({
          user_id: userId,
          persona_bucket_id: bucket.persona_bucket_id,
          confidence_score: result.persona.confidence,
          assigned_at: new Date().toISOString(),
          assigned_by: 'ai_enrichment'
        }, {
          onConflict: 'user_id'
        });
      }
    }

    // Update status to completed
    await supabase.from('user_identity').update({
      status: 'completed',
      enriched_at: new Date().toISOString(),
      completed_at: new Date().toISOString(),
      cost_cents: result.cost * 100 // Convert to cents
    }).eq('user_id', userId);

    // Log event
    await supabase.from('user_event').insert({
      user_id: userId,
      etype: 'identity_enriched',
      occurred_at: new Date().toISOString(),
      properties: {
        has_social: result.social && result.social.length > 0,
        has_company: !!result.company,
        has_persona: !!result.persona,
        cost: result.cost
      }
    });

    console.log(`✅ Enrichment completed for user ${userId}`);

  } catch (error) {
    console.error(`❌ Enrichment failed for user ${userId}:`, error);
    throw error;
  }
}

/**
 * Hash email for privacy
 */
function hashEmail(email: string): string {
  const crypto = require('crypto');
  return crypto
    .createHash('sha256')
    .update(email.toLowerCase().trim())
    .digest('hex');
}

// GET endpoint for status check
export async function GET(req: NextRequest) {
  const supabase = getSupabase();
  const userId = req.nextUrl.searchParams.get('user_id');

  if (!userId) {
    return NextResponse.json(
      { error: 'Missing user_id parameter' },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from('user_identity')
    .select('status, enriched_at, error_message, cost_cents')
    .eq('user_id', userId)
    .single();

  if (error) {
    return NextResponse.json(
      { error: 'User not found' },
      { status: 404 }
    );
  }

  return NextResponse.json({
    user_id: userId,
    ...data
  });
}
