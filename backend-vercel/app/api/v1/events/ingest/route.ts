import { NextRequest, NextResponse } from 'next/server';
import { getClientOrThrow } from "@/lib/supabase";
import { getUser } from "@/lib/auth";
import { options, ok, unauthorized, badRequest, serverError } from "@/lib/cors";
import { IngestEvent, IngestRequest, IngestResponse } from "@/lib/events/types";
import { validateBatch } from "@/lib/events/validator";

export const runtime = "edge";

export function OPTIONS(req: Request){ return options(req); }

/**
 * POST /v1/events/ingest
 * 
 * Unified event ingestion endpoint for all platforms.
 * 
 * Authentication:
 * - Server-to-server: x-ingest-key header (for webhooks)
 * - Client: Authorization Bearer token (for app events)
 * 
 * Features:
 * - Batch ingestion (up to 100 events)
 * - Idempotency via idempotency_key
 * - Automatic deduplication
 * - Validation
 */
export async function POST(req: NextRequest) {
  // Authentication check
  const serverKey = req.headers.get('x-ingest-key');
  
  const isServerAuthed = Boolean(process.env.INGEST_SERVER_KEY) && serverKey === process.env.INGEST_SERVER_KEY;
  const user = !isServerAuthed ? await getUser(req) : null;
  const isClientAuthed = !!user;

  if (!isServerAuthed && !isClientAuthed) {
    return unauthorized('Authentication required', req);
  }

  // Parse body
  let body: IngestRequest;
  try {
    body = await req.json();
  } catch (error) {
    return badRequest('Invalid JSON body', req);
  }

  // Validate
  const validation = validateBatch(body.events || []);
  if (!validation.valid) {
    return NextResponse.json({
      ok: false,
      error: 'Validation failed',
      errors: validation.errors.map(e => ({
        index: e.index,
        error: e.errors.map(err => `${err.field}: ${err.message}`).join(', ')
      }))
    }, { 
      status: 400,
      headers: {
        'Access-Control-Allow-Origin': process.env.NEXT_PUBLIC_FRONTEND_URL || '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-ingest-key',
      }
    });
  }

  const supabase = getClientOrThrow(req);
  const now = new Date();

  // Transform events to database format
  const rows = body.events.map((e: IngestEvent) => ({
    idempotency_key: e.idempotencyKey || null,
    source: e.source,
    category: e.category,
    name: e.name,
    occurred_at: e.occurredAt ? new Date(e.occurredAt) : now,
    user_id: e.userId || null,
    app_user_id: e.appUserId || null,
    anon_id: e.anonId || null,
    session_id: e.sessionId || null,
    platform: e.platform || null,
    device: e.device || null,
    utm_source: e.utm?.source || null,
    utm_medium: e.utm?.medium || null,
    utm_campaign: e.utm?.campaign || null,
    utm_content: e.utm?.content || null,
    utm_term: e.utm?.term || null,
    product_id: e.billing?.productId || null,
    entitlement_id: e.billing?.entitlementId || null,
    store: e.billing?.store || null,
    revenue_amount_cents: e.billing?.amountCents || null,
    currency: e.billing?.currency || null,
    campaign_id: e.ads?.campaignId || null,
    adset_id: e.ads?.adsetId || null,
    ad_id: e.ads?.adId || null,
    external_ref: e.externalRef || null,
    payload: e.payload || {},
    created_by: isServerAuthed ? 'webhook' : 'client'
  }));

  try {
    // Upsert with on-conflict to handle idempotency
    const { data, error } = await supabase
      .from('events')
      .upsert(rows, { 
        onConflict: 'idempotency_key',
        ignoreDuplicates: false // Update if exists
      })
      .select('id');

    if (error) {
      console.error('[Events Ingest] Database error:', error);
      return serverError('Failed to ingest events', req);
    }

    const response: IngestResponse = {
      ok: true,
      ingested: data?.length || rows.length
    };

    return ok(response, req);

  } catch (error: any) {
    console.error('[Events Ingest] Unexpected error:', error);
    return serverError('Internal error', req);
  }
}
