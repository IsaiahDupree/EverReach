import type { AnalyticsEmitter, NormalizedRcEvent } from './base';
import { MetaEmitter } from './meta';
import { Ga4Emitter } from './ga4';
import { TikTokEmitter } from './tiktok';

function isEnabled(name: string): boolean {
  return (process.env[name] || '').toLowerCase() === 'true';
}

function buildEmitters(): AnalyticsEmitter[] {
  const emitters: AnalyticsEmitter[] = [];

  if (isEnabled('ANALYTICS_ENABLE_META')) {
    emitters.push(new MetaEmitter());
  }
  if (isEnabled('ANALYTICS_ENABLE_GA4')) {
    emitters.push(new Ga4Emitter());
  }
  if (isEnabled('ANALYTICS_ENABLE_TIKTOK')) {
    emitters.push(new TikTokEmitter());
  }

  return emitters;
}

let cached: AnalyticsEmitter[] | null = null;

export async function emitAll(event: NormalizedRcEvent): Promise<void> {
  try {
    if (!cached) cached = buildEmitters();
    if (!cached.length) return; // no destinations enabled

    await Promise.all(
      cached.map(async (emitter) => {
        try {
          await emitter.emit(event);
        } catch (e: any) {
          console.error('[AnalyticsEmitter] destination failed:', e?.message || e);
        }
      })
    );
  } catch (e: any) {
    console.error('[AnalyticsEmitter] fan-out failed:', e?.message || e);
  }
}
