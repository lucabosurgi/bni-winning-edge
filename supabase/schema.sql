-- BNI Winning Edge — database schema
-- Run this in the Supabase SQL editor FIRST, then run seed.sql.

-- ─────────────────────────────────────────────────────────────
-- MEMBERS
-- ─────────────────────────────────────────────────────────────
create table if not exists public.members (
  id             uuid primary key default gen_random_uuid(),
  slug           text unique not null,
  business_name  text not null,
  contact_person text,
  category       text,
  description    text,
  email          text,
  phone          text,
  website        text,
  logo_url       text,          -- filled once the logo is harvested + approved
  photo_url      text,          -- optional hero/photo
  published      boolean not null default false,  -- site only shows published members
  approved       boolean not null default false,  -- member signed off on their assets
  created_at     timestamptz not null default now()
);

create index if not exists members_published_idx on public.members (published);
create index if not exists members_category_idx  on public.members (category);

-- ─────────────────────────────────────────────────────────────
-- LEADS / REFERRALS  (captured by the concierge)
-- ─────────────────────────────────────────────────────────────
create table if not exists public.leads (
  id                   uuid primary key default gen_random_uuid(),
  created_at           timestamptz not null default now(),
  visitor_name         text,
  visitor_contact      text,          -- email or phone the visitor left
  request              text,          -- what the visitor needs, in their words
  recommended_member   uuid references public.members(id) on delete set null,
  recommended_business text,          -- denormalised for easy reporting
  referred_by          text default 'Luca Bosurgi',  -- BNI referral attribution
  transcript           jsonb,         -- optional: full concierge conversation
  status               text not null default 'new'   -- new | passed_to_member | closed
);

create index if not exists leads_created_idx on public.leads (created_at desc);

-- ─────────────────────────────────────────────────────────────
-- ROW LEVEL SECURITY
-- Public site uses the anon key. It may:
--   • read ONLY published members
--   • insert leads (so the concierge can log referrals)
-- It may NOT read leads or see unpublished members.
-- Admin work (viewing leads, publishing members) uses the service_role
-- key, which bypasses RLS.
-- ─────────────────────────────────────────────────────────────
alter table public.members enable row level security;
alter table public.leads   enable row level security;

drop policy if exists "public reads published members" on public.members;
create policy "public reads published members"
  on public.members for select
  using (published = true);

drop policy if exists "anyone can submit a lead" on public.leads;
create policy "anyone can submit a lead"
  on public.leads for insert
  with check (true);
