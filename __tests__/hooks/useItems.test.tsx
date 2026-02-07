/**
 * Tests for useItems Hook
 * Feature: IOS-DATA-004
 *
 * Tests the useItems hook which provides CRUD operations for Item entities.
 * This hook manages items fetching, creation, updating, and deletion.
 */

import { renderHook, act, waitFor } from '@testing-library/react-native';
import { useItems } from '../../hooks/useItems';
import { supabase } from '../../lib/supabase';
import { Item, ItemInput, ItemUpdateInput, ItemStatus } from '../../types/item';

// Mock Supabase client
jest.mock('../../lib/supabase', () => ({
  supabase: {
    from: jest.fn(),
    auth: {
      getUser: jest.fn(),
    },
  },
}));

describe('useItems', () => {
  const mockSupabase = supabase as jest.Mocked<typeof supabase>;

  const mockItem: Item = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    user_id: 'user-123',
    name: 'Test Item',
    description: 'Test Description',
    status: ItemStatus.ACTIVE,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-02T00:00:00Z',
  };

  const mockItems: Item[] = [
    mockItem,
    {
      id: '223e4567-e89b-12d3-a456-426614174001',
      user_id: 'user-123',
      name: 'Second Item',
      status: ItemStatus.ACTIVE,
      created_at: '2024-01-01T00:00:00Z',
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock auth.getUser to return a valid user
    (mockSupabase.auth.getUser as jest.Mock).mockResolvedValue({
      data: {
        user: { id: 'user-123' },
      },
      error: null,
    });
  });

  describe('Initial State', () => {
    it('should initialize with loading true and empty items', () => {
      // Mock the query chain
      const mockSelect = jest.fn().mockReturnThis();
      const mockOrder = jest.fn().mockResolvedValue({
        data: [],
        error: null,
      });

      (mockSupabase.from as jest.Mock).mockReturnValue({
        select: mockSelect,
        order: mockOrder,
      });

      const { result } = renderHook(() => useItems());

      expect(result.current.loading).toBe(true);
      expect(result.current.items).toEqual([]);
      expect(result.current.error).toBeNull();
    });
  });

  describe('Fetching Items', () => {
    it('should fetch items successfully', async () => {
      const mockSelect = jest.fn().mockReturnThis();
      const mockOrder = jest.fn().mockResolvedValue({
        data: mockItems,
        error: null,
      });

      (mockSupabase.from as jest.Mock).mockReturnValue({
        select: mockSelect,
        order: mockOrder,
      });

      const { result } = renderHook(() => useItems());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.items).toEqual(mockItems);
      expect(result.current.error).toBeNull();
      expect(mockSupabase.from).toHaveBeenCalledWith('items');
      expect(mockSelect).toHaveBeenCalledWith('*');
      expect(mockOrder).toHaveBeenCalledWith('created_at', { ascending: false });
    });

    it('should handle fetch error', async () => {
      const mockError = new Error('Fetch failed');
      const mockSelect = jest.fn().mockReturnThis();
      const mockOrder = jest.fn().mockResolvedValue({
        data: null,
        error: mockError,
      });

      (mockSupabase.from as jest.Mock).mockReturnValue({
        select: mockSelect,
        order: mockOrder,
      });

      const { result } = renderHook(() => useItems());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.items).toEqual([]);
      expect(result.current.error).toBeTruthy();
    });
  });

  describe('Creating Items', () => {
    it('should create a new item successfully', async () => {
      const newItemInput: ItemInput = {
        name: 'New Item',
        description: 'New Description',
        status: ItemStatus.DRAFT,
      };

      const createdItem: Item = {
        id: 'new-item-id',
        user_id: 'user-123',
        ...newItemInput,
        status: ItemStatus.DRAFT,
        created_at: '2024-01-03T00:00:00Z',
      };

      // Mock fetch
      const mockSelect = jest.fn().mockReturnThis();
      const mockOrder = jest.fn().mockResolvedValue({
        data: mockItems,
        error: null,
      });

      // Mock insert
      const mockInsert = jest.fn().mockReturnThis();
      const mockInsertSelect = jest.fn().mockReturnThis();
      const mockInsertSingle = jest.fn().mockResolvedValue({
        data: createdItem,
        error: null,
      });

      (mockSupabase.from as jest.Mock).mockReturnValue({
        select: mockSelect,
        order: mockOrder,
        insert: mockInsert,
        single: mockInsertSingle,
      });

      mockInsert.mockReturnValue({
        select: mockInsertSelect,
      });

      mockInsertSelect.mockReturnValue({
        single: mockInsertSingle,
      });

      const { result } = renderHook(() => useItems());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await act(async () => {
        await result.current.createItem(newItemInput);
      });

      expect(mockInsert).toHaveBeenCalledWith({
        ...newItemInput,
        user_id: 'user-123',
      });
    });

    it('should handle create error', async () => {
      const newItemInput: ItemInput = {
        name: 'Failed Item',
      };

      const mockError = new Error('Create failed');

      // Mock fetch
      const mockSelect = jest.fn().mockReturnThis();
      const mockOrder = jest.fn().mockResolvedValue({
        data: [],
        error: null,
      });

      // Mock failed insert
      const mockInsert = jest.fn().mockReturnThis();
      const mockInsertSelect = jest.fn().mockReturnThis();
      const mockInsertSingle = jest.fn().mockResolvedValue({
        data: null,
        error: mockError,
      });

      (mockSupabase.from as jest.Mock).mockReturnValue({
        select: mockSelect,
        order: mockOrder,
        insert: mockInsert,
      });

      mockInsert.mockReturnValue({
        select: mockInsertSelect,
      });

      mockInsertSelect.mockReturnValue({
        single: mockInsertSingle,
      });

      const { result } = renderHook(() => useItems());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await expect(
        act(async () => {
          await result.current.createItem(newItemInput);
        })
      ).rejects.toThrow();
    });
  });

  describe('Updating Items', () => {
    it('should update an item successfully', async () => {
      const updateInput: ItemUpdateInput = {
        name: 'Updated Name',
        status: ItemStatus.ARCHIVED,
      };

      const updatedItem: Item = {
        ...mockItem,
        ...updateInput,
        updated_at: '2024-01-03T00:00:00Z',
      };

      // Mock fetch
      const mockSelect = jest.fn().mockReturnThis();
      const mockOrder = jest.fn().mockResolvedValue({
        data: mockItems,
        error: null,
      });

      // Mock update
      const mockEq = jest.fn().mockReturnThis();
      const mockUpdate = jest.fn().mockReturnValue({
        eq: mockEq,
      });
      const mockUpdateSelect = jest.fn().mockReturnThis();
      const mockUpdateSingle = jest.fn().mockResolvedValue({
        data: updatedItem,
        error: null,
      });

      (mockSupabase.from as jest.Mock).mockReturnValue({
        select: mockSelect,
        order: mockOrder,
        update: mockUpdate,
      });

      mockEq.mockReturnValue({
        select: mockUpdateSelect,
      });

      mockUpdateSelect.mockReturnValue({
        single: mockUpdateSingle,
      });

      const { result } = renderHook(() => useItems());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await act(async () => {
        await result.current.updateItem(mockItem.id, updateInput);
      });

      expect(mockUpdate).toHaveBeenCalledWith(updateInput);
      expect(mockEq).toHaveBeenCalledWith('id', mockItem.id);
    });
  });

  describe('Deleting Items', () => {
    it('should delete an item successfully', async () => {
      // Mock fetch
      const mockSelect = jest.fn().mockReturnThis();
      const mockOrder = jest.fn().mockResolvedValue({
        data: mockItems,
        error: null,
      });

      // Mock delete
      const mockEq = jest.fn().mockResolvedValue({
        data: null,
        error: null,
      });
      const mockDelete = jest.fn().mockReturnValue({
        eq: mockEq,
      });

      (mockSupabase.from as jest.Mock).mockReturnValue({
        select: mockSelect,
        order: mockOrder,
        delete: mockDelete,
      });

      const { result } = renderHook(() => useItems());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await act(async () => {
        await result.current.deleteItem(mockItem.id);
      });

      expect(mockDelete).toHaveBeenCalled();
      expect(mockEq).toHaveBeenCalledWith('id', mockItem.id);
    });

    it('should handle delete error', async () => {
      const mockError = new Error('Delete failed');

      // Mock fetch
      const mockSelect = jest.fn().mockReturnThis();
      const mockOrder = jest.fn().mockResolvedValue({
        data: mockItems,
        error: null,
      });

      // Mock failed delete
      const mockEq = jest.fn().mockResolvedValue({
        data: null,
        error: mockError,
      });
      const mockDelete = jest.fn().mockReturnValue({
        eq: mockEq,
      });

      (mockSupabase.from as jest.Mock).mockReturnValue({
        select: mockSelect,
        order: mockOrder,
        delete: mockDelete,
      });

      const { result } = renderHook(() => useItems());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await expect(
        act(async () => {
          await result.current.deleteItem(mockItem.id);
        })
      ).rejects.toThrow();
    });
  });

  describe('Refetch functionality', () => {
    it('should have a refetch method', async () => {
      const mockSelect = jest.fn().mockReturnThis();
      const mockOrder = jest.fn().mockResolvedValue({
        data: mockItems,
        error: null,
      });

      (mockSupabase.from as jest.Mock).mockReturnValue({
        select: mockSelect,
        order: mockOrder,
      });

      const { result } = renderHook(() => useItems());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(typeof result.current.refetch).toBe('function');

      // Test refetch
      await act(async () => {
        await result.current.refetch();
      });

      // Verify it calls the query again
      expect(mockSupabase.from).toHaveBeenCalledTimes(2); // Initial fetch + refetch
    });
  });
});
