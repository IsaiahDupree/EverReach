import { KV } from '@/storage/AsyncStorageService';
import * as Localization from 'expo-localization';

export const STORAGE_KEYS = {
  SNAPSHOT: 'contacts:lastSnapshot',
  HISTORY: 'contacts:history',
} as const;

export type Snapshot = Record<string, string | number | undefined>;

export const getDefaultRegion = () => {
  try {
    const locales = Localization.getLocales?.();
    const region = Array.isArray(locales) && locales.length > 0 ? (locales[0] as any)?.region : undefined;
    return region ?? 'US';
  } catch {
    return 'US';
  }
};

export const normalizeEmail = (e?: string) => (e ?? '').trim().toLowerCase();

export const normalizePhone = (raw?: string, region = getDefaultRegion()) => {
  if (!raw) return '';
  const keptPlus = raw.trim().startsWith('+');
  const digits = raw.replace(/\D+/g, '');
  if (keptPlus) return `+${digits}`;
  if (region === 'US' || region === 'CA') {
    if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`;
    if (digits.length === 10) return `+1${digits}`;
  }
  return digits.length >= 10 ? `+${digits}` : digits;
};

export async function loadSnapshot(): Promise<Snapshot> {
  try {
    const s = await KV.get<Snapshot>(STORAGE_KEYS.SNAPSHOT);
    return s ?? {};
  } catch (e) {
    console.warn('loadSnapshot failed', e);
    return {};
  }
}

export async function saveSnapshot(s: Snapshot) {
  if (!s || typeof s !== 'object') return;
  try {
    await KV.set(STORAGE_KEYS.SNAPSHOT, s);
  } catch (e) {
    console.warn('saveSnapshot failed', e);
  }
}

export async function loadHistory<T = any[]>(): Promise<T> {
  try {
    const s = await KV.get<T>(STORAGE_KEYS.HISTORY);
    return (s ?? ([] as unknown as T));
  } catch (e) {
    console.warn('loadHistory failed', e);
    return [] as unknown as T;
  }
}

export async function saveHistory(entries: any[]) {
  if (!Array.isArray(entries)) return;
  try {
    await KV.set(STORAGE_KEYS.HISTORY, entries);
  } catch (e) {
    console.warn('saveHistory failed', e);
  }
}
