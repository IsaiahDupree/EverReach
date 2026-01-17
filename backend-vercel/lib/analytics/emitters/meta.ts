import type { AnalyticsEmitter, NormalizedRcEvent } from './base';

export class MetaEmitter implements AnalyticsEmitter {
  async emit(event: NormalizedRcEvent): Promise<void> {
    const pixelId = process.env.META_PIXEL_ID;
    const token = process.env.META_CAPI_TOKEN;

    if (!pixelId || !token) {
      // Destination disabled/misconfigured; noop
      return;
    }

    // Prepare minimal payload shape (no network call in scaffold)
    const payload = {
      event_name: mapKindToMetaEvent(event.kind),
      event_time: Math.floor((event.purchased_at_ms || Date.now()) / 1000),
      action_source: 'other',
      event_id: event.event_id,
      user_data: {
        // Placeholders; add hashed identifiers when available
      },
      custom_data: {
        currency: event.currency,
        value: event.value,
        subscription_id: event.product_id,
        product_id: event.product_id,
        environment: event.environment,
        platform: event.platform,
        status: event.status,
      },
    };

    // Intentionally no HTTP call here; real sending will be added in implementation
    // console.debug('[MetaEmitter] prepared payload', { pixelId, payload });
  }
}

function mapKindToMetaEvent(kind: NormalizedRcEvent['kind']): string {
  switch (kind) {
    case 'trial_started':
      return 'StartTrial';
    case 'non_subscription_purchase':
      return 'Purchase';
    default:
      return 'Subscribe';
  }
}
