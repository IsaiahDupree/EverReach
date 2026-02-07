/**
 * Input Validation Utility
 *
 * Provides Zod-based input validation helpers for API endpoints.
 * This ensures consistent validation and error formatting across the API.
 *
 * @example
 * ```typescript
 * import { validateInput } from '@/lib/utils/validation';
 * import { CreateItemSchema } from '@/lib/validation/item';
 *
 * const result = validateInput(CreateItemSchema, body);
 * if (!result.success) {
 *   return NextResponse.json(
 *     formatZodErrors(result.error),
 *     { status: 400 }
 *   );
 * }
 * ```
 */

import { z } from 'zod';

/**
 * Validates input data against a Zod schema
 *
 * @param schema - The Zod schema to validate against
 * @param data - The data to validate
 * @returns SafeParseReturnType from Zod with typed success/error
 */
export function validateInput<T extends z.ZodTypeAny>(
  schema: T,
  data: unknown
): z.SafeParseReturnType<z.input<T>, z.output<T>> {
  return schema.safeParse(data);
}

/**
 * Error response format for validation errors
 */
export interface ValidationErrorResponse {
  errors: Array<{
    field: string;
    message: string;
  }>;
}

/**
 * Formats Zod validation errors into a user-friendly error response
 *
 * @param error - The ZodError from validation
 * @returns Formatted error response with field-specific messages
 */
export function formatZodErrors(error: z.ZodError): ValidationErrorResponse {
  const errors = error.issues.map((issue) => {
    // Build the field path (e.g., "user.email" or "title")
    const field = issue.path.length > 0 ? issue.path.join('.') : 'unknown';

    return {
      field,
      message: issue.message,
    };
  });

  return { errors };
}

/**
 * Helper to create standard validation error responses
 *
 * @param schema - The Zod schema to validate against
 * @param data - The data to validate
 * @returns Object with success flag and either data or formatted errors
 */
export function validate<T extends z.ZodTypeAny>(
  schema: T,
  data: unknown
):
  | { success: true; data: z.output<T> }
  | { success: false; errors: ValidationErrorResponse } {
  const result = validateInput(schema, data);

  if (result.success) {
    return { success: true, data: result.data };
  }

  return {
    success: false,
    errors: formatZodErrors(result.error),
  };
}

/**
 * Common Zod refinements and helpers
 */

/**
 * Creates a trimmed string schema that removes leading/trailing whitespace
 */
export const trimmedString = (schema?: z.ZodString) => {
  const baseSchema = schema || z.string();
  return baseSchema.transform((val) => val.trim());
};

/**
 * Creates a non-empty string schema with trimming
 */
export const nonEmptyString = (message = 'This field is required') => {
  return trimmedString().min(1, message);
};

/**
 * Creates a pagination schema with sensible defaults
 */
export function createPaginationSchema(
  maxPageSize = 100,
  defaultPageSize = 10
) {
  return z.object({
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(maxPageSize).default(defaultPageSize),
  });
}

/**
 * Creates a search query schema
 */
export const createSearchSchema = () => {
  return z.object({
    q: z.string().min(1).max(500).optional(),
    limit: z.coerce.number().int().min(1).max(100).default(20),
  });
};
