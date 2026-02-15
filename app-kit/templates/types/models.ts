/**
 * APP-KIT: Data Models
 * 
 * 🔧 REPLACE THESE WITH YOUR OWN DATA STRUCTURES
 * 
 * These are placeholder models. Replace them with your business entities.
 * 
 * Examples:
 * - E-commerce: Product, Order, Cart, Review
 * - Social: Post, Comment, User, Follow
 * - Fitness: Workout, Exercise, Progress
 * - Task Manager: Task, Project, Label
 */

// ============================================
// 🔧 REPLACE: Your main data entity
// ============================================
export interface Item {
  id: string;
  user_id: string;
  
  // TODO: Replace with your fields
  name: string;
  description?: string;
  category?: string;
  status: 'active' | 'archived' | 'deleted';
  
  // Common fields (usually keep these)
  created_at: string;
  updated_at: string;
}

// ============================================
// 🔧 REPLACE: Your secondary entities
// ============================================
export interface Category {
  id: string;
  name: string;
  color: string;
  icon?: string;
}

// ============================================
// ✅ KEEP: User model (works with Supabase Auth)
// ============================================
export interface User {
  id: string;
  email: string;
  full_name?: string;
  avatar_url?: string;
  subscription_tier: 'free' | 'core' | 'pro' | 'team';
  subscription_status: 'trial' | 'active' | 'grace' | 'paused' | 'past_due' | 'canceled' | 'expired' | 'refunded';
  created_at: string;
}

// ============================================
// ✅ KEEP: Subscription model
// ============================================
export interface Subscription {
  id: string;
  user_id: string;
  product_id?: string;
  store: 'app_store' | 'play' | 'stripe';
  store_account_id?: string;
  status: 'trial' | 'active' | 'grace' | 'paused' | 'past_due' | 'canceled' | 'expired' | 'refunded';
  started_at?: string;
  current_period_end?: string;
  cancel_at?: string;
  canceled_at?: string;
  updated_at: string;
}

// ============================================
// ✅ KEEP: Entitlements model (derived from subscriptions)
// ============================================
export interface Entitlement {
  user_id: string;
  plan: 'free' | 'core' | 'pro' | 'team';
  valid_until?: string;
  source: 'app_store' | 'play' | 'stripe' | 'manual' | 'revenuecat';
  subscription_id?: string;
  updated_at: string;
}

// ============================================
// ✅ KEEP: Subscription events audit log
// ============================================
export interface SubscriptionEvent {
  id: string;
  user_id?: string;
  event_type: string;
  product_id?: string;
  store?: 'app_store' | 'play' | 'stripe';
  environment?: string;
  period_type?: string;
  plan?: string;
  status?: string;
  transaction_id?: string;
  original_transaction_id?: string;
  revenue?: number;
  currency?: string;
  entitlement_ids?: string[];
  is_trial_conversion?: boolean;
  occurred_at?: string;
  created_at: string;
}

// ============================================
// 🔧 CUSTOMIZE: API Response types
// ============================================
export interface ApiResponse<T> {
  data: T | null;
  error: string | null;
  success: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  per_page: number;
  has_more: boolean;
}

// ============================================
// 🔧 CUSTOMIZE: Form input types
// ============================================
export interface CreateItemInput {
  name: string;
  description?: string;
  category?: string;
}

export interface UpdateItemInput {
  name?: string;
  description?: string;
  category?: string;
  status?: 'active' | 'archived';
}
