import type { AnalyticsEmitter, NormalizedRcEvent } from './base';

export class TikTokEmitter implements AnalyticsEmitter {
  async emit(event: NormalizedRcEvent): Promise<void> {
    const pixelId = process.env.TIKTOK_PIXEL_ID;
    const token = process.env.TIKTOK_ACCESS_TOKEN;

    if (!pixelId || !token) {
      // Destination disabled/misconfigured; noop
      return;
    }

    const payload = {
      pixel_code: pixelId,
      event: mapKindToTikTokEvent(event.kind),
      timestamp: Date.now(),
      event_id: event.event_id,
      context: {
        // ip, user_agent can be added when available
      },
      properties: {
        currency: event.currency,
        value: event.value,
        product_id: event.product_id,
        environment: event.environment,
        platform: event.platform,
        status: event.status,
      },
    };

    // Scaffold only; no HTTP call yet
    // console.debug('[TikTokEmitter] prepared payload', payload);
  }
}

function mapKindToTikTokEvent(kind: NormalizedRcEvent['kind']): string {
  switch (kind) {
    case 'non_subscription_purchase':
      return 'CompletePayment';
    case 'trial_started':
      return 'StartTrial';
    default:
      return 'Subscribe';
  }
}
