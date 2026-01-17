-- Supabase Setup for EverReach
-- Run this in your Supabase SQL Editor

-- Enable extensions
create extension if not exists "pgcrypto";
create extension if not exists "uuid-ossp";
create extension if not exists "vector";

-- Core tables
create table if not exists orgs (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz default now()
);

create table if not exists user_orgs (
  org_id uuid references orgs(id) on delete cascade,
  user_id uuid not null,  -- auth.uid()
  role text check (role in ('owner','admin','member')) default 'member',
  primary key (org_id, user_id)
);

-- People (contacts)
create table if not exists people (
  id uuid primary key default gen_random_uuid(),
  org_id uuid references orgs(id) on delete cascade,
  full_name text not null,
  title text, 
  company text,
  emails text[] default '{}',
  phones text[] default '{}',
  timezone text, 
  locale text,
  location jsonb,
  comms jsonb default '{"channelsPreferred":[],"style":{}}',
  tags text[] default '{}',
  interests text[] default '{}',
  goals text[] default '{}',
  values text[] default '{}',
  key_dates jsonb default '[]',
  last_interaction timestamptz,
  last_interaction_summary text,
  warmth int default 0 check (warmth between 0 and 100),
  last_suggest_copy_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Provenance and media
create table if not exists sources (
  id uuid primary key default gen_random_uuid(),
  org_id uuid references orgs(id) on delete cascade,
  kind text not null,     -- 'audio','email','web','manual','calendar','file'
  uri text,
  sha256 text,
  meta jsonb,
  created_by uuid not null,  -- auth.uid()
  created_at timestamptz default now()
);

create table if not exists media_files (
  id uuid primary key default gen_random_uuid(),
  org_id uuid references orgs(id) on delete cascade,
  source_id uuid references sources(id) unique,
  kind text check (kind in ('audio','video','doc','image')),
  storage_url text not null,
  mime_type text,
  duration_seconds int,
  tracks jsonb,
  deleted_at timestamptz,
  created_at timestamptz default now()
);

create table if not exists voice_calls (
  id uuid primary key default gen_random_uuid(),
  org_id uuid references orgs(id) on delete cascade,
  person_id uuid references people(id),
  source_id uuid references sources(id) unique,
  media_id uuid references media_files(id),
  scenario text, -- 'voice_note','scheduled_call','inbound_vm'
  started_at timestamptz,
  ended_at timestamptz,
  lang text,
  stt_model text,
  stt_confidence numeric,
  transcript text,
  transcript_json jsonb,
  context_scope text check (context_scope in ('about_person','about_me')) default 'about_person',
  created_at timestamptz default now()
);

-- Interactions and documents
create table if not exists interactions (
  id uuid primary key default gen_random_uuid(),
  org_id uuid references orgs(id) on delete cascade,
  person_id uuid references people(id) on delete cascade,
  occurred_at timestamptz not null default now(),
  channel text check (channel in ('sms','email','dm','call','meet','note','webhook')),
  direction text check (direction in ('inbound','outbound','internal')) default 'internal',
  summary text,
  sentiment text check (sentiment in ('pos','neu','neg')),
  action_items text[] default '{}',
  source_id uuid references sources(id),
  created_by uuid not null,
  created_at timestamptz default now()
);

create table if not exists documents (
  id uuid primary key default gen_random_uuid(),
  org_id uuid references orgs(id) on delete cascade,
  source_id uuid references sources(id),
  person_id uuid references people(id),
  title text, 
  kind text, 
  raw text,
  created_at timestamptz default now()
);

create table if not exists doc_chunks (
  id uuid primary key default gen_random_uuid(),
  org_id uuid references orgs(id) on delete cascade,
  doc_id uuid references documents(id) on delete cascade,
  ord int not null,
  text text not null,
  embedding vector(1536),
  meta jsonb,
  created_at timestamptz default now(),
  unique (doc_id, ord)
);

-- Insights and field changes
create table if not exists insights (
  id uuid primary key default gen_random_uuid(),
  org_id uuid references orgs(id) on delete cascade,
  person_id uuid references people(id) on delete cascade,
  source_id uuid references sources(id),
  proposal jsonb not null,
  confidence numeric,
  status text check (status in ('pending','approved','rejected')) default 'pending',
  reviewer_id uuid,
  reviewed_at timestamptz,
  created_at timestamptz default now()
);

create table if not exists field_changes (
  id uuid primary key default gen_random_uuid(),
  org_id uuid references orgs(id) on delete cascade,
  entity_type text not null,   -- 'person'
  entity_id uuid not null,
  field_path text not null,
  old_value jsonb,
  new_value jsonb,
  reason text,
  source_id uuid references sources(id),
  sha256 text,
  confidence numeric,
  actor_id uuid,
  created_at timestamptz default now()
);

create table if not exists ux_events (
  id uuid primary key default gen_random_uuid(),
  org_id uuid references orgs(id) on delete cascade,
  user_id uuid not null,
  person_id uuid references people(id) on delete cascade,
  kind text not null,         -- 'message_suggested','message_copied','message_sent'
  payload jsonb,
  created_at timestamptz default now()
);

-- Message goals (custom templates for message generation)
create table if not exists message_goals (
  id uuid primary key default gen_random_uuid(),
  org_id uuid references orgs(id) on delete cascade,
  user_id uuid not null,
  name text not null,
  template text not null,
  default_channels text[] default '{"sms","email","dm"}',
  style_tags text[] default '{}',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Generated messages (drafts with variants)
create table if not exists generated_messages (
  id uuid primary key default gen_random_uuid(),
  org_id uuid references orgs(id) on delete cascade,
  user_id uuid not null,
  person_id uuid references people(id) on delete cascade,
  goal_id uuid references message_goals(id) on delete set null,
  channel_selected text check (channel_selected in ('sms','email','dm')),
  context_snapshot jsonb not null default '{}',
  status text check (status in ('draft','copied','sent_inferred','sent_confirmed')) default 'draft',
  chosen_index int,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Message variants (3 options per generated message)
create table if not exists message_variants (
  id uuid primary key default gen_random_uuid(),
  message_id uuid references generated_messages(id) on delete cascade,
  variant_index int not null check (variant_index >= 0 and variant_index <= 2),
  text text not null,
  edited boolean default false,
  created_at timestamptz default now(),
  unique (message_id, variant_index)
);

-- Analytics events (for message generation tracking)
create table if not exists analytics_events (
  id uuid primary key default gen_random_uuid(),
  org_id uuid references orgs(id) on delete cascade,
  user_id uuid not null,
  name text not null,
  properties jsonb default '{}',
  created_at timestamptz default now()
);

-- Indexes
create index if not exists people_org_idx on people (org_id, updated_at desc);
create index if not exists interactions_q on interactions (org_id, person_id, occurred_at desc);
create index if not exists doc_chunks_ivf on doc_chunks using ivfflat (embedding vector_cosine_ops);
create index if not exists message_goals_org_idx on message_goals (org_id, user_id, created_at desc);
create index if not exists generated_messages_org_idx on generated_messages (org_id, user_id, person_id, created_at desc);
create index if not exists message_variants_msg_idx on message_variants (message_id, variant_index);
create index if not exists analytics_events_org_idx on analytics_events (org_id, user_id, name, created_at desc);

-- Enable RLS
alter table orgs enable row level security;
alter table user_orgs enable row level security;
alter table people enable row level security;
alter table sources enable row level security;
alter table media_files enable row level security;
alter table voice_calls enable row level security;
alter table interactions enable row level security;
alter table documents enable row level security;
alter table doc_chunks enable row level security;
alter table insights enable row level security;
alter table field_changes enable row level security;
alter table ux_events enable row level security;
alter table message_goals enable row level security;
alter table generated_messages enable row level security;
alter table message_variants enable row level security;
alter table analytics_events enable row level security;

-- Helper function to check membership
create or replace function is_member(org uuid)
returns boolean language sql stable as $$
  select exists(select 1 from user_orgs u where u.org_id = org and u.user_id = auth.uid());
$$;

-- Function to ensure user has an org
create or replace function ensure_user_org()
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  oid uuid;
begin
  select org_id into oid from user_orgs where user_id = auth.uid() limit 1;

  if oid is null then
    insert into orgs (name) values ('My Workspace') returning id into oid;
    insert into user_orgs (org_id, user_id, role) values (oid, auth.uid(), 'owner');
  end if;

  return oid;
end;
$$;

-- RLS Policies
create policy "orgs_owned" on orgs
  for select using (exists(select 1 from user_orgs u where u.org_id = id and u.user_id = auth.uid()));
create policy "orgs_ins_owner" on orgs for insert with check (true);

create policy "user_orgs_self" on user_orgs
  for select using (user_id = auth.uid());

-- Generic policies for org-based tables
create policy "people_read_org" on people
  for select using (is_member(org_id));
create policy "people_write_org" on people
  for insert with check (is_member(org_id));
create policy "people_update_org" on people
  for update using (is_member(org_id)) with check (is_member(org_id));

create policy "sources_read_org" on sources
  for select using (is_member(org_id));
create policy "sources_write_org" on sources
  for insert with check (is_member(org_id));
create policy "sources_update_org" on sources
  for update using (is_member(org_id)) with check (is_member(org_id));

create policy "media_files_read_org" on media_files
  for select using (is_member(org_id));
create policy "media_files_write_org" on media_files
  for insert with check (is_member(org_id));
create policy "media_files_update_org" on media_files
  for update using (is_member(org_id)) with check (is_member(org_id));

create policy "voice_calls_read_org" on voice_calls
  for select using (is_member(org_id));
create policy "voice_calls_write_org" on voice_calls
  for insert with check (is_member(org_id));
create policy "voice_calls_update_org" on voice_calls
  for update using (is_member(org_id)) with check (is_member(org_id));

create policy "interactions_read_org" on interactions
  for select using (is_member(org_id));
create policy "interactions_write_org" on interactions
  for insert with check (is_member(org_id));
create policy "interactions_update_org" on interactions
  for update using (is_member(org_id)) with check (is_member(org_id));

create policy "documents_read_org" on documents
  for select using (is_member(org_id));
create policy "documents_write_org" on documents
  for insert with check (is_member(org_id));
create policy "documents_update_org" on documents
  for update using (is_member(org_id)) with check (is_member(org_id));

create policy "doc_chunks_read_org" on doc_chunks
  for select using (is_member(org_id));

create policy "insights_read_org" on insights
  for select using (is_member(org_id));
create policy "insights_write_org" on insights
  for insert with check (is_member(org_id));
create policy "insights_update_org" on insights
  for update using (is_member(org_id)) with check (is_member(org_id));

create policy "field_changes_read_org" on field_changes
  for select using (is_member(org_id));
create policy "field_changes_write_org" on field_changes
  for insert with check (is_member(org_id));

create policy "ux_events_read_org" on ux_events
  for select using (is_member(org_id));
create policy "ux_events_write_org" on ux_events
  for insert with check (is_member(org_id));

-- RLS policies for message goals
create policy "message_goals_read_org" on message_goals
  for select using (is_member(org_id));
create policy "message_goals_write_org" on message_goals
  for insert with check (is_member(org_id));
create policy "message_goals_update_org" on message_goals
  for update using (is_member(org_id)) with check (is_member(org_id));
create policy "message_goals_delete_org" on message_goals
  for delete using (is_member(org_id));

-- RLS policies for generated messages
create policy "generated_messages_read_org" on generated_messages
  for select using (is_member(org_id));
create policy "generated_messages_write_org" on generated_messages
  for insert with check (is_member(org_id));
create policy "generated_messages_update_org" on generated_messages
  for update using (is_member(org_id)) with check (is_member(org_id));
create policy "generated_messages_delete_org" on generated_messages
  for delete using (is_member(org_id));

-- RLS policies for message variants
create policy "message_variants_read_org" on message_variants
  for select using (exists(select 1 from generated_messages gm where gm.id = message_id and is_member(gm.org_id)));
create policy "message_variants_write_org" on message_variants
  for insert with check (exists(select 1 from generated_messages gm where gm.id = message_id and is_member(gm.org_id)));
create policy "message_variants_update_org" on message_variants
  for update using (exists(select 1 from generated_messages gm where gm.id = message_id and is_member(gm.org_id))) with check (exists(select 1 from generated_messages gm where gm.id = message_id and is_member(gm.org_id)));
create policy "message_variants_delete_org" on message_variants
  for delete using (exists(select 1 from generated_messages gm where gm.id = message_id and is_member(gm.org_id)));

-- RLS policies for analytics events
create policy "analytics_events_read_org" on analytics_events
  for select using (is_member(org_id));
create policy "analytics_events_write_org" on analytics_events
  for insert with check (is_member(org_id));
create policy "analytics_events_update_org" on analytics_events
  for update using (is_member(org_id)) with check (is_member(org_id));
create policy "analytics_events_delete_org" on analytics_events
  for delete using (is_member(org_id));

-- Insert some sample data for testing
insert into orgs (id, name) values ('00000000-0000-0000-0000-000000000001', 'Demo Workspace') on conflict do nothing;

insert into people (id, org_id, full_name, title, company, emails, interests, goals, warmth) values 
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'Sarah Chen', 'Product Manager', 'TechCorp', '{"sarah@techcorp.com"}', '{"AI","Product Design","Hiking"}', '{"Launch Q2 features","Improve user onboarding"}', 75),
  ('00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'Mike Johnson', 'Software Engineer', 'StartupXYZ', '{"mike@startupxyz.com"}', '{"React","TypeScript","Gaming"}', '{"Learn Rust","Build side project"}', 45),
  ('00000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', 'Emily Rodriguez', 'Designer', 'Creative Agency', '{"emily@creative.com"}', '{"UI/UX","Photography","Travel"}', '{"Portfolio redesign","Learn Figma advanced"}', 20)
on conflict do nothing;

-- Success message
select 'Supabase setup completed successfully! You can now sign in to your app.' as message;