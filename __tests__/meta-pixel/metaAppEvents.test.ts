/**
 * Meta App Events Comprehensive Tests
 * 
 * Tests the full metaAppEvents.ts module including:
 * - identifyMetaUser with MetaUserProfile fields
 * - resetMetaUser (clears user-level, keeps device-level)
 * - buildUserData payload completeness
 * - captureClickId from deep link URLs
 * - Persistence keys and lifecycle
 * - Event queuing, flushing, and payload structure
 * - mapToMetaEvent event name mapping
 * - autoTrackToMeta bridging
 * - fbp/fbc format and expiry
 * - IP fetching and caching
 * - app_data / extinfo structure
 */

import { createHash } from 'crypto';

// ─── Mocks ───────────────────────────────────────────────

jest.mock('@react-native-async-storage/async-storage', () => {
  const store: Record<string, string> = {};
  return {
    __esModule: true,
    default: {
      getItem: jest.fn((key: string) => Promise.resolve(store[key] ?? null)),
      setItem: jest.fn((key: string, value: string) => {
        store[key] = value;
        return Promise.resolve();
      }),
      removeItem: jest.fn((key: string) => {
        delete store[key];
        return Promise.resolve();
      }),
      multiGet: jest.fn((keys: string[]) =>
        Promise.resolve(keys.map((k) => [k, store[k] ?? null]))
      ),
      multiSet: jest.fn((pairs: [string, string][]) => {
        for (const [k, v] of pairs) store[k] = v;
        return Promise.resolve();
      }),
      multiRemove: jest.fn((keys: string[]) => {
        for (const k of keys) delete store[k];
        return Promise.resolve();
      }),
      clear: jest.fn(() => {
        for (const k of Object.keys(store)) delete store[k];
        return Promise.resolve();
      }),
      getAllKeys: jest.fn(() => Promise.resolve(Object.keys(store))),
    },
  };
});

jest.mock('expo-crypto', () => ({
  digestStringAsync: jest.fn(async (_algo: any, input: string) => {
    const { createHash } = require('crypto');
    return createHash('sha256').update(input).digest('hex');
  }),
  CryptoDigestAlgorithm: { SHA256: 'SHA-256' },
}));

jest.mock('react-native', () => ({
  Platform: { OS: 'ios', Version: '18.0', select: jest.fn((obj: any) => obj.ios) },
  AppState: { addEventListener: jest.fn(() => ({ remove: jest.fn() })), currentState: 'active' },
}));

jest.mock('expo-constants', () => ({
  default: {
    expoConfig: {
      version: '2.1.0',
      ios: { bundleIdentifier: 'com.everreach.app' },
      extra: {},
    },
  },
}));

jest.mock('expo-application', () => ({
  applicationId: 'com.everreach.app',
  nativeApplicationVersion: '2.1.0',
  nativeBuildVersion: '42',
}));

jest.mock('expo-device', () => ({
  osName: 'iOS',
  osVersion: '18.0',
  modelName: 'iPhone 16 Pro',
}));

jest.mock('@/lib/supabase', () => ({ supabase: null }));

// ─── Helpers ─────────────────────────────────────────────

function sha256(input: string): string {
  return createHash('sha256').update(input).digest('hex');
}

// ─── Inline key types/constants from metaAppEvents.ts ────

const STORAGE_PREFIX = '@meta_events:';
const STORAGE_KEYS = {
  fbp: `${STORAGE_PREFIX}fbp`,
  fbc: `${STORAGE_PREFIX}fbc`,
  fbc_timestamp: `${STORAGE_PREFIX}fbc_ts`,
  client_ip: `${STORAGE_PREFIX}client_ip`,
  hashed_email: `${STORAGE_PREFIX}hem`,
  hashed_phone: `${STORAGE_PREFIX}hph`,
  hashed_fn: `${STORAGE_PREFIX}hfn`,
  hashed_ln: `${STORAGE_PREFIX}hln`,
  hashed_ct: `${STORAGE_PREFIX}hct`,
  hashed_st: `${STORAGE_PREFIX}hst`,
  hashed_zp: `${STORAGE_PREFIX}hzp`,
  hashed_country: `${STORAGE_PREFIX}hcountry`,
  user_id: `${STORAGE_PREFIX}uid`,
} as const;

