-- Add missing contact_pipeline_state table
-- This table tracks the current pipeline state for each contact

create table if not exists contact_pipeline_state (
  contact_id uuid primary key references contacts(id) on delete cascade,
  pipeline_id uuid not null references pipelines(id) on delete cascade,
  stage_id uuid not null references pipeline_stages(id) on delete cascade,
  started_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Add index for faster lookups
create index if not exists contact_pipeline_state_pipeline_idx on contact_pipeline_state (pipeline_id, stage_id);

-- Enable RLS
alter table contact_pipeline_state enable row level security;

-- RLS policies for contact_pipeline_state
drop policy if exists "contact_pipeline_state_read_org" on contact_pipeline_state;
drop policy if exists "contact_pipeline_state_write_org" on contact_pipeline_state;
drop policy if exists "contact_pipeline_state_update_org" on contact_pipeline_state;
drop policy if exists "contact_pipeline_state_delete_org" on contact_pipeline_state;

create policy "contact_pipeline_state_read_org" on contact_pipeline_state
  for select using (exists(select 1 from contacts c where c.id = contact_id and is_member(c.org_id)));

create policy "contact_pipeline_state_write_org" on contact_pipeline_state
  for insert with check (exists(select 1 from contacts c where c.id = contact_id and is_member(c.org_id)));

create policy "contact_pipeline_state_update_org" on contact_pipeline_state
  for update using (exists(select 1 from contacts c where c.id = contact_id and is_member(c.org_id))) 
  with check (exists(select 1 from contacts c where c.id = contact_id and is_member(c.org_id)));

create policy "contact_pipeline_state_delete_org" on contact_pipeline_state
  for delete using (exists(select 1 from contacts c where c.id = contact_id and is_member(c.org_id)));

-- Add trigger to update updated_at timestamp
create or replace function update_contact_pipeline_state_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists update_contact_pipeline_state_updated_at_trigger on contact_pipeline_state;
create trigger update_contact_pipeline_state_updated_at_trigger
  before update on contact_pipeline_state
  for each row execute function update_contact_pipeline_state_updated_at();

-- Also add missing contact_pipeline_history table (different from pipeline_history)
create table if not exists contact_pipeline_history (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references orgs(id) on delete cascade,
  contact_id uuid not null references contacts(id) on delete cascade,
  pipeline_id uuid not null references pipelines(id) on delete cascade,
  from_stage_id uuid references pipeline_stages(id),
  to_stage_id uuid not null references pipeline_stages(id) on delete cascade,
  changed_by_user_id uuid not null,
  reason text,
  created_at timestamptz default now()
);

-- Add indexes for contact_pipeline_history
create index if not exists contact_pipeline_history_contact_idx on contact_pipeline_history (contact_id, created_at desc);
create index if not exists contact_pipeline_history_pipeline_idx on contact_pipeline_history (pipeline_id, created_at desc);

-- Enable RLS
alter table contact_pipeline_history enable row level security;

-- RLS policies for contact_pipeline_history
drop policy if exists "contact_pipeline_history_read_org" on contact_pipeline_history;
drop policy if exists "contact_pipeline_history_write_org" on contact_pipeline_history;

create policy "contact_pipeline_history_read_org" on contact_pipeline_history
  for select using (exists(select 1 from contacts c where c.id = contact_id and is_member(c.org_id)));

create policy "contact_pipeline_history_write_org" on contact_pipeline_history
  for insert with check (exists(select 1 from contacts c where c.id = contact_id and is_member(c.org_id)));

-- Success message
select 'Pipeline state tables created successfully!' as message;
