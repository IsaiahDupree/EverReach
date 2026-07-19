-- EverReach blog posts (from Authority OS)
CREATE TABLE IF NOT EXISTS public.er_blog_posts (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  aos_post_id     text UNIQUE,
  title           text NOT NULL,
  slug            text UNIQUE NOT NULL,
  content_html    text,
  excerpt         text,
  tags            text[] DEFAULT '{}',
  category        text,
  author          text DEFAULT 'Authority OS',
  featured        boolean DEFAULT false,
  published_at    timestamptz,
  received_at     timestamptz DEFAULT now(),
  seo_title       text,
  seo_description text,
  word_count      int,
  created_at      timestamptz DEFAULT now()
);

-- Blog content requests sent to Authority OS
CREATE TABLE IF NOT EXISTS public.er_blog_requests (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  topic             text NOT NULL,
  keywords          text[] DEFAULT '{}',
  tone              text DEFAULT 'professional',
  word_count_target int DEFAULT 1500,
  status            text DEFAULT 'queued' CHECK (status IN ('queued','fulfilled','failed')),
  aos_request_id    text,
  created_at        timestamptz DEFAULT now()
);

-- SEO indexing log (site-indexer pipeline writes here)
CREATE TABLE IF NOT EXISTS public.site_indexer_log (
  id            bigserial PRIMARY KEY,
  url           text NOT NULL,
  ok            boolean NOT NULL,
  http_status   int,
  error_message text,
  source        text,        -- 'api' | 'browser' | 'ga4'
  pipeline      text,        -- 'vercel-to-ga4-indexing' | 'crawl-and-index'
  site_url      text,
  submitted_at  timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS er_blog_posts_slug_idx      ON public.er_blog_posts (slug);
CREATE INDEX IF NOT EXISTS er_blog_posts_pub_idx       ON public.er_blog_posts (published_at DESC);
CREATE INDEX IF NOT EXISTS er_blog_posts_cat_idx       ON public.er_blog_posts (category);
CREATE INDEX IF NOT EXISTS er_blog_requests_status_idx ON public.er_blog_requests (status);
CREATE INDEX IF NOT EXISTS site_indexer_url_idx        ON public.site_indexer_log (url);
CREATE INDEX IF NOT EXISTS site_indexer_ok_idx         ON public.site_indexer_log (ok, submitted_at DESC);
CREATE INDEX IF NOT EXISTS site_indexer_site_idx       ON public.site_indexer_log (site_url, submitted_at DESC);

ALTER TABLE public.er_blog_posts  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.er_blog_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_indexer_log ENABLE ROW LEVEL SECURITY;

-- Public read for blog posts
CREATE POLICY IF NOT EXISTS "er_blog_posts_public_read" ON public.er_blog_posts
  FOR SELECT USING (true);

-- Service role full access
CREATE POLICY IF NOT EXISTS "er_blog_posts_service_all" ON public.er_blog_posts
  USING (auth.role() = 'service_role');
CREATE POLICY IF NOT EXISTS "er_blog_requests_service_all" ON public.er_blog_requests
  USING (auth.role() = 'service_role');
CREATE POLICY IF NOT EXISTS "site_indexer_log_service_all" ON public.site_indexer_log
  USING (auth.role() = 'service_role');
