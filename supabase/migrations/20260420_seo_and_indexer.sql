-- Add SEO columns to er_blog_posts
ALTER TABLE er_blog_posts 
  ADD COLUMN IF NOT EXISTS seo_title text,
  ADD COLUMN IF NOT EXISTS seo_description text,
  ADD COLUMN IF NOT EXISTS word_count int;

-- Create site_indexer_log table
CREATE TABLE IF NOT EXISTS site_indexer_log (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  url text NOT NULL,
  status text NOT NULL,
  result jsonb,
  created_at timestamptz DEFAULT now()
);

-- Fix duplicate slugs: keep the one with highest id, remove others
DELETE FROM er_blog_posts
WHERE slug = 'professional-relationship-management-guide'
  AND id NOT IN (
    SELECT id FROM er_blog_posts
    WHERE slug = 'professional-relationship-management-guide'
    ORDER BY id DESC
    LIMIT 1
  );
