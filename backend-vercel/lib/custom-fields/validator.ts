/**
 * Custom Fields Validator
 * 
 * Runtime validation using Zod schemas generated from custom field definitions
 */

import { z } from 'zod';
import type { CustomFieldDef } from './ai-tools';

// ============================================================================
// DYNAMIC ZOD SCHEMA GENERATION
// ============================================================================

/**
 * Build Zod schema for a single custom field
 */
export function buildFieldSchema(def: CustomFieldDef): z.ZodTypeAny {
  let schema: z.ZodTypeAny;

  switch (def.type) {
    case 'text':
    case 'textarea':
    case 'email':
    case 'phone':
    case 'url':
      schema = z.string();
      if (def.pattern) {
        schema = (schema as z.ZodString).regex(new RegExp(def.pattern), {
          message: `Invalid format for ${def.label}`,
        });
      }
      if (def.type === 'email') {
        schema = (schema as z.ZodString).email(`Invalid email for ${def.label}`);
      }
      if (def.type === 'url') {
        schema = (schema as z.ZodString).url(`Invalid URL for ${def.label}`);
      }
      break;

    case 'number':
    case 'currency':
    case 'rating':
      schema = z.number();
      if (def.min_value !== undefined) {
        schema = (schema as z.ZodNumber).min(def.min_value, `${def.label} must be >= ${def.min_value}`);
      }
      if (def.max_value !== undefined) {
        schema = (schema as z.ZodNumber).max(def.max_value, `${def.label} must be <= ${def.max_value}`);
      }
      break;

    case 'integer':
      schema = z.number().int(`${def.label} must be an integer`);
      if (def.min_value !== undefined) {
        schema = (schema as z.ZodNumber).min(def.min_value, `${def.label} must be >= ${def.min_value}`);
      }
      if (def.max_value !== undefined) {
        schema = (schema as z.ZodNumber).max(def.max_value, `${def.label} must be <= ${def.max_value}`);
      }
      break;

    case 'boolean':
      schema = z.boolean();
      break;

    case 'date':
      schema = z.string().refine(
        (val) => {
          const date = new Date(val);
          return !isNaN(date.getTime()) && /^\d{4}-\d{2}-\d{2}$/.test(val);
        },
        { message: `${def.label} must be a valid date (YYYY-MM-DD)` }
      );
      break;

    case 'datetime':
      schema = z.string().refine(
        (val) => {
          const date = new Date(val);
          return !isNaN(date.getTime());
        },
        { message: `${def.label} must be a valid datetime (ISO 8601)` }
      );
      break;

    case 'select':
      if (def.options && def.options.length > 0) {
        const values = def.options.map(o => o.value) as [string, ...string[]];
        schema = z.enum(values, {
          errorMap: () => ({
            message: `${def.label} must be one of: ${values.join(', ')}`,
          }),
        });
      } else {
        schema = z.string();
      }
      break;

    case 'multiselect':
      if (def.options && def.options.length > 0) {
        const values = def.options.map(o => o.value);
        schema = z.array(z.string()).refine(
          (arr) => arr.every(v => values.includes(v)),
          { message: `${def.label} values must be from: ${values.join(', ')}` }
        );
      } else {
        schema = z.array(z.string());
      }
      break;

    case 'json':
      schema = z.any();
      break;

    default:
      schema = z.string();
  }

  // Handle required/optional
  if (!def.required) {
    schema = schema.optional().nullable();
  }

  return schema;
}

/**
 * Build Zod schema for all custom fields
 */
export function buildCustomFieldsSchema(defs: CustomFieldDef[]): z.ZodObject<any> {
  const shape: Record<string, z.ZodTypeAny> = {};

  for (const def of defs) {
    if (!def.is_archived) {
      shape[def.slug] = buildFieldSchema(def);
    }
  }

  return z.object(shape).partial(); // All fields optional in patch
}

// ============================================================================
// VALIDATION HELPERS
// ============================================================================

/**
 * Validate and coerce custom field values
 */
export async function validateAndCoerce(
  values: Record<string, any>,
  defs: CustomFieldDef[]
): Promise<{
  success: boolean;
  data?: Record<string, any>;
  errors?: Array<{ field: string; message: string }>;
}> {
  try {
    const schema = buildCustomFieldsSchema(defs);
    const validated = schema.parse(values);

    return {
      success: true,
      data: validated,
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors = error.errors.map(err => ({
        field: err.path.join('.'),
        message: err.message,
      }));

      return {
        success: false,
        errors,
      };
    }

    return {
      success: false,
      errors: [{ field: '', message: String(error) }],
    };
  }
}

/**
 * Format validation errors for API response
 */
export function formatValidationErrors(
  errors: Array<{ field: string; message: string }>
): { error: string; details: any } {
  return {
    error: 'Validation failed',
    details: errors.reduce((acc, err) => {
      acc[err.field] = err.message;
      return acc;
    }, {} as Record<string, string>),
  };
}

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  buildFieldSchema,
  buildCustomFieldsSchema,
  validateAndCoerce,
  formatValidationErrors,
};
