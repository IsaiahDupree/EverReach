-- Check and recreate templates table with correct schema

-- Drop existing table and related objects
DROP TABLE IF EXISTS templates CASCADE;
DROP MATERIALIZED VIEW IF EXISTS mv_popular_templates CASCADE;
DROP FUNCTION IF EXISTS extract_template_variables(TEXT) CASCADE;
DROP FUNCTION IF EXISTS render_template(TEXT, JSONB) CASCADE;
DROP FUNCTION IF EXISTS increment_template_usage(UUID) CASCADE;
DROP FUNCTION IF EXISTS refresh_popular_templates() CASCADE;
DROP FUNCTION IF EXISTS update_template_updated_at() CASCADE;

-- Now run the main migration
\i backend-vercel/migrations/message-templates.sql
