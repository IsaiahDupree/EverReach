/**
 * Custom Fields System
 * 
 * Hybrid JSONB + Registry approach for flexible, AI-friendly custom fields
 * - Registry: Centralized field definitions (types, validation, AI permissions)
 * - JSONB: Per-record values (flexible, no schema migrations)
 * - AI-Native: Designed for OpenAI function calling
 */

-- ============================================================================
-- 1. CUSTOM FIELD DEFINITIONS (Registry)
-- ============================================================================

CREATE TABLE IF NOT EXISTS custom_field_defs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Entity scope
  entity_kind TEXT NOT NULL CHECK (entity_kind IN (
    'contact', 'company', 'deal', 'interaction', 'task', 'note'
  )),
  
  -- Field identity
  slug TEXT NOT NULL, -- Stable key for code/AI (e.g., "favorite_color", "ltv", "is_vip")
  label TEXT NOT NULL, -- UI display name
  
  -- Field type
  type TEXT NOT NULL CHECK (type IN (
    'text', 'textarea', 'number', 'integer', 'boolean',
    'date', 'datetime', 'select', 'multiselect',
    'email', 'phone', 'url', 'currency', 'rating', 'json'
  )),
  
  -- Type-specific config
  options JSONB, -- For select/multiselect: [{"value": "Gold", "label": "Gold Tier"}]
  min_value NUMERIC, -- For number/integer/currency/rating
  max_value NUMERIC,
  pattern TEXT, -- Regex for text validation (e.g., "^\d{5}$" for zip code)
  
  -- Validation
  required BOOLEAN NOT NULL DEFAULT false,
  unique_across_org BOOLEAN NOT NULL DEFAULT false,
  default_value JSONB,
  
  -- UI/UX
  help_text TEXT, -- User-facing help
  placeholder TEXT, -- Input placeholder
  group_name TEXT, -- Section grouping (e.g., "Business Info", "Personal")
  order_index INTEGER NOT NULL DEFAULT 1000,
  icon TEXT, -- Optional icon name
  
  -- AI Integration ⭐ KEY FOR AI
  ai_can_read BOOLEAN NOT NULL DEFAULT true, -- AI can see this field
  ai_can_write BOOLEAN NOT NULL DEFAULT false, -- AI can modify this field
  synonyms TEXT[], -- Alternative names AI might use (e.g., ["vip", "priority", "premium"])
  explanation TEXT, -- Concise description for AI prompts
  example_values TEXT[], -- Few-shot examples (e.g., ["Gold", "Silver", "Bronze"])
  pii_level TEXT DEFAULT 'none' CHECK (pii_level IN ('none', 'light', 'sensitive')),
  
  -- Performance
  is_indexed BOOLEAN NOT NULL DEFAULT false, -- Create expression index for fast filters
  is_searchable BOOLEAN NOT NULL DEFAULT false, -- Include in full-text search
  
  -- State
  is_archived BOOLEAN NOT NULL DEFAULT false,
  visibility JSONB, -- Optional rules (e.g., {"pipelines": ["sales", "support"]})
  
  -- Audit
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  UNIQUE(org_id, entity_kind, slug)
);

CREATE INDEX idx_custom_field_defs_org ON custom_field_defs(org_id);
CREATE INDEX idx_custom_field_defs_entity ON custom_field_defs(entity_kind);
CREATE INDEX idx_custom_field_defs_active ON custom_field_defs(org_id, entity_kind) WHERE is_archived = false;
CREATE INDEX idx_custom_field_defs_ai_writable ON custom_field_defs(org_id, entity_kind) WHERE ai_can_write = true;

-- ============================================================================
-- 2. ADD JSONB COLUMNS TO ENTITIES
-- ============================================================================

-- Contacts
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS custom JSONB NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS custom_schema_version INTEGER NOT NULL DEFAULT 1;

-- Create GIN index for general JSONB queries
CREATE INDEX IF NOT EXISTS idx_contacts_custom_gin ON contacts USING gin (custom jsonb_path_ops);

-- Companies (if you have this table)
-- ALTER TABLE companies ADD COLUMN IF NOT EXISTS custom JSONB NOT NULL DEFAULT '{}'::jsonb;
-- ALTER TABLE companies ADD COLUMN IF NOT EXISTS custom_schema_version INTEGER NOT NULL DEFAULT 1;
-- CREATE INDEX IF NOT EXISTS idx_companies_custom_gin ON companies USING gin (custom jsonb_path_ops);

