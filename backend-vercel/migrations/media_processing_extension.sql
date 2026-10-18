-- Extend organic marketing schema for media processing workflow
-- Adds tables for tracking media assets and processing jobs

create table if not exists public.media_assets (
  id uuid primary key default gen_random_uuid(),
  workspace_id text,
  source text not null, -- google_drive | upload | generated
  source_id text, -- Google Drive file ID, etc.
  file_type text not null, -- image | video | audio
  original_url text,
  processed_url text,
  thumbnail_url text,
  status text not null default 'pending', -- pending | processing | processed | failed
  duration_seconds numeric,
  width int,
  height int,
  file_size_bytes bigint,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_media_assets_workspace on public.media_assets (workspace_id);
create index if not exists idx_media_assets_status on public.media_assets (status);
create index if not exists idx_media_assets_source on public.media_assets (source, source_id);

create table if not exists public.media_processing_jobs (
  id uuid primary key default gen_random_uuid(),
  workspace_id text,
  media_asset_id uuid references public.media_assets(id) on delete cascade,
  job_type text not null, -- transcribe | caption | filter | crop | compress | thumbnail
  status text not null default 'queued', -- queued | processing | completed | failed
  input_params jsonb not null,
  output_data jsonb,
  flask_job_id text,
  attempts int not null default 0,
  error text,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_media_jobs_status on public.media_processing_jobs (status);
create index if not exists idx_media_jobs_asset on public.media_processing_jobs (media_asset_id);
create index if not exists idx_media_jobs_flask on public.media_processing_jobs (flask_job_id);

-- Extend n8n_jobs with media-specific actions
comment on column public.n8n_jobs.action is 'Actions: create_post | draft_post | schedule_post | sync_metrics | sync_comments | process_media | upload_media | distribute_media';

-- RLS policies
alter table public.media_assets enable row level security;
alter table public.media_processing_jobs enable row level security;

drop policy if exists "Users can view their workspace media assets" on public.media_assets;
create policy "Users can view their workspace media assets"
on public.media_assets for select
to authenticated
using (
  workspace_id = current_setting('app.workspace_id', true)
  or workspace_id is null
);

drop policy if exists "Users can create media assets" on public.media_assets;
create policy "Users can create media assets"
on public.media_assets for insert
to authenticated
with check (
  workspace_id = current_setting('app.workspace_id', true)
  or workspace_id is null
);

drop policy if exists "Users can update their workspace media assets" on public.media_assets;
create policy "Users can update their workspace media assets"
on public.media_assets for update
to authenticated
using (
  workspace_id = current_setting('app.workspace_id', true)
  or workspace_id is null
);

drop policy if exists "Users can view their workspace processing jobs" on public.media_processing_jobs;
create policy "Users can view their workspace processing jobs"
on public.media_processing_jobs for select
to authenticated
using (
  workspace_id = current_setting('app.workspace_id', true)
  or workspace_id is null
);

drop policy if exists "Service role has full access to media jobs" on public.media_processing_jobs;
create policy "Service role has full access to media jobs"
on public.media_processing_jobs for all
to service_role
using (true)
with check (true);
