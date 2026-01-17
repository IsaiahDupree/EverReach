-- Migration: Event Mirror Table
-- Purpose: Mirror critical analytics events from PostHog to Supabase for:
--   1. Product analytics (join with CRM data)
--   2. Backup if PostHog is down
--   3. SQL-based analysis

-- Create app_events table
create table if not exists app_events (
  id bigserial primary key,
  event_name text not null,
  user_id uuid references auth.users(id) on delete set null,
  anonymous_id text,
  occurred_at timestamptz not null default now(),
  context jsonb not null default '{}',
  properties jsonb not null default '{}'
);

-- Add comment
comment on table app_events is 'Mirror of critical analytics events for product analytics and SQL-based analysis';

-- Indexes for performance
create index idx_app_events_event_name on app_events(event_name);
create index idx_app_events_user_id on app_events(user_id) where user_id is not null;
create index idx_app_events_occurred_at on app_events(occurred_at desc);
create index idx_app_events_event_time on app_events(event_name, occurred_at desc);
create index idx_app_events_anonymous_id on app_events(anonymous_id) where anonymous_id is not null;

-- Enable Row Level Security
alter table app_events enable row level security;

-- RLS Policies

-- Users can view their own events
create policy "Users can view their own events"
  on app_events for select
  using (auth.uid() = user_id);

-- Service role can insert events (backend only)
create policy "Service role can insert events"
  on app_events for insert
  with check (true);

-- Service role can read all events
create policy "Service role can read all events"
  on app_events for select
  using (auth.role() = 'service_role');

-- Helper function: Get event counts for a user
create or replace function get_event_counts(
  p_user_id uuid,
  p_event_names text[]
)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_counts jsonb;
begin
  select jsonb_object_agg(
    event_name,
    count
  )
  into v_counts
  from (
    select
      event_name,
      count(*) as count
    from app_events
    where user_id = p_user_id
      and event_name = any(p_event_names)
    group by event_name
  ) counts;

  return coalesce(v_counts, '{}'::jsonb);
end;
$$;

-- Helper function: Get last event of a type for a user
create or replace function get_last_event(
  p_user_id uuid,
  p_event_name text
)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_event jsonb;
begin
  select row_to_json(e)::jsonb
  into v_event
  from app_events e
  where e.user_id = p_user_id
    and e.event_name = p_event_name
  order by e.occurred_at desc
  limit 1;

  return v_event;
end;
$$;

-- Helper function: Get event timeline for a user
create or replace function get_event_timeline(
  p_user_id uuid,
  p_start_date timestamptz default null,
  p_end_date timestamptz default null,
  p_limit int default 100
)
returns table (
  event_name text,
  occurred_at timestamptz,
  properties jsonb
)
language plpgsql
security definer
as $$
begin
  return query
  select
    e.event_name,
    e.occurred_at,
    e.properties
  from app_events e
  where e.user_id = p_user_id
    and (p_start_date is null or e.occurred_at >= p_start_date)
    and (p_end_date is null or e.occurred_at <= p_end_date)
  order by e.occurred_at desc
  limit p_limit;
end;
$$;

-- Create materialized view for event analytics
create materialized view if not exists mv_event_analytics as
select
  event_name,
  date_trunc('day', occurred_at) as event_date,
  count(*) as event_count,
  count(distinct user_id) as unique_users,
  count(distinct anonymous_id) filter (where user_id is null) as anonymous_users
from app_events
group by event_name, date_trunc('day', occurred_at);

-- Index on materialized view
create unique index idx_mv_event_analytics_unique on mv_event_analytics(event_name, event_date);

-- Function to refresh materialized view
create or replace function refresh_event_analytics()
returns void
language plpgsql
security definer
as $$
begin
  refresh materialized view concurrently mv_event_analytics;
end;
$$;

-- Grant permissions
grant select on app_events to authenticated;
grant execute on function get_event_counts(uuid, text[]) to authenticated;
grant execute on function get_last_event(uuid, text) to authenticated;
grant execute on function get_event_timeline(uuid, timestamptz, timestamptz, int) to authenticated;
grant select on mv_event_analytics to authenticated;

-- Add comments to functions
comment on function get_event_counts is 'Get count of specific events for a user';
comment on function get_last_event is 'Get the most recent event of a type for a user';
comment on function get_event_timeline is 'Get chronological event timeline for a user';
comment on function refresh_event_analytics is 'Refresh the event analytics materialized view';

-- Success message
do $$
begin
  raise notice 'Migration complete: app_events table created with indexes, RLS policies, and helper functions';
end;
$$;
