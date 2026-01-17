-- Add App Store product IDs to products table
-- These match the product IDs used in App Store Connect and RevenueCat
-- Migration: add_app_store_product_ids
-- Date: Applied via Supabase MCP

INSERT INTO products (id, display_name, period, active)
VALUES 
  ('com.everreach.core.monthly', 'Core Monthly', 'month', true),
  ('com.everreach.core.yearly', 'Core Yearly', 'year', true)
ON CONFLICT (id) DO UPDATE
SET display_name = EXCLUDED.display_name,
    period = EXCLUDED.period,
    active = EXCLUDED.active;

-- After running this migration, the restore route will be able to:
-- 1. Insert subscriptions with product_id = 'com.everreach.core.monthly' or 'com.everreach.core.yearly'
-- 2. These will properly reference the products table via foreign key constraint
-- 3. The recomputeEntitlementsForUser function will find active subscriptions and grant PRO access