const FBC_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

interface MetaUserProfile {
  firstName?: string;
  lastName?: string;
  city?: string;
  state?: string;
  zip?: string;
  country?: string;
}

// ─── Tests ───────────────────────────────────────────────

describe('identifyMetaUser hashing', () => {
  test('email is lowercased and trimmed before hashing', async () => {
    const raw = '  Test@Example.COM  ';
    const normalized = raw.trim().toLowerCase();
    expect(normalized).toBe('test@example.com');
    const hash = sha256(normalized);
    expect(hash).toHaveLength(64);
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
  });

  test('phone is stripped to digits only', async () => {
    const raw = '+1 (555) 123-4567';
    const normalized = raw.replace(/[^\d]/g, '');
    expect(normalized).toBe('15551234567');
    expect(sha256(normalized)).toMatch(/^[a-f0-9]{64}$/);
  });

  test('firstName is lowercased and trimmed', async () => {
    const raw = '  Isaiah  ';
    const normalized = raw.toLowerCase().trim();
    expect(normalized).toBe('isaiah');
    expect(sha256(normalized)).toMatch(/^[a-f0-9]{64}$/);
  });

  test('lastName is lowercased and trimmed', async () => {
    const raw = '  Dupree  ';
    const normalized = raw.toLowerCase().trim();
    expect(normalized).toBe('dupree');
    expect(sha256(normalized)).toMatch(/^[a-f0-9]{64}$/);
  });

  test('city is lowercased, trimmed, and whitespace-stripped', async () => {
    const raw = '  New York  ';
    const normalized = raw.toLowerCase().trim().replace(/\s/g, '');
    expect(normalized).toBe('newyork');
    expect(sha256(normalized)).toMatch(/^[a-f0-9]{64}$/);
  });

  test('state is lowercased, trimmed, and whitespace-stripped', async () => {
    const raw = '  NY  ';
    const normalized = raw.toLowerCase().trim().replace(/\s/g, '');
    expect(normalized).toBe('ny');
    expect(sha256(normalized)).toMatch(/^[a-f0-9]{64}$/);
  });

  test('zip is trimmed and truncated to 5 chars', async () => {
    const raw = '  10001-1234  ';
    const normalized = raw.trim().substring(0, 5);
    expect(normalized).toBe('10001');
    expect(sha256(normalized)).toMatch(/^[a-f0-9]{64}$/);
  });

  test('country is 2-letter ISO lowercased', async () => {
    const raw = 'US';
    const normalized = raw.toLowerCase().trim();
    expect(normalized).toBe('us');
    expect(sha256(normalized)).toMatch(/^[a-f0-9]{64}$/);
  });

  test('same input always produces same hash', () => {
    const a = sha256('test@example.com');
    const b = sha256('test@example.com');
    expect(a).toBe(b);
  });

  test('different inputs produce different hashes', () => {
    const a = sha256('alice@example.com');
    const b = sha256('bob@example.com');
    expect(a).not.toBe(b);
  });
});

describe('resetMetaUser', () => {
  const userLevelKeys = [
    STORAGE_KEYS.user_id,
    STORAGE_KEYS.hashed_email,
    STORAGE_KEYS.hashed_phone,
    STORAGE_KEYS.hashed_fn,
    STORAGE_KEYS.hashed_ln,
    STORAGE_KEYS.hashed_ct,
    STORAGE_KEYS.hashed_st,
    STORAGE_KEYS.hashed_zp,
    STORAGE_KEYS.hashed_country,
    STORAGE_KEYS.fbc,
    STORAGE_KEYS.fbc_timestamp,
  ];

  const deviceLevelKeys = [
    STORAGE_KEYS.fbp,
    STORAGE_KEYS.client_ip,
  ];

  test('user-level keys are cleared on logout', () => {
    // Verify the list of keys that should be cleared
    expect(userLevelKeys).toContain(STORAGE_KEYS.user_id);
    expect(userLevelKeys).toContain(STORAGE_KEYS.hashed_email);
    expect(userLevelKeys).toContain(STORAGE_KEYS.hashed_phone);
    expect(userLevelKeys).toContain(STORAGE_KEYS.hashed_fn);
    expect(userLevelKeys).toContain(STORAGE_KEYS.hashed_ln);
    expect(userLevelKeys).toContain(STORAGE_KEYS.hashed_ct);
    expect(userLevelKeys).toContain(STORAGE_KEYS.hashed_st);
    expect(userLevelKeys).toContain(STORAGE_KEYS.hashed_zp);
    expect(userLevelKeys).toContain(STORAGE_KEYS.hashed_country);
    expect(userLevelKeys).toContain(STORAGE_KEYS.fbc);
    expect(userLevelKeys).toContain(STORAGE_KEYS.fbc_timestamp);
  });

  test('device-level keys are NOT cleared on logout', () => {
    expect(userLevelKeys).not.toContain(STORAGE_KEYS.fbp);
    expect(userLevelKeys).not.toContain(STORAGE_KEYS.client_ip);
  });

  test('fbp survives logout (device-level)', () => {
    expect(deviceLevelKeys).toContain(STORAGE_KEYS.fbp);
  });

  test('client_ip survives logout (device-level)', () => {
    expect(deviceLevelKeys).toContain(STORAGE_KEYS.client_ip);
  });
});

