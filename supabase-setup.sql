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

-- Profiles (user billing and subscription management)
create table if not exists profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique,
  email text,
  display_name text,
  -- Stripe billing fields
  stripe_customer_id text unique,
  stripe_subscription_id text,
  stripe_price_id text,
  subscription_status text check (subscription_status in ('active', 'canceled', 'past_due', 'trialing', 'incomplete', 'incomplete_expired', 'unpaid')),
  current_period_end timestamptz,
  -- Timestamps
  created_at timestamptz default now(),
  updated_at timestamptz default now()
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

-- Additional tables required by backend

-- Contacts (alternative to people table for backward compatibility)
create table if not exists contacts (
  id uuid primary key default gen_random_uuid(),
  org_id uuid references orgs(id) on delete cascade,
  display_name text not null,
  emails text[] default '{}',
  phones text[] default '{}',
  company text,
  notes text,
  tags text[] default '{}',
  avatar_url text,
  warmth int default 0 check (warmth between 0 and 100),
  warmth_band text check (warmth_band in ('hot','warm','neutral','cool','cold')),
  warmth_override boolean default false,
  warmth_override_reason text,
  metadata jsonb default '{}',
  pipeline text,
  stage text,
  last_interaction_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Persona notes (voice and text notes about user preferences/context)
create table if not exists persona_notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  type text check (type in ('text','voice')) not null,
  status text check (status in ('pending','processing','completed','failed')) default 'completed',
  title text,
  body_text text,
  file_url text,
  duration_sec int,
  transcript text,
  tags text[] default '{}',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Templates (reusable message templates)
create table if not exists templates (
  id uuid primary key default gen_random_uuid(),
  org_id uuid references orgs(id) on delete cascade,
  user_id uuid not null,
  channel text check (channel in ('email','sms','dm')) not null,
  name text not null,
  description text,
  subject_tmpl text,
  body_tmpl text not null,
  closing_tmpl text,
  variables jsonb default '[]',
  visibility text check (visibility in ('private','team','org')) default 'private',
  is_default boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Templates stats (usage tracking)
create table if not exists templates_stats (
  id uuid primary key default gen_random_uuid(),
  template_id uuid references templates(id) on delete cascade,
  user_id uuid not null,
  uses_count int default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (template_id, user_id)
);

-- Compose settings (user preferences for message composition)
create table if not exists compose_settings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique not null,
  enabled boolean default true,
  default_channel text check (default_channel in ('email','sms','dm')),
  auto_use_persona_notes boolean default true,
  default_template_id uuid references templates(id) on delete set null,
  tone text check (tone in ('concise','warm','professional','playful')) default 'warm',
  max_length int,
  guardrails jsonb default '{}',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Compose sessions (track AI-generated message sessions)
create table if not exists compose_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  contact_id uuid references contacts(id) on delete cascade,
  goal_id uuid references message_goals(id) on delete set null,
  goal_text text,
  channel text check (channel in ('email','sms','dm')) not null,
  template_id uuid references templates(id) on delete set null,
  variables jsonb default '{}',
  sources jsonb default '{}',
  draft jsonb,
  safety jsonb default '{}',
  created_at timestamptz default now()
);

-- Messages (outbound message tracking)
create table if not exists messages (
  id uuid primary key default gen_random_uuid(),
  org_id uuid references orgs(id) on delete cascade,
  user_id uuid not null,
  contact_id uuid references contacts(id) on delete cascade,
  thread_id uuid,
  channel text check (channel in ('email','sms','dm')) not null,
  status text check (status in ('draft','queued','sent','failed')) default 'draft',
  subject text,
  body text not null,
  closing text,
  composer_context jsonb default '{}',
  provider_meta jsonb default '{}',
  sent_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Files (attachment tracking)
create table if not exists files (
  id uuid primary key default gen_random_uuid(),
  org_id uuid references orgs(id) on delete cascade,
  user_id uuid not null,
  contact_id uuid references contacts(id) on delete set null,
  interaction_id uuid references interactions(id) on delete set null,
  message_id uuid references messages(id) on delete set null,
  path text not null,
  mime_type text,
  size_bytes bigint,
  public_url text,
  created_at timestamptz default now()
);

-- Goals (predefined message goals/templates)
create table if not exists goals (
  id uuid primary key default gen_random_uuid(),
  org_id uuid references orgs(id) on delete cascade,
  kind text check (kind in ('business','network','personal')) not null,
  name text not null,
  description text,
  channel_suggestions text[] default '{}',
  variables_schema jsonb default '{}',
  default_template_id uuid references templates(id) on delete set null,
  is_active boolean default true,
  scope text check (scope in ('global','org','user')) default 'global',
  created_by uuid,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Goal pins (user pinned goals)
create table if not exists goal_pins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  goal_id uuid references goals(id) on delete cascade,
  pinned boolean default true,
  created_at timestamptz default now(),
  unique (user_id, goal_id)
);

-- Pipelines (for contact stage tracking)
create table if not exists pipelines (
  id uuid primary key default gen_random_uuid(),
  org_id uuid references orgs(id) on delete cascade,
  key text not null,
  name text not null,
  description text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (org_id, key)
);

-- Pipeline stages (stages within a pipeline)
create table if not exists pipeline_stages (
  id uuid primary key default gen_random_uuid(),
  pipeline_id uuid references pipelines(id) on delete cascade,
  key text not null,
  name text not null,
  position int not null,
  terminal boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (pipeline_id, key),
  unique (pipeline_id, position)
);

-- Pipeline history (track contact movement through stages)
create table if not exists pipeline_history (
  id uuid primary key default gen_random_uuid(),
  org_id uuid references orgs(id) on delete cascade,
  contact_id uuid references contacts(id) on delete cascade,
  pipeline_id uuid references pipelines(id) on delete cascade,
  from_stage_id uuid references pipeline_stages(id),
  to_stage_id uuid references pipeline_stages(id) on delete cascade,
  moved_by uuid not null,
  moved_at timestamptz default now()
);

-- Ensure all required columns exist (handles tables from previous schemas)
-- CRITICAL: This must run BEFORE any RLS policies or functions reference these columns

-- People table columns
alter table people add column if not exists org_id uuid references orgs(id) on delete cascade;
alter table people add column if not exists full_name text;
alter table people add column if not exists title text;
alter table people add column if not exists company text;
alter table people add column if not exists emails text[] default '{}';
alter table people add column if not exists phones text[] default '{}';
alter table people add column if not exists timezone text;
alter table people add column if not exists locale text;
alter table people add column if not exists location jsonb;
alter table people add column if not exists comms jsonb default '{"channelsPreferred":[],"style":{}}';
alter table people add column if not exists tags text[] default '{}';
alter table people add column if not exists interests text[] default '{}';
alter table people add column if not exists goals text[] default '{}';
alter table people add column if not exists values text[] default '{}';
alter table people add column if not exists key_dates jsonb default '[]';
alter table people add column if not exists last_interaction timestamptz;
alter table people add column if not exists last_interaction_summary text;
alter table people add column if not exists warmth int default 0;
alter table people add column if not exists last_suggest_copy_at timestamptz;
alter table people add column if not exists created_at timestamptz default now();
alter table people add column if not exists updated_at timestamptz default now();

-- Profiles table columns
alter table profiles add column if not exists user_id uuid;
alter table profiles add column if not exists email text;
alter table profiles add column if not exists display_name text;
alter table profiles add column if not exists stripe_customer_id text;
alter table profiles add column if not exists stripe_subscription_id text;
alter table profiles add column if not exists stripe_price_id text;
alter table profiles add column if not exists subscription_status text;
alter table profiles add column if not exists current_period_end timestamptz;
alter table profiles add column if not exists created_at timestamptz default now();
alter table profiles add column if not exists updated_at timestamptz default now();

-- Interactions table columns
alter table interactions add column if not exists org_id uuid references orgs(id) on delete cascade;
alter table interactions add column if not exists person_id uuid references people(id) on delete cascade;
alter table interactions add column if not exists contact_id uuid references contacts(id) on delete cascade;
alter table interactions add column if not exists occurred_at timestamptz default now();
alter table interactions add column if not exists channel text;
alter table interactions add column if not exists direction text default 'internal';
alter table interactions add column if not exists summary text;
alter table interactions add column if not exists sentiment text;
alter table interactions add column if not exists action_items text[] default '{}';
alter table interactions add column if not exists source_id uuid references sources(id);
alter table interactions add column if not exists created_by uuid;
alter table interactions add column if not exists created_at timestamptz default now();
-- Contacts table columns
alter table contacts add column if not exists org_id uuid references orgs(id) on delete cascade;
alter table contacts add column if not exists display_name text;
alter table contacts add column if not exists emails text[] default '{}';
alter table contacts add column if not exists phones text[] default '{}';
alter table contacts add column if not exists company text;
alter table contacts add column if not exists notes text;
alter table contacts add column if not exists tags text[] default '{}';
alter table contacts add column if not exists avatar_url text;
alter table contacts add column if not exists warmth int default 0;
alter table contacts add column if not exists warmth_band text;
alter table contacts add column if not exists warmth_override boolean default false;
alter table contacts add column if not exists warmth_override_reason text;
alter table contacts add column if not exists metadata jsonb default '{}';
alter table contacts add column if not exists pipeline text;
alter table contacts add column if not exists stage text;
alter table contacts add column if not exists last_interaction_at timestamptz;
alter table contacts add column if not exists deleted_at timestamptz;
alter table contacts add column if not exists created_at timestamptz default now();
alter table contacts add column if not exists updated_at timestamptz default now();
-- Goals table columns
alter table goals add column if not exists org_id uuid references orgs(id) on delete cascade;
alter table goals add column if not exists kind text;
alter table goals add column if not exists name text;
alter table goals add column if not exists description text;
alter table goals add column if not exists channel_suggestions text[] default '{}';
alter table goals add column if not exists variables_schema jsonb default '{}';
alter table goals add column if not exists default_template_id uuid references templates(id);
alter table goals add column if not exists is_active boolean default true;
alter table goals add column if not exists scope text;
alter table goals add column if not exists created_by uuid;
alter table goals add column if not exists created_at timestamptz default now();
alter table goals add column if not exists updated_at timestamptz default now();

-- Templates table columns
alter table templates add column if not exists org_id uuid references orgs(id) on delete cascade;
alter table templates add column if not exists user_id uuid;
alter table templates add column if not exists channel text;
alter table templates add column if not exists name text;
alter table templates add column if not exists description text;
alter table templates add column if not exists subject_tmpl text;
alter table templates add column if not exists body_tmpl text;
alter table templates add column if not exists closing_tmpl text;
alter table templates add column if not exists variables jsonb default '[]';
alter table templates add column if not exists visibility text default 'private';
alter table templates add column if not exists is_default boolean default false;
alter table templates add column if not exists created_at timestamptz default now();
alter table templates add column if not exists updated_at timestamptz default now();

-- Messages table columns
alter table messages add column if not exists org_id uuid references orgs(id) on delete cascade;
alter table messages add column if not exists user_id uuid;
alter table messages add column if not exists contact_id uuid references contacts(id);
alter table messages add column if not exists thread_id uuid;
alter table messages add column if not exists channel text;
alter table messages add column if not exists status text default 'draft';
alter table messages add column if not exists subject text;
alter table messages add column if not exists body text;
alter table messages add column if not exists closing text;
alter table messages add column if not exists composer_context jsonb default '{}';
alter table messages add column if not exists provider_meta jsonb default '{}';
alter table messages add column if not exists sent_at timestamptz;
alter table messages add column if not exists created_at timestamptz default now();
alter table messages add column if not exists updated_at timestamptz default now();

-- Files table columns
alter table files add column if not exists org_id uuid references orgs(id) on delete cascade;
alter table files add column if not exists user_id uuid;
alter table files add column if not exists contact_id uuid references contacts(id);
alter table files add column if not exists interaction_id uuid references interactions(id);
alter table files add column if not exists message_id uuid references messages(id);
alter table files add column if not exists path text;
alter table files add column if not exists mime_type text;
alter table files add column if not exists size_bytes bigint;
alter table files add column if not exists public_url text;
alter table files add column if not exists created_at timestamptz default now();
alter table sources add column if not exists org_id uuid references orgs(id) on delete cascade;
alter table media_files add column if not exists org_id uuid references orgs(id) on delete cascade;
alter table voice_calls add column if not exists org_id uuid references orgs(id) on delete cascade;
alter table documents add column if not exists org_id uuid references orgs(id) on delete cascade;
alter table doc_chunks add column if not exists org_id uuid references orgs(id) on delete cascade;
alter table insights add column if not exists org_id uuid references orgs(id) on delete cascade;
alter table field_changes add column if not exists org_id uuid references orgs(id) on delete cascade;
-- Message goals table columns
alter table message_goals add column if not exists org_id uuid references orgs(id) on delete cascade;
alter table message_goals add column if not exists user_id uuid;
alter table message_goals add column if not exists name text;
alter table message_goals add column if not exists template text;
alter table message_goals add column if not exists default_channels text[] default '{"sms","email","dm"}';
alter table message_goals add column if not exists style_tags text[] default '{}';
alter table message_goals add column if not exists created_at timestamptz default now();
alter table message_goals add column if not exists updated_at timestamptz default now();

-- Generated messages table columns
alter table generated_messages add column if not exists org_id uuid references orgs(id) on delete cascade;
alter table generated_messages add column if not exists user_id uuid;
alter table generated_messages add column if not exists person_id uuid references people(id);
alter table generated_messages add column if not exists goal_id uuid references message_goals(id);
alter table generated_messages add column if not exists channel_selected text;
alter table generated_messages add column if not exists context_snapshot jsonb default '{}';
alter table generated_messages add column if not exists status text default 'draft';
alter table generated_messages add column if not exists chosen_index int;
alter table generated_messages add column if not exists created_at timestamptz default now();
alter table generated_messages add column if not exists updated_at timestamptz default now();

-- Analytics events table columns
alter table analytics_events add column if not exists org_id uuid references orgs(id) on delete cascade;
alter table analytics_events add column if not exists user_id uuid;
alter table analytics_events add column if not exists name text;
alter table analytics_events add column if not exists properties jsonb default '{}';
alter table analytics_events add column if not exists created_at timestamptz default now();

-- UX events table columns
alter table ux_events add column if not exists org_id uuid references orgs(id) on delete cascade;
alter table ux_events add column if not exists user_id uuid;
alter table ux_events add column if not exists person_id uuid references people(id);
alter table ux_events add column if not exists kind text;
alter table ux_events add column if not exists payload jsonb;
alter table ux_events add column if not exists created_at timestamptz default now();

-- Persona notes table columns
alter table persona_notes add column if not exists user_id uuid;
alter table persona_notes add column if not exists type text;
alter table persona_notes add column if not exists status text default 'completed';
alter table persona_notes add column if not exists title text;
alter table persona_notes add column if not exists body_text text;
alter table persona_notes add column if not exists file_url text;
alter table persona_notes add column if not exists duration_sec int;
alter table persona_notes add column if not exists transcript text;
alter table persona_notes add column if not exists tags text[] default '{}';
alter table persona_notes add column if not exists created_at timestamptz default now();
alter table persona_notes add column if not exists updated_at timestamptz default now();

-- Pipelines table columns
alter table pipelines add column if not exists org_id uuid references orgs(id) on delete cascade;
alter table pipelines add column if not exists key text;
alter table pipelines add column if not exists name text;
alter table pipelines add column if not exists description text;
alter table pipelines add column if not exists created_at timestamptz default now();
alter table pipelines add column if not exists updated_at timestamptz default now();

-- Pipeline stages table columns
alter table pipeline_stages add column if not exists pipeline_id uuid references pipelines(id);
alter table pipeline_stages add column if not exists key text;
alter table pipeline_stages add column if not exists name text;
alter table pipeline_stages add column if not exists position int;
alter table pipeline_stages add column if not exists terminal boolean default false;
alter table pipeline_stages add column if not exists created_at timestamptz default now();
alter table pipeline_stages add column if not exists updated_at timestamptz default now();

-- Pipeline history table columns
alter table pipeline_history add column if not exists org_id uuid references orgs(id) on delete cascade;
alter table pipeline_history add column if not exists contact_id uuid references contacts(id);
alter table pipeline_history add column if not exists pipeline_id uuid references pipelines(id);
alter table pipeline_history add column if not exists from_stage_id uuid references pipeline_stages(id);
alter table pipeline_history add column if not exists to_stage_id uuid references pipeline_stages(id);
alter table pipeline_history add column if not exists moved_by uuid;
alter table pipeline_history add column if not exists moved_at timestamptz default now();

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

-- Function to automatically create profile on user signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (user_id, email, display_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'display_name', new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1))
  )
  on conflict (user_id) do nothing;
  return new;
