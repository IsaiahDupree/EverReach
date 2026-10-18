-- Personal Profile API - Verification Script
-- Safe to run in Supabase SQL Editor or via psql

-- =========================
-- Tables exist
-- =========================
SELECT 'table:compose_settings' AS check, to_regclass('public.compose_settings') IS NOT NULL AS ok;
SELECT 'table:persona_notes'    AS check, to_regclass('public.persona_notes')    IS NOT NULL AS ok;

-- =========================
-- Profiles columns exist
-- =========================
SELECT 'column:profiles.display_name' AS check,
       EXISTS (
         SELECT 1 FROM information_schema.columns 
         WHERE table_schema='public' AND table_name='profiles' AND column_name='display_name'
       ) AS ok;

SELECT 'column:profiles.preferences' AS check,
       EXISTS (
         SELECT 1 FROM information_schema.columns 
         WHERE table_schema='public' AND table_name='profiles' AND column_name='preferences'
       ) AS ok;

-- =========================
-- RLS enabled
-- =========================
SELECT 'rls:compose_settings' AS check,
       c.relrowsecurity AS ok
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' AND c.relname = 'compose_settings';

SELECT 'rls:persona_notes' AS check,
       c.relrowsecurity AS ok
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' AND c.relname = 'persona_notes';

-- =========================
-- Policies present (list)
-- =========================
SELECT 'policies:compose_settings' AS section, polname
FROM pg_policies WHERE schemaname='public' AND tablename='compose_settings'
ORDER BY polname;

SELECT 'policies:persona_notes' AS section, polname
FROM pg_policies WHERE schemaname='public' AND tablename='persona_notes'
ORDER BY polname;

-- =========================
-- Indexes present
-- =========================
SELECT 'index:idx_persona_notes_user'     AS check, EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='idx_persona_notes_user')     AS ok;
SELECT 'index:idx_persona_notes_type'     AS check, EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='idx_persona_notes_type')     AS ok;
SELECT 'index:idx_persona_notes_tags'     AS check, EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='idx_persona_notes_tags')     AS ok;
SELECT 'index:idx_persona_notes_contacts' AS check, EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='idx_persona_notes_contacts') AS ok;
SELECT 'index:idx_persona_notes_created'  AS check, EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='idx_persona_notes_created')  AS ok;
