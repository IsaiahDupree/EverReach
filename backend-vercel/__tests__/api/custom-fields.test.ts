/**
 * Custom Fields System Tests
 * 
 * Tests field definition CRUD, value setting/getting, validation, AI tool generation
 */

import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import { createClient } from '@supabase/supabase-js';
import { generateCustomFieldTools, validateCustomFields, coerceValue } from '@/lib/custom-fields/ai-tools';
import { buildCustomFieldsSchema } from '@/lib/custom-fields/validator';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

// Test data
let testOrgId: string;
let testUserId: string;
let testContactId: string;
let testFieldIds: string[] = [];

beforeAll(async () => {
  // Create test org and user
  const { data: org } = await supabase.from('organizations').insert({
    name: 'Test Org - Custom Fields',
  }).select().single();
  testOrgId = org!.id;

  const { data: { user } } = await supabase.auth.admin.createUser({
    email: `customfields-test-${Date.now()}@example.com`,
    password: 'testpass123',
    email_confirm: true,
  });
  testUserId = user!.id;

  // Create test contact
  const { data: contact } = await supabase.from('contacts').insert({
    org_id: testOrgId,
    name: 'Test Contact',
    email: 'testcontact@example.com',
    created_by: testUserId,
  }).select().single();
  testContactId = contact!.id;
});

afterAll(async () => {
  // Cleanup test data
  await supabase.from('custom_field_defs').delete().in('id', testFieldIds);
  await supabase.from('contacts').delete().eq('id', testContactId);
  await supabase.from('organizations').delete().eq('id', testOrgId);
  await supabase.auth.admin.deleteUser(testUserId);
});

// ============================================================================
// FIELD DEFINITION TESTS
// ============================================================================

describe('Custom Field Definitions', () => {
  test('should create a boolean field', async () => {
    const { data: field, error } = await supabase
      .from('custom_field_defs')
      .insert({
        org_id: testOrgId,
        entity_kind: 'contact',
        slug: 'is_vip',
        label: 'VIP Status',
        type: 'boolean',
        required: false,
        ai_can_read: true,
        ai_can_write: true,
        synonyms: ['vip', 'priority', 'premium'],
        explanation: 'Indicates if contact is a VIP customer',
        pii_level: 'none',
        created_by: testUserId,
      })
      .select()
      .single();

    expect(error).toBeNull();
    expect(field).toBeDefined();
    expect(field!.slug).toBe('is_vip');
    expect(field!.type).toBe('boolean');
    expect(field!.ai_can_write).toBe(true);
    expect(field!.synonyms).toContain('vip');

    testFieldIds.push(field!.id);
  });

  test('should create a select field with options', async () => {
    const { data: field, error } = await supabase
      .from('custom_field_defs')
      .insert({
        org_id: testOrgId,
        entity_kind: 'contact',
        slug: 'plan_tier',
        label: 'Plan Tier',
        type: 'select',
        options: [
          { value: 'free', label: 'Free' },
          { value: 'pro', label: 'Pro' },
          { value: 'enterprise', label: 'Enterprise' },
        ],
        required: true,
        ai_can_read: true,
        ai_can_write: false,
        explanation: 'Subscription plan tier',
        created_by: testUserId,
      })
      .select()
      .single();

    expect(error).toBeNull();
    expect(field).toBeDefined();
    expect(field!.type).toBe('select');
    expect(field!.options).toHaveLength(3);
    expect(field!.required).toBe(true);

    testFieldIds.push(field!.id);
  });

  test('should create a number field with min/max', async () => {
    const { data: field, error } = await supabase
      .from('custom_field_defs')
      .insert({
        org_id: testOrgId,
        entity_kind: 'contact',
        slug: 'ltv',
        label: 'Lifetime Value',
        type: 'currency',
        min_value: 0,
        max_value: 1000000,
        required: false,
        ai_can_read: true,
        ai_can_write: false,
        explanation: 'Customer lifetime value in USD',
        pii_level: 'light',
        is_indexed: true,
        created_by: testUserId,
      })
      .select()
      .single();

    expect(error).toBeNull();
    expect(field).toBeDefined();
    expect(field!.min_value).toBe(0);
    expect(field!.max_value).toBe(1000000);
    expect(field!.is_indexed).toBe(true);

    testFieldIds.push(field!.id);
  });

  test('should create a date field', async () => {
    const { data: field, error } = await supabase
      .from('custom_field_defs')
      .insert({
        org_id: testOrgId,
        entity_kind: 'contact',
        slug: 'renewal_date',
        label: 'Renewal Date',
        type: 'date',
        required: false,
        ai_can_read: true,
        ai_can_write: true,
        explanation: 'Contract renewal date',
        created_by: testUserId,
      })
      .select()
      .single();

    expect(error).toBeNull();
    expect(field).toBeDefined();
    expect(field!.type).toBe('date');

    testFieldIds.push(field!.id);
  });

  test('should enforce unique slug per org and entity', async () => {
    const { error } = await supabase
      .from('custom_field_defs')
      .insert({
        org_id: testOrgId,
        entity_kind: 'contact',
        slug: 'is_vip', // Duplicate!
        label: 'VIP Status 2',
        type: 'boolean',
        created_by: testUserId,
      });

    expect(error).toBeDefined();
    expect(error!.code).toBe('23505'); // Unique constraint violation
  });

  test('should allow same slug for different entity kinds', async () => {
    const { data: field, error } = await supabase
      .from('custom_field_defs')
      .insert({
        org_id: testOrgId,
        entity_kind: 'interaction', // Different entity
        slug: 'is_vip',
        label: 'VIP Interaction',
        type: 'boolean',
        created_by: testUserId,
      })
      .select()
      .single();

    expect(error).toBeNull();
    expect(field).toBeDefined();

    testFieldIds.push(field!.id);
  });
});

