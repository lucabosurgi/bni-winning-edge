import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  // Surfaced at build/runtime so misconfiguration is obvious.
  console.warn(
    "[supabase] Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY."
  );
}

// Placeholders keep createClient from throwing before env vars are configured;
// queries simply fail gracefully (and are caught) until real values are set.
const safeUrl = url || "https://placeholder.supabase.co";
const safeAnon = anonKey || "placeholder-anon-key";

/** Public (anon) client — respects RLS: reads published members, inserts leads. */
export const supabase = createClient(safeUrl, safeAnon, {
  auth: { persistSession: false },
});

/**
 * Server-only client using the service_role key. Bypasses RLS.
 * Use for writing leads reliably and for future admin tooling.
 * NEVER import this into a client component.
 */
export function supabaseAdmin() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error(
      "supabaseAdmin() requires SUPABASE_SERVICE_ROLE_KEY and NEXT_PUBLIC_SUPABASE_URL."
    );
  }
  return createClient(url, serviceKey, { auth: { persistSession: false } });
}
