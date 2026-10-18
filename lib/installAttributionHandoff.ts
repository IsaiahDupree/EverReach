import AsyncStorage from '@react-native-async-storage/async-storage';

import { apiFetch } from '@/lib/api';
import {
  acceptRecoveredContentAttribution,
  reserveRecoveredContentAttributionToken,
} from '@/lib/contentAttribution';
import {
  createInstallAttributionHandoff,
  touchTokenToInstallRecoveryCode,
} from '@/lib/installAttributionHandoffCore';

const handoff = createInstallAttributionHandoff(
  AsyncStorage,
  async (recoveryCode, expectedUserId) => {
    const retryDelays = [0, 250, 1000];
    let response: Response | null = null;
    let lastNetworkError: unknown;
    for (let index = 0; index < retryDelays.length; index += 1) {
      const delay = retryDelays[index];
      if (delay > 0) {
        await new Promise<void>((resolve) => setTimeout(resolve, delay));
      }
      try {
        response = await apiFetch('/api/v1/attribution/handoff/redeem', {
          method: 'POST',
          requireAuth: true,
          body: JSON.stringify({
            recovery_code: recoveryCode,
            expected_user_id: expectedUserId,
          }),
        });
      } catch (error) {
        lastNetworkError = error;
        if (index === retryDelays.length - 1) throw error;
        continue;
      }
      if (response.ok || response.status < 500) break;
    }
    if (!response?.ok) {
      if (!response && lastNetworkError instanceof Error) throw lastNetworkError;
      throw new Error(`Install attribution recovery failed with HTTP ${response?.status ?? 0}`);
    }
    const body = await response.json();
    if ((body?.status !== 'claimed' && body?.status !== 'idempotent_replay')
      || !body?.touch) {
      throw new Error('Install attribution recovery response is invalid');
    }
    return { status: body.status, touch: body.touch };
  },
  acceptRecoveredContentAttribution,
  reserveRecoveredContentAttributionToken,
);

export { touchTokenToInstallRecoveryCode };

export function savePendingInstallAttributionCode(code: string): Promise<string> {
  return handoff.savePendingCode(code);
}

export function getPendingInstallAttributionCode(): Promise<string | null> {
  return handoff.getPendingCode();
}

export function redeemPendingInstallAttribution(userId: string) {
  return handoff.redeemPending(userId);
}