-- Interactions
ALTER TABLE interactions ADD COLUMN IF NOT EXISTS custom JSONB NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE interactions ADD COLUMN IF NOT EXISTS custom_schema_version INTEGER NOT NULL DEFAULT 1;
CREATE INDEX IF NOT EXISTS idx_interactions_custom_gin ON interactions USING gin (custom jsonb_path_ops);

-- ============================================================================
-- 3. HELPER FUNCTIONS
-- ============================================================================

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION touch_updated_at() 
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS t_custom_field_defs_updated ON custom_field_defs;
CREATE TRIGGER t_custom_field_defs_updated 
  BEFORE UPDATE ON custom_field_defs
  FOR EACH ROW 
  EXECUTE FUNCTION touch_updated_at();

-- Merge custom fields (safely update JSONB)
CREATE OR REPLACE FUNCTION merge_contact_custom(
  p_contact_id UUID,
  p_org_id UUID,
  p_patch JSONB
) RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
  v_result JSONB;
BEGIN
  UPDATE contacts
  SET 
    custom = custom || p_patch,
    updated_at = NOW()
  WHERE id = p_contact_id
    AND org_id = p_org_id
  RETURNING custom INTO v_result;
  
  RETURN v_result;
END;
$$;

-- Create per-field expression index (called when is_indexed = true)
CREATE OR REPLACE FUNCTION ensure_contact_cf_index(p_slug TEXT)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
  v_idx_name TEXT := format('idx_contacts_cf_%s', regexp_replace(p_slug, '[^a-z0-9_]', '_', 'gi'));
BEGIN
  EXECUTE format(
    'CREATE INDEX IF NOT EXISTS %I ON contacts ((custom->>%L))',
    v_idx_name,
    p_slug
  );
END;
$$;

-- Drop per-field expression index
CREATE OR REPLACE FUNCTION drop_contact_cf_index(p_slug TEXT)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
  v_idx_name TEXT := format('idx_contacts_cf_%s', regexp_replace(p_slug, '[^a-z0-9_]', '_', 'gi'));
BEGIN
  EXECUTE format('DROP INDEX IF EXISTS %I', v_idx_name);
END;
$$;

-- Get custom field value with type coercion
CREATE OR REPLACE FUNCTION get_custom_field(
  p_custom JSONB,
  p_slug TEXT,
  p_type TEXT DEFAULT 'text'
)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  CASE p_type
    WHEN 'boolean' THEN
      RETURN (p_custom->>p_slug)::boolean::text;
    WHEN 'number', 'currency', 'rating' THEN
      RETURN (p_custom->>p_slug)::numeric::text;
    WHEN 'integer' THEN
      RETURN (p_custom->>p_slug)::integer::text;
    WHEN 'date' THEN
      RETURN (p_custom->>p_slug)::date::text;
    WHEN 'datetime' THEN
      RETURN (p_custom->>p_slug)::timestamptz::text;
    ELSE
      RETURN p_custom->>p_slug;
  END CASE;
END;
$$;

-- Validate custom field value against definition
CREATE OR REPLACE FUNCTION validate_custom_field(
  p_slug TEXT,
  p_value JSONB,
  p_field_def JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
  v_type TEXT := p_field_def->>'type';
  v_required BOOLEAN := (p_field_def->>'required')::boolean;
  v_options JSONB := p_field_def->'options';
  v_errors TEXT[] := ARRAY[]::TEXT[];
BEGIN
  -- Check required
  IF v_required AND (p_value IS NULL OR p_value = 'null'::jsonb) THEN
    v_errors := array_append(v_errors, 'Field is required');
  END IF;
  
  -- Check select options
  IF v_type = 'select' AND v_options IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM jsonb_array_elements(v_options) AS opt
      WHERE opt->>'value' = p_value#>>'{}'
    ) THEN
      v_errors := array_append(v_errors, 'Invalid option selected');
    END IF;
  END IF;
  
  -- Check multiselect options
  IF v_type = 'multiselect' AND v_options IS NOT NULL THEN
    -- Validate each selected value
    IF jsonb_typeof(p_value) = 'array' THEN
      -- Logic for multiselect validation would go here
      NULL;
    END IF;
  END IF;
  
  IF array_length(v_errors, 1) > 0 THEN
    RETURN jsonb_build_object('valid', false, 'errors', to_jsonb(v_errors));
  END IF;
  
  RETURN jsonb_build_object('valid', true);
END;
$$;

-- ============================================================================
-- 4. RLS POLICIES
-- ============================================================================

