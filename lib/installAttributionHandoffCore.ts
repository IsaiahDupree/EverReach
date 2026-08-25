import type { AttributionTouch } from './contentAttributionCore';

const CODE_ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
const CODE_PREFIX = 'ER1';
const CODE_PAYLOAD_LENGTH = 26;

export const INSTALL_ATTRIBUTION_HANDOFF_STORAGE_KEYS = {
  PENDING_CODE: '@everreach_install_attribution_handoff_code_v1',
  CLAIMED: '@everreach_install_attribution_handoff_claimed_v1',
} as const;

export interface InstallAttributionHandoffStorage {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}

export interface InstallAttributionHandoffClaim {
  touch: AttributionTouch;
  status: 'claimed' | 'idempotent_replay';
}

export type InstallAttributionHandoffSender = (
  recoveryCode: string,
  expectedUserId: string,
) => Promise<InstallAttributionHandoffClaim>;

export type InstallAttributionHandoffResult = {
  status: 'claimed' | 'no_pending_code';
  userId: string;
  touch?: AttributionTouch;
};

type ClaimedInstallAttribution = {
  status: 'redeemed';
  user_id: string;
  redeemed_at: string;
};

function hexToBytes(hex: string): number[] {
  const bytes: number[] = [];
  for (let index = 0; index < hex.length; index += 2) {
    bytes.push(Number.parseInt(hex.slice(index, index + 2), 16));
  }
  return bytes;
}

function bytesToHex(bytes: number[]): string {
  return bytes.map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

function encodeCodePayload(bytes: number[]): string {
  let buffer = 0;
  let bitCount = 0;
  let encoded = '';
  for (const byte of bytes) {
    buffer = (buffer << 8) | byte;
    bitCount += 8;
    while (bitCount >= 5) {
      bitCount -= 5;
      encoded += CODE_ALPHABET[(buffer >> bitCount) & 31];
      buffer &= (1 << bitCount) - 1;
    }
  }
  if (bitCount > 0) encoded += CODE_ALPHABET[(buffer << (5 - bitCount)) & 31];
  return encoded;
}

function decodeCodePayload(encoded: string): number[] | null {
  let buffer = 0;
  let bitCount = 0;
  const bytes: number[] = [];
  for (const character of encoded) {
    const value = CODE_ALPHABET.indexOf(character);
    if (value < 0) return null;
    buffer = (buffer << 5) | value;
    bitCount += 5;
    while (bitCount >= 8) {
      bitCount -= 8;
      bytes.push((buffer >> bitCount) & 255);
      buffer &= (1 << bitCount) - 1;
    }
  }
  if (bitCount > 0 && buffer !== 0) return null;
  return bytes.length === 16 ? bytes : null;
}

function normalizedCodePayload(value: string): string | null {
  const compact = value.trim().toUpperCase().replace(/[\s-]/g, '');
  if (!compact.startsWith(CODE_PREFIX)) return null;
  const payload = compact.slice(CODE_PREFIX.length)
    .replace(/[IL]/g, '1')
    .replace(/O/g, '0');
  if (payload.length !== CODE_PAYLOAD_LENGTH) return null;
  return [...payload].every((character) => CODE_ALPHABET.includes(character))
    ? payload
    : null;
}

function formatCodePayload(payload: string): string {
  return `${CODE_PREFIX}-${payload.slice(0, 5)}-${payload.slice(5, 10)}`
    + `-${payload.slice(10, 15)}-${payload.slice(15, 20)}-${payload.slice(20)}`;
}

export function touchTokenToInstallRecoveryCode(token: string): string | null {
  const match = /^touch_([0-9a-f]{8})-([0-9a-f]{4})-([0-9a-f]{4})-([0-9a-f]{4})-([0-9a-f]{12})$/i
    .exec(token.trim());
  if (!match) return null;
  const payload = encodeCodePayload(hexToBytes(match.slice(1).join('')));
  return payload.length === CODE_PAYLOAD_LENGTH ? formatCodePayload(payload) : null;
}

export function installRecoveryCodeToTouchToken(code: string): string | null {
  const payload = normalizedCodePayload(code);
  if (!payload) return null;
  const bytes = decodeCodePayload(payload);
  if (!bytes) return null;
  const hex = bytesToHex(bytes);
  return `touch_${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}`
    + `-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export function normalizeInstallRecoveryCode(code: string): string | null {
  const token = installRecoveryCodeToTouchToken(code);
  return token ? touchTokenToInstallRecoveryCode(token) : null;
}

function isExactVerifiedTouch(value: unknown): value is AttributionTouch {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Record<string, unknown>;
  return [
    'actp_content_id',
    'actp_published_id',
    'actp_campaign_id',
    'actp_offer_id',
    'actp_source_platform',
    'actp_touch_token',
    'captured_at',
    'landing_page',
  ].every((field) => (
    typeof candidate[field] === 'string'
    && candidate[field].trim().length > 0
  ));
}

export function createInstallAttributionHandoff(
  storage: InstallAttributionHandoffStorage,
  sender: InstallAttributionHandoffSender,
  applyVerifiedTouch: (touch: AttributionTouch) => Promise<void>,
  reserveVerifiedToken: (touchToken: string) => Promise<() => void>,
) {

  async function savePendingCode(rawCode: string): Promise<string> {
    const recoveryCode = normalizeInstallRecoveryCode(rawCode);
    if (!recoveryCode) throw new Error('Install recovery code is invalid');
    await storage.removeItem(INSTALL_ATTRIBUTION_HANDOFF_STORAGE_KEYS.CLAIMED);
    await storage.setItem(
      INSTALL_ATTRIBUTION_HANDOFF_STORAGE_KEYS.PENDING_CODE,
      recoveryCode,
    );
    return recoveryCode;
  }

  async function getPendingCode(): Promise<string | null> {
    const raw = await storage.getItem(
      INSTALL_ATTRIBUTION_HANDOFF_STORAGE_KEYS.PENDING_CODE,
    );
    return raw ? normalizeInstallRecoveryCode(raw) : null;
  }

  async function redeemPending(
    expectedUserId: string,
  ): Promise<InstallAttributionHandoffResult> {
    const userId = expectedUserId.trim();
    if (!userId) throw new Error('A real authenticated user ID is required');
    const recoveryCode = await getPendingCode();
    if (!recoveryCode) return { status: 'no_pending_code' as const, userId };
    const expectedToken = installRecoveryCodeToTouchToken(recoveryCode);
    if (!expectedToken) throw new Error('Install recovery code is invalid');
    const releaseReservation = await reserveVerifiedToken(expectedToken);
    try {
      const result = await sender(recoveryCode, userId);
      if (!isExactVerifiedTouch(result.touch)
        || result.touch.actp_touch_token !== expectedToken) {
        throw new Error('Install recovery response did not match the submitted journey');
      }
      await applyVerifiedTouch(result.touch);
      await storage.setItem(
        INSTALL_ATTRIBUTION_HANDOFF_STORAGE_KEYS.CLAIMED,
        JSON.stringify({
          status: 'redeemed',
          user_id: userId,
          redeemed_at: new Date().toISOString(),
        } satisfies ClaimedInstallAttribution),
      );
      await storage.removeItem(
        INSTALL_ATTRIBUTION_HANDOFF_STORAGE_KEYS.PENDING_CODE,
      );
      return { status: 'claimed' as const, userId, touch: result.touch };
    } finally {
      releaseReservation();
    }
  }

  return { getPendingCode, redeemPending, savePendingCode };
}
