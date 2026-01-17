-- Migration: Screenshot Analysis System
-- Purpose: Store and analyze screenshots with AI (business cards, emails, meeting notes)

-- Create screenshots table
create table if not exists screenshots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  storage_key text not null,
  thumbnail_key text,
  width int,
  height int,
  file_size int,
  mime_type text,
  created_at timestamptz default now()
);

-- Add comments
comment on table screenshots is 'User-uploaded screenshots for AI analysis';
comment on column screenshots.storage_key is 'Path in Supabase Storage (screenshots bucket)';
comment on column screenshots.thumbnail_key is 'Path to 400px thumbnail';

-- Create screenshot_analysis table
create table if not exists screenshot_analysis (
  id uuid primary key default gen_random_uuid(),
  screenshot_id uuid not null references screenshots(id) on delete cascade,
  status text not null check (status in ('queued','analyzing','analyzed','error')) default 'queued',
  
  -- OCR results
  ocr_text text,
  ocr_confidence numeric,
  ocr_json jsonb,
  
  -- Extracted entities
  entities jsonb default '{
    "contacts": [],
    "dates": [],
    "platforms": [],
    "handles": [],
    "emails": [],
    "phones": []
  }'::jsonb,
  
  -- AI insights
  insights jsonb default '{
    "summary": null,
    "action_items": [],
    "sentiment": null,
    "category": null
  }'::jsonb,
  
  -- Error tracking
  error text,
  retry_count int default 0,
  
  -- Timestamps
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  analysis_completed_at timestamptz
);

-- Add comments
comment on table screenshot_analysis is 'AI analysis results for screenshots';
comment on column screenshot_analysis.status is 'Processing status: queued, analyzing, analyzed, error';
comment on column screenshot_analysis.entities is 'Extracted entities: contacts, dates, platforms, handles, emails, phones';
comment on column screenshot_analysis.insights is 'AI insights: summary, action_items, sentiment, category';

-- Indexes for performance
create index idx_screenshots_user_id on screenshots(user_id, created_at desc);
create index idx_screenshots_created_at on screenshots(created_at desc);
create index idx_screenshot_analysis_status on screenshot_analysis(status) where status != 'analyzed';
create index idx_screenshot_analysis_screenshot_id on screenshot_analysis(screenshot_id);

-- Enable Row Level Security
alter table screenshots enable row level security;
alter table screenshot_analysis enable row level security;

-- RLS Policies: Users can view their own screenshots
create policy "Users can view own screenshots"
  on screenshots for select
  using (auth.uid() = user_id);

-- Users can upload screenshots
create policy "Users can upload screenshots"
  on screenshots for insert
  with check (auth.uid() = user_id);

-- Users can delete their own screenshots
create policy "Users can delete own screenshots"
  on screenshots for delete
  using (auth.uid() = user_id);

-- Users can view their own analysis
create policy "Users can view own analysis"
  on screenshot_analysis for select
  using (exists (
    select 1 from screenshots
    where screenshots.id = screenshot_analysis.screenshot_id
    and screenshots.user_id = auth.uid()
  ));

-- Service role can update analysis
create policy "Service can update analysis"
  on screenshot_analysis for update
  using (true);

-- Service role can insert analysis
create policy "Service can insert analysis"
  on screenshot_analysis for insert
  with check (true);

-- Trigger to update updated_at
create or replace function update_screenshot_analysis_timestamp()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger update_screenshot_analysis_timestamp
  before update on screenshot_analysis
  for each row
  execute function update_screenshot_analysis_timestamp();

-- Helper function: Get screenshots with analysis for a user
create or replace function get_user_screenshots(
  p_user_id uuid,
  p_limit int default 20,
  p_offset int default 0
)
returns table (
  id uuid,
  storage_key text,
  thumbnail_key text,
  width int,
  height int,
  file_size int,
  mime_type text,
  created_at timestamptz,
  analysis_status text,
  analysis_summary text,
  entities_count int
)
language plpgsql
security definer
as $$
begin
  return query
  select
    s.id,
    s.storage_key,
    s.thumbnail_key,
    s.width,
    s.height,
    s.file_size,
    s.mime_type,
    s.created_at,
    sa.status as analysis_status,
    sa.insights->>'summary' as analysis_summary,
    (
      coalesce(jsonb_array_length(sa.entities->'contacts'), 0) +
      coalesce(jsonb_array_length(sa.entities->'dates'), 0) +
      coalesce(jsonb_array_length(sa.entities->'emails'), 0) +
      coalesce(jsonb_array_length(sa.entities->'phones'), 0)
    )::int as entities_count
  from screenshots s
  left join screenshot_analysis sa on sa.screenshot_id = s.id
  where s.user_id = p_user_id
  order by s.created_at desc
  limit p_limit
  offset p_offset;
end;
$$;

-- Helper function: Get pending screenshots for analysis
create or replace function get_pending_screenshots(p_limit int default 50)
returns table (
  screenshot_id uuid,
  user_id uuid,
  storage_key text,
  created_at timestamptz
)
language plpgsql
security definer
as $$
begin
  return query
  select
    s.id as screenshot_id,
    s.user_id,
    s.storage_key,
    s.created_at
  from screenshots s
  inner join screenshot_analysis sa on sa.screenshot_id = s.id
  where sa.status in ('queued', 'error')
    and sa.retry_count < 3
  order by s.created_at asc
  limit p_limit;
end;
$$;

-- Grant permissions
grant select, insert, delete on screenshots to authenticated;
grant select on screenshot_analysis to authenticated;
grant execute on function get_user_screenshots(uuid, int, int) to authenticated;

-- Add comments to functions
comment on function get_user_screenshots is 'Get screenshots with analysis summary for a user';
comment on function get_pending_screenshots is 'Get screenshots pending analysis (for background workers)';

-- Success message
do $$
begin
  raise notice 'Migration complete: Screenshot analysis system created';
  raise notice 'Tables: screenshots, screenshot_analysis';
  raise notice 'Storage bucket required: screenshots (create in Supabase dashboard)';
end;
$$;