end;
$$;

-- Trigger to create profile on user signup
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Function to update updated_at timestamp
create or replace function update_profiles_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Trigger to update updated_at on profile updates
drop trigger if exists update_profiles_updated_at_trigger on profiles;
create trigger update_profiles_updated_at_trigger
  before update on profiles
  for each row execute function update_profiles_updated_at();

-- Drop existing policies to allow re-running schema
drop policy if exists "orgs_owned" on orgs;
drop policy if exists "orgs_ins_owner" on orgs;
drop policy if exists "user_orgs_self" on user_orgs;
drop policy if exists "profiles_select_own" on profiles;
drop policy if exists "profiles_insert_own" on profiles;
drop policy if exists "profiles_update_own" on profiles;
drop policy if exists "people_read_org" on people;
drop policy if exists "people_write_org" on people;
drop policy if exists "people_update_org" on people;
drop policy if exists "people_delete_org" on people;
drop policy if exists "sources_read_org" on sources;
drop policy if exists "sources_write_org" on sources;
drop policy if exists "sources_update_org" on sources;
drop policy if exists "media_files_read_org" on media_files;
drop policy if exists "media_files_write_org" on media_files;
drop policy if exists "media_files_update_org" on media_files;
drop policy if exists "voice_calls_read_org" on voice_calls;
drop policy if exists "voice_calls_write_org" on voice_calls;
drop policy if exists "voice_calls_update_org" on voice_calls;
drop policy if exists "interactions_read_org" on interactions;
drop policy if exists "interactions_write_org" on interactions;
drop policy if exists "interactions_update_org" on interactions;
drop policy if exists "interactions_delete_org" on interactions;
drop policy if exists "documents_read_org" on documents;
drop policy if exists "documents_write_org" on documents;
drop policy if exists "documents_update_org" on documents;
drop policy if exists "doc_chunks_read_org" on doc_chunks;
drop policy if exists "insights_read_org" on insights;
drop policy if exists "insights_write_org" on insights;
drop policy if exists "insights_update_org" on insights;
drop policy if exists "field_changes_read_org" on field_changes;
drop policy if exists "field_changes_write_org" on field_changes;
drop policy if exists "ux_events_read_org" on ux_events;
drop policy if exists "ux_events_write_org" on ux_events;
drop policy if exists "message_goals_read_org" on message_goals;
drop policy if exists "message_goals_write_org" on message_goals;
drop policy if exists "message_goals_update_org" on message_goals;
drop policy if exists "message_goals_delete_org" on message_goals;
drop policy if exists "generated_messages_read_org" on generated_messages;
drop policy if exists "generated_messages_write_org" on generated_messages;
drop policy if exists "generated_messages_update_org" on generated_messages;
drop policy if exists "generated_messages_delete_org" on generated_messages;
drop policy if exists "message_variants_read_org" on message_variants;
drop policy if exists "message_variants_write_org" on message_variants;
drop policy if exists "message_variants_update_org" on message_variants;
drop policy if exists "message_variants_delete_org" on message_variants;
drop policy if exists "analytics_events_read_org" on analytics_events;
drop policy if exists "analytics_events_write_org" on analytics_events;
drop policy if exists "analytics_events_update_org" on analytics_events;
drop policy if exists "analytics_events_delete_org" on analytics_events;
drop policy if exists "contacts_read_org" on contacts;
drop policy if exists "contacts_write_org" on contacts;
drop policy if exists "contacts_update_org" on contacts;
drop policy if exists "contacts_delete_org" on contacts;
drop policy if exists "persona_notes_self" on persona_notes;
drop policy if exists "templates_read_org" on templates;
drop policy if exists "templates_write_org" on templates;
drop policy if exists "templates_update_org" on templates;
drop policy if exists "templates_delete_org" on templates;
drop policy if exists "templates_stats_read_org" on templates_stats;
drop policy if exists "templates_stats_write_org" on templates_stats;
drop policy if exists "templates_stats_update_org" on templates_stats;
drop policy if exists "compose_settings_self" on compose_settings;
drop policy if exists "compose_sessions_self" on compose_sessions;
drop policy if exists "messages_read_org" on messages;
drop policy if exists "messages_write_org" on messages;
drop policy if exists "messages_update_org" on messages;
drop policy if exists "messages_delete_org" on messages;
drop policy if exists "files_read_org" on files;
drop policy if exists "files_write_org" on files;
drop policy if exists "files_delete_org" on files;
drop policy if exists "goals_read" on goals;
drop policy if exists "goals_write_org" on goals;
drop policy if exists "goals_update_org" on goals;
drop policy if exists "goals_delete_org" on goals;
drop policy if exists "goal_pins_self" on goal_pins;
drop policy if exists "pipelines_read_org" on pipelines;
drop policy if exists "pipelines_write_org" on pipelines;
drop policy if exists "pipelines_update_org" on pipelines;
drop policy if exists "pipelines_delete_org" on pipelines;
drop policy if exists "pipeline_stages_read" on pipeline_stages;
drop policy if exists "pipeline_stages_write" on pipeline_stages;
drop policy if exists "pipeline_stages_update" on pipeline_stages;
drop policy if exists "pipeline_stages_delete" on pipeline_stages;
drop policy if exists "pipeline_history_read_org" on pipeline_history;
drop policy if exists "pipeline_history_write_org" on pipeline_history;

