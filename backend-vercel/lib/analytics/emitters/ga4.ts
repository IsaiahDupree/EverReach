import type { AnalyticsEmitter, NormalizedRcEvent } from './base';

export class Ga4Emitter implements AnalyticsEmitter {
  async emit(event: NormalizedRcEvent): Promise<void> {
    const measurementId = process.env.GA4_MEASUREMENT_ID;
    const apiSecret = process.env.GA4_API_SECRET;

    if (!measurementId || !apiSecret) {
      // Destination disabled/misconfigured; noop
      return;
    }

    // Prepare minimal Measurement Protocol-like payload (scaffold only)
    const payload = {
      measurement_id: measurementId,
      events: [
        {
          name: mapKindToGa4Event(event.kind),
          params: {
            currency: event.currency,
            value: event.value,
            product_id: event.product_id,
            environment: event.environment,
            platform: event.platform,
            status: event.status,
          },
        },
      ],
    };

    // Intentionally no HTTP call in scaffold
    // console.debug('[Ga4Emitter] prepared payload', payload);
  }
}

function mapKindToGa4Event(kind: NormalizedRcEvent['kind']): string {
  switch (kind) {
    case 'initial_purchase':
      return 'subscription_purchase_initial';
    case 'trial_started':
      return 'subscription_trial_started';
    case 'trial_converted':
      return 'subscription_trial_converted';
    case 'renewal':
      return 'subscription_renewed';
    case 'cancellation':
      return 'subscription_cancelled';
    case 'uncancellation':
      return 'subscription_uncancelled';
    case 'expiration':
      return 'subscription_expired';
    case 'billing_issue':
      return 'subscription_billing_issue';
    case 'product_change':
      return 'subscription_product_changed';
    case 'non_subscription_purchase':
      return 'purchase_non_subscription';
    case 'refund':
      return 'subscription_refunded';
    default:
      return 'subscription_event';
  }
}
