import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiFetch } from '@/lib/api';
import {
  ContentAttributionController,
  type AttributionTouch,
  type AttributionCaptureResult,
  type AttributionPersistResult,
} from '@/lib/contentAttributionCore';

const controller = new ContentAttributionController(
  AsyncStorage,
  async (payload) => {
    const response = await apiFetch('/api/v1/attribution/ingest', {
      method: 'POST',
      requireAuth: true,
      body: JSON.stringify(payload),
    });
    return { ok: response.ok, status: response.status };
  },
  () => new Date().toISOString(),
  async (touch) => {
    const response = await apiFetch('/api/v1/attribution/touch', {
      method: 'POST',
      requireAuth: false,
      body: JSON.stringify(touch),
    });
    if (!response.ok) {
      throw new Error(`Anonymous attribution touch failed with HTTP ${response.status}`);
    }
    const body = await response.json();
    if (typeof body?.touch_token !== 'string'
      || typeof body?.captured_at !== 'string') {
      throw new Error('Anonymous attribution touch response is invalid');
    }
    return { touchToken: body.touch_token, capturedAt: body.captured_at };
  },
);

export function captureContentAttribution(
  url: string,
  referrer?: string,
): Promise<AttributionCaptureResult> {
  return controller.captureUrl(url, referrer);
}

export function buildContentAttributedDestination(destination: string): Promise<string> {
  return controller.buildDestination(destination);
}

export function acceptRecoveredContentAttribution(touch: AttributionTouch): Promise<void> {
  return controller.acceptVerifiedTouch(touch);
}

export function reserveRecoveredContentAttributionToken(
  touchToken: string,
): Promise<() => void> {
  return controller.reserveVerifiedToken(touchToken);
}

export function persistFirstTouchAttribution(
  authenticatedUserId: string,
): Promise<AttributionPersistResult> {
  return controller.persistFirstTouch(authenticatedUserId);
}
