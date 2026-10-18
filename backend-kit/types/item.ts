/**
 * Item Types
 *
 * Type definitions for the generic Item entity.
 * This is a placeholder entity that developers should customize
 * for their specific use case.
 */

/**
 * Item entity from the database
 */
export interface Item {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Input for creating a new item
 */
export interface CreateItemInput {
  title: string;
  description?: string | null;
}

/**
 * Input for updating an existing item
 */
export interface UpdateItemInput {
  title?: string;
  description?: string | null;
}

/**
 * Paginated list response
 */
export interface PaginatedItemsResponse {
  data: Item[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

/**
 * Query parameters for listing items
 */
export interface ListItemsParams {
  page?: number;
  pageSize?: number;
  sortBy?: 'created_at' | 'updated_at' | 'title';
  sortOrder?: 'asc' | 'desc';
}
