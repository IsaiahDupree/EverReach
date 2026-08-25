const CODE_ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
const CODE_PREFIX = 'ER1';
const CODE_PAYLOAD_LENGTH = 26;
export const DEFAULT_INSTALL_HANDOFF_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;
const MAX_INSTALL_HANDOFF_MAX_AGE_MS = 90 * 24 * 60 * 60 * 1000;
const MAX_CAPTURE_CLOCK_SKEW_MS = 5 * 60 * 1000;

export function installHandoffMaxAgeMs(rawDays: string | undefined): number {
  const parsedDays = rawDays ? Number(rawDays) : Number.NaN;
  if (!Number.isFinite(parsedDays) || parsedDays <= 0) {
    return DEFAULT_INSTALL_HANDOFF_MAX_AGE_MS;
  }
  return Math.min(
    Math.floor(parsedDays * 24 * 60 * 60 * 1000),
    MAX_INSTALL_HANDOFF_MAX_AGE_MS,
  );
}

export function isInstallHandoffCapturedAtRedeemable(
  capturedAt: string,
  nowMs: number,
  maxAgeMs: number,
): boolean {
  const capturedAtMs = Date.parse(capturedAt);
  if (!Number.isFinite(capturedAtMs)) return false;
  if (!Number.isFinite(nowMs) || !Number.isFinite(maxAgeMs) || maxAgeMs <= 0) return false;
  const ageMs = nowMs - capturedAtMs;
  return ageMs >= -MAX_CAPTURE_CLOCK_SKEW_MS && ageMs <= maxAgeMs;
}

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

function encodePayload(bytes: number[]): string {
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

function decodePayload(encoded: string): number[] | null {
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

function normalizedPayload(value: string): string | null {
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

function formatPayload(payload: string): string {
  return `${CODE_PREFIX}-${payload.slice(0, 5)}-${payload.slice(5, 10)}`
    + `-${payload.slice(10, 15)}-${payload.slice(15, 20)}-${payload.slice(20)}`;
}

export function touchTokenToInstallRecoveryCode(token: string): string | null {
  const match = /^touch_([0-9a-f]{8})-([0-9a-f]{4})-([0-9a-f]{4})-([0-9a-f]{4})-([0-9a-f]{12})$/i
    .exec(token.trim());
  if (!match) return null;
  const payload = encodePayload(hexToBytes(match.slice(1).join('')));
  return payload.length === CODE_PAYLOAD_LENGTH ? formatPayload(payload) : null;
}

export function installRecoveryCodeToTouchToken(code: string): string | null {
  const payload = normalizedPayload(code);
  if (!payload) return null;
  const bytes = decodePayload(payload);
  if (!bytes) return null;
  const hex = bytesToHex(bytes);
  return `touch_${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}`
    + `-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
