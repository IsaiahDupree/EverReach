-- Migration: App Analytics Tracking System
-- Description: Track mobile app routes, elements, and coverage
-- Date: 2025-11-02

-- =====================================================
-- 1. Route Manifest (Expected Pages)
-- =====================================================

CREATE TABLE IF NOT EXISTS public.tracking_route_manifest (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  app_version text NOT NULL,
  route text NOT NULL,
  dynamic boolean NOT NULL DEFAULT false,
  file text NOT NULL,
  generated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (app_version, route)
);

CREATE INDEX IF NOT EXISTS idx_route_manifest_version ON public.tracking_route_manifest(app_version);
CREATE INDEX IF NOT EXISTS idx_route_manifest_route ON public.tracking_route_manifest(route);

-- =====================================================
-- 2. Contracts (Required Elements/Events per Route)
-- =====================================================

CREATE TABLE IF NOT EXISTS public.tracking_contracts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  app_version text NOT NULL,
  route text NOT NULL,
  required_elements text[] DEFAULT '{}',
  required_events text[] DEFAULT '{}',
  critical boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (app_version, route)
);

CREATE INDEX IF NOT EXISTS idx_contracts_version_route ON public.tracking_contracts(app_version, route);

-- =====================================================
-- 3. Route Analytics (Observed Screen Views)
-- =====================================================

CREATE TABLE IF NOT EXISTS public.tracking_route_seen (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  app_version text NOT NULL,
  route text NOT NULL,
  user_id text,
  authed boolean DEFAULT false,
  views integer NOT NULL DEFAULT 0,
  total_duration_ms bigint NOT NULL DEFAULT 0,
  first_seen_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (app_version, route)
);

CREATE INDEX IF NOT EXISTS idx_route_seen_version ON public.tracking_route_seen(app_version);
CREATE INDEX IF NOT EXISTS idx_route_seen_route ON public.tracking_route_seen(route);
CREATE INDEX IF NOT EXISTS idx_route_seen_views ON public.tracking_route_seen(views DESC);
CREATE INDEX IF NOT EXISTS idx_route_seen_last ON public.tracking_route_seen(last_seen_at DESC);

-- =====================================================
-- 4. Element Tracking (Button/UI Interactions)
-- =====================================================

CREATE TABLE IF NOT EXISTS public.tracking_element_seen (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  app_version text NOT NULL,
  route text NOT NULL,
  element_id text NOT NULL,
  label text,
  taps integer NOT NULL DEFAULT 0,
  last_tapped_at timestamptz NOT NULL DEFAULT now(),
  first_tapped_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (app_version, route, element_id)
);

CREATE INDEX IF NOT EXISTS idx_element_seen_version_route ON public.tracking_element_seen(app_version, route);
CREATE INDEX IF NOT EXISTS idx_element_seen_element ON public.tracking_element_seen(element_id);
CREATE INDEX IF NOT EXISTS idx_element_seen_taps ON public.tracking_element_seen(taps DESC);

-- =====================================================
-- 5. Event Log (All Events for Analysis)
-- =====================================================

CREATE TABLE IF NOT EXISTS public.tracking_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  app_version text,
  event_name text NOT NULL,
  route text,
  user_id text,
  authed boolean DEFAULT false,
  props jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_events_name ON public.tracking_events(event_name);
CREATE INDEX IF NOT EXISTS idx_events_route ON public.tracking_events(route);
CREATE INDEX IF NOT EXISTS idx_events_created ON public.tracking_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_events_app_version ON public.tracking_events(app_version);

-- =====================================================
-- 6. Coverage Views
-- =====================================================

-- Missing Routes: In manifest but never seen
CREATE OR REPLACE VIEW tracking_missing_routes AS
SELECT 
  m.app_version,
  m.route,
  m.dynamic,
  m.file,
  m.generated_at
FROM public.tracking_route_manifest m
LEFT JOIN public.tracking_route_seen s
  ON s.app_version = m.app_version AND s.route = m.route
WHERE s.route IS NULL
ORDER BY m.route;

-- Missing Elements: Required but never tapped
CREATE OR REPLACE VIEW tracking_missing_elements AS
SELECT 
  c.app_version,
  c.route,
  elem.element_id,
  c.critical
FROM public.tracking_contracts c
CROSS JOIN LATERAL unnest(c.required_elements) AS elem(element_id)
LEFT JOIN public.tracking_element_seen s
  ON s.app_version = c.app_version 
  AND s.route = c.route 
  AND s.element_id = elem.element_id
WHERE s.element_id IS NULL
ORDER BY c.critical DESC, c.route, elem.element_id;

-- Coverage Summary per Version
CREATE OR REPLACE VIEW tracking_coverage_summary AS
SELECT 
  m.app_version,
  COUNT(DISTINCT m.route) as total_routes,
  COUNT(DISTINCT s.route) as covered_routes,
  ROUND(100.0 * COUNT(DISTINCT s.route) / NULLIF(COUNT(DISTINCT m.route), 0), 2) as coverage_percent,
  COUNT(DISTINCT m.route) FILTER (WHERE m.dynamic = false) as static_routes,
  COUNT(DISTINCT s.route) FILTER (WHERE m.dynamic = false) as covered_static_routes,
  SUM(s.views) as total_views,
  MAX(s.last_seen_at) as last_activity
