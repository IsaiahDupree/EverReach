/**
 * @jest-environment jsdom
 */
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useItems, useItem, useCreateItem, useUpdateItem, useDeleteItem } from '@/hooks/use-items';
import { supabase } from '@/lib/supabase/client';
import type { Database } from '@/types/database';
import React from 'react';

type Item = Database['public']['Tables']['items']['Row'];

// Mock the Supabase client
jest.mock('@/lib/supabase/client', () => ({
  supabase: {
    from: jest.fn(),
  },
}));

const mockSupabase = supabase as jest.Mocked<typeof supabase>;

// Helper function to create a wrapper with QueryClient
function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
      mutations: {
        retry: false,
      },
    },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

describe('useItems Hook', () => {
  const mockItems: Item[] = [
    {
      id: 'item-1',
      user_id: 'user-1',
      title: 'Test Item 1',
      description: 'Description 1',
      created_at: '2024-01-01T00:00:00.000Z',
      updated_at: '2024-01-01T00:00:00.000Z',
    },
    {
      id: 'item-2',
      user_id: 'user-1',
      title: 'Test Item 2',
      description: 'Description 2',
      created_at: '2024-01-02T00:00:00.000Z',
      updated_at: '2024-01-02T00:00:00.000Z',
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('useItems - pagination query', () => {
    it('should fetch paginated items successfully', async () => {
      const mockSelect = jest.fn().mockReturnThis();
      const mockOrder = jest.fn().mockReturnThis();
      const mockRange = jest.fn().mockResolvedValue({
        data: mockItems,
        error: null,
        count: 10,
      });

      mockSupabase.from.mockReturnValue({
        select: mockSelect,
        order: mockOrder,
        range: mockRange,
      } as any);

      const { result } = renderHook(() => useItems({ page: 1, limit: 10 }), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockSupabase.from).toHaveBeenCalledWith('items');
      expect(mockSelect).toHaveBeenCalledWith('*', { count: 'exact' });
      expect(mockOrder).toHaveBeenCalledWith('created_at', { ascending: false });
      expect(mockRange).toHaveBeenCalledWith(0, 9);
      expect(result.current.data).toEqual({
        items: mockItems,
        total: 10,
      });
    });

    it('should handle pagination correctly', async () => {
      const mockSelect = jest.fn().mockReturnThis();
      const mockOrder = jest.fn().mockReturnThis();
      const mockRange = jest.fn().mockResolvedValue({
        data: [mockItems[1]],
        error: null,
        count: 10,
      });

      mockSupabase.from.mockReturnValue({
        select: mockSelect,
        order: mockOrder,
        range: mockRange,
      } as any);

      const { result } = renderHook(() => useItems({ page: 2, limit: 5 }), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      // Page 2 with limit 5 should have offset 5
      expect(mockRange).toHaveBeenCalledWith(5, 9);
    });

    it('should handle errors when fetching items', async () => {
      const mockError = { message: 'Database error' };
      const mockSelect = jest.fn().mockReturnThis();
      const mockOrder = jest.fn().mockReturnThis();
      const mockRange = jest.fn().mockResolvedValue({
        data: null,
        error: mockError,
        count: null,
      });

      mockSupabase.from.mockReturnValue({
        select: mockSelect,
        order: mockOrder,
        range: mockRange,
      } as any);

      const { result } = renderHook(() => useItems(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error?.message).toBe('Database error');
    });

    it('should use default pagination values', async () => {
      const mockSelect = jest.fn().mockReturnThis();
      const mockOrder = jest.fn().mockReturnThis();
      const mockRange = jest.fn().mockResolvedValue({
        data: mockItems,
        error: null,
        count: 2,
      });

      mockSupabase.from.mockReturnValue({
        select: mockSelect,
        order: mockOrder,
        range: mockRange,
      } as any);

      const { result } = renderHook(() => useItems(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      // Default should be page 1, limit 10
      expect(mockRange).toHaveBeenCalledWith(0, 9);
    });
  });

  describe('useItem - single item query', () => {
    it('should fetch a single item by ID', async () => {
      const mockItem = mockItems[0];
      const mockSelect = jest.fn().mockReturnThis();
      const mockEq = jest.fn().mockReturnThis();
      const mockSingle = jest.fn().mockResolvedValue({
        data: mockItem,
        error: null,
      });

      mockSupabase.from.mockReturnValue({
        select: mockSelect,
        eq: mockEq,
        single: mockSingle,
      } as any);

      const { result } = renderHook(() => useItem('item-1'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockSupabase.from).toHaveBeenCalledWith('items');
      expect(mockSelect).toHaveBeenCalledWith('*');
      expect(mockEq).toHaveBeenCalledWith('id', 'item-1');
      expect(result.current.data).toEqual(mockItem);
    });

    it('should handle error when item not found', async () => {
      const mockSelect = jest.fn().mockReturnThis();
      const mockEq = jest.fn().mockReturnThis();
      const mockSingle = jest.fn().mockResolvedValue({
        data: null,
        error: null,
      });

      mockSupabase.from.mockReturnValue({
        select: mockSelect,
        eq: mockEq,
        single: mockSingle,
      } as any);

      const { result } = renderHook(() => useItem('non-existent-id'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error?.message).toBe('Item not found');
    });

    it('should handle database errors', async () => {
      const mockError = { message: 'Database connection failed' };
      const mockSelect = jest.fn().mockReturnThis();
      const mockEq = jest.fn().mockReturnThis();
      const mockSingle = jest.fn().mockResolvedValue({
        data: null,
        error: mockError,
      });

      mockSupabase.from.mockReturnValue({
        select: mockSelect,
        eq: mockEq,
        single: mockSingle,
      } as any);

      const { result } = renderHook(() => useItem('item-1'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error?.message).toBe('Database connection failed');
    });

    it('should not query when ID is empty', async () => {
      const { result } = renderHook(() => useItem(''), {
        wrapper: createWrapper(),
      });

      expect(result.current.isPending).toBe(true);
      expect(mockSupabase.from).not.toHaveBeenCalled();
    });
  });

  describe('useCreateItem - mutation', () => {
    it('should create a new item successfully', async () => {
      const newItemData = {
        user_id: 'user-1',
        title: 'New Item',
        description: 'New Description',
      };

      const createdItem: Item = {
        id: 'new-item-id',
        ...newItemData,
        created_at: '2024-01-03T00:00:00.000Z',
        updated_at: '2024-01-03T00:00:00.000Z',
      };

      const mockInsert = jest.fn().mockReturnThis();
      const mockSelect = jest.fn().mockReturnThis();
      const mockSingle = jest.fn().mockResolvedValue({
        data: createdItem,
        error: null,
      });

      mockSupabase.from.mockReturnValue({
        insert: mockInsert,
        select: mockSelect,
        single: mockSingle,
      } as any);

      const { result } = renderHook(() => useCreateItem(), {
        wrapper: createWrapper(),
      });

      result.current.mutate(newItemData);

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockSupabase.from).toHaveBeenCalledWith('items');
      expect(mockInsert).toHaveBeenCalledWith(newItemData);
      expect(result.current.data).toEqual(createdItem);
    });

    it('should handle errors when creating item', async () => {
      const newItemData = {
        user_id: 'user-1',
        title: 'New Item',
        description: 'New Description',
      };

      const mockError = { message: 'Insert failed' };
      const mockInsert = jest.fn().mockReturnThis();
      const mockSelect = jest.fn().mockReturnThis();
      const mockSingle = jest.fn().mockResolvedValue({
        data: null,
        error: mockError,
      });

      mockSupabase.from.mockReturnValue({
        insert: mockInsert,
        select: mockSelect,
        single: mockSingle,
      } as any);

      const { result } = renderHook(() => useCreateItem(), {
        wrapper: createWrapper(),
      });

      result.current.mutate(newItemData);

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error?.message).toBe('Insert failed');
    });

    it('should handle null data response', async () => {
      const newItemData = {
        user_id: 'user-1',
        title: 'New Item',
        description: 'New Description',
      };

      const mockInsert = jest.fn().mockReturnThis();
      const mockSelect = jest.fn().mockReturnThis();
      const mockSingle = jest.fn().mockResolvedValue({
        data: null,
        error: null,
      });

      mockSupabase.from.mockReturnValue({
        insert: mockInsert,
        select: mockSelect,
        single: mockSingle,
      } as any);

      const { result } = renderHook(() => useCreateItem(), {
        wrapper: createWrapper(),
      });

      result.current.mutate(newItemData);

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error?.message).toBe('Failed to create item');
    });
  });

  describe('useUpdateItem - mutation', () => {
    it('should update an item successfully', async () => {
      const updateData = {
        id: 'item-1',
        updates: {
          title: 'Updated Title',
          description: 'Updated Description',
        },
      };

      const updatedItem: Item = {
        id: 'item-1',
        user_id: 'user-1',
        title: 'Updated Title',
        description: 'Updated Description',
        created_at: '2024-01-01T00:00:00.000Z',
        updated_at: '2024-01-03T00:00:00.000Z',
      };

      const mockUpdate = jest.fn().mockReturnThis();
      const mockEq = jest.fn().mockReturnThis();
      const mockSelect = jest.fn().mockReturnThis();
      const mockSingle = jest.fn().mockResolvedValue({
        data: updatedItem,
        error: null,
      });

      mockSupabase.from.mockReturnValue({
        update: mockUpdate,
        eq: mockEq,
        select: mockSelect,
        single: mockSingle,
      } as any);

      const { result } = renderHook(() => useUpdateItem(), {
        wrapper: createWrapper(),
      });

      result.current.mutate(updateData);

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockSupabase.from).toHaveBeenCalledWith('items');
      expect(mockUpdate).toHaveBeenCalledWith(updateData.updates);
      expect(mockEq).toHaveBeenCalledWith('id', 'item-1');
      expect(result.current.data).toEqual(updatedItem);
    });

    it('should handle errors when updating item', async () => {
      const updateData = {
        id: 'item-1',
        updates: { title: 'Updated Title' },
      };

      const mockError = { message: 'Update failed' };
      const mockUpdate = jest.fn().mockReturnThis();
      const mockEq = jest.fn().mockReturnThis();
      const mockSelect = jest.fn().mockReturnThis();
      const mockSingle = jest.fn().mockResolvedValue({
        data: null,
        error: mockError,
      });

      mockSupabase.from.mockReturnValue({
        update: mockUpdate,
        eq: mockEq,
        select: mockSelect,
        single: mockSingle,
      } as any);

      const { result } = renderHook(() => useUpdateItem(), {
        wrapper: createWrapper(),
      });

      result.current.mutate(updateData);

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error?.message).toBe('Update failed');
    });

    it('should handle null data response', async () => {
      const updateData = {
        id: 'item-1',
        updates: { title: 'Updated Title' },
      };

      const mockUpdate = jest.fn().mockReturnThis();
      const mockEq = jest.fn().mockReturnThis();
      const mockSelect = jest.fn().mockReturnThis();
      const mockSingle = jest.fn().mockResolvedValue({
        data: null,
        error: null,
      });

      mockSupabase.from.mockReturnValue({
        update: mockUpdate,
        eq: mockEq,
        select: mockSelect,
        single: mockSingle,
      } as any);

      const { result } = renderHook(() => useUpdateItem(), {
        wrapper: createWrapper(),
      });

      result.current.mutate(updateData);

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error?.message).toBe('Failed to update item');
    });
  });

  describe('useDeleteItem - mutation', () => {
    it('should delete an item successfully', async () => {
      const itemId = 'item-1';

      const mockDelete = jest.fn().mockReturnThis();
      const mockEq = jest.fn().mockResolvedValue({
        error: null,
      });

      mockSupabase.from.mockReturnValue({
        delete: mockDelete,
        eq: mockEq,
      } as any);

      const { result } = renderHook(() => useDeleteItem(), {
        wrapper: createWrapper(),
      });

      result.current.mutate(itemId);

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockSupabase.from).toHaveBeenCalledWith('items');
      expect(mockDelete).toHaveBeenCalled();
      expect(mockEq).toHaveBeenCalledWith('id', itemId);
    });

    it('should handle errors when deleting item', async () => {
      const itemId = 'item-1';
      const mockError = { message: 'Delete failed' };

      const mockDelete = jest.fn().mockReturnThis();
      const mockEq = jest.fn().mockResolvedValue({
        error: mockError,
      });

      mockSupabase.from.mockReturnValue({
        delete: mockDelete,
        eq: mockEq,
      } as any);

      const { result } = renderHook(() => useDeleteItem(), {
        wrapper: createWrapper(),
      });

      result.current.mutate(itemId);

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error?.message).toBe('Delete failed');
    });
  });
});
