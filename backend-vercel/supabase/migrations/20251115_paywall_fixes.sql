-- Fix for paywall advanced features SQL bugs

-- ============================================================================
-- 1. Fix calculate_next_report_send_time function (missing ELSE in CASE)
-- ============================================================================

CREATE OR REPLACE FUNCTION calculate_next_report_send_time(p_subscription_id UUID)
RETURNS TIMESTAMPTZ
LANGUAGE plpgsql
AS $$
DECLARE
  v_sub RECORD;
  v_next_send TIMESTAMPTZ;
  v_now TIMESTAMPTZ := NOW();
BEGIN
  SELECT frequency, day_of_week, day_of_month, hour_of_day, timezone
  INTO v_sub
  FROM paywall_report_subscriptions
  WHERE id = p_subscription_id;
  
  CASE v_sub.frequency
    WHEN 'daily' THEN
      v_next_send := DATE_TRUNC('day', v_now) + (v_sub.hour_of_day || ' hours')::INTERVAL;
      IF v_next_send <= v_now THEN
        v_next_send := v_next_send + INTERVAL '1 day';
      END IF;
      
    WHEN 'weekly' THEN
      v_next_send := DATE_TRUNC('week', v_now) + 
                     (v_sub.day_of_week || ' days')::INTERVAL + 
                     (v_sub.hour_of_day || ' hours')::INTERVAL;
      IF v_next_send <= v_now THEN
        v_next_send := v_next_send + INTERVAL '1 week';
      END IF;
      
    WHEN 'monthly' THEN
      v_next_send := DATE_TRUNC('month', v_now) + 
                     ((v_sub.day_of_month - 1) || ' days')::INTERVAL + 
                     (v_sub.hour_of_day || ' hours')::INTERVAL;
      IF v_next_send <= v_now THEN
        v_next_send := v_next_send + INTERVAL '1 month';
      END IF;
      
    ELSE
      -- Default to daily if unknown frequency
      v_next_send := DATE_TRUNC('day', v_now) + INTERVAL '1 day' + (v_sub.hour_of_day || ' hours')::INTERVAL;
  END CASE;
  
  RETURN v_next_send;
END;
$$;

-- ============================================================================
-- 2. Fix calculate_ab_test_significance function (ambiguous revenue_usd column)
-- ============================================================================

CREATE OR REPLACE FUNCTION calculate_ab_test_significance(
  p_user_id UUID,
  p_start_date TIMESTAMPTZ DEFAULT NOW() - INTERVAL '30 days',
  p_end_date TIMESTAMPTZ DEFAULT NOW(),
  p_confidence_level DECIMAL DEFAULT 0.95
)
RETURNS TABLE (
  provider TEXT,
  impressions BIGINT,
  conversions BIGINT,
  conversion_rate DECIMAL,
  revenue_usd DECIMAL,
  standard_error DECIMAL,
  z_score DECIMAL,
  p_value DECIMAL,
  is_significant BOOLEAN,
  confidence_interval_lower DECIMAL,
  confidence_interval_upper DECIMAL
)
LANGUAGE plpgsql
AS $$
DECLARE
  v_superwall RECORD;
  v_revenuecat RECORD;
  v_pooled_p DECIMAL;
  v_se DECIMAL;
  v_z DECIMAL;
  v_p DECIMAL;
  v_ci_margin DECIMAL;
  v_z_critical DECIMAL := 1.96;
