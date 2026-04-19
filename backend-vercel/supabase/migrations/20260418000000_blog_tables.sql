-- Blog tables for Authority OS integration
-- Run in Supabase SQL editor: https://supabase.com/dashboard/project/utasetfxiqcrnwyfforx/sql/new

CREATE TABLE IF NOT EXISTS er_blog_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  aos_post_id text UNIQUE,
  title text NOT NULL,
  slug text NOT NULL,
  content_html text NOT NULL DEFAULT '',
  excerpt text DEFAULT '',
  answer_summary text DEFAULT '',
  tags text[] DEFAULT '{}',
  category text DEFAULT 'general',
  author text DEFAULT 'EverReach Team',
  author_slug text DEFAULT 'everreach-team',
  author_bio text DEFAULT '',
  hero_image_url text,
  featured boolean DEFAULT false,
  reading_time_minutes integer DEFAULT 5,
  published_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  received_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS er_blog_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  topic text NOT NULL,
  keywords text[] DEFAULT '{}',
  tone text DEFAULT 'professional',
  word_count_target integer DEFAULT 1500,
  status text DEFAULT 'queued' CHECK (status IN ('queued', 'processing', 'fulfilled', 'failed')),
  aos_request_id text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_blog_posts_slug ON er_blog_posts(slug);
CREATE INDEX IF NOT EXISTS idx_blog_posts_category ON er_blog_posts(category);
CREATE INDEX IF NOT EXISTS idx_blog_posts_published ON er_blog_posts(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_blog_posts_featured ON er_blog_posts(featured) WHERE featured = true;
CREATE INDEX IF NOT EXISTS idx_blog_requests_status ON er_blog_requests(status);

-- RLS policies (allow public read, service role write)
ALTER TABLE er_blog_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE er_blog_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read published blog posts" ON er_blog_posts
  FOR SELECT USING (true);

CREATE POLICY "Service role can manage blog posts" ON er_blog_posts
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role can manage blog requests" ON er_blog_requests
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Authenticated users can create blog requests" ON er_blog_requests
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Users can read their own requests" ON er_blog_requests
  FOR SELECT USING (auth.uid() = user_id OR auth.role() = 'service_role');
