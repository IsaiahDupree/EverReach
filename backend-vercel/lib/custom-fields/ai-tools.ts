/**
 * AI Tools for Custom Fields
 * 
 * Auto-generates OpenAI function calling schemas from custom field definitions
 * Integrates with existing agent system (lib/agent-tools.ts)
 */

import { getSupabaseServiceClient } from '@/lib/supabase';

// Build-safe: Supabase client created lazily inside functions

// ============================================================================
// TYPES
// ============================================================================

export interface CustomFieldDef {
  id: string;
  org_id: string;
  entity_kind: 'contact' | 'company' | 'deal' | 'interaction' | 'task' | 'note';
  slug: string;
  label: string;
  type: string;
  options?: { value: string; label?: string }[];
  min_value?: number;
  max_value?: number;
  pattern?: string;
  required: boolean;
  unique_across_org: boolean;
  default_value?: any;
  help_text?: string;
  placeholder?: string;
  group_name?: string;
  order_index: number;
  // AI-specific
  ai_can_read: boolean;
  ai_can_write: boolean;
  synonyms?: string[];
  explanation?: string;
  example_values?: string[];
  pii_level: 'none' | 'light' | 'sensitive';
  // Performance
  is_indexed: boolean;
  is_searchable: boolean;
  is_archived: boolean;
}

export interface OpenAIFunctionParameter {
  type: string;
  description?: string;
  enum?: string[];
  items?: any;
  format?: string;
  minimum?: number;
  maximum?: number;
  pattern?: string;
  properties?: Record<string, OpenAIFunctionParameter>; // For nested objects
  required?: string[]; // For nested objects
}

export interface OpenAIFunction {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: {
      type: 'object';
      properties: Record<string, OpenAIFunctionParameter>;
      required: string[];
      additionalProperties?: boolean;
    };
  };
}

// ============================================================================
// FETCH CUSTOM FIELD DEFINITIONS
// ============================================================================

/**
 * Get all custom field definitions for an org and entity kind
 */
export async function getCustomFieldDefs(
  orgId: string,
  entityKind: string,
  options?: {
    aiWritableOnly?: boolean;
    aiReadableOnly?: boolean;
    includeArchived?: boolean;
  }
): Promise<CustomFieldDef[]> {
  let query = getSupabaseServiceClient()
    .from('custom_field_defs')
    .select('*')
    .eq('org_id', orgId)
    .eq('entity_kind', entityKind);

  if (!options?.includeArchived) {
    query = query.eq('is_archived', false);
  }

  if (options?.aiWritableOnly) {
    query = query.eq('ai_can_write', true);
  }

  if (options?.aiReadableOnly) {
    query = query.eq('ai_can_read', true);
  }

  const { data, error } = await query.order('order_index');

  if (error) {
    console.error('Error fetching custom field defs:', error);
    return [];
  }

  return data || [];
}

/**
 * Find custom field by slug or synonym
 */
export async function findCustomFieldByName(
  orgId: string,
  entityKind: string,
  name: string
): Promise<CustomFieldDef | null> {
  const normalizedName = name.toLowerCase().trim();

  const { data, error } = await getSupabaseServiceClient()
    .from('custom_field_defs')
    .select('*')
    .eq('org_id', orgId)
    .eq('entity_kind', entityKind)
    .eq('is_archived', false)
    .or(`slug.eq.${normalizedName},synonyms.cs.{${normalizedName}}`);

  if (error || !data || data.length === 0) {
    return null;
  }

  return data[0];
}

// ============================================================================
// OPENAI FUNCTION GENERATION
// ============================================================================

/**
 * Convert custom field type to OpenAI JSON Schema type
 */
function fieldTypeToOpenAIType(fieldDef: CustomFieldDef): OpenAIFunctionParameter {
  const base = {
    description: fieldDef.explanation || fieldDef.help_text || fieldDef.label,
  };

  // Add examples if available
  if (fieldDef.example_values && fieldDef.example_values.length > 0) {
    base.description += ` Examples: ${fieldDef.example_values.join(', ')}`;
  }

  switch (fieldDef.type) {
    case 'text':
    case 'textarea':
    case 'email':
    case 'phone':
    case 'url':
      return {
        ...base,
        type: 'string',
        pattern: fieldDef.pattern,
      };

    case 'number':
    case 'currency':
    case 'rating':
      return {
        ...base,
        type: 'number',
        minimum: fieldDef.min_value,
        maximum: fieldDef.max_value,
      };

    case 'integer':
      return {
        ...base,
        type: 'integer',
        minimum: fieldDef.min_value,
        maximum: fieldDef.max_value,
      };

    case 'boolean':
      return {
        ...base,
        type: 'boolean',
      };

    case 'date':
      return {
        ...base,
        type: 'string',
        format: 'date',
        description: (base.description || '') + ' Format: YYYY-MM-DD',
      };

    case 'datetime':
      return {
        ...base,
        type: 'string',
        format: 'date-time',
        description: (base.description || '') + ' Format: ISO 8601',
      };

    case 'select':
      return {
        ...base,
        type: 'string',
        enum: fieldDef.options?.map(o => o.value) || [],
        description: (base.description || '') + ` Options: ${fieldDef.options?.map(o => o.label || o.value).join(', ')}`,
      };

    case 'multiselect':
      return {
        ...base,
        type: 'array',
        items: {
          type: 'string',
          enum: fieldDef.options?.map(o => o.value) || [],
        },
        description: (base.description || '') + ` Options: ${fieldDef.options?.map(o => o.label || o.value).join(', ')}`,
      };

    case 'json':
      return {
        ...base,
        type: 'object',
      };

    default:
      return {
        ...base,
        type: 'string',
      };
  }
}