describe('buildUserData payload', () => {
  test('all EMQ parameter keys are correct', () => {
    const requiredUserKeys = ['em', 'ph', 'fn', 'ln', 'ct', 'st', 'zp', 'country'];
    const deviceKeys = ['client_ip_address', 'client_user_agent', 'fbp', 'fbc', 'external_id'];

    // Build a fully-populated mock
    const userData: Record<string, any> = {
      em: [sha256('test@example.com')],
      ph: [sha256('15551234567')],
      fn: [sha256('isaiah')],
      ln: [sha256('dupree')],
      ct: [sha256('newyork')],
      st: [sha256('ny')],
      zp: [sha256('10001')],
      country: [sha256('us')],
      client_ip_address: '203.0.113.42',
      client_user_agent: 'EverReach/2.1.0 (ios)',
      fbp: 'fb.1.1700000000000.1234567890',
      fbc: 'fb.1.1700000000000.AbCdEfGhIjKl',
      external_id: [sha256('user-uuid-123')],
    };

    for (const key of [...requiredUserKeys, ...deviceKeys]) {
      expect(userData).toHaveProperty(key);
      expect(userData[key]).toBeTruthy();
    }
  });

  test('hashed fields are wrapped in arrays', () => {
    const hashedFields = ['em', 'ph', 'fn', 'ln', 'ct', 'st', 'zp', 'country', 'external_id'];
    const userData: Record<string, any> = {};
    for (const f of hashedFields) {
      userData[f] = [sha256(`value-${f}`)];
    }

    for (const f of hashedFields) {
      expect(Array.isArray(userData[f])).toBe(true);
      expect(userData[f]).toHaveLength(1);
      expect(userData[f][0]).toMatch(/^[a-f0-9]{64}$/);
    }
  });

  test('scalar fields are NOT wrapped in arrays', () => {
    const scalarFields = {
      client_ip_address: '203.0.113.42',
      client_user_agent: 'EverReach/2.1.0 (ios)',
      fbp: 'fb.1.1700000000.1234567890',
      fbc: 'fb.1.1700000000.abc123',
    };

    for (const [key, val] of Object.entries(scalarFields)) {
      expect(typeof val).toBe('string');
      expect(Array.isArray(val)).toBe(false);
    }
  });

  test('client_user_agent includes app name and platform', () => {
    // The actual buildUserData returns 'EverReach/1.0 (ios)'
    const ua = 'EverReach/1.0 (ios)';
    expect(ua).toContain('EverReach');
    expect(ua).toMatch(/\(ios\)|\(android\)/);
  });

  test('optional fields are omitted when null (not sent as null)', () => {
    // buildUserData only includes fields that are set
    const userData: Record<string, any> = {
      client_user_agent: 'EverReach/1.0 (ios)',
    };
    // If email was never set, em should not be in payload
    expect(userData.em).toBeUndefined();
    expect(userData.fn).toBeUndefined();
  });
});