-- RLS Policies
create policy "orgs_owned" on orgs
  for select using (exists(select 1 from user_orgs u where u.org_id = id and u.user_id = auth.uid()));
create policy "orgs_ins_owner" on orgs for insert with check (true);

create policy "user_orgs_self" on user_orgs
  for select using (user_id = auth.uid());

-- RLS policies for profiles (user-specific)
create policy "profiles_select_own" on profiles
  for select using (user_id = auth.uid());
create policy "profiles_insert_own" on profiles
  for insert with check (user_id = auth.uid());
create policy "profiles_update_own" on profiles
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

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

-- Indexes (created after ALTER TABLE to ensure columns exist)
create index if not exists people_org_idx on people (org_id, updated_at desc);
create index if not exists people_warmth_idx on people (org_id, warmth desc);
create index if not exists profiles_user_id_idx on profiles (user_id);
create index if not exists profiles_stripe_customer_id_idx on profiles (stripe_customer_id);
create index if not exists contacts_org_idx on contacts (org_id, updated_at desc);
create index if not exists contacts_warmth_idx on contacts (org_id, warmth desc);
create index if not exists interactions_q on interactions (org_id, person_id, occurred_at desc);
create index if not exists interactions_contact_idx on interactions (contact_id, occurred_at desc);
create index if not exists doc_chunks_ivf on doc_chunks using ivfflat (embedding vector_cosine_ops) with (lists = 100);
create index if not exists message_goals_org_idx on message_goals (org_id, user_id, created_at desc);
create index if not exists generated_messages_org_idx on generated_messages (org_id, user_id, person_id, created_at desc);
create index if not exists message_variants_msg_idx on message_variants (message_id, variant_index);
create index if not exists analytics_events_org_idx on analytics_events (org_id, user_id, name, created_at desc);
create index if not exists persona_notes_user_idx on persona_notes (user_id, created_at desc);
create index if not exists templates_org_idx on templates (org_id, user_id, channel, created_at desc);
create index if not exists messages_org_idx on messages (org_id, contact_id, created_at desc);
create index if not exists files_org_idx on files (org_id, contact_id, created_at desc);
create index if not exists goals_org_idx on goals (org_id, kind, is_active);
create index if not exists pipelines_org_key_idx on pipelines (org_id, key);
create index if not exists pipeline_stages_pipeline_idx on pipeline_stages (pipeline_id, position);
create index if not exists pipeline_history_contact_idx on pipeline_history (contact_id, moved_at desc);
create index if not exists pipeline_history_org_idx on pipeline_history (org_id, moved_at desc);

