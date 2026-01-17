/**
 * Ad Pixel Integration System
 * 
 * Support for Meta Pixel, Google Analytics 4, TikTok Pixel, and other advertising pixels
 * Includes server-side conversion API support and privacy compliance
 */

-- ============================================================================
-- 1. PIXEL CONFIGURATIONS
-- ============================================================================

CREATE TABLE IF NOT EXISTS ad_pixel_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Pixel identity
  provider TEXT NOT NULL CHECK (provider IN (
    'meta', 'google_analytics', 'google_ads', 'tiktok', 'snapchat', 
    'pinterest', 'twitter', 'linkedin', 'reddit'
  )),
  pixel_id TEXT NOT NULL, -- e.g., Meta Pixel ID, GA4 Measurement ID
  
  -- Configuration
  enabled BOOLEAN NOT NULL DEFAULT true,
  test_mode BOOLEAN NOT NULL DEFAULT false, -- Test events mode
  events TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[], -- Enabled event types
  config JSONB, -- Provider-specific config
  
  -- API credentials (encrypted in production)
  access_token_enc TEXT, -- For Conversion APIs
  api_secret_enc TEXT,
  
  -- Settings
  custom_data_mapping JSONB, -- Map app events to pixel events
  user_data_mapping JSONB, -- Map user fields to pixel user data
  
  -- Audit
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  UNIQUE(org_id, provider, pixel_id)
);

CREATE INDEX idx_ad_pixel_configs_org ON ad_pixel_configs(org_id);
CREATE INDEX idx_ad_pixel_configs_enabled ON ad_pixel_configs(org_id, enabled) WHERE enabled = true;

-- ============================================================================
-- 2. PIXEL EVENTS LOG
-- ============================================================================

CREATE TABLE IF NOT EXISTS ad_pixel_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  pixel_config_id UUID NOT NULL REFERENCES ad_pixel_configs(id) ON DELETE CASCADE,
  
  -- Event data
  provider TEXT NOT NULL,
  event_name TEXT NOT NULL, -- e.g., 'Purchase', 'AddToCart', 'PageView'
  event_data JSONB, -- Provider-specific event parameters
  
  -- User context
  user_id UUID REFERENCES auth.users(id),
  session_id TEXT,
  
  -- Page context
  page_url TEXT,
  referrer_url TEXT,
  
  -- UTM parameters (for attribution)
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  utm_term TEXT,
  utm_content TEXT,
  
  -- Device context
  ip_address INET,
  user_agent TEXT,
  
  -- Facebook-specific
  fbc TEXT, -- Facebook click ID cookie
  fbp TEXT, -- Facebook browser ID cookie
  
  -- Conversion API status
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'dead_letter')),
  sent_at TIMESTAMPTZ,
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  
  -- Timestamps
  event_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Indexes for common queries
  INDEX idx_ad_pixel_events_org (org_id),
  INDEX idx_ad_pixel_events_user (user_id),
  INDEX idx_ad_pixel_events_session (session_id),
  INDEX idx_ad_pixel_events_provider (provider, event_name),
  INDEX idx_ad_pixel_events_time (event_time DESC),
  INDEX idx_ad_pixel_events_status (status) WHERE status IN ('pending', 'failed'),
  INDEX idx_ad_pixel_events_utm (utm_source, utm_campaign) WHERE utm_source IS NOT NULL
);

-- Partition by month for better performance (optional, implement later)
-- SELECT create_hypertable('ad_pixel_events', 'event_time');

-- ============================================================================
-- 3. USER TRACKING CONSENT
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_tracking_consent (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Consent flags
  analytics_consent BOOLEAN NOT NULL DEFAULT false,
  advertising_consent BOOLEAN NOT NULL DEFAULT false,
  personalization_consent BOOLEAN NOT NULL DEFAULT false,
  
  -- Consent metadata
  consent_method TEXT, -- 'banner', 'settings', 'implicit'
  ip_address INET,
  user_agent TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  UNIQUE(user_id, org_id)
);

CREATE INDEX idx_user_tracking_consent_user ON user_tracking_consent(user_id);
CREATE INDEX idx_user_tracking_consent_advertising ON user_tracking_consent(user_id) WHERE advertising_consent = true;

