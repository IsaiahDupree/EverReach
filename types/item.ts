/**
 * Item Type Definitions
 * Feature: IOS-DATA-001
 *
 * Defines TypeScript types for generic Item entity.
 * This is a placeholder entity that developers should customize
 * for their specific use case (e.g., products, tasks, workouts, etc.).
 *
 * @module types/item
 */

/**
 * Item status states
 */
export enum ItemStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  ARCHIVED = 'archived',
  DRAFT = 'draft',
}

/**
 * Item categories for basic categorization
 * Developers should customize these for their domain
 */
export enum ItemCategory {
  GENERAL = 'general',
  PERSONAL = 'personal',
  WORK = 'work',
  OTHER = 'other',
}

/**
 * Item entity representing a generic item in the system
 *
 * This is a starter template - customize fields based on your use case:
 * - E-commerce: Add price, inventory, images
 * - Tasks: Add due_date, priority, assignee
 * - Content: Add author, tags, publish_date
 * - etc.
 */
export interface Item {
  /**
   * Unique item identifier (UUID)
   */
  id: string;

  /**
   * User who owns this item
   */
  user_id: string;

  /**
   * Item name/title (required)
   */
  name: string;

  /**
   * Optional detailed description
   */
  description?: string | null;

  /**
   * Category for organizing items
   */
  category?: ItemCategory;

  /**
   * Current status of the item
   */
  status: ItemStatus;

  /**
   * Flexible JSON field for additional custom data
   * Use this for domain-specific fields during prototyping,
   * then migrate to typed fields in production
   */
  metadata?: Record<string, any>;

  /**
   * Timestamp when item was created
   */
  created_at: string;

  /**
   * Timestamp when item was last updated
   */
  updated_at?: string;
}

/**
 * Input for creating a new item
 * Does not include id, user_id, or timestamps (set by database)
 */
export interface ItemInput {
  /**
   * Item name (required)
   */
  name: string;

  /**
   * Optional description
   */
  description?: string;

  /**
   * Optional category
   */
  category?: ItemCategory;

  /**
   * Optional status (defaults to ACTIVE if not provided)
   */
  status?: ItemStatus;

  /**
   * Optional metadata
   */
  metadata?: Record<string, any>;
}

/**
 * Input for updating an existing item
 * All fields are optional - only include fields to update
 */
export interface ItemUpdateInput {
  /**
   * Update name
   */
  name?: string;

  /**
   * Update description
   */
  description?: string;

  /**
   * Update category
   */
  category?: ItemCategory;

  /**
   * Update status
   */
  status?: ItemStatus;

  /**
   * Update metadata
   */
  metadata?: Record<string, any>;
}
