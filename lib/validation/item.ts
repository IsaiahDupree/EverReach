/**
 * Item Validation Schemas
 *
 * Zod schemas for validating Item entity input.
 * These are placeholder schemas that developers should customize
 * for their specific use case.
 *
 * @example
 * ```typescript
 * import { CreateItemSchema } from '@/lib/validation/item';
 *
 * const result = CreateItemSchema.safeParse(body);
 * if (!result.success) {
 *   return NextResponse.json({ error: result.error }, { status: 400 });
 * }
 * ```
 */

import { z } from 'zod';
import { trimmedString, nonEmptyString } from '../utils/validation';

/**
 * Schema for creating a new item
 *
 * Validates:
 * - title: Required, non-empty, max 500 characters
 * - description: Optional, max 5000 characters
 */
export const CreateItemSchema = z.object({
  title: trimmedString(z.string().min(1, 'Title is required').max(500, 'Title must be 500 characters or less')),
  description: trimmedString(z.string().max(5000, 'Description must be 5000 characters or less')).optional().nullable(),
});

/**
 * Type inference for CreateItemSchema
 */
export type CreateItemInput = z.infer<typeof CreateItemSchema>;

/**
 * Schema for updating an existing item
 *
 * Validates:
 * - title: Optional, but if provided must be non-empty and max 500 characters
 * - description: Optional, max 5000 characters, can be null
 *
 * At least one field must be provided for update
 */
export const UpdateItemSchema = z
  .object({
    title: trimmedString(z.string().min(1, 'Title cannot be empty').max(500, 'Title must be 500 characters or less')).optional(),
    description: trimmedString(z.string().max(5000, 'Description must be 5000 characters or less')).optional().nullable(),
  })
  .refine(
    (data) => data.title !== undefined || data.description !== undefined,
    {
      message: 'At least one field (title or description) must be provided for update',
    }
  );

/**
 * Type inference for UpdateItemSchema
 */
export type UpdateItemInput = z.infer<typeof UpdateItemSchema>;

/**
 * Schema for list/query parameters
 *
 * Validates:
 * - page: Integer >= 1, defaults to 1
 * - pageSize: Integer 1-100, defaults to 10
 * - sortBy: One of the allowed fields, defaults to 'created_at'
 * - sortOrder: 'asc' or 'desc', defaults to 'desc'
 */
export const ListItemsParamsSchema = z.object({
  page: z.coerce.number().int().min(1, 'Page must be at least 1').default(1),
  pageSize: z.coerce
    .number()
    .int()
    .min(1, 'Page size must be at least 1')
    .max(100, 'Page size cannot exceed 100')
    .default(10),
  sortBy: z.enum(['created_at', 'updated_at', 'title']).default('created_at'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

/**
 * Type inference for ListItemsParamsSchema
 */
export type ListItemsParams = z.infer<typeof ListItemsParamsSchema>;

/**
 * Schema for search parameters
 *
 * Validates:
 * - q: Search query string, optional, max 500 characters
 * - page: Integer >= 1, defaults to 1
 * - pageSize: Integer 1-100, defaults to 10
 */
export const SearchItemsSchema = z.object({
  q: z.string().min(1, 'Search query cannot be empty').max(500, 'Search query too long').optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(10),
});

/**
 * Type inference for SearchItemsSchema
 */
export type SearchItemsParams = z.infer<typeof SearchItemsSchema>;

/**
 * Schema for item ID parameter
 */
export const ItemIdSchema = z.object({
  id: z.string().uuid('Invalid item ID format'),
});

/**
 * Type inference for ItemIdSchema
 */
export type ItemIdParams = z.infer<typeof ItemIdSchema>;
