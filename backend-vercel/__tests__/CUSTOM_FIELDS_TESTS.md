# Custom Fields System Tests

Comprehensive test suite for the AI-native custom fields system.

## 🎯 What's Being Tested

### 1. Field Definition CRUD (8 tests)
- ✅ Create boolean fields
- ✅ Create select fields with options
- ✅ Create number fields with min/max
- ✅ Create date fields
- ✅ Enforce unique slug constraint
- ✅ Allow same slug across different entity kinds
- ✅ Test AI permissions (ai_can_read, ai_can_write)
- ✅ Test PII level tracking

### 2. Value Setting/Getting (4 tests)
- ✅ Set custom field values on contacts
- ✅ Get custom field values from contacts
- ✅ Update existing values (merge behavior)
- ✅ Handle null values

### 3. Validation (8 tests)
- ✅ Validate required fields
- ✅ Validate select options
- ✅ Validate number ranges (min/max)
- ✅ Type coercion (string → number, string → boolean)
- ✅ Date string coercion
- ✅ Reject unknown fields
- ✅ Pattern validation (regex)
- ✅ Uniqueness constraints

### 4. AI Tool Generation (7 tests)
- ✅ Generate OpenAI function for setting fields
- ✅ Include AI-writable fields only in set function
- ✅ Include select options as enum
- ✅ Exclude sensitive PII from AI-readable fields
- ✅ Include synonyms in function descriptions
- ✅ Generate correct parameter types
- ✅ Map field types to OpenAI schema types

### 5. Audit Trail (2 tests)
- ✅ Log field changes with old/new values
- ✅ Track change source (ui, api, ai_agent)

### 6. Performance (2 tests)
- ✅ Efficiently query with GIN index
- ✅ Handle large JSONB objects (20+ fields)

### 7. End-to-End Integration (1 test)
- ✅ Full workflow: create field → set value → AI reads it → validate

---

## 🚀 Running the Tests

### Run All Custom Fields Tests
```bash
npm run test:custom-fields
```

### Run Specific Test Groups
```bash
# Field definitions only
npm test -- --testNamePattern="Custom Field Definitions"

# Validation tests only
npm test -- --testNamePattern="Custom Field Validation"

# AI tool generation only
npm test -- --testNamePattern="AI Tool Generation"
```

### Watch Mode
```bash
npm run test:watch -- custom-fields
```

### Coverage Report
```bash
npm run test:coverage -- custom-fields
```

---

## 📊 Test Coverage Goals

| Category | Target Coverage |
|----------|----------------|
| Field Definition CRUD | 100% |
| Value Operations | 100% |
| Validation Logic | 95% |
| AI Tool Generation | 90% |
| Audit Trail | 100% |
| Performance | 80% |

---

## 🧪 Test Data

### Test Organization
- **Org Name**: `Test Org - Custom Fields`
- **Test User**: `customfields-test-{timestamp}@example.com`
- **Test Contact**: Created with `custom` JSONB column

### Test Fields Created
1. **is_vip** (boolean) - AI writable
2. **plan_tier** (select) - Required, AI readable only
3. **ltv** (currency) - With min/max, indexed
4. **renewal_date** (date) - AI writable
5. **ssn** (text) - PII sensitive, AI blocked

### Cleanup
All test data is automatically cleaned up in `afterAll()`:
- Custom field definitions deleted
- Test contact deleted
- Test org deleted
- Test user deleted

---

## 🔍 Key Test Scenarios

### Scenario 1: AI Agent Sets VIP Status
```typescript
// 1. Admin creates field
POST /v1/custom-fields
{
  "slug": "is_vip",
  "type": "boolean",
  "ai_can_write": true
}

// 2. AI generates tool automatically
const tools = await generateCustomFieldTools(orgId);
// Returns: set_contact_custom_fields() with is_vip parameter

// 3. User says: "Mark John as VIP"
// AI calls: set_contact_custom_fields({ contact_id, fields: { is_vip: true } })

// 4. Test validates:
expect(contact.custom.is_vip).toBe(true);
expect(auditLog.changed_via).toBe('ai_agent');
```

### Scenario 2: Validation Prevents Bad Data
```typescript
// Field definition: plan_tier with enum ['free', 'pro', 'enterprise']

// ❌ Invalid value rejected
await validateCustomFields(orgId, 'contact', { plan_tier: 'invalid' });
// Returns: { valid: false, errors: [...] }

// ✅ Valid value accepted
await validateCustomFields(orgId, 'contact', { plan_tier: 'pro' });
// Returns: { valid: true, data: { plan_tier: 'pro' } }
```

### Scenario 3: Type Coercion
```typescript
// AI might send string values
const values = {
  ltv: "50000",        // String
  is_vip: "true",      // String
  renewal_date: "2025-12-01"
};

// System coerces to correct types
const coerced = {
  ltv: 50000,          // Number
  is_vip: true,        // Boolean
  renewal_date: "2025-12-01" // Date string
};
```

---

## 🐛 Debugging Failed Tests

### Common Issues

**1. Unique Constraint Violations**
```
Error: duplicate key value violates unique constraint "custom_field_defs_org_id_entity_kind_slug_key"
```
**Fix**: Ensure test cleanup runs properly. Check `afterAll()` hook.

**2. Type Coercion Failures**
```
Expected: 50000 (number)
Received: "50000" (string)
```
**Fix**: Verify `coerceValue()` function is called before validation.

**3. Missing Field Definitions**
```
Error: Unknown custom field: unknown_field
```
**Fix**: Create field definition before attempting to set values.

**4. AI Tool Generation Empty**
```
Expected: tools.length > 0
Received: 0
```
**Fix**: Ensure at least one field has `ai_can_write = true` or `ai_can_read = true`.

---

## 📈 Performance Benchmarks

| Operation | Target Time | Typical Time |
|-----------|-------------|--------------|
| Create field def | < 100ms | ~50ms |
| Set custom values (5 fields) | < 200ms | ~100ms |
| Get custom values | < 50ms | ~30ms |
| Validate 10 fields | < 100ms | ~40ms |
| Generate AI tools | < 300ms | ~150ms |
| Query with GIN index | < 1000ms | ~200ms |
| Merge 20 fields | < 500ms | ~250ms |

---

## 🔗 Related Files

- **Tests**: `__tests__/api/custom-fields.test.ts`
- **Migration**: `migrations/custom-fields-system.sql`
- **AI Tools**: `lib/custom-fields/ai-tools.ts`
- **Validator**: `lib/custom-fields/validator.ts`
- **API Routes**: 
  - `app/api/v1/custom-fields/route.ts`
  - `app/api/v1/contacts/[id]/custom/route.ts`

---

## ✅ Pre-Deployment Checklist

Before deploying custom fields to production:

- [ ] All 32 tests passing
- [ ] Coverage > 90% for core modules
- [ ] Performance benchmarks met
- [ ] Migration tested on staging database
- [ ] API routes tested with real auth tokens
- [ ] AI tool generation validated
- [ ] Audit trail verified
- [ ] RLS policies tested

---

**Total Tests**: 32  
**Test Categories**: 7  
**Estimated Run Time**: ~30 seconds  
**Last Updated**: 2025-10-09
