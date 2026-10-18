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
  'actp_source_platform',
  'actp_series_id',
  'actp_episode_id',
  'actp_experiment_id',
  'actp_variant_id',
  'actp_touch_token',
  'actp_publication_claim',
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

export type AttributionTouchIssue = {
  touchToken: string;
  capturedAt: string;
};

export type AttributionTouchTokenFactory = (
  touch: AttributionTouch,
) => AttributionTouchIssue | string | null | Promise<AttributionTouchIssue | string | null>;

export type AttributionIngestPayload = ContentAttributionValues & {
  expected_user_id: string;
  captured_at?: string;
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

export function isVerifiedAttributionTouch(
  value: unknown,
): value is AttributionTouch {
  if (!isTouch(value)) return false;
  const candidate = value as Record<string, unknown>;
  return [
    'actp_content_id',
    'actp_published_id',
    'actp_campaign_id',
    'actp_offer_id',
    'actp_source_platform',
    'actp_touch_token',
  ].every((field) => (
    typeof candidate[field] === 'string'
    && candidate[field].trim().length > 0
  ));
}

function persistenceMarker(touch: AttributionTouch, userId: string): string {
  const token = touch.actp_touch_token;
  return JSON.stringify({
    attribution_key: token
      ? `verified:${token}`
      : `provisional:${touch.captured_at}:${touch.landing_page}`,
    user_id: userId,
  });
}

function markerMatches(
  raw: string | null,
  touch: AttributionTouch,
  userId: string,
): boolean {
  if (!raw) return false;
  if (raw === userId) return !isVerifiedAttributionTouch(touch);
  try {
    return raw === persistenceMarker(touch, userId);
  } catch {
    return false;
  }
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
  const values = attributionValues(source);
  delete values.actp_publication_claim;
  return values;
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
  const values = attributionValues(touch);
  delete values.actp_publication_claim;
  if (!values.actp_touch_token) {
    for (const field of CONTENT_ATTRIBUTION_FIELDS) {
      if (field.startsWith('actp_')) delete values[field];
    }
  }
  return {
    expected_user_id: userId,
    ...values,
    ...(values.actp_touch_token ? { captured_at: touch.captured_at } : {}),
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
    private readonly createTouchToken: AttributionTouchTokenFactory = () => null,
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
      let candidate = parseAttributionUrl(rawUrl, this.now(), referrer);
      const existingFirst = await this.getFirstTouch();
      const existingLast = await this.getLastTouch();
      if (candidate) {
        delete candidate.actp_touch_token;
        const candidateValues = attributionValues(candidate);
        delete candidateValues.actp_touch_token;
        delete candidateValues.actp_publication_claim;
        const lastValues = existingLast ? attributionValues(existingLast) : null;
        if (lastValues) {
          delete lastValues.actp_touch_token;
          delete lastValues.actp_publication_claim;
        }
        const sameTouch = existingLast
          && existingLast.landing_page === candidate.landing_page
          && JSON.stringify(lastValues) === JSON.stringify(candidateValues);
        if (sameTouch && existingLast.actp_touch_token) {
          candidate = {
            ...candidate,
            captured_at: existingLast.captured_at,
            actp_touch_token: existingLast.actp_touch_token,
          };
        } else if (
          candidate.actp_content_id
          && candidate.actp_published_id
          && candidate.actp_campaign_id
          && candidate.actp_offer_id
          && candidate.actp_source_platform
          && candidate.actp_publication_claim
        ) {
          const issued = await this.createTouchToken(candidate);
          const issuedToken = cleanValue(
            typeof issued === 'string' ? issued : issued?.touchToken ?? null,
            MAX_ATTRIBUTION_VALUE_LENGTH,
          );
          if (issuedToken) {
            candidate = {
              ...candidate,
              captured_at: typeof issued === 'object' && issued?.capturedAt
                ? issued.capturedAt
                : candidate.captured_at,
              actp_touch_token: issuedToken,
            };
            delete candidate.actp_publication_claim;
          }
        }
        if (candidate.actp_touch_token) delete candidate.actp_publication_claim;
      }
      if (!candidate) {
        return {
          captured: false,
          firstTouch: existingFirst,
          lastTouch: existingLast,
        };
      }

      const upgradesProvisionalFirst = Boolean(
        existingFirst
        && !isVerifiedAttributionTouch(existingFirst)
        && isVerifiedAttributionTouch(candidate),
      );
      const firstTouch = !existingFirst || upgradesProvisionalFirst
        ? candidate
        : existingFirst;
      if (!existingFirst || upgradesProvisionalFirst) {
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

  async acceptVerifiedTouch(touch: AttributionTouch): Promise<void> {
    if (!isVerifiedAttributionTouch(touch)) {
      throw new Error('Recovered attribution must contain one complete verified journey');
    }
    const verified: AttributionTouch = {
      ...attributionValues(touch),
      captured_at: touch.captured_at,
      landing_page: touch.landing_page.slice(0, MAX_URL_VALUE_LENGTH),
      ...(touch.referrer
        ? { referrer: touch.referrer.slice(0, MAX_URL_VALUE_LENGTH) }
        : {}),
    };
    delete verified.actp_publication_claim;
    const existingFirst = await this.getFirstTouch();
    if (isVerifiedAttributionTouch(existingFirst)
      && existingFirst.actp_touch_token !== verified.actp_touch_token) {
      throw new Error('A different verified first-touch journey is already stored');
    }
    if (!isVerifiedAttributionTouch(existingFirst)) {
      await this.storage.setItem(
        ATTRIBUTION_STORAGE_KEYS.FIRST_TOUCH,
        JSON.stringify(verified),
      );
    }
    await this.storage.setItem(
      ATTRIBUTION_STORAGE_KEYS.LAST_TOUCH,
      JSON.stringify(verified),
    );
  }

  private async assertCanAcceptVerifiedToken(touchToken: string): Promise<void> {
    const token = cleanValue(touchToken, MAX_ATTRIBUTION_VALUE_LENGTH);
    if (!token) throw new Error('A verified attribution token is required');
    const existingFirst = await this.getFirstTouch();
    if (isVerifiedAttributionTouch(existingFirst)
      && existingFirst.actp_touch_token !== token) {
      throw new Error('A different verified first-touch journey is already stored');
    }
  }

  async reserveVerifiedToken(touchToken: string): Promise<() => void> {
    let releaseHold: () => void = () => undefined;
    const hold = new Promise<void>((resolve) => {
      releaseHold = resolve;
    });
    const acquired = this.captureQueue.then(async () => {
      await this.assertCanAcceptVerifiedToken(touchToken);
    });
    this.captureQueue = acquired
      .then(() => hold)
      .catch(() => undefined);
    await acquired;
    let released = false;
    return () => {
      if (released) return;
      released = true;
      releaseHold();
    };
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

    const persistedMarker = await this.storage.getItem(
      ATTRIBUTION_STORAGE_KEYS.PERSISTED_USER,
    );
    if (markerMatches(persistedMarker, touch, userId)) {
      return { status: 'already_persisted', userId };
    }

    const response = await this.sender(buildAttributionIngestPayload(touch, userId));
    if (!response.ok) {
      throw new Error(`Attribution ingest failed with HTTP ${response.status}`);
    }
    await this.storage.setItem(
      ATTRIBUTION_STORAGE_KEYS.PERSISTED_USER,
      persistenceMarker(touch, userId),
    );
    return { status: 'persisted', userId };
  }
}
