-- ============================================================================
-- Instagram Autonomous Publisher
-- Adaptive scheduling with Thompson Sampling engagement learning
-- ============================================================================

-- Queue: posts waiting to be published
CREATE TABLE IF NOT EXISTS instagram_post_queue (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id              UUID REFERENCES auth.users ON DELETE CASCADE,

  -- Content
  media_type           TEXT NOT NULL CHECK (media_type IN ('IMAGE','REELS','STORIES','CAROUSEL_ALBUM')),
  image_url            TEXT,
  video_url            TEXT,
  children             JSONB,               -- [{ image_url }] for carousels
  caption              TEXT,
  location_id          TEXT,
  share_to_feed        BOOLEAN DEFAULT true,

  -- Scheduling
  scheduled_at         TIMESTAMPTZ,         -- NULL = let algorithm decide
  auto_schedule        BOOLEAN DEFAULT true,
  priority             INT DEFAULT 5,       -- 1 (high) → 10 (low)

  -- State
  status               TEXT DEFAULT 'queued'
                       CHECK (status IN ('queued','publishing','published','failed','cancelled')),
  published_at         TIMESTAMPTZ,
  ig_media_id          TEXT,
  permalink            TEXT,
  error                TEXT,
  retry_count          INT DEFAULT 0,
  next_retry_at        TIMESTAMPTZ,

  created_at           TIMESTAMPTZ DEFAULT now(),
  updated_at           TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_igq_status_scheduled
  ON instagram_post_queue (status, scheduled_at NULLS FIRST)
  WHERE status IN ('queued', 'failed');

CREATE INDEX IF NOT EXISTS idx_igq_user_status
  ON instagram_post_queue (user_id, status);

-- Performance: per-post engagement data for the learning model
CREATE TABLE IF NOT EXISTS instagram_post_performance (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ig_media_id          TEXT UNIQUE NOT NULL,
  queue_id             UUID REFERENCES instagram_post_queue ON DELETE SET NULL,
  user_id              UUID REFERENCES auth.users ON DELETE CASCADE,

  -- When was it posted?
  posted_at            TIMESTAMPTZ NOT NULL,
  hour_of_day          SMALLINT NOT NULL CHECK (hour_of_day BETWEEN 0 AND 23),
  day_of_week          SMALLINT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6), -- 0=Sun
  media_type           TEXT,

  -- Engagement metrics (fetched ~24h after posting)
  likes                INT DEFAULT 0,
  comments             INT DEFAULT 0,
  saves                INT DEFAULT 0,
  shares               INT DEFAULT 0,
  reach                INT DEFAULT 0,
  impressions          INT DEFAULT 0,

  -- Derived score: (likes + comments*2 + saves*3 + shares*4) / max(reach,1)
  engagement_score     FLOAT GENERATED ALWAYS AS (
    CASE WHEN reach > 0
      THEN (likes + comments * 2.0 + saves * 3.0 + shares * 4.0) / reach
      ELSE 0
    END
  ) STORED,

  metrics_fetched_at   TIMESTAMPTZ,
  created_at           TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_igperf_user_slot
  ON instagram_post_performance (user_id, hour_of_day, day_of_week);

CREATE INDEX IF NOT EXISTS idx_igperf_metrics_needed
  ON instagram_post_performance (posted_at)
  WHERE metrics_fetched_at IS NULL;

-- Posting model: Beta distribution parameters per (user, hour, day_of_week)
-- Thompson Sampling: sample from Beta(alpha, beta) to pick next slot
CREATE TABLE IF NOT EXISTS instagram_posting_model (
  user_id              UUID REFERENCES auth.users ON DELETE CASCADE,
  hour_of_day          SMALLINT NOT NULL CHECK (hour_of_day BETWEEN 0 AND 23),
  day_of_week          SMALLINT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),

  -- Beta distribution parameters
  alpha                FLOAT NOT NULL DEFAULT 1.5, -- prior: slight optimism
  beta_param           FLOAT NOT NULL DEFAULT 1.0,

  -- Stats
  posts_in_slot        INT DEFAULT 0,
  avg_engagement       FLOAT DEFAULT 0,
  last_posted_at       TIMESTAMPTZ,

  updated_at           TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (user_id, hour_of_day, day_of_week)
);

-- Frequency config: per-user adaptive posting cadence
CREATE TABLE IF NOT EXISTS instagram_publisher_config (
  user_id              UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,

  -- Frequency bounds
  min_posts_per_day    FLOAT DEFAULT 0.5,  -- minimum (post every 2 days)
  max_posts_per_day    FLOAT DEFAULT 3.0,  -- cap
  current_target       FLOAT DEFAULT 1.0,  -- current learned target (posts/day)

  -- Quiet hours (UTC)
  quiet_start_hour     SMALLINT DEFAULT 23, -- 11 PM UTC
  quiet_end_hour       SMALLINT DEFAULT 6,  -- 6 AM UTC

  -- Learning params
  learning_rate        FLOAT DEFAULT 0.1,   -- how fast to update frequency
  engagement_threshold FLOAT DEFAULT 0.02,  -- "success" threshold (2% rate)

  -- State
  last_posted_at       TIMESTAMPTZ,
  posts_last_7d        INT DEFAULT 0,
  avg_engagement_7d    FLOAT DEFAULT 0,

  enabled              BOOLEAN DEFAULT true,
  created_at           TIMESTAMPTZ DEFAULT now(),
  updated_at           TIMESTAMPTZ DEFAULT now()
);

-- Trigger: keep updated_at fresh
CREATE OR REPLACE FUNCTION update_updated_at_col()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_igq_updated_at') THEN
    CREATE TRIGGER set_igq_updated_at
      BEFORE UPDATE ON instagram_post_queue
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_col();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_igcfg_updated_at') THEN
    CREATE TRIGGER set_igcfg_updated_at
      BEFORE UPDATE ON instagram_publisher_config
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_col();
  END IF;
END $$;