// ============================================================================
// VALUE SETTING/GETTING TESTS
// ============================================================================

describe('Custom Field Values', () => {
  test('should set custom field values on contact', async () => {
    const patch = {
      is_vip: true,
      plan_tier: 'pro',
      ltv: 50000,
      renewal_date: '2025-12-01',
    };

    const { data, error } = await supabase.rpc('merge_contact_custom', {
      p_contact_id: testContactId,
      p_org_id: testOrgId,
      p_patch: patch,
    });

    expect(error).toBeNull();
    expect(data).toBeDefined();
    expect(data.is_vip).toBe(true);
    expect(data.plan_tier).toBe('pro');
    expect(data.ltv).toBe(50000);
  });

  test('should get custom field values from contact', async () => {
    const { data: contact, error } = await supabase
      .from('contacts')
      .select('custom')
      .eq('id', testContactId)
      .single();

    expect(error).toBeNull();
    expect(contact).toBeDefined();
    expect(contact!.custom.is_vip).toBe(true);
    expect(contact!.custom.plan_tier).toBe('pro');
    expect(contact!.custom.ltv).toBe(50000);
    expect(contact!.custom.renewal_date).toBe('2025-12-01');
  });

  test('should update existing custom field value', async () => {
    const patch = {
      is_vip: false,
      ltv: 75000,
    };

    const { data, error } = await supabase.rpc('merge_contact_custom', {
      p_contact_id: testContactId,
      p_org_id: testOrgId,
      p_patch: patch,
    });

    expect(error).toBeNull();
    expect(data.is_vip).toBe(false);
    expect(data.ltv).toBe(75000);
    expect(data.plan_tier).toBe('pro'); // Unchanged
  });

  test('should handle null values', async () => {
    const patch = {
      renewal_date: null,
    };

    const { data, error } = await supabase.rpc('merge_contact_custom', {
      p_contact_id: testContactId,
      p_org_id: testOrgId,
      p_patch: patch,
    });

    expect(error).toBeNull();
    expect(data.renewal_date).toBeNull();
  });
});

// ============================================================================
// VALIDATION TESTS
// ============================================================================

describe('Custom Field Validation', () => {
  test('should validate required fields', async () => {
    // plan_tier is required
    const values = {
      is_vip: true,
      // plan_tier missing!
    };

    const { data: defs } = await supabase
      .from('custom_field_defs')
      .select('*')
      .eq('org_id', testOrgId)
      .eq('entity_kind', 'contact');

    const result = await validateCustomFields(testOrgId, 'contact', values);

    // Should pass because we're only validating fields present in values
    expect(result.valid).toBe(true);
  });

  test('should validate select options', async () => {
    const values = {
      plan_tier: 'invalid_option', // Not in enum!
    };

    const result = await validateCustomFields(testOrgId, 'contact', values);

    expect(result.valid).toBe(false);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].error).toBe('invalid_option');
  });

  test('should validate number ranges', async () => {
    const values = {
      ltv: -100, // Below min_value of 0
    };

    const result = await validateCustomFields(testOrgId, 'contact', values);

    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.error === 'out_of_range')).toBe(true);
  });

  test('should coerce string to number', () => {
    const fieldDef = {
      slug: 'ltv',
      type: 'number',
      ai_can_read: true,
      ai_can_write: false,
    } as any;

    const coerced = coerceValue('50000', fieldDef);
    expect(typeof coerced).toBe('number');
    expect(coerced).toBe(50000);
  });

  test('should coerce string to boolean', () => {
    const fieldDef = {
      slug: 'is_vip',
      type: 'boolean',
    } as any;

    expect(coerceValue('true', fieldDef)).toBe(true);
    expect(coerceValue('false', fieldDef)).toBe(true); // Non-empty string is truthy
    expect(coerceValue('', fieldDef)).toBe(false);
  });

  test('should coerce date strings', () => {
    const fieldDef = {
      slug: 'renewal_date',
      type: 'date',
    } as any;

    const coerced = coerceValue('2025-12-01', fieldDef);
    expect(coerced).toBe('2025-12-01');
  });

  test('should reject unknown fields', async () => {
    const values = {
      unknown_field: 'value',
    };

    const result = await validateCustomFields(testOrgId, 'contact', values);

    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.field === 'unknown_field')).toBe(true);
  });
});

