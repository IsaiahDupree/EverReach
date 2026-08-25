import { getUser } from '@/lib/auth';
import { badRequest, ok, options, serverError, unauthorized } from '@/lib/cors';
import { getOwnedOutcomeServiceClient } from '@/lib/supabase';
import { enqueueOwnedOutcomeForUser } from '@/lib/owned-outcomes';

export const runtime = 'nodejs';

const RFC3339_WITH_ZONE =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/;

export function OPTIONS(req: Request) { return options(req); }

function optionalText(
  body: Record<string, unknown>,
  field: string,
  maximum: number,
): string | null {
  const value = body[field];
  if (value === undefined || value === null) return null;
  if (typeof value !== 'string') throw new Error(`${field} must be a string`);
  const text = value.trim();
  if (!text || text.length > maximum) {
    throw new Error(`${field} must be 1 to ${maximum} characters`);
  }
  return text;
}

export async function POST(req: Request) {
  const user = await getUser(req);
  if (!user) return unauthorized('Unauthorized', req);

  let value: unknown;
  try {
    value = await req.json();
  } catch {
    return badRequest('Request body must be valid JSON', req);
  }
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return badRequest('Request body must be a JSON object', req);
  }

  try {
    const body = value as Record<string, unknown>;
    const expectedUserId = optionalText(body, 'expected_user_id', 64);
    if (expectedUserId && expectedUserId !== user.id) {
      return badRequest('Install subject does not match authenticated user', req);
    }
    const providerEventId = optionalText(body, 'provider_event_id', 256);
    const occurredAt = optionalText(body, 'occurred_at', 64);
    const installSource = optionalText(body, 'install_source', 64);
    const appPlatform = optionalText(body, 'app_platform', 32);
    if (!providerEventId || !occurredAt) {
      return badRequest('provider_event_id and occurred_at are required', req);
    }
    if (!RFC3339_WITH_ZONE.test(occurredAt)
      || Number.isNaN(Date.parse(occurredAt))) {
      return badRequest(
        'occurred_at must be an RFC3339 timestamp with a timezone',
        req,
      );
    }

    const result = await enqueueOwnedOutcomeForUser(getOwnedOutcomeServiceClient(), {
      userId: user.id,
      eventType: 'install',
      providerEventId,
      occurredAt,
      metadata: {
        producer: 'everreach_first_install',
        install_source: installSource,
        app_platform: appPlatform,
      },
    });
    return ok({
      ok: true,
      attribution_subject_verified: Boolean(expectedUserId),
      owned_outcome_install: result,
    }, req);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (/must be/.test(message)) return badRequest(message, req);
    console.error('[Owned Install] Enqueue failed:', message);
    return serverError('Install outcome enqueue failed', req);
  }
}