/**
 * Generate OpenAI function for setting custom fields
 */
export async function buildSetCustomFieldsTool(
  orgId: string,
  entityKind: string = 'contact'
): Promise<OpenAIFunction> {
  const defs = await getCustomFieldDefs(orgId, entityKind, { aiWritableOnly: true });

  const properties: Record<string, OpenAIFunctionParameter> = {};
  const required: string[] = [];

  for (const def of defs) {
    properties[def.slug] = fieldTypeToOpenAIType(def);
    if (def.required) {
      required.push(def.slug);
    }
  }

  // Add synonyms to description for better AI understanding
  const synonymsDoc = defs
    .filter(d => d.synonyms && d.synonyms.length > 0)
    .map(d => `- ${d.label} (${d.slug}): also called ${d.synonyms!.join(', ')}`)
    .join('\n');

  return {
    type: 'function',
    function: {
      name: `set_${entityKind}_custom_fields`,
      description: `Update custom fields on a ${entityKind}. Only modify fields explicitly requested by the user. Available fields:\n${synonymsDoc || 'See parameters for available fields.'}`,
      parameters: {
        type: 'object',
        properties: {
          [`${entityKind}_id`]: {
            type: 'string',
            description: `UUID of the ${entityKind} to update`,
          },
          fields: {
            type: 'object',
            properties,
            description: 'Custom field values to set',
          },
        },
        required: [`${entityKind}_id`, 'fields'],
        additionalProperties: false,
      },
    },
  };
}

/**
 * Generate OpenAI function for getting custom fields
 */
export async function buildGetCustomFieldsTool(
  orgId: string,
  entityKind: string = 'contact'
): Promise<OpenAIFunction> {
  const defs = await getCustomFieldDefs(orgId, entityKind, { aiReadableOnly: true });

  const availableFields = defs.map(d => `${d.label} (${d.slug})`).join(', ');

  return {
    type: 'function',
    function: {
      name: `get_${entityKind}_custom_fields`,
      description: `Retrieve custom field values for a ${entityKind}. Available fields: ${availableFields}`,
      parameters: {
        type: 'object',
        properties: {
          [`${entityKind}_id`]: {
            type: 'string',
            description: `UUID of the ${entityKind}`,
          },
          fields: {
            type: 'array',
            items: { type: 'string' },
            description: 'List of field slugs to retrieve (leave empty for all readable fields)',
          },
        },
        required: [`${entityKind}_id`],
      },
    },
  };
}

/**
 * Generate OpenAI function for searching by custom fields
 */
export async function buildSearchByCustomFieldsTool(
  orgId: string,
  entityKind: string = 'contact'
): Promise<OpenAIFunction> {
  const defs = await getCustomFieldDefs(orgId, entityKind, { aiReadableOnly: true });

  const filterableFields = defs
    .filter(d => d.is_indexed || d.is_searchable)
    .map(d => `${d.label} (${d.slug}, type: ${d.type})`)
    .join(', ');

  return {
    type: 'function',
    function: {
      name: `search_${entityKind}s_by_custom_fields`,
      description: `Search ${entityKind}s by custom field values. Best performance on indexed fields: ${filterableFields}`,
      parameters: {
        type: 'object',
        properties: {
          filters: {
            type: 'object',
            description: 'Custom field filters. Use slug as key and value/operator as value.',
            properties: {
              // Dynamic based on defs, but for now generic
            },
          },
          limit: {
            type: 'integer',
            description: 'Maximum number of results',
            minimum: 1,
            maximum: 100,
          },
        },
        required: ['filters'],
      },
    },
  };
}

// ============================================================================
// GENERATE ALL CUSTOM FIELD TOOLS FOR AGENT
// ============================================================================

/**
 * Generate all custom field tools for the AI agent
 * This integrates with your existing agent-tools.ts
 */
export async function generateCustomFieldTools(
  orgId: string,
  entityKinds: string[] = ['contact']
): Promise<OpenAIFunction[]> {
  const tools: OpenAIFunction[] = [];

  for (const entityKind of entityKinds) {
    // Get writable fields
    const writableDefs = await getCustomFieldDefs(orgId, entityKind, { aiWritableOnly: true });
    if (writableDefs.length > 0) {
      tools.push(await buildSetCustomFieldsTool(orgId, entityKind));
    }

    // Get readable fields
    const readableDefs = await getCustomFieldDefs(orgId, entityKind, { aiReadableOnly: true });
    if (readableDefs.length > 0) {
      tools.push(await buildGetCustomFieldsTool(orgId, entityKind));
      tools.push(await buildSearchByCustomFieldsTool(orgId, entityKind));
    }
  }

  return tools;
}