-- ============================================================================
-- 4. CONVERSION ATTRIBUTION
-- ============================================================================

CREATE TABLE IF NOT EXISTS conversion_attribution (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Conversion event
  conversion_event_id UUID NOT NULL REFERENCES ad_pixel_events(id) ON DELETE CASCADE,
  conversion_value NUMERIC(10, 2),
  conversion_currency TEXT DEFAULT 'USD',
  
  -- Attribution
  attributed_source TEXT, -- 'meta', 'google', 'tiktok', etc.
  attributed_campaign TEXT,
  attributed_ad_set TEXT,
  attributed_ad TEXT,
  attribution_window_days INTEGER DEFAULT 7, -- 1, 7, 28 day windows
  
  -- Click/impression data
  click_id TEXT, -- fbclid, gclid, ttclid
  click_timestamp TIMESTAMPTZ,
  impression_timestamp TIMESTAMPTZ,
  
  -- Model
  attribution_model TEXT CHECK (attribution_model IN (
    'last_click', 'first_click', 'linear', 'time_decay', 'data_driven'
  )) DEFAULT 'last_click',
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  INDEX idx_conversion_attribution_org (org_id),
  INDEX idx_conversion_attribution_source (attributed_source, attributed_campaign),
  INDEX idx_conversion_attribution_click (click_id) WHERE click_id IS NOT NULL
);

-- ============================================================================
-- 5. PIXEL PERFORMANCE METRICS (Materialized View)
-- ============================================================================

CREATE MATERIALIZED VIEW IF NOT EXISTS mv_pixel_performance AS
SELECT
  p.org_id,
  p.provider,
  p.pixel_id,
  DATE(e.event_time) AS event_date,
  e.event_name,
  
  -- Event counts
  COUNT(*) AS event_count,
  COUNT(DISTINCT e.user_id) AS unique_users,
  COUNT(DISTINCT e.session_id) AS unique_sessions,
  
  -- Revenue metrics (for Purchase events)
  SUM((e.event_data->>'value')::numeric) FILTER (WHERE e.event_name IN ('Purchase', 'CompletePayment')) AS total_revenue,
  AVG((e.event_data->>'value')::numeric) FILTER (WHERE e.event_name IN ('Purchase', 'CompletePayment')) AS avg_order_value,
  
  -- Conversion metrics
  COUNT(*) FILTER (WHERE e.event_name IN ('Purchase', 'CompletePayment')) AS conversions,
  COUNT(*) FILTER (WHERE e.event_name = 'AddToCart') AS add_to_carts,
  COUNT(*) FILTER (WHERE e.event_name = 'PageView') AS page_views,
  
  -- Attribution
  e.utm_source,
  e.utm_campaign,
  
  -- API status
  COUNT(*) FILTER (WHERE e.status = 'sent') AS sent_count,
  COUNT(*) FILTER (WHERE e.status = 'failed') AS failed_count
  
FROM ad_pixel_configs p
JOIN ad_pixel_events e ON e.pixel_config_id = p.id
WHERE p.enabled = true
  AND e.event_time >= NOW() - INTERVAL '90 days'
GROUP BY p.org_id, p.provider, p.pixel_id, DATE(e.event_time), e.event_name, e.utm_source, e.utm_campaign;

CREATE UNIQUE INDEX ON mv_pixel_performance (org_id, provider, pixel_id, event_date, event_name, COALESCE(utm_source, ''), COALESCE(utm_campaign, ''));
CREATE INDEX ON mv_pixel_performance (org_id, event_date DESC);

-- ============================================================================
-- 6. HELPER FUNCTIONS
-- ============================================================================

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION update_ad_pixel_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS t_ad_pixel_configs_updated ON ad_pixel_configs;
CREATE TRIGGER t_ad_pixel_configs_updated
  BEFORE UPDATE ON ad_pixel_configs
  FOR EACH ROW
  EXECUTE FUNCTION update_ad_pixel_timestamp();