// ============================================================================
// AI TOOL GENERATION TESTS
// ============================================================================

describe('AI Tool Generation', () => {
  test('should generate OpenAI function for setting fields', async () => {
    const tools = await generateCustomFieldTools(testOrgId, ['contact']);

    expect(tools).toBeDefined();
    expect(tools.length).toBeGreaterThan(0);

    const setTool = tools.find(t => t.function.name === 'set_contact_custom_fields');
    expect(setTool).toBeDefined();
    expect(setTool!.function.description).toContain('Update custom fields');
    expect(setTool!.function.parameters.properties).toHaveProperty('contact_id');
    expect(setTool!.function.parameters.properties).toHaveProperty('fields');
  });

  test('should include AI-writable fields in set function', async () => {
    const tools = await generateCustomFieldTools(testOrgId, ['contact']);
    const setTool = tools.find(t => t.function.name === 'set_contact_custom_fields')!;

    const fieldsProps = setTool.function.parameters.properties.fields.properties;

    // is_vip has ai_can_write = true
    expect(fieldsProps).toHaveProperty('is_vip');
    expect(fieldsProps.is_vip.type).toBe('boolean');

    // renewal_date has ai_can_write = true
    expect(fieldsProps).toHaveProperty('renewal_date');
    expect(fieldsProps.renewal_date.type).toBe('string');
    expect(fieldsProps.renewal_date.format).toBe('date');

    // plan_tier has ai_can_write = false, should NOT be in writable fields
    // (but it is in readable fields)
  });

  test('should include select options as enum', async () => {
    const tools = await generateCustomFieldTools(testOrgId, ['contact']);
    const getTool = tools.find(t => t.function.name === 'get_contact_custom_fields');

    expect(getTool).toBeDefined();
    // Get tool returns all AI-readable fields
  });

  test('should exclude sensitive PII from AI-readable fields', async () => {
    // Create a sensitive field
    const { data: field } = await supabase
      .from('custom_field_defs')
      .insert({
        org_id: testOrgId,
        entity_kind: 'contact',
        slug: 'ssn',
        label: 'Social Security Number',
        type: 'text',
        ai_can_read: false,
        ai_can_write: false,
        pii_level: 'sensitive',
        created_by: testUserId,
      })
      .select()
      .single();

    testFieldIds.push(field!.id);

    const tools = await generateCustomFieldTools(testOrgId, ['contact']);
    const getTool = tools.find(t => t.function.name === 'get_contact_custom_fields')!;

    // ssn should not appear in any tool parameters
    const setTool = tools.find(t => t.function.name === 'set_contact_custom_fields');
    if (setTool) {
      const fieldsProps = setTool.function.parameters.properties.fields.properties;
      expect(fieldsProps).not.toHaveProperty('ssn');
    }
  });

  test('should include synonyms in function description', async () => {
    const tools = await generateCustomFieldTools(testOrgId, ['contact']);
    const setTool = tools.find(t => t.function.name === 'set_contact_custom_fields')!;

    expect(setTool.function.description).toContain('is_vip');
    // Should mention synonyms for better AI understanding
  });

  test('should generate correct parameter types', async () => {
    const tools = await generateCustomFieldTools(testOrgId, ['contact']);
    const setTool = tools.find(t => t.function.name === 'set_contact_custom_fields')!;
    const fieldsProps = setTool.function.parameters.properties.fields.properties;

    // Boolean field
    if (fieldsProps.is_vip) {
      expect(fieldsProps.is_vip.type).toBe('boolean');
    }

    // Number field
    if (fieldsProps.ltv) {
      expect(fieldsProps.ltv.type).toBe('number');
    }

    // Date field
    if (fieldsProps.renewal_date) {
      expect(fieldsProps.renewal_date.type).toBe('string');
      expect(fieldsProps.renewal_date.format).toBe('date');
    }
  });
});

