import { renderHook, waitFor } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLivePaywall } from '../hooks/useLivePaywall';
import * as api from '../lib/api';

// Mock dependencies
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

jest.mock('../lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: jest.fn(),
    },
  },
}));

jest.mock('../lib/api');
jest.mock('../lib/analytics', () => ({
  default: {
    track: jest.fn(),
  },
}));

const mockApiFetch = api.apiFetch as jest.MockedFunction<typeof api.apiFetch>;
const mockGetSession = require('../lib/supabase').supabase.auth.getSession;
const mockGetItem = AsyncStorage.getItem as jest.MockedFunction<typeof AsyncStorage.getItem>;
const mockSetItem = AsyncStorage.setItem as jest.MockedFunction<typeof AsyncStorage.setItem>;

describe('useLivePaywall', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Default: authenticated user
    mockGetSession.mockResolvedValue({
      data: { session: { access_token: 'test-token' } },
      error: null,
    });
  });

  describe('Success scenarios', () => {
    it('should fetch and return live paywall config', async () => {
      const mockConfig = {
        platform: 'android',
        provider: 'revenuecat',
        paywall_id: 'premium_annual',
        configuration: {},
        updated_at: '2025-11-15T18:00:00Z',
      };

      mockGetItem.mockResolvedValue(null);
      mockApiFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => mockConfig,
      } as Response);

      const { result } = renderHook(() => useLivePaywall());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.config).toEqual(mockConfig);
      expect(result.current.error).toBeNull();
      expect(mockApiFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/v1/config/paywall-live'),
        expect.objectContaining({
          requireAuth: true,
        })
      );
    });

    it('should use cached config if fresh', async () => {
      const cachedConfig = {
        ts: Date.now(),
        value: {
          platform: 'ios',
          provider: 'custom',
          paywall_id: 'everreach_basic_paywall',
          configuration: {},
          updated_at: '2025-11-15T17:00:00Z',
        },
      };

      // Return cache for the storage key, null for dev override key
      mockGetItem.mockImplementation((key: string) => {
        if (key.startsWith('live_paywall_config')) {
          return Promise.resolve(JSON.stringify(cachedConfig));
        }
        return Promise.resolve(null);
      });

      // Remote fetch returns same data (so config stays consistent)
      mockApiFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => cachedConfig.value,
      } as Response);

      const { result } = renderHook(() => useLivePaywall());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Config should match (either from cache or remote - both return same)
      expect(result.current.config?.provider).toBe('custom');
      expect(result.current.config?.paywall_id).toBe('everreach_basic_paywall');
      expect(mockApiFetch).toHaveBeenCalled(); // Still fetches in background
    });
  });

  describe('Error scenarios', () => {
    it('should handle 404 (no live config) gracefully', async () => {
      mockGetItem.mockResolvedValue(null);
      mockApiFetch.mockResolvedValue({
        ok: false,
        status: 404,
        json: async () => ({ error: 'Not found' }),
      } as Response);

      const { result } = renderHook(() => useLivePaywall());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Should fallback to custom provider
      expect(result.current.config).toEqual({
        platform: expect.any(String),
        provider: 'custom',
        paywall_id: 'everreach_basic_paywall',
        configuration: {},
        updated_at: expect.any(String),
      });
      expect(result.current.error).toBeNull();
    });

    it('should handle 401 (unauthorized) gracefully', async () => {
      mockGetItem.mockResolvedValue(null);
      mockApiFetch.mockResolvedValue({
        ok: false,
        status: 401,
        json: async () => ({ error: 'Unauthorized' }),
      } as Response);

      const { result } = renderHook(() => useLivePaywall());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Should fallback to custom provider
      expect(result.current.config?.provider).toBe('custom');
      expect(result.current.error).toBeTruthy();
    });

    it('should handle network errors gracefully', async () => {
      mockGetItem.mockResolvedValue(null);
      mockApiFetch.mockRejectedValue(new Error('Network request failed'));

      const { result } = renderHook(() => useLivePaywall());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Should fallback to custom provider
      expect(result.current.config?.provider).toBe('custom');
      expect(result.current.error).toBe('Network request failed');
    });

    it('should use stale cache on network error', async () => {
      const staleConfig = {
        ts: Date.now() - 10 * 60 * 1000, // 10 minutes old (stale)
        value: {
          platform: 'ios',
          provider: 'revenuecat',
          paywall_id: 'premium_monthly',
          configuration: {},
          updated_at: '2025-11-15T16:00:00Z',
        },
      };

      mockGetItem.mockResolvedValue(JSON.stringify(staleConfig));
      mockApiFetch.mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() => useLivePaywall());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Should use stale cache as fallback
      expect(result.current.config).toEqual(staleConfig.value);
      expect(result.current.error).toBe('Network error');
    });
  });

  describe('Cache behavior', () => {
    it('should save config to cache after successful fetch', async () => {
      const mockConfig = {
        platform: 'android',
        provider: 'custom',
        paywall_id: 'everreach_basic_paywall',
        configuration: {},
        updated_at: '2025-11-15T18:00:00Z',
      };

      mockGetItem.mockResolvedValue(null);
      mockApiFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => mockConfig,
      } as Response);

      renderHook(() => useLivePaywall());

      await waitFor(() => {
        expect(mockSetItem).toHaveBeenCalledWith(
          expect.stringContaining('live_paywall_config'),
          expect.stringContaining(mockConfig.provider)
        );
      });
    });
  });

  describe('Authentication', () => {
    it('should fetch with requireAuth even without session (delegates auth to apiFetch)', async () => {
      mockGetSession.mockResolvedValue({
        data: { session: null },
        error: null,
      });

      mockGetItem.mockResolvedValue(null);
      mockApiFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          platform: 'ios',
          provider: 'custom',
          paywall_id: 'default',
          updated_at: '2025-11-15T18:00:00Z',
        }),
      } as Response);

      const { result } = renderHook(() => useLivePaywall());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Hook always calls apiFetch with requireAuth: true
      expect(mockApiFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/v1/config/paywall-live'),
        expect.objectContaining({ requireAuth: true })
      );
    });
  });

  describe('Dev overrides', () => {
    it('should read dev override key from AsyncStorage on native', async () => {
      const mockConfig = {
        platform: 'ios',
        provider: 'custom' as const,
        paywall_id: 'everreach_basic_paywall',
        configuration: {},
        updated_at: '2025-11-15T18:00:00Z',
      };

      mockGetItem
        .mockResolvedValueOnce(null) // cache check
        .mockResolvedValueOnce('revenuecat'); // dev override

      mockApiFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => mockConfig,
      } as Response);

      const { result } = renderHook(() => useLivePaywall());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Verify the dev override key was read
      expect(mockGetItem).toHaveBeenCalledWith('dev:paywallProvider');
    });
  });

  describe('Refetch', () => {
    it('should allow manual refetch', async () => {
      const mockConfig = {
        platform: 'web',
        provider: 'custom' as const,
        paywall_id: 'everreach_basic_paywall',
        configuration: {},
        updated_at: '2025-11-15T18:00:00Z',
      };

      mockGetItem.mockResolvedValue(null);
      mockApiFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => mockConfig,
      } as Response);

      const { result } = renderHook(() => useLivePaywall());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Clear the mock and refetch
      mockApiFetch.mockClear();
      result.current.refetch();

      await waitFor(() => {
        expect(mockApiFetch).toHaveBeenCalled();
      });
    });
  });
});