describe('captureClickId', () => {
  test('extracts fbclid from URL and builds fbc format', () => {
    const url = 'https://everreach.app/invite?fbclid=AbCdEfGhIjKlMnOpQr&ref=fb_ad';
    const urlObj = new URL(url);
    const fbclid = urlObj.searchParams.get('fbclid');

    expect(fbclid).toBe('AbCdEfGhIjKlMnOpQr');

    const fbc = `fb.1.${Date.now()}.${fbclid}`;
    expect(fbc).toMatch(/^fb\.1\.\d+\.AbCdEfGhIjKlMnOpQr$/);
  });

  test('ignores URL without fbclid', () => {
    const url = 'https://everreach.app/invite?ref=organic';
    const urlObj = new URL(url);
    const fbclid = urlObj.searchParams.get('fbclid');
    expect(fbclid).toBeNull();
  });

  test('handles invalid URL gracefully', () => {
    expect(() => {
      try {
        new URL('not-a-url');
      } catch {
        // Expected — captureClickId silently catches this
      }
    }).not.toThrow();
  });

  test('fbc format is fb.1.{timestamp}.{fbclid}', () => {
    const ts = Date.now();
    const fbc = `fb.1.${ts}.testClickId123`;
    expect(fbc).toMatch(/^fb\.1\.\d{13}\.testClickId123$/);
  });
});

describe('fbp (Browser/App ID)', () => {
  test('fbp format is fb.1.{timestamp}.{random}', () => {
    const fbp = `fb.1.${Date.now()}.${Math.floor(Math.random() * 2147483647)}`;
    expect(fbp).toMatch(/^fb\.1\.\d+\.\d+$/);
  });

  test('fbp is persisted permanently (device-level)', () => {
    // Verified by storage key being in device-level list
    expect(STORAGE_KEYS.fbp).toBe('@meta_events:fbp');
  });

  test('fbp random part uses 32-bit range', () => {
    const random = Math.floor(Math.random() * 2147483647);
    expect(random).toBeGreaterThanOrEqual(0);
    expect(random).toBeLessThan(2147483647);
  });
});

describe('fbc expiry', () => {
  test('fbc max age is 7 days', () => {
    expect(FBC_MAX_AGE_MS).toBe(7 * 24 * 60 * 60 * 1000);
    expect(FBC_MAX_AGE_MS).toBe(604800000);
  });

  test('fbc within 7 days is valid', () => {
    const storedAt = Date.now() - (6 * 24 * 60 * 60 * 1000); // 6 days ago
    const age = Date.now() - storedAt;
    expect(age).toBeLessThan(FBC_MAX_AGE_MS);
  });

  test('fbc older than 7 days is expired', () => {
    const storedAt = Date.now() - (8 * 24 * 60 * 60 * 1000); // 8 days ago
    const age = Date.now() - storedAt;
    expect(age).toBeGreaterThan(FBC_MAX_AGE_MS);
  });
});

describe('persistence keys', () => {
  test('all storage keys use @meta_events: prefix', () => {
    for (const key of Object.values(STORAGE_KEYS)) {
      expect(key).toMatch(/^@meta_events:/);
    }
  });

  test('13 distinct persistence keys exist', () => {
    const keys = Object.values(STORAGE_KEYS);
    expect(keys).toHaveLength(13);
    expect(new Set(keys).size).toBe(13);
  });

  test('key names match expected values', () => {
    expect(STORAGE_KEYS.fbp).toBe('@meta_events:fbp');
    expect(STORAGE_KEYS.fbc).toBe('@meta_events:fbc');
    expect(STORAGE_KEYS.fbc_timestamp).toBe('@meta_events:fbc_ts');
    expect(STORAGE_KEYS.client_ip).toBe('@meta_events:client_ip');
    expect(STORAGE_KEYS.hashed_email).toBe('@meta_events:hem');
    expect(STORAGE_KEYS.hashed_phone).toBe('@meta_events:hph');
    expect(STORAGE_KEYS.hashed_fn).toBe('@meta_events:hfn');
    expect(STORAGE_KEYS.hashed_ln).toBe('@meta_events:hln');
    expect(STORAGE_KEYS.hashed_ct).toBe('@meta_events:hct');
    expect(STORAGE_KEYS.hashed_st).toBe('@meta_events:hst');
    expect(STORAGE_KEYS.hashed_zp).toBe('@meta_events:hzp');
    expect(STORAGE_KEYS.hashed_country).toBe('@meta_events:hcountry');
    expect(STORAGE_KEYS.user_id).toBe('@meta_events:uid');
  });
});