BEGIN
  -- Get Superwall metrics
  SELECT 
    COUNT(*) FILTER (WHERE event_type = 'impression') as impressions,
    COUNT(*) FILTER (WHERE event_type = 'conversion') as conversions,
    COALESCE(
      COUNT(*) FILTER (WHERE event_type = 'conversion')::DECIMAL / 
      NULLIF(COUNT(*) FILTER (WHERE event_type = 'impression'), 0),
      0
    ) as rate,
    COALESCE(SUM(pe.revenue_usd) FILTER (WHERE event_type IN ('conversion', 'renewal')), 0) as revenue
  INTO v_superwall
  FROM unified_paywall_events pe
  WHERE pe.user_id = p_user_id
    AND pe.provider = 'superwall'
    AND pe.occurred_at >= p_start_date
    AND pe.occurred_at <= p_end_date;
  
  -- Get RevenueCat metrics
  SELECT 
    COUNT(*) FILTER (WHERE event_type = 'impression') as impressions,
    COUNT(*) FILTER (WHERE event_type = 'conversion') as conversions,
    COALESCE(
      COUNT(*) FILTER (WHERE event_type = 'conversion')::DECIMAL / 
      NULLIF(COUNT(*) FILTER (WHERE event_type = 'impression'), 0),
      0
    ) as rate,
    COALESCE(SUM(pe.revenue_usd) FILTER (WHERE event_type IN ('conversion', 'renewal')), 0) as revenue
  INTO v_revenuecat
  FROM unified_paywall_events pe
  WHERE pe.user_id = p_user_id
    AND pe.provider = 'revenuecat'
    AND pe.occurred_at >= p_start_date
    AND pe.occurred_at <= p_end_date;
  
  -- Calculate pooled proportion for standard error
  IF (v_superwall.impressions + v_revenuecat.impressions) > 0 THEN
    v_pooled_p := (v_superwall.conversions + v_revenuecat.conversions)::DECIMAL / 
                  (v_superwall.impressions + v_revenuecat.impressions);
    
    -- Calculate standard error
    v_se := SQRT(
      v_pooled_p * (1 - v_pooled_p) * 
      (1.0 / NULLIF(v_superwall.impressions, 0) + 1.0 / NULLIF(v_revenuecat.impressions, 0))
    );
    
    -- Calculate z-score
    IF v_se > 0 THEN
      v_z := (v_superwall.rate - v_revenuecat.rate) / v_se;
      
      -- Calculate p-value (two-tailed test) using normal distribution approximation
      v_p := 2 * (1 - (0.5 * (1 + erf(ABS(v_z) / SQRT(2)))));
    ELSE
      v_z := 0;
      v_p := 1;
    END IF;
    
    -- Calculate confidence interval margin
    v_ci_margin := v_z_critical * SQRT(v_superwall.rate * (1 - v_superwall.rate) / NULLIF(v_superwall.impressions, 0));
  ELSE
    v_se := 0;
    v_z := 0;
    v_p := 1;
    v_ci_margin := 0;
  END IF;
  
  -- Return results for Superwall
  RETURN QUERY
  SELECT 
    'superwall'::TEXT,
    v_superwall.impressions,
    v_superwall.conversions,
    ROUND(v_superwall.rate * 100, 2),
    ROUND(v_superwall.revenue, 2),
    ROUND(v_se * 100, 4),
    ROUND(v_z, 4),
    ROUND(v_p, 4),
    v_p < (1 - p_confidence_level),
    ROUND((v_superwall.rate - v_ci_margin) * 100, 2),
    ROUND((v_superwall.rate + v_ci_margin) * 100, 2);
  
  -- Return results for RevenueCat
  v_ci_margin := v_z_critical * SQRT(v_revenuecat.rate * (1 - v_revenuecat.rate) / NULLIF(v_revenuecat.impressions, 0));
  
  RETURN QUERY
  SELECT 
    'revenuecat'::TEXT,
    v_revenuecat.impressions,
    v_revenuecat.conversions,
    ROUND(v_revenuecat.rate * 100, 2),
    ROUND(v_revenuecat.revenue, 2),
    ROUND(v_se * 100, 4),
    ROUND(v_z, 4),
    ROUND(v_p, 4),
    v_p < (1 - p_confidence_level),
    ROUND((v_revenuecat.rate - v_ci_margin) * 100, 2),
    ROUND((v_revenuecat.rate + v_ci_margin) * 100, 2);
END;
$$;

-- ============================================================================
-- 3. Add unique index to paywall_cohort_analysis for concurrent refresh
-- ============================================================================

CREATE UNIQUE INDEX IF NOT EXISTS idx_cohort_analysis_unique 
ON paywall_cohort_analysis(cohort_week, provider, platform);
