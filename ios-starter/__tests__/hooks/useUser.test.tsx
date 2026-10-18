/**
 * Tests for useUser Hook
 * Feature: IOS-DATA-005
 *
 * Tests the useUser hook which provides methods for user profile operations:
 * - Get user profile
 * - Update user profile
 */

import { renderHook, act, waitFor } from '@testing-library/react-native';
import { useUser } from '../../hooks/useUser';
import { supabase } from '../../lib/supabase';

// Mock Supabase
jest.mock('../../lib/supabase', () => ({
  supabase: {
    auth: {
      getUser: jest.fn(),
    },
    from: jest.fn(),
  },
}));

describe('useUser', () => {
  const mockSupabase = supabase as jest.Mocked<typeof supabase>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('fetchProfile', () => {
    it('should fetch user profile successfully', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        full_name: 'Test User',
        avatar_url: 'https://example.com/avatar.jpg',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-02T00:00:00Z',
      };

      // Mock getUser
      (mockSupabase.auth.getUser as jest.Mock).mockResolvedValue({
        data: { user: { id: 'user-123', email: 'test@example.com' } },
        error: null,
      });

      // Mock from().select().eq().single()
      const mockSelect = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: mockUser,
            error: null,
          }),
        }),
      });

      (mockSupabase.from as jest.Mock).mockReturnValue({
        select: mockSelect,
      });

      const { result } = renderHook(() => useUser());

      // Wait for loading to complete
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.profile).toEqual(mockUser);
      expect(result.current.error).toBeNull();
      expect(mockSupabase.from).toHaveBeenCalledWith('users');
      expect(mockSelect).toHaveBeenCalledWith('*');
    });

    it('should handle fetch error', async () => {
      const mockError = new Error('Failed to fetch profile');

      // Mock getUser
      (mockSupabase.auth.getUser as jest.Mock).mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      });

      // Mock from().select().eq().single() with error
      const mockSelect = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: null,
            error: mockError,
          }),
        }),
      });

      (mockSupabase.from as jest.Mock).mockReturnValue({
        select: mockSelect,
      });

      const { result } = renderHook(() => useUser());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.profile).toBeNull();
      expect(result.current.error).toEqual(mockError);
    });

    it('should handle unauthenticated user', async () => {
      // Mock getUser with no user
      (mockSupabase.auth.getUser as jest.Mock).mockResolvedValue({
        data: { user: null },
        error: null,
      });

      const { result } = renderHook(() => useUser());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.profile).toBeNull();
      expect(result.current.error).toEqual(
        expect.objectContaining({ message: 'User not authenticated' })
      );
    });
  });

  describe('updateProfile', () => {
    it('should update user profile successfully', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        full_name: 'Test User',
        avatar_url: null,
      };

      const updatedProfile = {
        id: 'user-123',
        email: 'test@example.com',
        full_name: 'Updated Name',
        avatar_url: 'https://example.com/new-avatar.jpg',
      };

      // Mock getUser
      (mockSupabase.auth.getUser as jest.Mock).mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      });

      // Mock initial fetch
      const mockSelect = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: mockUser,
            error: null,
          }),
        }),
      });

      // Mock update
      const mockUpdate = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: updatedProfile,
              error: null,
            }),
          }),
        }),
      });

      (mockSupabase.from as jest.Mock)
        .mockReturnValueOnce({
          select: mockSelect,
        })
        .mockReturnValue({
          update: mockUpdate,
        });

      const { result } = renderHook(() => useUser());

      // Wait for initial load
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Update profile
      await act(async () => {
        await result.current.updateProfile({
          full_name: 'Updated Name',
          avatar_url: 'https://example.com/new-avatar.jpg',
        });
      });

      expect(result.current.profile).toEqual(updatedProfile);
      expect(mockUpdate).toHaveBeenCalledWith({
        full_name: 'Updated Name',
        avatar_url: 'https://example.com/new-avatar.jpg',
        updated_at: expect.any(String),
      });
    });

    it('should handle update error', async () => {
      const mockError = new Error('Failed to update profile');

      // Mock getUser
      (mockSupabase.auth.getUser as jest.Mock).mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      });

      // Mock initial fetch
      const mockSelect = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: { id: 'user-123', email: 'test@example.com' },
            error: null,
          }),
        }),
      });

      // Mock update with error
      const mockUpdate = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: null,
              error: mockError,
            }),
          }),
        }),
      });

      (mockSupabase.from as jest.Mock)
        .mockReturnValueOnce({
          select: mockSelect,
        })
        .mockReturnValue({
          update: mockUpdate,
        });

      const { result } = renderHook(() => useUser());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await expect(async () => {
        await act(async () => {
          await result.current.updateProfile({
            full_name: 'Updated Name',
          });
        });
      }).rejects.toThrow('Failed to update profile');
    });
  });

  describe('refetch', () => {
    it('should refetch user profile', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        full_name: 'Test User',
      };

      // Mock getUser
      (mockSupabase.auth.getUser as jest.Mock).mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      });

      // Mock select
      const mockSelect = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: mockUser,
            error: null,
          }),
        }),
      });

      (mockSupabase.from as jest.Mock).mockReturnValue({
        select: mockSelect,
      });

      const { result } = renderHook(() => useUser());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Clear mocks
      jest.clearAllMocks();

      // Mock select again for refetch
      (mockSupabase.from as jest.Mock).mockReturnValue({
        select: mockSelect,
      });

      (mockSupabase.auth.getUser as jest.Mock).mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      });

      // Refetch
      await act(async () => {
        await result.current.refetch();
      });

      expect(mockSupabase.from).toHaveBeenCalledWith('users');
      expect(mockSelect).toHaveBeenCalled();
    });
  });

  describe('loading state', () => {
    it('should start with loading true', () => {
      // Mock getUser to not resolve immediately
      (mockSupabase.auth.getUser as jest.Mock).mockReturnValue(
        new Promise(() => {}) // Never resolves
      );

      const { result } = renderHook(() => useUser());

      expect(result.current.loading).toBe(true);
    });

    it('should set loading to false after fetch completes', async () => {
      // Mock getUser
      (mockSupabase.auth.getUser as jest.Mock).mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      });

      const mockSelect = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: { id: 'user-123', email: 'test@example.com' },
            error: null,
          }),
        }),
      });

      (mockSupabase.from as jest.Mock).mockReturnValue({
        select: mockSelect,
      });

      const { result } = renderHook(() => useUser());

      expect(result.current.loading).toBe(true);

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });
    });
  });
});