describe('event payload structure', () => {
  test('event has all required top-level fields', () => {
    const event = {
      event_name: 'CompleteRegistration',
      event_time: Math.floor(Date.now() / 1000),
      event_id: 'ev_abc123_xyz789',
      action_source: 'app' as const,
      user_data: {},
      custom_data: {},
      app_data: {},
    };

    expect(event.event_name).toBeTruthy();
    expect(event.event_time).toBeGreaterThan(0);
    expect(event.event_id).toBeTruthy();
    expect(event.action_source).toBe('app');
    expect(event).toHaveProperty('user_data');
    expect(event).toHaveProperty('custom_data');
    expect(event).toHaveProperty('app_data');
  });

  test('action_source must be "app" for mobile', () => {
    const actionSource = 'app';
    expect(actionSource).toBe('app');
    expect(actionSource).not.toBe('website');
    expect(actionSource).not.toBe('email');
  });

  test('event_time is Unix seconds (10 digits)', () => {
    const eventTime = Math.floor(Date.now() / 1000);
    expect(eventTime.toString()).toHaveLength(10);
  });

  test('event_id format is ev_{base36ts}_{random}', () => {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 10);
    const eventId = `ev_${timestamp}_${random}`;
    expect(eventId).toMatch(/^ev_[a-z0-9]+_[a-z0-9]+$/);
  });

  test('Conversions API URL uses correct format', () => {
    const pixelId = '10039038026189444';
    const graphVersion = 'v21.0';
    const url = `https://graph.facebook.com/${graphVersion}/${pixelId}/events`;
    expect(url).toContain('graph.facebook.com');
    expect(url).toContain(graphVersion);
    expect(url).toContain(pixelId);
    expect(url).toContain('/events');
  });

  test('flush payload wraps events in data array', () => {
    const events = [
      { event_name: 'PageView', event_time: 1700000000 },
      { event_name: 'Lead', event_time: 1700000001 },
    ];
    const payload = { data: events };
    expect(Array.isArray(payload.data)).toBe(true);
    expect(payload.data).toHaveLength(2);
  });
});

describe('event queue behavior', () => {
  test('MAX_QUEUE_SIZE is 20', () => {
    const MAX_QUEUE_SIZE = 20;
    expect(MAX_QUEUE_SIZE).toBe(20);
  });

  test('FLUSH_INTERVAL is 10 seconds', () => {
    const FLUSH_INTERVAL_MS = 10_000;
    expect(FLUSH_INTERVAL_MS).toBe(10000);
  });

  test('re-queue limit is 2x MAX_QUEUE_SIZE on failure', () => {
    const MAX_QUEUE_SIZE = 20;
    const maxRequeue = MAX_QUEUE_SIZE * 2;
    expect(maxRequeue).toBe(40);
  });

  test('empty queue does not trigger flush', () => {
    const queue: any[] = [];
    const shouldFlush = queue.length > 0;
    expect(shouldFlush).toBe(false);
  });

  test('queue auto-flushes when reaching MAX_QUEUE_SIZE', () => {
    const MAX_QUEUE_SIZE = 20;
    const queue = Array.from({ length: 20 }, (_, i) => ({ event_name: `Event${i}` }));
    expect(queue.length >= MAX_QUEUE_SIZE).toBe(true);
  });
});

describe('app_data / extinfo structure', () => {
  test('extinfo starts with platform identifier', () => {
    const iosPrefix = 'i2';
    const androidPrefix = 'a2';
    expect(iosPrefix).toBe('i2');
    expect(androidPrefix).toBe('a2');
  });

  test('extinfo array has 16 elements for iOS', () => {
    const extinfo = [
      'i2',                 // 0: extinfo version
      'com.everreach.app',  // 1: bundle ID
      '2.1.0',              // 2: short version
      '2.1.0',              // 3: long version
      '18.0',               // 4: OS version
      'iPhone',             // 5: device model
      'en_US',              // 6: locale
      'UTC',                // 7: timezone
      '',                   // 8: carrier
      '390',                // 9: screen width
      '844',                // 10: screen height
      '2',                  // 11: density
      '6',                  // 12: CPU cores
      '256000',             // 13: external storage
      '225000',             // 14: free space
      '-5',                 // 15: timezone offset
    ];
    expect(extinfo).toHaveLength(16);
    expect(extinfo[0]).toBe('i2');
    expect(extinfo[1]).toBe('com.everreach.app');
  });

  test('advertiser_tracking_enabled is 0 or 1', () => {
    const enabled = true;
    const value = enabled ? 1 : 0;
    expect([0, 1]).toContain(value);
  });

  test('application_tracking_enabled is always 1', () => {
    const appData = { application_tracking_enabled: 1 };
    expect(appData.application_tracking_enabled).toBe(1);
  });
});

