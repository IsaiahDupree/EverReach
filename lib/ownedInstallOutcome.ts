import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';

import { apiFetch } from '@/lib/api';

interface OwnedInstallFact {
  provider_event_id: string;
  occurred_at: string;
  install_source: string;
  app_platform: string;
}

export interface OwnedInstallPersistResult {
  status: 'persisted' | 'already_persisted' | 'no_install_fact';
}

const STORAGE_KEYS = {
  FACT: '@everreach_owned_install_fact_v1',
  PERSISTED_USER: '@everreach_owned_install_persisted_user_v1',
} as const;

function isInstallFact(value: unknown): value is OwnedInstallFact {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Record<string, unknown>;
  return typeof candidate.provider_event_id === 'string'
    && typeof candidate.occurred_at === 'string'
    && typeof candidate.install_source === 'string'
    && typeof candidate.app_platform === 'string';
}

export async function recordOwnedInstallFact(
  installSource: string,
  appPlatform: string,
  occurredAt: string = new Date().toISOString(),
): Promise<OwnedInstallFact> {
  const existing = await AsyncStorage.getItem(STORAGE_KEYS.FACT);
  if (existing) {
    try {
      const parsed: unknown = JSON.parse(existing);
      if (isInstallFact(parsed)) return parsed;
    } catch {}
  }

  const fact: OwnedInstallFact = {
    provider_event_id: `install_${Crypto.randomUUID()}`,
    occurred_at: occurredAt,
    install_source: installSource.trim().slice(0, 64) || 'unknown',
    app_platform: appPlatform.trim().slice(0, 32) || 'unknown',
  };
  await AsyncStorage.setItem(STORAGE_KEYS.FACT, JSON.stringify(fact));
  return fact;
}

export async function persistOwnedInstallOutcome(
  authenticatedUserId: string,
): Promise<OwnedInstallPersistResult> {
  const userId = authenticatedUserId.trim();
  if (!userId) throw new Error('A real authenticated user ID is required');

  const claimedUser = await AsyncStorage.getItem(STORAGE_KEYS.PERSISTED_USER);
  if (claimedUser) return { status: 'already_persisted' };

  const encoded = await AsyncStorage.getItem(STORAGE_KEYS.FACT);
  if (!encoded) return { status: 'no_install_fact' };
  let fact: unknown;
  try {
    fact = JSON.parse(encoded);
  } catch {
    return { status: 'no_install_fact' };
  }
  if (!isInstallFact(fact)) return { status: 'no_install_fact' };

  const response = await apiFetch('/api/v1/attribution/outcomes/install', {
    method: 'POST',
    requireAuth: true,
    body: JSON.stringify({
      expected_user_id: userId,
      ...fact,
    }),
  });
  if (!response.ok) {
    throw new Error(`Install outcome ingest failed with HTTP ${response.status}`);
  }
  const body = await response.json();
  const status = body?.owned_outcome_install?.status;
  if (status !== 'queued' && status !== 'idempotent_replay') {
    const missing = Array.isArray(body?.owned_outcome_install?.missingDimensions)
      ? body.owned_outcome_install.missingDimensions.join(',')
      : 'exact attribution';
    throw new Error(`Install outcome is not emittable: missing ${missing}`);
  }

  await AsyncStorage.setItem(STORAGE_KEYS.PERSISTED_USER, userId);
  return { status: 'persisted' };
}
