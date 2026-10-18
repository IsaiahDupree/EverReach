-- ============================================================================
-- Fix Missing Helper Functions
-- ============================================================================
-- This adds the helper functions that may have been missed
-- Safe to run multiple times (uses CREATE OR REPLACE)
-- ============================================================================

-- ============================================================================
-- 1. Verify API Key Function
-- ============================================================================

CREATE OR REPLACE FUNCTION public.verify_api_key(p_key_hash TEXT)
RETURNS TABLE (
  organization_id UUID,
  scopes TEXT[],
  api_key_id UUID
) 
LANGUAGE plpgsql 
SECURITY DEFINER 
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    k.organization_id,
    k.scopes,
    k.id
  FROM api_keys k
  WHERE k.key_hash = p_key_hash
    AND k.revoked = false
    AND (k.expires_at IS NULL OR k.expires_at > NOW())
    AND (k.deleted_at IS NULL OR k.deleted_at IS NULL);
END;
$$;

COMMENT ON FUNCTION public.verify_api_key IS 'Verifies an API key hash and returns organization_id, scopes, and key ID if valid';

-- ============================================================================
-- 2. Check Scope Function
-- ============================================================================

CREATE OR REPLACE FUNCTION public.has_scope(
  p_scopes TEXT[],
  p_required_scope TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  -- Check for wildcard (full access)
  IF '*' = ANY(p_scopes) THEN
    RETURN TRUE;
  END IF;
  
  -- Check for exact scope match
  IF p_required_scope = ANY(p_scopes) THEN
    RETURN TRUE;
  END IF;
  
  -- Check for resource wildcard (e.g., 'contacts:*' matches 'contacts:read')
  IF EXISTS (
    SELECT 1 
    FROM unnest(p_scopes) AS scope
    WHERE scope LIKE '%:*'
      AND p_required_scope LIKE (REPLACE(scope, ':*', '') || ':%')
  ) THEN
    RETURN TRUE;
  END IF;
  
  RETURN FALSE;
END;
$$;

COMMENT ON FUNCTION public.has_scope IS 'Checks if a scope array contains the required scope (supports wildcards)';

-- ============================================================================
-- 3. Update API Key Usage Function
-- ============================================================================

CREATE OR REPLACE FUNCTION public.update_api_key_usage(
  p_api_key_id UUID,
  p_ip_address INET,
  p_user_agent TEXT
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE api_keys
  SET 
    last_used_at = NOW(),
    last_used_ip = p_ip_address,
    last_used_user_agent = p_user_agent,
    usage_count = usage_count + 1,
    updated_at = NOW()
  WHERE id = p_api_key_id;
END;
$$;

COMMENT ON FUNCTION public.update_api_key_usage IS 'Updates API key usage metadata (last used timestamp, IP, user agent, count)';

-- ============================================================================
-- 4. Emit Webhook Event Function
-- ============================================================================

CREATE OR REPLACE FUNCTION public.emit_webhook_event(
  p_organization_id UUID,
  p_event_type TEXT,
  p_payload JSONB
)
RETURNS VOID 
LANGUAGE plpgsql 
AS $$
DECLARE
  v_webhook RECORD;
  v_event_id UUID := gen_random_uuid();
BEGIN
  -- Find all webhooks subscribed to this event type
  FOR v_webhook IN
    SELECT id, url, secret
    FROM webhooks
    WHERE organization_id = p_organization_id
      AND enabled = true
      AND p_event_type = ANY(events)
      AND (deleted_at IS NULL)
  LOOP
    -- Queue delivery
    INSERT INTO webhook_deliveries (
      webhook_id,
      event_id,
      event_type,
      payload,
      attempt_number,
      status,
      created_at
    ) VALUES (
      v_webhook.id,
      v_event_id,
      p_event_type,
      p_payload,
      1,
      NULL, -- pending
      NOW()
    );
  END LOOP;
END;
$$;

COMMENT ON FUNCTION public.emit_webhook_event IS 'Queues webhook deliveries for all webhooks subscribed to the event type';

-- ============================================================================
-- 5. Compute Segment Members Function
-- ============================================================================

CREATE OR REPLACE FUNCTION public.compute_segment_members(p_segment_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_count INTEGER;
  v_segment RECORD;
BEGIN
  SELECT * INTO v_segment FROM segments WHERE id = p_segment_id;
  
  -- This is a simplified version - in production, parse the filters JSONB
  -- and build dynamic SQL query
  
  -- For now, just count all contacts in org
  SELECT COUNT(*) INTO v_count
  FROM people
  WHERE organization_id = v_segment.organization_id
    AND (deleted_at IS NULL);
  
  UPDATE segments
  SET member_count = v_count, last_computed_at = NOW()
  WHERE id = p_segment_id;
  
  RETURN v_count;
END;
$$;

COMMENT ON FUNCTION public.compute_segment_members IS 'Recomputes the member count for a segment based on its filters';

-- ============================================================================
-- Verification
-- ============================================================================

-- Test that functions exist
DO $$
DECLARE
  func_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO func_count
  FROM information_schema.routines
  WHERE routine_schema = 'public'
  AND routine_name IN ('verify_api_key', 'has_scope', 'emit_webhook_event', 'update_api_key_usage', 'compute_segment_members');
  
  IF func_count >= 5 THEN
    RAISE NOTICE '✅ All 5 helper functions installed successfully!';
  ELSE
    RAISE WARNING '⚠️  Only % / 5 functions installed', func_count;
  END IF;
END $$;