-- Enable RLS on new tables
alter table profiles enable row level security;
alter table contacts enable row level security;
alter table persona_notes enable row level security;
alter table templates enable row level security;
alter table templates_stats enable row level security;
alter table compose_settings enable row level security;
alter table compose_sessions enable row level security;
alter table messages enable row level security;
alter table files enable row level security;
alter table goals enable row level security;
alter table goal_pins enable row level security;
alter table pipelines enable row level security;
alter table pipeline_stages enable row level security;
alter table pipeline_history enable row level security;

-- RLS policies for contacts
create policy "contacts_read_org" on contacts
  for select using (is_member(org_id));
create policy "contacts_write_org" on contacts
  for insert with check (is_member(org_id));
create policy "contacts_update_org" on contacts
  for update using (is_member(org_id)) with check (is_member(org_id));
create policy "contacts_delete_org" on contacts
  for delete using (is_member(org_id));

-- RLS policies for persona notes (user-specific)
create policy "persona_notes_self" on persona_notes
  for all using (user_id = auth.uid());

-- RLS policies for templates
create policy "templates_read_org" on templates
  for select using (is_member(org_id));
create policy "templates_write_org" on templates
  for insert with check (is_member(org_id));
create policy "templates_update_org" on templates
  for update using (is_member(org_id)) with check (is_member(org_id));
