-- ACE: Autonomous Content Engine tables
-- Creates all 11 tables needed for the content engine pipeline

CREATE TABLE IF NOT EXISTS public.content_signals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_type TEXT NOT NULL,
  source_id TEXT,
  signal_category TEXT NOT NULL,
  signal_text TEXT NOT NULL,
  pillar TEXT,
  format TEXT,
  engagement_score NUMERIC,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS public.content_strategy_briefs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scope_type TEXT NOT NULL CHECK (scope_type IN ('daily','weekly')),
  primary_objective TEXT NOT NULL,
  secondary_objective TEXT,
  target_mix JSONB NOT NULL,
  exclusions JSONB NOT NULL DEFAULT '[]'::jsonb,
  notes TEXT,
  created_for_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.content_candidates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brief_id UUID NOT NULL REFERENCES public.content_strategy_briefs(id) ON DELETE CASCADE,
  pillar TEXT NOT NULL,
  subtopic TEXT,
  awareness_level TEXT NOT NULL,
  format TEXT NOT NULL,
  hook_type TEXT NOT NULL,
  cta_type TEXT NOT NULL,
  target_emotion TEXT,
  concept_text TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  predicted_engagement NUMERIC,
  predicted_conversion NUMERIC,
  novelty_score NUMERIC,
  strategic_alignment NUMERIC,
  format_strength NUMERIC,
  audience_relevance NUMERIC,
  production_confidence NUMERIC,
  total_score NUMERIC,
  status TEXT NOT NULL DEFAULT 'generated',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.content_copy_variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id UUID NOT NULL REFERENCES public.content_candidates(id) ON DELETE CASCADE,
  variant_type TEXT NOT NULL,
  caption TEXT,
  slide_copy JSONB,
  overlay_copy JSONB,
  alt_text TEXT,
  prompt_text TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.content_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_name TEXT UNIQUE NOT NULL,
  format TEXT NOT NULL,
  template_version TEXT NOT NULL,
  visual_rules JSONB NOT NULL,
  prompt_rules JSONB NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.content_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id UUID NOT NULL REFERENCES public.content_candidates(id) ON DELETE CASCADE,
  template_id UUID REFERENCES public.content_templates(id),
  asset_type TEXT NOT NULL,
  storage_path TEXT,
  public_url TEXT,
  render_spec JSONB NOT NULL DEFAULT '{}'::jsonb,
  render_status TEXT NOT NULL DEFAULT 'pending',
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.post_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id UUID REFERENCES public.content_candidates(id),
  platform TEXT NOT NULL DEFAULT 'instagram',
  media_type TEXT NOT NULL,
  asset_urls JSONB NOT NULL,
  caption TEXT NOT NULL,
  auto_schedule BOOLEAN NOT NULL DEFAULT true,
  queue_status TEXT NOT NULL DEFAULT 'queued',
  queue_source TEXT NOT NULL DEFAULT 'autonomous_engine',
  dedupe_key TEXT UNIQUE,
  scheduled_slot TIMESTAMPTZ,
  platform_submission_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.published_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  queue_id UUID NOT NULL REFERENCES public.post_queue(id) ON DELETE CASCADE,
  platform_post_id TEXT,
  published_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.post_performance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  published_post_id UUID NOT NULL REFERENCES public.published_posts(id) ON DELETE CASCADE,
  likes INT DEFAULT 0,
  comments INT DEFAULT 0,
  saves INT DEFAULT 0,
  shares INT DEFAULT 0,
  reach INT DEFAULT 0,
  profile_visits INT DEFAULT 0,
  clicks INT DEFAULT 0,
  installs_attributed INT DEFAULT 0,
  engagement_score NUMERIC,
  conversion_score NUMERIC,
  raw_metrics JSONB NOT NULL DEFAULT '{}'::jsonb,
  synced_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (published_post_id)
);

CREATE TABLE IF NOT EXISTS public.model_weights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_name TEXT NOT NULL,
  model_version TEXT NOT NULL,
  weights JSONB NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.job_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_name TEXT NOT NULL,
  run_key TEXT NOT NULL,
  status TEXT NOT NULL,
  result JSONB,
  error TEXT,
  started_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,
  UNIQUE (job_name, run_key)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_content_signals_created ON public.content_signals(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_content_candidates_brief ON public.content_candidates(brief_id);
CREATE INDEX IF NOT EXISTS idx_content_candidates_status ON public.content_candidates(status);
CREATE INDEX IF NOT EXISTS idx_post_queue_status ON public.post_queue(queue_status);
CREATE INDEX IF NOT EXISTS idx_job_runs_lookup ON public.job_runs(job_name, run_key);

-- Grant access to all roles (required for PostgREST schema cache)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.content_signals TO anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.content_strategy_briefs TO anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.content_candidates TO anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.content_copy_variants TO anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.content_templates TO anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.content_assets TO anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.post_queue TO anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.published_posts TO anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.post_performance TO anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.model_weights TO anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.job_runs TO anon, authenticated, service_role;

-- Seed default model weights
INSERT INTO public.model_weights (model_name, model_version, weights, is_active)
VALUES (
  'content_scoring_v1',
  '1.0.0',
  '{"predicted_engagement": 0.25, "predicted_conversion": 0.20, "novelty_score": 0.15, "strategic_alignment": 0.15, "format_strength": 0.10, "audience_relevance": 0.10, "production_confidence": 0.05}'::jsonb,
  true
)
ON CONFLICT DO NOTHING;

-- Seed default content templates
INSERT INTO public.content_templates (template_name, format, template_version, visual_rules, prompt_rules, is_active)
VALUES
  ('static_truth_v1', 'static_truth', '1.0', '{"background": "#1a1a1a", "text_color": "#ffffff", "font": "Inter", "size": "1080x1080"}'::jsonb, '{"max_words": 15, "style": "bold_statement"}'::jsonb, true),
  ('carousel_psychology_v1', 'carousel_psychology', '1.0', '{"slides": 6, "style": "hand_drawn", "background": "#f5f0e8"}'::jsonb, '{"slides": 6, "hook_required": true}'::jsonb, true),
  ('carousel_framework_v1', 'carousel_framework', '1.0', '{"slides": 5, "style": "numbered", "background": "#ffffff"}'::jsonb, '{"slides": 5, "numbered": true}'::jsonb, true),
  ('product_screenshot_v1', 'product_screenshot', '1.0', '{"overlay": true, "callout": true}'::jsonb, '{"focus": "feature_highlight"}'::jsonb, true),
  ('founder_note_v1', 'founder_note', '1.0', '{"style": "personal", "background": "#fafafa"}'::jsonb, '{"voice": "first_person", "max_words": 200}'::jsonb, true)
ON CONFLICT (template_name) DO NOTHING;
