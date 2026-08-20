export const CONTENT_ATTRIBUTION_FIELDS = [
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_term',
  'utm_content',
  'actp_content_id',
  'actp_published_id',
  'actp_campaign_id',
  'actp_narrative_id',
  'actp_offer_id',
  'actp_series_id',
  'actp_episode_id',
  'actp_experiment_id',
  'actp_variant_id',
] as const;

export type ContentAttributionField = typeof CONTENT_ATTRIBUTION_FIELDS[number];
export type ContentAttributionValues = Partial<Record<ContentAttributionField, string>>;

export type AttributionTouch = ContentAttributionValues & {
  captured_at: string;
  landing_page: string;
  referrer?: string;
};

export interface AttributionStorage {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
}

export interface AttributionSendResult {
  ok: boolean;
  status: number;
}

export type AttributionSender = (
  payload: AttributionIngestPayload,
) => Promise<AttributionSendResult>;

export type AttributionIngestPayload = ContentAttributionValues & {
  expected_user_id: string;
  referrer?: string;
  landing_page: string;
};

export interface AttributionCaptureResult {
  captured: boolean;
  firstTouch: AttributionTouch | null;
  lastTouch: AttributionTouch | null;
}

export interface AttributionPersistResult {
  status: 'persisted' | 'already_persisted' | 'no_attribution';
  userId: string;
}

export const ATTRIBUTION_STORAGE_KEYS = {
  FIRST_TOUCH: '@everreach_attribution_first_touch_v1',
  LAST_TOUCH: '@everreach_attribution_last_touch_v1',
  PERSISTED_USER: '@everreach_attribution_persisted_user_v1',
} as const;

const MAX_ATTRIBUTION_VALUE_LENGTH = 512;
const MAX_URL_VALUE_LENGTH = 2048;
const FALLBACK_ORIGIN = 'https://www.everreach.app';

function cleanValue(value: string | null, maxLength: number): string | undefined {
  if (value === null) return undefined;
  const cleaned = value.trim().slice(0, maxLength);
  return cleaned || undefined;
}

function safeUrl(value: string): URL | null {
  try {
    return new URL(value, FALLBACK_ORIGIN);
  } catch {
    return null;
  }
}

function isTouch(value: unknown): value is AttributionTouch {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Record<string, unknown>;
  return typeof candidate.captured_at === 'string'
    && typeof candidate.landing_page === 'string'
    && CONTENT_ATTRIBUTION_FIELDS.some((field) => typeof candidate[field] === 'string');
}

export function attributionValues(
  source: object,
): ContentAttributionValues {
  const sourceRecord = source as Record<string, unknown>;
  const values: ContentAttributionValues = {};
  for (const field of CONTENT_ATTRIBUTION_FIELDS) {
    const raw = sourceRecord[field];
    if (typeof raw !== 'string') continue;
    const cleaned = cleanValue(raw, MAX_ATTRIBUTION_VALUE_LENGTH);
    if (cleaned) values[field] = cleaned;
  }
  return values;
}

export function parseAttributionUrl(
  rawUrl: string,
  capturedAt: string,
  referrer?: string,
): AttributionTouch | null {
  const parsed = safeUrl(rawUrl);
  if (!parsed) return null;

  const queryValues: Record<string, string> = {};
  for (const field of CONTENT_ATTRIBUTION_FIELDS) {
    const cleaned = cleanValue(parsed.searchParams.get(field), MAX_ATTRIBUTION_VALUE_LENGTH);
    if (cleaned) queryValues[field] = cleaned;
  }
  const values = attributionValues(queryValues);
  if (Object.keys(values).length === 0) return null;

  const cleanedReferrer = cleanValue(referrer ?? null, MAX_URL_VALUE_LENGTH);
  return {
    ...values,
    captured_at: capturedAt,
    landing_page: `${parsed.origin === 'null' ? FALLBACK_ORIGIN : parsed.origin}${parsed.pathname}`
      .slice(0, MAX_URL_VALUE_LENGTH),
    ...(cleanedReferrer ? { referrer: cleanedReferrer } : {}),
  };
}