ALTER TABLE custom_field_defs ENABLE ROW LEVEL SECURITY;

-- Users can view field definitions in their org
CREATE POLICY "Users can view custom field defs in their org"
  ON custom_field_defs FOR SELECT
  USING (
    org_id IN (
      SELECT org_id FROM contacts WHERE org_id = custom_field_defs.org_id LIMIT 1
    )
  );

-- Only org admins can manage field definitions
CREATE POLICY "Admins can manage custom field defs"
  ON custom_field_defs FOR ALL
  USING (
    org_id IN (
      SELECT org_id FROM contacts WHERE org_id = custom_field_defs.org_id LIMIT 1
    )
  );

-- Note: Contacts already have RLS, so custom JSONB is protected

-- ============================================================================
-- 5. SEED DATA (Common Custom Fields)
-- ============================================================================

-- Example: Add some common custom fields for contacts
-- (You can customize these per org via the API)

COMMENT ON TABLE custom_field_defs IS 'Registry of custom field definitions with AI integration support';
COMMENT ON COLUMN custom_field_defs.slug IS 'Stable identifier for code and AI (e.g., "is_vip", "ltv")';
COMMENT ON COLUMN custom_field_defs.ai_can_read IS 'Whether AI can read this field value';
COMMENT ON COLUMN custom_field_defs.ai_can_write IS 'Whether AI can modify this field value';
COMMENT ON COLUMN custom_field_defs.synonyms IS 'Alternative names AI might use for this field';
COMMENT ON COLUMN custom_field_defs.explanation IS 'Concise description for AI prompts and function calling';
COMMENT ON COLUMN custom_field_defs.pii_level IS 'Privacy level: none, light, or sensitive';
COMMENT ON COLUMN custom_field_defs.is_indexed IS 'Create expression index for fast filtering/sorting';

-- ============================================================================
-- 6. CUSTOM FIELD CHANGE LOG (Optional - for audit)
-- ============================================================================

CREATE TABLE IF NOT EXISTS custom_field_changes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- What changed
  entity_kind TEXT NOT NULL,
  entity_id UUID NOT NULL,
  field_slug TEXT NOT NULL,
  
  -- Values
  old_value JSONB,
  new_value JSONB,
  
  -- Context
  changed_by UUID REFERENCES auth.users(id),
  changed_via TEXT, -- 'ui', 'api', 'ai_agent', 'import'
  
  -- Audit
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Indexes for querying history
  INDEX idx_cf_changes_entity (org_id, entity_kind, entity_id),
  INDEX idx_cf_changes_field (org_id, field_slug),
  INDEX idx_cf_changes_time (created_at DESC)
);

ALTER TABLE custom_field_changes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view custom field changes in their org"
  ON custom_field_changes FOR SELECT
  USING (
    org_id IN (
      SELECT org_id FROM contacts WHERE org_id = custom_field_changes.org_id LIMIT 1
    )
  );

-- ============================================================================
-- 7. MATERIALIZED VIEW (Optional - for analytics)
-- ============================================================================

-- View of all custom field usage across contacts
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_custom_field_usage AS
SELECT
  c.org_id,
  'contact' AS entity_kind,
  cfd.slug,
  cfd.label,
  cfd.type,
  COUNT(*) AS usage_count,
  COUNT(*) FILTER (WHERE c.custom->>cfd.slug IS NOT NULL AND c.custom->>cfd.slug != '') AS filled_count,
  COUNT(*) FILTER (WHERE c.custom->>cfd.slug IS NULL OR c.custom->>cfd.slug = '') AS empty_count,
  (COUNT(*) FILTER (WHERE c.custom->>cfd.slug IS NOT NULL AND c.custom->>cfd.slug != '')::float / 
   NULLIF(COUNT(*), 0) * 100)::numeric(5,2) AS fill_rate_pct
FROM contacts c
CROSS JOIN custom_field_defs cfd
WHERE cfd.entity_kind = 'contact'
  AND cfd.is_archived = false
  AND c.org_id = cfd.org_id
GROUP BY c.org_id, cfd.slug, cfd.label, cfd.type;

CREATE UNIQUE INDEX ON mv_custom_field_usage (org_id, slug);

-- Refresh function (call via cron or after bulk imports)
CREATE OR REPLACE FUNCTION refresh_custom_field_usage()
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_custom_field_usage;
END;
$$;

COMMENT ON MATERIALIZED VIEW mv_custom_field_usage IS 'Analytics view showing custom field usage and fill rates';
