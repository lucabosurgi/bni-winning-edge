-- Weekly newsletter "Monday Food for the Mind" — one row per issue sent.
-- Run once in the Supabase SQL editor (project "BNI website").
create table if not exists public.newsletter_issues (
  post_id     bigint primary key,          -- WordPress post id on lucabosurgi.com
  issue_no    int,
  title       text,
  url         text,
  subject     text,
  campaign_id bigint,                      -- Brevo campaign id
  sent_at     timestamptz,
  created_at  timestamptz not null default now()
);
alter table public.newsletter_issues enable row level security;