create policy "templates_delete_org" on templates
  for delete using (is_member(org_id));

-- RLS policies for templates stats
create policy "templates_stats_read_org" on templates_stats
  for select using (exists(select 1 from templates t where t.id = template_id and is_member(t.org_id)));
create policy "templates_stats_write_org" on templates_stats
  for insert with check (exists(select 1 from templates t where t.id = template_id and is_member(t.org_id)));
create policy "templates_stats_update_org" on templates_stats
  for update using (exists(select 1 from templates t where t.id = template_id and is_member(t.org_id))) with check (exists(select 1 from templates t where t.id = template_id and is_member(t.org_id)));

-- RLS policies for compose settings (user-specific)
create policy "compose_settings_self" on compose_settings
  for all using (user_id = auth.uid());

-- RLS policies for compose sessions
create policy "compose_sessions_self" on compose_sessions
  for all using (user_id = auth.uid());

-- RLS policies for messages
create policy "messages_read_org" on messages
  for select using (is_member(org_id));
create policy "messages_write_org" on messages
  for insert with check (is_member(org_id));
create policy "messages_update_org" on messages
  for update using (is_member(org_id)) with check (is_member(org_id));
create policy "messages_delete_org" on messages
  for delete using (is_member(org_id));

-- RLS policies for files
create policy "files_read_org" on files
  for select using (is_member(org_id));
