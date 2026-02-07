/**
 * useItems Hook
 * Feature: IOS-DATA-004
 *
 * React hook for managing Item entity CRUD operations.
 * Provides methods to fetch, create, update, and delete items.
 *
 * This hook uses Supabase for data persistence and manages loading/error states.
 * Consider migrating to React Query for better caching and state management.
 *
 * @returns Object containing:
 *   - items: Array of items
 *   - loading: Boolean indicating if operation is in progress
 *   - error: Error object if operation failed
 *   - createItem: Function to create a new item
 *   - updateItem: Function to update an existing item
 *   - deleteItem: Function to delete an item
 *   - refetch: Function to manually refetch items
 *
 * @example
 * ```tsx
 * import { useItems } from '@/hooks/useItems';
 *
 * function ItemsList() {
 *   const { items, loading, error, createItem, deleteItem } = useItems();
 *
 *   if (loading) return <LoadingSpinner />;
 *   if (error) return <ErrorMessage error={error} />;
 *
 *   return (
 *     <FlatList
 *       data={items}
 *       renderItem={({ item }) => (
 *         <ItemCard
 *           item={item}
 *           onDelete={() => deleteItem(item.id)}
 *         />
 *       )}
 *     />
 *   );
 * }
 * ```
 *
 * @module hooks/useItems
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { Item, ItemInput, ItemUpdateInput } from '../types/item';

/**
 * Return type for useItems hook
 */
interface UseItemsReturn {
  items: Item[];
  loading: boolean;
  error: Error | null;
  createItem: (input: ItemInput) => Promise<Item>;
  updateItem: (id: string, input: ItemUpdateInput) => Promise<Item>;
  deleteItem: (id: string) => Promise<void>;
  refetch: () => Promise<void>;
}

/**
 * Hook to manage items with CRUD operations
 */
export const useItems = (): UseItemsReturn => {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  /**
   * Fetch all items for the current user
   */
  const fetchItems = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Fetch items ordered by creation date (newest first)
      const { data, error: fetchError } = await supabase
        .from('items')
        .select('*')
        .order('created_at', { ascending: false });

      if (fetchError) {
        throw fetchError;
      }

      setItems(data || []);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to fetch items');
      setError(error);
      console.error('Error fetching items:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Create a new item
   */
  const createItem = useCallback(async (input: ItemInput): Promise<Item> => {
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Insert new item
      const { data, error: createError } = await supabase
        .from('items')
        .insert({
          ...input,
          user_id: user.id,
        })
        .select()
        .single();

      if (createError) {
        throw createError;
      }

      if (!data) {
        throw new Error('Failed to create item');
      }

      // Update local state
      setItems((prev) => [data, ...prev]);

      return data;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to create item');
      console.error('Error creating item:', error);
      throw error;
    }
  }, []);

  /**
   * Update an existing item
   */
  const updateItem = useCallback(async (
    id: string,
    input: ItemUpdateInput
  ): Promise<Item> => {
    try {
      // Update item in database
      const { data, error: updateError } = await supabase
        .from('items')
        .update(input)
        .eq('id', id)
        .select()
        .single();

      if (updateError) {
        throw updateError;
      }

      if (!data) {
        throw new Error('Failed to update item');
      }

      // Update local state
      setItems((prev) =>
        prev.map((item) => (item.id === id ? data : item))
      );

      return data;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to update item');
      console.error('Error updating item:', error);
      throw error;
    }
  }, []);

  /**
   * Delete an item
   */
  const deleteItem = useCallback(async (id: string): Promise<void> => {
    try {
      // Delete item from database
      const { error: deleteError } = await supabase
        .from('items')
        .delete()
        .eq('id', id);

      if (deleteError) {
        throw deleteError;
      }

      // Update local state
      setItems((prev) => prev.filter((item) => item.id !== id));
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to delete item');
      console.error('Error deleting item:', error);
      throw error;
    }
  }, []);

  /**
   * Manually refetch items
   */
  const refetch = useCallback(async () => {
    await fetchItems();
  }, [fetchItems]);

  // Fetch items on mount
  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  return {
    items,
    loading,
    error,
    createItem,
    updateItem,
    deleteItem,
    refetch,
  };
};
