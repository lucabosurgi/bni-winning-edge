// Generates supabase/seed.sql and data/members.csv from data/members.json
// Run:  node scripts/generate-seed.mjs
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

const members = JSON.parse(
  readFileSync(join(root, "data", "members.json"), "utf8")
);

// Harvested logo URLs (keyed by slug). Optional file.
let logos = {};
try {
  logos = JSON.parse(readFileSync(join(root, "data", "logos.json"), "utf8"));
} catch {
  logos = {};
}

function slugify(name) {
  return name
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[’'".,()]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// Ensure unique slugs
const seen = new Map();
for (const m of members) {
  let base = slugify(m.business_name);
  let slug = base;
  let i = 2;
  while (seen.has(slug)) slug = `${base}-${i++}`;
  seen.set(slug, true);
  m.slug = slug;
  // Normalise a bare display website (strip protocol) and a full URL
  m.website_display = (m.website || "").replace(/^https?:\/\//, "").replace(/\/$/, "");
  m.website_url = m.website ? `https://${m.website_display}` : "";
  // Merge harvested logo (if any).
  const hit = logos[slug];
  m.logo_url = hit?.url || "";
  m.logo_status = hit?.status || (m.website ? "manual" : "no-website");
  m.logo_note = hit?.note || "";
}

const sqlEsc = (s) => (s == null ? "" : String(s)).replace(/'/g, "''");

// ---- seed.sql ----
let sql = `-- BNI Winning Edge — member seed data (generated; do not edit by hand)
-- Regenerate with: node scripts/generate-seed.mjs
-- Members are inserted with published = false (private until each one approves their assets).

insert into public.members
  (slug, business_name, contact_person, category, description, email, phone, website, logo_url, photo_url, published, approved)
values
`;

sql += members
  .map((m) => {
    return `  ('${sqlEsc(m.slug)}', '${sqlEsc(m.business_name)}', '${sqlEsc(
      m.contact_person
    )}', '${sqlEsc(m.category)}', '${sqlEsc(m.description)}', '${sqlEsc(
      m.email
    )}', '${sqlEsc(m.phone)}', '${sqlEsc(
      m.website_url
    )}', ${m.logo_url ? `'${sqlEsc(m.logo_url)}'` : "null"}, null, false, false)`;
  })
  .join(",\n");

sql += `\non conflict (slug) do update set
  business_name = excluded.business_name,
  contact_person = excluded.contact_person,
  category = excluded.category,
  description = excluded.description,
  email = excluded.email,
  phone = excluded.phone,
  website = excluded.website,
  logo_url = coalesce(excluded.logo_url, public.members.logo_url);
`;

writeFileSync(join(root, "supabase", "seed.sql"), sql);

// ---- members.csv (permission / asset tracking sheet) ----
const csvHeader = [
  "business_name",
  "contact_person",
  "category",
  "email",
  "phone",
  "website",
  "harvested_logo_url",
  "logo_status",
  "logo_note",
  "permission_requested (y/n)",
  "permission_granted (y/n)",
  "published (y/n)",
  "notes",
];
const csvEsc = (s) => {
  const v = (s == null ? "" : String(s));
  return /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
};
let csv = csvHeader.join(",") + "\n";
for (const m of members) {
  csv +=
    [
      m.business_name,
      m.contact_person,
      m.category,
      m.email,
      m.phone,
      m.website_display,
      m.logo_url,
      m.logo_status,
      m.logo_note,
      "",
      "",
      "",
      "",
    ]
      .map(csvEsc)
      .join(",") + "\n";
}
writeFileSync(join(root, "data", "members.csv"), csv);

console.log(
  `Generated seed.sql and members.csv for ${members.length} members.`
);
