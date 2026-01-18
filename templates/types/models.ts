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
  subscription_tier: 'free' | 'pro' | 'business';
  subscription_status: 'active' | 'past_due' | 'canceled' | 'expired';
  created_at: string;
}

// ============================================
// ✅ KEEP: Subscription model
// ============================================
export interface Subscription {
  id: string;
  user_id: string;
  tier: 'free' | 'pro' | 'business';
  status: 'active' | 'past_due' | 'canceled' | 'expired' | 'trialing';
  provider: 'stripe' | 'revenuecat' | 'manual';
  current_period_start?: string;
  current_period_end?: string;
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