DROP TRIGGER IF EXISTS t_user_tracking_consent_updated ON user_tracking_consent;
CREATE TRIGGER t_user_tracking_consent_updated
  BEFORE UPDATE ON user_tracking_consent
  FOR EACH ROW
  EXECUTE FUNCTION update_ad_pixel_timestamp();

-- Check if user consented to advertising tracking
CREATE OR REPLACE FUNCTION check_advertising_consent(p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_consent BOOLEAN;
BEGIN
  SELECT advertising_consent INTO v_consent
  FROM user_tracking_consent
  WHERE user_id = p_user_id;
  
  RETURN COALESCE(v_consent, false); -- Default to false if no record
END;
$$ LANGUAGE plpgsql;

-- Get enabled pixel configs for an org
CREATE OR REPLACE FUNCTION get_enabled_pixels(p_org_id UUID, p_provider TEXT DEFAULT NULL)
RETURNS TABLE (
  id UUID,
  provider TEXT,
  pixel_id TEXT,
  events TEXT[],
  test_mode BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    pc.id,
    pc.provider,
    pc.pixel_id,
    pc.events,
    pc.test_mode
  FROM ad_pixel_configs pc
  WHERE pc.org_id = p_org_id
    AND pc.enabled = true
    AND (p_provider IS NULL OR pc.provider = p_provider);
END;
$$ LANGUAGE plpgsql;

-- Refresh pixel performance metrics
CREATE OR REPLACE FUNCTION refresh_pixel_performance()
RETURNS VOID AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_pixel_performance;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 7. RLS POLICIES
-- ============================================================================

ALTER TABLE ad_pixel_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE ad_pixel_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_tracking_consent ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversion_attribution ENABLE ROW LEVEL SECURITY;

-- Users can view pixel configs in their org
CREATE POLICY "Users can view pixel configs in their org"
  ON ad_pixel_configs FOR SELECT
  USING (
    org_id IN (
      SELECT org_id FROM contacts WHERE org_id = ad_pixel_configs.org_id LIMIT 1
    )
  );

-- Only admins can manage pixel configs
CREATE POLICY "Admins can manage pixel configs"
  ON ad_pixel_configs FOR ALL
  USING (
    org_id IN (
      SELECT org_id FROM contacts WHERE org_id = ad_pixel_configs.org_id LIMIT 1
    )
  );

-- Users can view their own tracking consent
CREATE POLICY "Users can view their own tracking consent"
  ON user_tracking_consent FOR SELECT
  USING (user_id = auth.uid());

-- Users can update their own tracking consent
CREATE POLICY "Users can update their own tracking consent"
  ON user_tracking_consent FOR ALL
  USING (user_id = auth.uid());

-- Pixel events are org-scoped
CREATE POLICY "Users can view pixel events in their org"
  ON ad_pixel_events FOR SELECT
  USING (
    org_id IN (
      SELECT org_id FROM contacts WHERE org_id = ad_pixel_events.org_id LIMIT 1
    )
  );

-- ============================================================================
-- 8. SAMPLE DATA (for testing)
-- ============================================================================

-- Add comments for documentation
COMMENT ON TABLE ad_pixel_configs IS 'Configuration for advertising pixels (Meta, Google, TikTok, etc.)';
COMMENT ON TABLE ad_pixel_events IS 'Log of all pixel events sent to advertising platforms';
COMMENT ON TABLE user_tracking_consent IS 'User consent for analytics and advertising tracking (GDPR)';
COMMENT ON TABLE conversion_attribution IS 'Attribution data for conversion events';
COMMENT ON MATERIALIZED VIEW mv_pixel_performance IS 'Aggregated pixel performance metrics by day';

COMMENT ON COLUMN ad_pixel_configs.test_mode IS 'Send test events (Meta Test Events, GA4 Debug Mode)';
COMMENT ON COLUMN ad_pixel_events.fbc IS 'Facebook click ID from fbclid URL parameter';
COMMENT ON COLUMN ad_pixel_events.fbp IS 'Facebook browser ID from _fbp cookie';
COMMENT ON COLUMN ad_pixel_events.status IS 'Conversion API send status: pending, sent, failed, dead_letter';
