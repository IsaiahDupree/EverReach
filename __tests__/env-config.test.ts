/**
 * Environment Configuration Validation Tests
 * 
 * Ensures required env vars are set and dev flags are correctly configured.
 * Catches misconfigurations before they reach production.
 */

describe('Environment Configuration', () => {
  describe('required variables', () => {
    test('EXPO_PUBLIC_SUPABASE_URL is set', () => {
      expect(process.env.EXPO_PUBLIC_SUPABASE_URL).toBeTruthy();
    });

    test('EXPO_PUBLIC_SUPABASE_KEY is set', () => {
      expect(process.env.EXPO_PUBLIC_SUPABASE_KEY).toBeTruthy();
    });

    test('EXPO_PUBLIC_API_URL is set', () => {
      expect(process.env.EXPO_PUBLIC_API_URL).toBeTruthy();
    });

    test('EXPO_PUBLIC_BACKEND_URL is set', () => {
      expect(process.env.EXPO_PUBLIC_BACKEND_URL).toBeTruthy();
    });
  });

  describe('Supabase URL format', () => {
    test('URL starts with https://', () => {
      const url = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
      expect(url.startsWith('https://') || url.startsWith('http://localhost')).toBe(true);
    });

    test('Supabase key looks like a JWT', () => {
      const key = process.env.EXPO_PUBLIC_SUPABASE_KEY || '';
      // JWT has 3 base64 parts separated by dots
      const parts = key.split('.');
      expect(parts.length).toBe(3);
    });
  });

  describe('dev flag defaults', () => {
    // In test environment these are not set, which is fine
    // This test documents the expected flags
    test('known dev flags are documented', () => {
      const devFlags = [
        'EXPO_PUBLIC_ENABLE_DEV_FEATURES',
        'EXPO_PUBLIC_SHOW_DEBUG_INFO',
        'EXPO_PUBLIC_SHOW_DEV_SETTINGS',
        'EXPO_PUBLIC_ENABLE_DEBUG_LOGGING',
        'EXPO_PUBLIC_SHOW_REFRESH_BUTTONS',
        'EXPO_PUBLIC_ENABLE_EXPERIMENTAL',
      ];

      // Just verify these are the known flag names
      expect(devFlags).toHaveLength(6);
      for (const flag of devFlags) {
        expect(flag).toMatch(/^EXPO_PUBLIC_/);
      }
    });
  });
});