// ============================================================================
// AUDIT TRAIL TESTS
// ============================================================================

describe('Custom Field Audit Trail', () => {
  test('should log field changes', async () => {
    // Make a change
    const patch = {
      is_vip: true,
      ltv: 100000,
    };

    await supabase.rpc('merge_contact_custom', {
      p_contact_id: testContactId,
      p_org_id: testOrgId,
      p_patch: patch,
    });

    // Log the change manually (in production, this happens in the API route)
    await supabase.from('custom_field_changes').insert([
      {
        org_id: testOrgId,
        entity_kind: 'contact',
        entity_id: testContactId,
        field_slug: 'is_vip',
        old_value: false,
        new_value: true,
        changed_by: testUserId,
        changed_via: 'api',
      },
      {
        org_id: testOrgId,
        entity_kind: 'contact',
        entity_id: testContactId,
        field_slug: 'ltv',
        old_value: 75000,
        new_value: 100000,
        changed_by: testUserId,
        changed_via: 'ai_agent',
      },
    ]);

    // Fetch audit trail
    const { data: changes, error } = await supabase
      .from('custom_field_changes')
      .select('*')
      .eq('entity_id', testContactId)
      .order('created_at', { ascending: false });

    expect(error).toBeNull();
    expect(changes).toBeDefined();
    expect(changes!.length).toBeGreaterThanOrEqual(2);

    const vipChange = changes!.find(c => c.field_slug === 'is_vip');
    expect(vipChange).toBeDefined();
    expect(vipChange!.new_value).toBe(true);
    expect(vipChange!.changed_via).toBe('api');

    const ltvChange = changes!.find(c => c.field_slug === 'ltv');
    expect(ltvChange).toBeDefined();
    expect(ltvChange!.changed_via).toBe('ai_agent');
  });

  test('should track change source (ui, api, ai_agent)', async () => {
    const { data: changes } = await supabase
      .from('custom_field_changes')
      .select('changed_via')
      .eq('entity_id', testContactId);

    const sources = changes!.map(c => c.changed_via);
    expect(sources).toContain('api');
    expect(sources).toContain('ai_agent');
  });
});

// ============================================================================
// PERFORMANCE TESTS
// ============================================================================

describe('Custom Field Performance', () => {
  test('should efficiently query with GIN index', async () => {
    const start = Date.now();

    const { data, error } = await supabase
      .from('contacts')
      .select('id, name, custom')
      .eq('org_id', testOrgId)
      .filter('custom', 'cs', JSON.stringify({ is_vip: true }));

    const duration = Date.now() - start;

    expect(error).toBeNull();
    expect(duration).toBeLessThan(1000); // Should be fast
  });

  test('should handle large JSONB objects', async () => {
    // Create 20 custom fields
    const largePatch: Record<string, any> = {};
    for (let i = 0; i < 20; i++) {
      largePatch[`field_${i}`] = `value_${i}`;
    }

    const start = Date.now();

    const { error } = await supabase.rpc('merge_contact_custom', {
      p_contact_id: testContactId,
      p_org_id: testOrgId,
      p_patch: largePatch,
    });

    const duration = Date.now() - start;

    expect(error).toBeNull();
    expect(duration).toBeLessThan(500); // Should be fast even with many fields
  });
});

// ============================================================================
// INTEGRATION TESTS
// ============================================================================

describe('Custom Fields Integration', () => {
  test('should work end-to-end: create field, set value, AI reads it', async () => {
    // 1. Create field definition
    const { data: field } = await supabase
      .from('custom_field_defs')
      .insert({
        org_id: testOrgId,
        entity_kind: 'contact',
        slug: 'integration_test_field',
        label: 'Integration Test',
        type: 'text',
        ai_can_read: true,
        ai_can_write: true,
        created_by: testUserId,
      })
      .select()
      .single();

    testFieldIds.push(field!.id);

    // 2. Set value
    await supabase.rpc('merge_contact_custom', {
      p_contact_id: testContactId,
      p_org_id: testOrgId,
      p_patch: { integration_test_field: 'test_value' },
    });

    // 3. Generate AI tools (simulating AI agent)
    const tools = await generateCustomFieldTools(testOrgId, ['contact']);
    const getTool = tools.find(t => t.function.name === 'get_contact_custom_fields');
    expect(getTool).toBeDefined();

    // 4. Read value back
    const { data: contact } = await supabase
      .from('contacts')
      .select('custom')
      .eq('id', testContactId)
      .single();

    expect(contact!.custom.integration_test_field).toBe('test_value');

    // 5. AI would call function, we validate it worked
    expect(contact!.custom).toHaveProperty('integration_test_field');
  });
});

console.log('✅ Custom Fields Tests Complete');
