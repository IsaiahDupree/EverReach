-- PulseLense — Core Schema
-- Tables: dashboards, metrics, alerts
-- All tables enforce user_id ownership via RLS.

-- ─────────────────────────────────────────────────────────────────────────────
-- dashboards
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.dashboards (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  name         text not null,
  description  text,
  layout       text not null default 'grid' check (layout in ('grid', 'list', 'compact')),
  is_default   boolean not null default false,
  status       text not null default 'active' check (status in ('active', 'archived')),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

alter table public.dashboards enable row level security;

create policy "dashboards: owner read"
  on public.dashboards for select
  using (auth.uid() = user_id);

create policy "dashboards: owner insert"
  on public.dashboards for insert
  with check (auth.uid() = user_id);

create policy "dashboards: owner update"
  on public.dashboards for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "dashboards: owner delete"
  on public.dashboards for delete
  using (auth.uid() = user_id);

create index if not exists dashboards_user_id_idx on public.dashboards(user_id);
create index if not exists dashboards_status_idx  on public.dashboards(user_id, status);

-- ─────────────────────────────────────────────────────────────────────────────
-- metrics
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.metrics (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references auth.users(id) on delete cascade,
  dashboard_id        uuid not null references public.dashboards(id) on delete cascade,
  name                text not null,
  description         text,
  metric_type         text not null check (metric_type in ('count', 'sum', 'average', 'rate', 'gauge', 'percentage')),
  source              text not null,
  value               numeric not null default 0,
  previous_value      numeric,
  unit                text,
  period              text not null default '24h' check (period in ('1h', '6h', '24h', '7d', '30d', '90d')),
  threshold_warning   numeric,
  threshold_critical  numeric,
  is_visible          boolean not null default true,
  sort_order          integer not null default 0,
  last_synced_at      timestamptz,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

alter table public.metrics enable row level security;

create policy "metrics: owner read"
  on public.metrics for select
  using (auth.uid() = user_id);

create policy "metrics: owner insert"
  on public.metrics for insert
  with check (auth.uid() = user_id);

create policy "metrics: owner update"
  on public.metrics for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "metrics: owner delete"
  on public.metrics for delete
  using (auth.uid() = user_id);

create index if not exists metrics_user_id_idx       on public.metrics(user_id);
create index if not exists metrics_dashboard_id_idx  on public.metrics(dashboard_id);
create index if not exists metrics_sort_idx          on public.metrics(dashboard_id, sort_order);

-- ─────────────────────────────────────────────────────────────────────────────
-- alerts
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.alerts (
  id                     uuid primary key default gen_random_uuid(),
  user_id                uuid not null references auth.users(id) on delete cascade,
  metric_id              uuid not null references public.metrics(id) on delete cascade,
  dashboard_id           uuid not null references public.dashboards(id) on delete cascade,
  name                   text not null,
  description            text,
  condition              text not null check (condition in ('above', 'below', 'equals', 'change_pct')),
  threshold              numeric not null,
  severity               text not null check (severity in ('info', 'warning', 'critical')),
  status                 text not null default 'active' check (status in ('active', 'acknowledged', 'resolved', 'dismissed')),
  triggered_at           timestamptz,
  acknowledged_at        timestamptz,
  resolved_at            timestamptz,
  notification_channels  text[] not null default '{push}',
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);

alter table public.alerts enable row level security;

create policy "alerts: owner read"
  on public.alerts for select
  using (auth.uid() = user_id);

create policy "alerts: owner insert"
  on public.alerts for insert
  with check (auth.uid() = user_id);

create policy "alerts: owner update"
  on public.alerts for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "alerts: owner delete"
  on public.alerts for delete
  using (auth.uid() = user_id);

create index if not exists alerts_user_id_idx      on public.alerts(user_id);
create index if not exists alerts_metric_id_idx    on public.alerts(metric_id);
create index if not exists alerts_dashboard_id_idx on public.alerts(dashboard_id);
create index if not exists alerts_status_idx       on public.alerts(user_id, status);

-- ─────────────────────────────────────────────────────────────────────────────
-- updated_at auto-trigger (shared helper)
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger dashboards_set_updated_at
  before update on public.dashboards
  for each row execute function public.set_updated_at();

create trigger metrics_set_updated_at
  before update on public.metrics
  for each row execute function public.set_updated_at();

create trigger alerts_set_updated_at
  before update on public.alerts
  for each row execute function public.set_updated_at();
