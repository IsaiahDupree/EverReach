// GET /api/v1/sessions          — list sessions for authenticated user (paginated)
// POST /api/v1/sessions         — create new session
// PATCH /api/v1/sessions/[id]   — update session (stop, add notes)
// DELETE /api/v1/sessions/[id]  — delete session
//
// All endpoints require Authorization: Bearer <supabase_access_token>

import { ok, badRequest, unauthorized, serverError, options } from '@/lib/cors';
import { getUser } from '@/lib/auth';
import { getClientOrThrow } from '@/lib/supabase';

export const runtime = 'edge';

export function OPTIONS(req: Request) {
  return options(req);
}

// ── GET — list sessions ────────────────────────────────────────────────────────

export async function GET(req: Request) {
  const user = await getUser(req);
  if (!user) return unauthorized(req);

  const db = getClientOrThrow(req);
  const url = new URL(req.url);
  const limit = Math.min(parseInt(url.searchParams.get('limit') ?? '50', 10), 100);
  const offset = parseInt(url.searchParams.get('offset') ?? '0', 10);
  const dateFrom = url.searchParams.get('date_from');
  const dateTo = url.searchParams.get('date_to');

  let query = db
    .from('sun_sessions')
    .select('*', { count: 'exact' })
    .eq('user_id', user.id)
    .order('started_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (dateFrom) query = query.gte('started_at', dateFrom);
  if (dateTo) query = query.lte('started_at', dateTo);

  const { data, error, count } = await query;

  if (error) return serverError(error.message, req);

  return ok({ sessions: data ?? [], total: count ?? 0, limit, offset }, req);
}

// ── POST — create session ─────────────────────────────────────────────────────

export async function POST(req: Request) {
  const user = await getUser(req);
  if (!user) return unauthorized(req);

  let body: any;
  try {
    body = await req.json();
  } catch {
    return badRequest('Invalid JSON body', req);
  }

  const { started_at, latitude, longitude, location_name, uv_index_avg, notes } = body;

  if (!started_at) {
    return badRequest('started_at is required', req);
  }

  const db = getClientOrThrow(req);

  const { data, error } = await db
    .from('sun_sessions')
    .insert({
      user_id: user.id,
      started_at,
      latitude: latitude ?? null,
      longitude: longitude ?? null,
      location_name: location_name ?? null,
      uv_index_avg: uv_index_avg ?? null,
      notes: notes ?? null,
    })
    .select()
    .single();

  if (error) return serverError(error.message, req);

  return ok({ session: data }, req);
}

// ── PATCH — update session ─────────────────────────────────────────────────────

export async function PATCH(req: Request) {
  const user = await getUser(req);
  if (!user) return unauthorized(req);

  const url = new URL(req.url);
  const segments = url.pathname.split('/');
  const sessionId = segments[segments.length - 1];

  if (!sessionId || sessionId === 'sessions') {
    return badRequest('Session ID required in path', req);
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return badRequest('Invalid JSON body', req);
  }

  const db = getClientOrThrow(req);
  const allowedFields = [
    'ended_at',
    'duration_minutes',
    'uv_index_avg',
    'd_earned_iu',
    'burn_risk_level',
    'notes',
    'sunscreen_applied',
    'location_name',
    'latitude',
    'longitude',
  ];

  const updates: Record<string, unknown> = {};
  for (const field of allowedFields) {
    if (field in body) updates[field] = body[field];
  }

  if (Object.keys(updates).length === 0) {
    return badRequest('No updatable fields provided', req);
  }

  const { data, error } = await db
    .from('sun_sessions')
    .update(updates)
    .eq('id', sessionId)
    .eq('user_id', user.id)
    .select()
    .single();

  if (error) return serverError(error.message, req);

  return ok({ session: data }, req);
}

// ── DELETE — remove session ────────────────────────────────────────────────────

export async function DELETE(req: Request) {
  const user = await getUser(req);
  if (!user) return unauthorized(req);

  const url = new URL(req.url);
  const segments = url.pathname.split('/');
  const sessionId = segments[segments.length - 1];

  if (!sessionId || sessionId === 'sessions') {
    return badRequest('Session ID required in path', req);
  }

  const db = getClientOrThrow(req);

  const { error } = await db
    .from('sun_sessions')
    .delete()
    .eq('id', sessionId)
    .eq('user_id', user.id);

  if (error) return serverError(error.message, req);

  return ok({ deleted: true, id: sessionId }, req);
}
