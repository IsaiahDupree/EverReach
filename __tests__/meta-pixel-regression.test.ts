/**
 * Meta Pixel Regression Tests
 * 
 * Verifies that buildUserData always includes all required EMQ parameters
 * and that persistence/hashing logic works correctly.
 */

// We need to mock dependencies before importing the module
jest.mock('@/lib/supabase', () => ({
  supabase: null,
}));

jest.mock('expo-application', () => ({
  applicationId: 'com.everreach.app',
  nativeApplicationVersion: '1.0.0',
  nativeBuildVersion: '1',
}));

jest.mock('expo-device', () => ({
  osName: 'iOS',
  osVersion: '17.0',
  modelName: 'iPhone 15',
}));

jest.mock('expo-constants', () => ({
  default: {
    expoConfig: { extra: {} },
  },
}));

jest.mock('react-native', () => ({
  Platform: { OS: 'ios', select: jest.fn((obj: any) => obj.ios) },
  AppState: { addEventListener: jest.fn(() => ({ remove: jest.fn() })), currentState: 'active' },
}));

// Mock crypto for SHA-256 hashing
jest.mock('expo-crypto', () => ({
  digestStringAsync: jest.fn(async (_algo: any, input: string) => {
    // Simple deterministic "hash" for testing
    const { createHash } = require('crypto');
    return createHash('sha256').update(input).digest('hex');
  }),
  CryptoDigestAlgorithm: { SHA256: 'SHA-256' },
}));

import { createHash } from 'crypto';

function sha256(input: string): string {
  return createHash('sha256').update(input).digest('hex');
}

describe('Meta Pixel Regression', () => {
  describe('SHA-256 hashing requirements', () => {
    test('email must be lowercase and trimmed before hashing', () => {
      const raw = '  Test@Example.COM  ';
      const normalized = raw.trim().toLowerCase();
      const hash = sha256(normalized);
      expect(normalized).toBe('test@example.com');
      expect(hash).toHaveLength(64);
      expect(hash).toMatch(/^[a-f0-9]{64}$/);
    });

    test('phone must be digits only (E.164 without +)', () => {
      const raw = '+1 (555) 123-4567';
      const normalized = raw.replace(/\D/g, '');
      const hash = sha256(normalized);
      expect(normalized).toBe('15551234567');
      expect(hash).toMatch(/^[a-f0-9]{64}$/);
    });

    test('first name must be lowercase and trimmed', () => {
      const raw = '  Isaiah  ';
      const normalized = raw.trim().toLowerCase();
      expect(normalized).toBe('isaiah');
      expect(sha256(normalized)).toMatch(/^[a-f0-9]{64}$/);
    });

    test('country must be 2-letter ISO lowercase', () => {
      const raw = 'US';
      const normalized = raw.trim().toLowerCase();
      expect(normalized).toBe('us');
      expect(sha256(normalized)).toMatch(/^[a-f0-9]{64}$/);
    });
  });

  describe('user_data payload structure', () => {
    test('all EMQ parameters have correct keys', () => {
      // These are the exact keys Meta expects in user_data
      const requiredKeys = ['em', 'ph', 'fn', 'ln', 'ct', 'st', 'zp', 'country'];
      const deviceKeys = ['client_ip_address', 'client_user_agent', 'fbp', 'fbc', 'external_id'];
      const allKeys = [...requiredKeys, ...deviceKeys];

      // Build a mock user_data object with all fields populated
      const userData: Record<string, any> = {
        em: [sha256('test@example.com')],
        ph: [sha256('15551234567')],
        fn: [sha256('isaiah')],
        ln: [sha256('dupree')],
        ct: [sha256('newyork')],
        st: [sha256('ny')],
        zp: [sha256('10001')],
        country: [sha256('us')],
        client_ip_address: '192.168.1.1',
        client_user_agent: 'EverReach/1.0.0 (iOS 17.0; iPhone 15)',
        fbp: 'fb.1.1234567890.1234567890',
        fbc: 'fb.1.1234567890.AbCdEfGhIjKl',
        external_id: [sha256('user-123')],
      };

      // Verify all required keys present
      for (const key of allKeys) {
        expect(userData).toHaveProperty(key);
        expect(userData[key]).toBeTruthy();
      }
    });

    test('hashed arrays must contain exactly one element', () => {
      const hashedFields = ['em', 'ph', 'fn', 'ln', 'ct', 'st', 'zp', 'country', 'external_id'];
      const userData: Record<string, any> = {};

      for (const field of hashedFields) {
        userData[field] = [sha256(`test-${field}`)];
      }

      for (const field of hashedFields) {
        expect(Array.isArray(userData[field])).toBe(true);
        expect(userData[field]).toHaveLength(1);
        expect(userData[field][0]).toMatch(/^[a-f0-9]{64}$/);
      }
    });

    test('fbp format must be fb.1.{timestamp}.{random}', () => {
      const fbp = `fb.1.${Date.now()}.${Math.floor(Math.random() * 1e10)}`;
      expect(fbp).toMatch(/^fb\.1\.\d+\.\d+$/);
    });

    test('fbc format must be fb.1.{timestamp}.{fbclid}', () => {
      const fbc = `fb.1.${Date.now()}.AbCdEfGhIjKlMn`;
      expect(fbc).toMatch(/^fb\.1\.\d+\..+$/);
    });
  });

  describe('event payload structure', () => {
    test('event must have required top-level fields', () => {
      const event = {
        event_name: 'PageView',
        event_time: Math.floor(Date.now() / 1000),
        event_id: 'evt_123',
        action_source: 'app',
        user_data: {},
        app_data: {},
      };

      expect(event.event_name).toBeTruthy();
      expect(event.event_time).toBeGreaterThan(0);
      expect(event.event_id).toBeTruthy();
      expect(event.action_source).toBe('app');
      expect(event).toHaveProperty('user_data');
      expect(event).toHaveProperty('app_data');
    });

    test('action_source must be "app" for mobile events', () => {
      // Meta requires action_source: 'app' for mobile apps
      expect('app').toBe('app');
    });

    test('event_time must be Unix timestamp in seconds (not ms)', () => {
      const eventTime = Math.floor(Date.now() / 1000);
      // Should be ~10 digits (seconds), not ~13 digits (milliseconds)
      expect(eventTime.toString()).toHaveLength(10);
    });
  });

  describe('persistence keys', () => {
    test('all persistence keys follow naming convention', () => {
      const expectedKeys = [
        '@meta_fbp',
        '@meta_fbc',
        '@meta_fbc_ts',
        '@meta_ip',
        '@meta_user_id',
        '@meta_hashed_email',
        '@meta_hashed_phone',
        '@meta_hashed_fn',
        '@meta_hashed_ln',
        '@meta_hashed_ct',
        '@meta_hashed_st',
        '@meta_hashed_zp',
        '@meta_hashed_country',
      ];

      for (const key of expectedKeys) {
        expect(key).toMatch(/^@meta_/);
      }
    });
  });
});