// ============================================================================
// VALUE COERCION (for safe type conversion)
// ============================================================================

const TYPE_COERCERS: Record<string, (value: any) => any> = {
  text: (v) => String(v),
  textarea: (v) => String(v),
  email: (v) => String(v),
  phone: (v) => String(v),
  url: (v) => String(v),
  number: (v) => (v === null || v === '' ? null : Number(v)),
  integer: (v) => (v === null || v === '' ? null : Math.trunc(Number(v))),
  currency: (v) => (v === null || v === '' ? null : Number(v)),
  rating: (v) => (v === null || v === '' ? null : Number(v)),
  boolean: (v) => Boolean(v),
  date: (v) => (v ? new Date(v).toISOString().slice(0, 10) : null),
  datetime: (v) => (v ? new Date(v).toISOString() : null),
  select: (v) => (v ?? null),
  multiselect: (v) => (Array.isArray(v) ? v : []),
  json: (v) => v,
};

/**
 * Coerce value to correct type based on field definition
 */
export function coerceValue(value: any, fieldDef: CustomFieldDef): any {
  const coercer = TYPE_COERCERS[fieldDef.type];
  if (!coercer) {
    return value;
  }
  return coercer(value);
}

// ============================================================================
// VALIDATION
// ============================================================================

export interface ValidationError {
  field: string;
  error: string;
  details?: any;
}

/**
 * Validate custom field values against definitions
 */
export async function validateCustomFields(
  orgId: string,
  entityKind: string,
  values: Record<string, any>
): Promise<{ valid: boolean; errors: ValidationError[] }> {
  const errors: ValidationError[] = [];

  // Get all field definitions
  const defs = await getCustomFieldDefs(orgId, entityKind);
  const defsBySlug = new Map(defs.map(d => [d.slug, d]));

  // Check for unknown fields
  for (const slug of Object.keys(values)) {
    if (!defsBySlug.has(slug)) {
      errors.push({
        field: slug,
        error: 'unknown_field',
        details: `Field '${slug}' is not defined for ${entityKind}`,
      });
    }
  }

  // Validate each field
  for (const [slug, value] of Object.entries(values)) {
    const def = defsBySlug.get(slug);
    if (!def) continue;

    // Check required
    if (def.required && (value === null || value === '' || (Array.isArray(value) && value.length === 0))) {
      errors.push({
        field: slug,
        error: 'required',
        details: `${def.label} is required`,
      });
    }

    // Check select options
    if (def.type === 'select' && def.options && value !== null && value !== '') {
      const validOptions = def.options.map(o => o.value);
      if (!validOptions.includes(value)) {
        errors.push({
          field: slug,
          error: 'invalid_option',
          details: `Invalid value for ${def.label}. Allowed: ${validOptions.join(', ')}`,
        });
      }
    }

    // Check multiselect options
    if (def.type === 'multiselect' && def.options && Array.isArray(value)) {
      const validOptions = new Set(def.options.map(o => o.value));
      const invalidValues = value.filter(v => !validOptions.has(v));
      if (invalidValues.length > 0) {
        errors.push({
          field: slug,
          error: 'invalid_option',
          details: `Invalid values for ${def.label}: ${invalidValues.join(', ')}`,
        });
      }
    }

    // Check number range
    if (['number', 'integer', 'currency', 'rating'].includes(def.type)) {
      const numValue = Number(value);
      if (def.min_value !== undefined && numValue < def.min_value) {
        errors.push({
          field: slug,
          error: 'out_of_range',
          details: `${def.label} must be >= ${def.min_value}`,
        });
      }
      if (def.max_value !== undefined && numValue > def.max_value) {
        errors.push({
          field: slug,
          error: 'out_of_range',
          details: `${def.label} must be <= ${def.max_value}`,
        });
      }
    }

    // Check pattern
    if (def.pattern && typeof value === 'string') {
      const regex = new RegExp(def.pattern);
      if (!regex.test(value)) {
        errors.push({
          field: slug,
          error: 'pattern_mismatch',
          details: `${def.label} does not match required format`,
        });
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Check uniqueness constraint
 */
export async function checkUniqueness(
  orgId: string,
  entityKind: string,
  entityId: string,
  slug: string,
  value: any
): Promise<boolean> {
  const tableName = `${entityKind}s`; // contacts, companies, etc.

  const { data, error } = await getSupabaseServiceClient()
    .from(tableName)
    .select('id')
    .eq('org_id', orgId)
    .neq('id', entityId)
    .eq(`custom->>${slug}`, String(value))
    .limit(1);

  if (error) {
    console.error('Uniqueness check error:', error);
    return false;
  }

  return (data?.length || 0) === 0;
}

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  getCustomFieldDefs,
  findCustomFieldByName,
  buildSetCustomFieldsTool,
  buildGetCustomFieldsTool,
  buildSearchByCustomFieldsTool,
  generateCustomFieldTools,
  coerceValue,
  validateCustomFields,
  checkUniqueness,
};
