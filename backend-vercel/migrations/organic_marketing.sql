-- Organic Marketing Schema (social + posts + metrics + n8n jobs)
-- Safe to run multiple times using IF NOT EXISTS where possible

create table if not exists public.social_accounts (
  id uuid primary key default gen_random_uuid(),
  workspace_id text,
  provider text not null, -- x | linkedin | facebook | instagram | tiktok | youtube | pinterest | threads | bluesky
  account_id text not null,
  handle text,
  display_name text,
  status text default 'connected', -- connected | disconnected | error
  token_expires_at timestamptz,
  scopes text[] default '{}',
  meta jsonb default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (provider, account_id)
);

create index if not exists idx_social_accounts_workspace on public.social_accounts (workspace_id);

create table if not exists public.content_posts (
  id uuid primary key default gen_random_uuid(),
  workspace_id text,
  social_account_id uuid references public.social_accounts(id) on delete set null,
  channel text not null, -- x | linkedin | instagram | ...
  status text not null default 'draft', -- draft | scheduled | publishing | published | failed
  scheduled_at timestamptz,
  published_at timestamptz,
  title text,
  body text,
  media jsonb default '[]'::jsonb,
  utm jsonb default '{}'::jsonb,
  external_post_id text,
  metrics jsonb default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_content_posts_workspace on public.content_posts (workspace_id);
create index if not exists idx_content_posts_status on public.content_posts (status);
create index if not exists idx_content_posts_scheduled_at on public.content_posts (scheduled_at);

create table if not exists public.post_metrics (
  id uuid primary key default gen_random_uuid(),
  workspace_id text,
  post_id uuid references public.content_posts(id) on delete cascade,
  metric_name text not null, -- impressions | reach | likes | comments | shares | clicks | watch_time_seconds
  value numeric not null,
  ts timestamptz not null,
  labels jsonb default '{}'::jsonb
);

create unique index if not exists uq_post_metrics_unique on public.post_metrics (post_id, metric_name, ts);
create index if not exists idx_post_metrics_workspace on public.post_metrics (workspace_id);
create index if not exists idx_post_metrics_metric_name on public.post_metrics (metric_name);

create table if not exists public.n8n_jobs (
  id uuid primary key default gen_random_uuid(),
  workspace_id text,
  source text, -- organic
  action text not null, -- create_post | draft_post | schedule_post | sync_metrics | sync_comments
  channel text, -- x | linkedin | ...
  account_id text,
  payload jsonb not null,
  idempotency_key text,
  status text not null default 'queued', -- queued | processing | done | failed
  attempts int not null default 0,
  error text,
  scheduled_at timestamptz,
  processed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_n8n_jobs_status on public.n8n_jobs (status);
create index if not exists idx_n8n_jobs_idem on public.n8n_jobs (idempotency_key);
