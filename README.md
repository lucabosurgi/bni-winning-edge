# BNI Winning Edge — chapter directory + AI concierge

A standalone website for the BNI Winning Edge chapter (Spring Hill, FL):

- **Searchable member directory** — filter by name, trade, or keyword.
- **A dedicated page per member** — one reusable template, its own clean URL,
  built for social sharing (Open Graph tags per page).
- **AI concierge** — a chat widget that routes visitors to the right member and
  **captures each request as a lead/referral**, attributed to Luca for BNI stats.
- **Private until approved** — members are hidden until you flip their
  `published` flag, so nothing goes live before they sign off on their logo/photo.

Built to run in **Cursor**, deploy on **Vercel**, backed by **Supabase**.
Stack: Next.js 14 (App Router) · TypeScript · Tailwind · Anthropic API.

---

## What's in here

```
data/
  members.json               ← source of truth for all 51 members (edit here)
  members.csv                ← permission / asset tracking sheet
  permission-request-template.md
scripts/
  generate-seed.mjs          ← rebuilds seed.sql + members.csv from members.json
supabase/
  schema.sql                 ← run FIRST in the Supabase SQL editor
  seed.sql                   ← run SECOND (inserts all members, unpublished)
src/
  app/                       ← pages, layout, and /api/concierge route
  components/                ← directory, member card, concierge chat
  lib/                       ← Supabase client + data helpers
```

---

## Setup, step by step

### 1. Supabase (the database)
1. Create a free project at https://supabase.com.
2. Open **SQL Editor** → paste and run `supabase/schema.sql`.
3. In the SQL Editor, paste and run `supabase/seed.sql` (adds all 51 members,
   all `published = false`).
4. Go to **Project Settings → API** and copy: the **Project URL**, the
   **anon public** key, and the **service_role** key.

### 2. Environment variables
Copy `.env.local.example` to `.env.local` and fill in:

```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...        # server-only, never public
ANTHROPIC_API_KEY=sk-ant-...         # from console.anthropic.com
NEXT_PUBLIC_SITE_URL=https://your-domain.com
```

### 3. Run it locally (in Cursor)
```
npm install
npm run dev
```
Open http://localhost:3000. The directory will be empty until you publish
members (next step) — the concierge works as soon as the API key is set.

### 4. Publish members as they approve
Members are private by default. To make one live, in the Supabase **Table
Editor → members**, set that row's `published` to `true`. It appears on the
site within a minute. (See the permission workflow below.)

### 5. Deploy to Vercel
1. Push this folder to a GitHub repo.
2. In Vercel, **New Project → import the repo**.
3. Add the same environment variables from `.env.local` in Vercel's project
   settings.
4. Deploy. Add your custom domain (e.g. `bniwinningedge.com`) under
   **Settings → Domains**.

---

## The logo / photo permission workflow

Everything ships **unpublished**, so the site stays private until each member
signs off. Suggested flow:

1. Harvest each member's logo (and optional photo) from their website. Upload
   them to a **Supabase Storage** bucket (e.g. `member-logos`), make the bucket
   public, and paste each file's URL into the member's `logo_url` / `photo_url`.
   *(Pages already fall back to a clean initials monogram when there's no logo,
   so you're never blocked waiting on anyone.)*
2. Send each member the note in `data/permission-request-template.md` with a
   link to their preview page.
3. When they approve, set their `published = true`. Track progress in
   `data/members.csv`.

Ask Claude to do step 1 for you — it can go through the member websites, pull
each logo, and hand you the assets plus a filled-in tracking sheet.

---

## Where the leads go

Every referral the concierge captures lands in the **`leads`** table
(Supabase → Table Editor → `leads`), with the visitor's name, contact, what they
asked for, which member was recommended, and `referred_by = "Luca Bosurgi"`.

### Admin leads page

Go to **`/admin`** on your site and sign in with `ADMIN_PASSWORD` (set it in your
env vars). You'll see every captured lead in a table and can **Download CSV** for
your BNI referral reporting — no need to open Supabase. The page is private
(password-gated, `httpOnly` cookie) and excluded from search engines.

---

## Editing members later

Edit `data/members.json`, then run `npm run seed:generate` and re-run the
updated `supabase/seed.sql` (it upserts on `slug`, so it won't create
duplicates). Or just edit rows directly in the Supabase Table Editor.

---

## Notes & choices

- **Concierge model** defaults to `claude-3-5-haiku-latest` (fast + cheap;
  a few cents per conversation). Change via `CONCIERGE_MODEL`. Set a spend
  limit in the Anthropic console so costs can't surprise you.
- **Neutral branding** on purpose — it's the chapter's asset, so every member
  can share it as their own. Swap the palette in `tailwind.config.ts`.
- The concierge is instructed to **only** recommend members in the live
  directory and never invent a business.