FROM public.tracking_route_manifest m
LEFT JOIN public.tracking_route_seen s
  ON s.app_version = m.app_version AND s.route = m.route
GROUP BY m.app_version
ORDER BY m.app_version DESC;

-- Popular Routes
CREATE OR REPLACE VIEW tracking_popular_routes AS
SELECT 
  app_version,
  route,
  views,
  ROUND(total_duration_ms / 1000.0, 2) as avg_duration_seconds,
  last_seen_at
FROM public.tracking_route_seen
ORDER BY views DESC, last_seen_at DESC;

-- Element Engagement
CREATE OR REPLACE VIEW tracking_element_engagement AS
SELECT 
  e.app_version,
  e.route,
  e.element_id,
  e.label,
  e.taps,
  e.last_tapped_at,
  CASE 
    WHEN c.required_elements @> ARRAY[e.element_id] THEN true 
    ELSE false 
  END as is_required,
  c.critical as route_critical
FROM public.tracking_element_seen e
LEFT JOIN public.tracking_contracts c
  ON c.app_version = e.app_version AND c.route = e.route
ORDER BY e.taps DESC, e.last_tapped_at DESC;

-- =====================================================
-- 7. Helper Functions
-- =====================================================

-- Increment route views atomically
CREATE OR REPLACE FUNCTION increment_route_views(
  p_app_version text,
  p_route text
)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE public.tracking_route_seen
  SET 
    views = views + 1,
    last_seen_at = now()
  WHERE app_version = p_app_version AND route = p_route;
END;
$$;

-- Add route duration
CREATE OR REPLACE FUNCTION add_route_duration(
  p_app_version text,
  p_route text,
  p_duration_ms bigint
)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE public.tracking_route_seen
  SET 
    total_duration_ms = total_duration_ms + p_duration_ms,
    last_seen_at = now()
  WHERE app_version = p_app_version AND route = p_route;
END;
$$;

-- Increment element taps
CREATE OR REPLACE FUNCTION increment_element_taps(
  p_app_version text,
  p_route text,
  p_element_id text,
  p_label text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO public.tracking_element_seen (
    app_version, route, element_id, label, taps, last_tapped_at, first_tapped_at
  )
  VALUES (
    p_app_version, p_route, p_element_id, p_label, 1, now(), now()
  )
  ON CONFLICT (app_version, route, element_id)
  DO UPDATE SET
    taps = tracking_element_seen.taps + 1,
    last_tapped_at = now(),
    label = COALESCE(EXCLUDED.label, tracking_element_seen.label);
END;
$$;

-- Get coverage report for a specific version
CREATE OR REPLACE FUNCTION get_coverage_report(p_app_version text)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'appVersion', p_app_version,
    'summary', (
      SELECT row_to_json(t) FROM (
        SELECT * FROM tracking_coverage_summary WHERE app_version = p_app_version
      ) t
    ),
    'missingRoutes', (
      SELECT COALESCE(jsonb_agg(row_to_json(t)), '[]'::jsonb)
      FROM (
        SELECT route, dynamic, file FROM tracking_missing_routes 
        WHERE app_version = p_app_version
      ) t
    ),
    'missingElements', (
      SELECT COALESCE(jsonb_agg(row_to_json(t)), '[]'::jsonb)
      FROM (
        SELECT route, element_id, critical FROM tracking_missing_elements
        WHERE app_version = p_app_version
      ) t
    ),
    'topRoutes', (
      SELECT COALESCE(jsonb_agg(row_to_json(t)), '[]'::jsonb)
      FROM (
        SELECT route, views, avg_duration_seconds FROM tracking_popular_routes
        WHERE app_version = p_app_version
        LIMIT 20
      ) t
    ),
    'topElements', (
      SELECT COALESCE(jsonb_agg(row_to_json(t)), '[]'::jsonb)
      FROM (
        SELECT route, element_id, label, taps, is_required 
        FROM tracking_element_engagement
        WHERE app_version = p_app_version
        LIMIT 50
      ) t
    )
  ) INTO result;
  
  RETURN result;
END;
$$;

-- =====================================================
-- 8. Comments
-- =====================================================

COMMENT ON TABLE public.tracking_route_manifest IS 'Expected routes from app build-time manifest';
COMMENT ON TABLE public.tracking_contracts IS 'Required elements and events per route for coverage tracking';
COMMENT ON TABLE public.tracking_route_seen IS 'Observed screen views and time-on-page';
COMMENT ON TABLE public.tracking_element_seen IS 'Observed UI element interactions (buttons, etc)';
COMMENT ON TABLE public.tracking_events IS 'Raw event log for all analytics events';

COMMENT ON VIEW tracking_missing_routes IS 'Routes in manifest but never visited';
COMMENT ON VIEW tracking_missing_elements IS 'Required elements never interacted with';
COMMENT ON VIEW tracking_coverage_summary IS 'Overall coverage statistics per app version';

-- Migration Complete
