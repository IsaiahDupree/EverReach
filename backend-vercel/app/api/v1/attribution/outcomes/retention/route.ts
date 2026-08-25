import { NextResponse } from 'next/server';
import { getOwnedOutcomeServiceClient } from '@/lib/supabase';

export const runtime = 'nodejs';

const RFC3339_WITH_ZONE =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/;

function text(body: Record<string, unknown>, field: string, maximum: number) {
  const value = body[field];
  if (typeof value !== 'string') throw new Error(`${field} must be a string`);
  const cleaned = value.trim();
  if (!cleaned || cleaned.length > maximum) {
    throw new Error(`${field} must be 1 to ${maximum} characters`);
  }
  return cleaned;
}

function integer(body: Record<string, unknown>, field: string, minimum: number) {
  const value = body[field];
  if (!Number.isSafeInteger(value) || Number(value) < minimum) {
    throw new Error(`${field} must be a safe integer greater than or equal to ${minimum}`);
  }
  return Number(value);
}

export async function POST(req: Request) {
  const configuredToken = process.env.OWNED_RETENTION_INGEST_TOKEN?.trim();
  if (!configuredToken) {
    return NextResponse.json(
      { error: 'Retention ingestion is not configured' },
      { status: 503 },
    );
  }
  if (req.headers.get('authorization') !== `Bearer ${configuredToken}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let value: unknown;
  try {
    value = await req.json();
  } catch {
    return NextResponse.json({ error: 'Request body must be valid JSON' }, { status: 400 });
  }
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return NextResponse.json({ error: 'Request body must be a JSON object' }, { status: 400 });
  }

  try {
    const body = value as Record<string, unknown>;
    const observedAt = text(body, 'observed_at', 64);
    if (!RFC3339_WITH_ZONE.test(observedAt) || Number.isNaN(Date.parse(observedAt))) {
      throw new Error('observed_at must be an RFC3339 timestamp with a timezone');
    }
    const metadata = body.metadata === undefined ? {} : body.metadata;
    if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) {
      throw new Error('metadata must be an object');
    }
    const journey = body.journey_id === undefined || body.journey_id === null
      ? null
      : text(body, 'journey_id', 256);
    const { data, error } = await getOwnedOutcomeServiceClient().rpc(
      'enqueue_owned_retention_sample',
      {
        p_measurement_id: text(body, 'measurement_id', 240),
        p_content_id: text(body, 'content_id', 512),
        p_source_id: text(body, 'source_id', 512),
        p_campaign_id: text(body, 'campaign_id', 512),
        p_offer_id: text(body, 'offer_id', 512),
        p_source_platform: text(body, 'source_platform', 100),
        p_journey_id: journey,
        p_observed_at: observedAt,
        p_elapsed_ms: integer(body, 'elapsed_ms', 0),
        p_retained_count: integer(body, 'retained_count', 0),
        p_sample_size: integer(body, 'sample_size', 1),
        p_metadata: metadata,
      },
    );
    if (error) {
      const status = error.code === '42501' ? 403
        : error.code === '23505' ? 409
          : error.code === '22023' ? 400 : 500;
      return NextResponse.json(
        { error: status === 500 ? 'Retention sample enqueue failed' : error.message },
        { status },
      );
    }
    return NextResponse.json({ ok: true, owned_retention: data }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 400 },
    );
  }
}