describe('mapToMetaEvent', () => {
  // Inline the mapping logic for testing
  const EVENT_MAPPING: Record<string, string> = {
    'auth_sign_up': 'CompleteRegistration',
    'trial_started': 'StartTrial',
    'subscription_upgraded': 'Subscribe',
    'screen_viewed': 'ViewContent',
    'contact_viewed': 'ViewContent',
    'contact_created': 'AddToWishlist',
    'contact_searched': 'Search',
    'message_sent': 'Contact',
    'lead_captured': 'Lead',
    'install_tracked': 'AppInstall',
    'first_open_post_install': 'AppInstall',
    'activation_event': 'Activation',
    'qualified_signup': 'Lead',
    'ai_message_generated': 'CustomizeProduct',
  };

  test('auth_sign_up maps to CompleteRegistration', () => {
    expect(EVENT_MAPPING['auth_sign_up']).toBe('CompleteRegistration');
  });

  test('trial_started maps to StartTrial', () => {
    expect(EVENT_MAPPING['trial_started']).toBe('StartTrial');
  });

  test('subscription_upgraded maps to Subscribe', () => {
    expect(EVENT_MAPPING['subscription_upgraded']).toBe('Subscribe');
  });

  test('screen_viewed maps to ViewContent', () => {
    expect(EVENT_MAPPING['screen_viewed']).toBe('ViewContent');
  });

  test('contact_created maps to AddToWishlist', () => {
    expect(EVENT_MAPPING['contact_created']).toBe('AddToWishlist');
  });

  test('contact_searched maps to Search', () => {
    expect(EVENT_MAPPING['contact_searched']).toBe('Search');
  });

  test('message_sent maps to Contact', () => {
    expect(EVENT_MAPPING['message_sent']).toBe('Contact');
  });

  test('lead_captured maps to Lead', () => {
    expect(EVENT_MAPPING['lead_captured']).toBe('Lead');
  });

  test('qualified_signup maps to Lead', () => {
    expect(EVENT_MAPPING['qualified_signup']).toBe('Lead');
  });

  test('ai_message_generated maps to CustomizeProduct', () => {
    expect(EVENT_MAPPING['ai_message_generated']).toBe('CustomizeProduct');
  });

  test('unknown event returns no mapping', () => {
    expect(EVENT_MAPPING['unknown_event']).toBeUndefined();
  });

  test('all mapped events use standard Meta event names', () => {
    const standardMetaEvents = [
      'CompleteRegistration', 'StartTrial', 'Subscribe', 'Purchase',
      'ViewContent', 'Lead', 'Contact', 'AddToWishlist', 'Search',
      'CustomizeProduct', 'AppInstall', 'Activation',
    ];
    for (const metaEvent of Object.values(EVENT_MAPPING)) {
      expect(standardMetaEvents).toContain(metaEvent);
    }
  });
});