create policy "files_write_org" on files
  for insert with check (is_member(org_id));
create policy "files_delete_org" on files
  for delete using (is_member(org_id));

-- RLS policies for goals
create policy "goals_read" on goals
  for select using (scope = 'global' or is_member(org_id));
create policy "goals_write_org" on goals
  for insert with check (is_member(org_id));
create policy "goals_update_org" on goals
  for update using (is_member(org_id)) with check (is_member(org_id));
create policy "goals_delete_org" on goals
  for delete using (is_member(org_id));

-- RLS policies for goal pins (user-specific)
create policy "goal_pins_self" on goal_pins
  for all using (user_id = auth.uid());

-- RLS policies for pipelines
create policy "pipelines_read_org" on pipelines
  for select using (is_member(org_id));
create policy "pipelines_write_org" on pipelines
  for insert with check (is_member(org_id));
create policy "pipelines_update_org" on pipelines
  for update using (is_member(org_id)) with check (is_member(org_id));
create policy "pipelines_delete_org" on pipelines
  for delete using (is_member(org_id));

-- RLS policies for pipeline_stages
create policy "pipeline_stages_read" on pipeline_stages
  for select using (exists(select 1 from pipelines p where p.id = pipeline_id and is_member(p.org_id)));
create policy "pipeline_stages_write" on pipeline_stages
  for insert with check (exists(select 1 from pipelines p where p.id = pipeline_id and is_member(p.org_id)));
create policy "pipeline_stages_update" on pipeline_stages
  for update using (exists(select 1 from pipelines p where p.id = pipeline_id and is_member(p.org_id))) with check (exists(select 1 from pipelines p where p.id = pipeline_id and is_member(p.org_id)));
create policy "pipeline_stages_delete" on pipeline_stages
  for delete using (exists(select 1 from pipelines p where p.id = pipeline_id and is_member(p.org_id)));

-- RLS policies for pipeline_history
create policy "pipeline_history_read_org" on pipeline_history
  for select using (is_member(org_id));
create policy "pipeline_history_write_org" on pipeline_history
  for insert with check (is_member(org_id));

-- Success message
select 'Complete schema setup completed successfully! All backend tables are now available.' as message;