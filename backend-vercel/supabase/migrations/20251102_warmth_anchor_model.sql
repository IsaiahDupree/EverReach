-- Migration: Warmth Anchor Model (prevent score jump on mode switch)
-- Adds anchor-based decay: score(t) = Wmin + (anchor_score - Wmin) * e^{-λ (t - anchor_at)}

-- Create or replace warmth_lambda function (if not exists from previous migration)
create or replace function warmth_lambda(mode text)
returns double precision language sql immutable as $$
  select case lower(mode)
    when 'slow'   then 0.040132
    when 'medium' then 0.085998
    when 'fast'   then 0.171996
    when 'test'   then 2.407946
    else 0.085998
  end;
$$;

-- Add anchor columns to contacts
alter table contacts
  add column if not exists warmth_anchor_score numeric default 100,
  add column if not exists warmth_anchor_at timestamptz default now();

-- Update existing contacts to use current score as anchor
update contacts c
set warmth_anchor_score = coalesce(c.warmth, 100),
    warmth_anchor_at    = coalesce(c.last_interaction_at, now())
where c.warmth_anchor_at is null;

-- Create function to calculate score from anchor (instead of last_touch)
create or replace function warmth_score_from_anchor(
  anchor_score numeric,
  anchor_at timestamptz,
  mode text,
  wmin int default 0
)
returns int language sql stable as $$
  select greatest(0, least(100,
    round(wmin + (anchor_score - wmin) *
      exp(- warmth_lambda(mode) * extract(epoch from (now() - anchor_at)) / 86400.0)
    )
  ))::int;
$$;

-- Update warmth_score_for_mode to use anchor model
create or replace function warmth_score_for_mode(last_touch_at timestamptz, mode text)
returns integer
language sql
stable
as $$
  -- Legacy: treat last_touch_at as anchor point with score 100
  select warmth_score_from_anchor(100, last_touch_at, mode, 0);
$$;

comment on column contacts.warmth_anchor_score is 'Score at anchor time (for smooth mode transitions)';
comment on column contacts.warmth_anchor_at is 'Time when anchor was set (mode switch or touch)';
