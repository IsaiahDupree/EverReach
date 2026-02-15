/**
 * APP-KIT: API Service
 * 
 * 🔧 REPLACE THE CRUD OPERATIONS WITH YOUR BUSINESS LOGIC
 * 
 * This file contains placeholder API calls. Replace them with
 * your actual data operations.
 * 
 * The structure is:
 * ✅ KEEP: Supabase client setup, auth helpers
 * 🔧 REPLACE: Item CRUD operations with your entities
 */

import { supabase } from '@/lib/supabase';
import { Item, CreateItemInput, UpdateItemInput, ApiResponse, PaginatedResponse } from '@/types/models';

// ============================================
// 🔧 REPLACE: Your main entity CRUD operations
// ============================================

/**
 * Fetch all items for the current user
 * 
 * TODO: Replace 'items' with your table name
 * TODO: Adjust query for your data structure
 */
export async function getItems(page = 1, limit = 20): Promise<PaginatedResponse<Item>> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const offset = (page - 1) * limit;

  const { data, error, count } = await supabase
    .from('items')  // TODO: Replace with your table name
    .select('*', { count: 'exact' })
    .eq('user_id', user.id)
    .neq('status', 'deleted')
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) throw error;

  return {
    data: data || [],
    total: count || 0,
    page,
    per_page: limit,
    has_more: (count || 0) > offset + limit,
  };
}

/**
 * Get a single item by ID
 * 
 * TODO: Replace 'items' with your table name
 */
export async function getItem(id: string): Promise<Item> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('items')  // TODO: Replace with your table name
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .single();

  if (error) throw error;
  return data;
}

/**
 * Create a new item
 * 
 * TODO: Replace 'items' with your table name
 * TODO: Adjust input fields for your data
 */
export async function createItem(input: CreateItemInput): Promise<Item> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('items')  // TODO: Replace with your table name
    .insert({
      user_id: user.id,
      name: input.name,
      description: input.description,
      category: input.category,
      status: 'active',
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Update an existing item
 * 
 * TODO: Replace 'items' with your table name
 */
export async function updateItem(id: string, input: UpdateItemInput): Promise<Item> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('items')  // TODO: Replace with your table name
    .update({
      ...input,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('user_id', user.id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Delete an item (soft delete)
 * 
 * TODO: Replace 'items' with your table name
 */
export async function deleteItem(id: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { error } = await supabase
    .from('items')  // TODO: Replace with your table name
    .update({ status: 'deleted' })
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) throw error;
}

/**
 * Search items
 * 
 * TODO: Replace 'items' with your table name
 * TODO: Adjust search columns for your data
 */
export async function searchItems(query: string): Promise<Item[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('items')  // TODO: Replace with your table name
    .select('*')
    .eq('user_id', user.id)
    .neq('status', 'deleted')
    .or(`name.ilike.%${query}%,description.ilike.%${query}%`)
    .limit(20);

  if (error) throw error;
  return data || [];
}

// ============================================
// ✅ KEEP: User profile operations
// ============================================

export async function getUserProfile() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('users')
    .select('*, subscription:subscriptions(*)')
    .eq('id', user.id)
    .single();

  if (error) throw error;
  return data;
}

export async function updateUserProfile(updates: { full_name?: string; avatar_url?: string }) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('users')
    .update(updates)
    .eq('id', user.id)
    .select()
    .single();

  if (error) throw error;
  return data;
}