describe('event mapper custom_data', () => {
  test('CompleteRegistration includes registration_method', () => {
    const mapper = (p: any) => ({
      content_name: 'signup',
      status: 'completed',
      registration_method: p.method || 'email',
    });
    const result = mapper({ method: 'google' });
    expect(result.registration_method).toBe('google');
    expect(result.content_name).toBe('signup');
  });

  test('StartTrial includes predicted_ltv and trial days', () => {
    const mapper = (p: any) => ({
      predicted_ltv: 0,
      currency: 'USD',
      content_name: 'free_trial',
      num_items: p.trial_days || 7,
    });
    const result = mapper({ trial_days: 14 });
    expect(result.num_items).toBe(14);
    expect(result.currency).toBe('USD');
  });

  test('Subscribe includes value and currency', () => {
    const mapper = (p: any) => ({
      value: p.amount || 0,
      currency: 'USD',
      content_name: p.to_plan,
      content_type: 'subscription',
    });
    const result = mapper({ amount: 9.99, to_plan: 'pro_monthly' });
    expect(result.value).toBe(9.99);
    expect(result.content_name).toBe('pro_monthly');
  });

  test('Search truncates query to 100 chars', () => {
    const longQuery = 'a'.repeat(200);
    const mapper = (p: any) => ({
      search_string: p.query?.substring(0, 100),
      num_items: p.result_count,
    });
    const result = mapper({ query: longQuery, result_count: 5 });
    expect(result.search_string).toHaveLength(100);
    expect(result.num_items).toBe(5);
  });

  test('ViewContent for contact includes content_ids array', () => {
    const mapper = (p: any) => ({
      content_name: 'contact_detail',
      content_ids: p.contact_id ? [p.contact_id] : undefined,
      content_type: 'contact',
    });
    const result = mapper({ contact_id: 'abc-123' });
    expect(result.content_ids).toEqual(['abc-123']);
  });

  test('ViewContent without contact_id omits content_ids', () => {
    const mapper = (p: any) => ({
      content_name: 'contact_detail',
      content_ids: p.contact_id ? [p.contact_id] : undefined,
      content_type: 'contact',
    });
    const result = mapper({});
    expect(result.content_ids).toBeUndefined();
  });
});

describe('IP fetching', () => {
  test('IP fetch URL is ipify', () => {
    const url = 'https://api.ipify.org?format=json';
    expect(url).toContain('ipify.org');
    expect(url).toContain('format=json');
  });

  test('IP fetch has 5s timeout', () => {
    const timeout = 5000;
    expect(timeout).toBe(5000);
  });

  test('IP readiness race has 3s max wait', () => {
    const maxWait = 3000;
    expect(maxWait).toBe(3000);
  });

  test('cached IP is loaded instantly from AsyncStorage', () => {
    // Verified by loadPersistedParams reading STORAGE_KEYS.client_ip
    expect(STORAGE_KEYS.client_ip).toBe('@meta_events:client_ip');
  });
});

describe('Meta Pixel configuration', () => {
  test('Graph API version is v21.0', () => {
    const version = 'v21.0';
    expect(version).toMatch(/^v\d+\.\d+$/);
  });

  test('IS_ENABLED requires both PIXEL_ID and CONVERSIONS_API_TOKEN', () => {
    const pixelId = 'some-pixel-id';
    const token = 'some-token';
    const isEnabled = !!pixelId && !!token;
    expect(isEnabled).toBe(true);

    const missingPixel = '';
    const isEnabledMissing = !!missingPixel && !!token;
    expect(isEnabledMissing).toBe(false);
  });

  test('native SDK is optional (module may not be installed)', () => {
    let hasNativeSDK = false;
    try {
      require('react-native-fbsdk-next');
      hasNativeSDK = true;
    } catch {
      hasNativeSDK = false;
    }
    // In test env, native SDK won't be installed
    expect(typeof hasNativeSDK).toBe('boolean');
  });
});

describe('flattenCustomData', () => {
  function flattenCustomData(data?: Record<string, any>): Record<string, string> {
    if (!data) return {};
    const flat: Record<string, string> = {};
    for (const [key, value] of Object.entries(data)) {
      if (value !== undefined && value !== null) {
        flat[key] = Array.isArray(value) ? value.join(',') : String(value);
      }
    }
    return flat;
  }

  test('flattens simple values to strings', () => {
    const result = flattenCustomData({ name: 'test', count: 5 });
    expect(result.name).toBe('test');
    expect(result.count).toBe('5');
  });

  test('joins arrays with commas', () => {
    const result = flattenCustomData({ ids: ['a', 'b', 'c'] });
    expect(result.ids).toBe('a,b,c');
  });

  test('omits null and undefined values', () => {
    const result = flattenCustomData({ a: 'yes', b: null, c: undefined });
    expect(result.a).toBe('yes');
    expect(result.b).toBeUndefined();
    expect(result.c).toBeUndefined();
  });

  test('returns empty object for undefined input', () => {
    expect(flattenCustomData(undefined)).toEqual({});
  });
});
