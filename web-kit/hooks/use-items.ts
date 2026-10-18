import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
import type { Database } from '@/types/database';

type Item = Database['public']['Tables']['items']['Row'];
type ItemInsert = Database['public']['Tables']['items']['Insert'];
type ItemUpdate = Database['public']['Tables']['items']['Update'];

interface UseItemsParams {
  page?: number;
  limit?: number;
}

interface ItemsResponse {
  items: Item[];
  total: number;
}

/**
 * React Query hook for fetching paginated items
 *
 * @param params - Pagination parameters
 * @returns Query result with items and total count
 */
export function useItems({ page = 1, limit = 10 }: UseItemsParams = {}) {
  return useQuery<ItemsResponse, Error>({
    queryKey: ['items', page, limit],
    queryFn: async () => {
      const offset = (page - 1) * limit;

      // Get paginated items
      const { data: items, error, count } = await supabase
        .from('items')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
        throw new Error(error.message);
      }

      return {
        items: items || [],
        total: count || 0,
      };
    },
  });
}

/**
 * React Query hook for fetching a single item by ID
 *
 * @param id - Item ID
 * @returns Query result with item data
 */
export function useItem(id: string) {
  return useQuery<Item, Error>({
    queryKey: ['items', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('items')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        throw new Error(error.message);
      }

      if (!data) {
        throw new Error('Item not found');
      }

      return data;
    },
    enabled: !!id,
  });
}

/**
 * React Query mutation hook for creating a new item
 *
 * @returns Mutation for creating items
 */
export function useCreateItem() {
  const queryClient = useQueryClient();

  return useMutation<Item, Error, Omit<ItemInsert, 'id' | 'created_at' | 'updated_at'>>({
    mutationFn: async (newItem) => {
      const { data, error } = await supabase
        .from('items')
        .insert(newItem)
        .select()
        .single();

      if (error) {
        throw new Error(error.message);
      }

      if (!data) {
        throw new Error('Failed to create item');
      }

      return data;
    },
    onSuccess: () => {
      // Invalidate and refetch items list
      queryClient.invalidateQueries({ queryKey: ['items'] });
    },
  });
}

/**
 * React Query mutation hook for updating an existing item
 *
 * @returns Mutation for updating items
 */
export function useUpdateItem() {
  const queryClient = useQueryClient();

  return useMutation<Item, Error, { id: string; updates: ItemUpdate }>({
    mutationFn: async ({ id, updates }) => {
      const { data, error } = await supabase
        .from('items')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        throw new Error(error.message);
      }

      if (!data) {
        throw new Error('Failed to update item');
      }

      return data;
    },
    onSuccess: (data) => {
      // Invalidate the specific item and items list
      queryClient.invalidateQueries({ queryKey: ['items', data.id] });
      queryClient.invalidateQueries({ queryKey: ['items'] });
    },
  });
}

/**
 * React Query mutation hook for deleting an item
 *
 * @returns Mutation for deleting items
 */
export function useDeleteItem() {
  const queryClient = useQueryClient();

  return useMutation<void, Error, string>({
    mutationFn: async (id) => {
      const { error } = await supabase
        .from('items')
        .delete()
        .eq('id', id);

      if (error) {
        throw new Error(error.message);
      }
    },
    onSuccess: (_, id) => {
      // Invalidate the specific item and items list
      queryClient.invalidateQueries({ queryKey: ['items', id] });
      queryClient.invalidateQueries({ queryKey: ['items'] });
    },
  });
}