export function attributionAnalyticsProperties(
  source: object,
): ContentAttributionValues {
  return attributionValues(source);
}

export function buildAttributedDestination(
  destination: string,
  touch: AttributionTouch | null,
): string {
  if (!touch) return destination;
  const parsed = safeUrl(destination);
  if (!parsed) throw new Error('Attribution destination must be a valid URL or absolute path');

  const values = attributionValues(touch);
  for (const field of CONTENT_ATTRIBUTION_FIELDS) {
    const value = values[field];
    if (value) parsed.searchParams.set(field, value);
  }

  const isAbsolute = /^https?:\/\//i.test(destination);
  return isAbsolute
    ? parsed.toString()
    : `${parsed.pathname}${parsed.search}${parsed.hash}`;
}

export function buildAttributionIngestPayload(
  touch: AttributionTouch,
  expectedUserId: string,
): AttributionIngestPayload {
  const userId = expectedUserId.trim();
  if (!userId) throw new Error('A real authenticated user ID is required for attribution');
  return {
    expected_user_id: userId,
    ...attributionValues(touch),
    ...(touch.referrer ? { referrer: touch.referrer } : {}),
    landing_page: touch.landing_page,
  };
}

export class ContentAttributionController {
  private captureQueue: Promise<unknown> = Promise.resolve();

  constructor(
    private readonly storage: AttributionStorage,
    private readonly sender: AttributionSender,
    private readonly now: () => string = () => new Date().toISOString(),
  ) {}

  private async readTouch(key: string): Promise<AttributionTouch | null> {
    const raw = await this.storage.getItem(key);
    if (!raw) return null;
    try {
      const parsed: unknown = JSON.parse(raw);
      return isTouch(parsed) ? parsed : null;
    } catch {
      return null;
    }
  }

  async getFirstTouch(): Promise<AttributionTouch | null> {
    return this.readTouch(ATTRIBUTION_STORAGE_KEYS.FIRST_TOUCH);
  }

  async getLastTouch(): Promise<AttributionTouch | null> {
    return this.readTouch(ATTRIBUTION_STORAGE_KEYS.LAST_TOUCH);
  }

  async captureUrl(rawUrl: string, referrer?: string): Promise<AttributionCaptureResult> {
    const operation = this.captureQueue.then(async () => {
      const candidate = parseAttributionUrl(rawUrl, this.now(), referrer);
      const existingFirst = await this.getFirstTouch();
      if (!candidate) {
        return {
          captured: false,
          firstTouch: existingFirst,
          lastTouch: await this.getLastTouch(),
        };
      }

      const firstTouch = existingFirst ?? candidate;
      if (!existingFirst) {
        await this.storage.setItem(
          ATTRIBUTION_STORAGE_KEYS.FIRST_TOUCH,
          JSON.stringify(firstTouch),
        );
      }
      await this.storage.setItem(
        ATTRIBUTION_STORAGE_KEYS.LAST_TOUCH,
        JSON.stringify(candidate),
      );
      return { captured: true, firstTouch, lastTouch: candidate };
    });
    this.captureQueue = operation.catch(() => undefined);
    return operation;
  }

  async buildDestination(destination: string): Promise<string> {
    const touch = await this.getLastTouch() ?? await this.getFirstTouch();
    return buildAttributedDestination(destination, touch);
  }

  async persistFirstTouch(expectedUserId: string): Promise<AttributionPersistResult> {
    const userId = expectedUserId.trim();
    if (!userId) throw new Error('A real authenticated user ID is required for attribution');

    const touch = await this.getFirstTouch();
    if (!touch) return { status: 'no_attribution', userId };

    const persistedUserId = await this.storage.getItem(
      ATTRIBUTION_STORAGE_KEYS.PERSISTED_USER,
    );
    if (persistedUserId === userId) {
      return { status: 'already_persisted', userId };
    }

    const response = await this.sender(buildAttributionIngestPayload(touch, userId));
    if (!response.ok) {
      throw new Error(`Attribution ingest failed with HTTP ${response.status}`);
    }
    await this.storage.setItem(ATTRIBUTION_STORAGE_KEYS.PERSISTED_USER, userId);
    return { status: 'persisted', userId };
  }
}
