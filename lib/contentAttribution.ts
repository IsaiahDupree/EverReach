import AsyncStorage from '@react-native-async-storage/async-storage';

import { apiFetch } from '@/lib/api';
import {
  ContentAttributionController,
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

export function persistFirstTouchAttribution(
  authenticatedUserId: string,
): Promise<AttributionPersistResult> {
  return controller.persistFirstTouch(authenticatedUserId);
}
