import type { AnalyticsEvent, EventProperties, EventContext } from './events';

function phHost() {
  const host = process.env.POSTHOG_HOST || 'https://us.i.posthog.com';
  return host.replace(/\/$/, '');
}

/**
 * Edge-safe PostHog capture via HTTP API
 */
export async function trackEvent<T extends AnalyticsEvent>(
  event: T,
  properties: EventProperties[T],
  context: EventContext = { platform: 'web' }
): Promise<void> {
  try {
    const apiKey = process.env.POSTHOG_PROJECT_KEY;
    if (!apiKey) return;

    const distinctId = context.user_id || context.anonymous_id || 'unknown';
    const payload = {
      api_key: apiKey,
      event,
      properties: {
        distinct_id: distinctId,
        ...context,
        ...properties,
        timestamp: new Date().toISOString(),
      },
    } as any;

    await fetch(`${phHost()}/capture/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }).catch(() => {});
  } catch (_) {
    // never throw on analytics
  }
}

export async function identifyUser(_userId: string, _properties: Record<string, any> = {}) {
  // no-op on edge (optional to implement via /identify)
}

export async function aliasUser(_userId: string, _anonymousId: string) {
  // no-op on edge (optional to implement via /alias)
}

export async function flushEvents() {
  // no-op on edge
}
