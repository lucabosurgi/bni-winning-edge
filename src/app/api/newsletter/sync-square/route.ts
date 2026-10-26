import { NextResponse } from "next/server";
import { notifyLuca } from "@/lib/notify";
import { isAuthorized, NEWSLETTER_LIST_ID, NEWSLETTER_NAME } from "@/lib/newsletter";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Weekly Square → Brevo sync (Vercel cron, Sunday evening, before Monday's issue).
 * Finds Square customers created in the last LOOKBACK_DAYS and adds anyone with
 * an email to the newsletter list and the Clients list. Idempotent: Brevo
 * upserts, so re-running never duplicates or removes anyone.
 *
 *   GET /api/newsletter/sync-square            (cron, Bearer CRON_SECRET)
 *   GET /api/newsletter/sync-square?key=ADMIN  (manual run)
 *   add &dry=1 to see who would be added without touching Brevo
 */
const LOOKBACK_DAYS = Number(process.env.SQUARE_SYNC_LOOKBACK_DAYS || 10);
const CLIENTS_LIST_ID = Number(process.env.CLIENTS_LIST_ID || 3);
const SQUARE_VERSION = "2025-01-23";

type SqCustomer = { id: string; given_name?: string; family_name?: string; email_address?: string; phone_number?: string; created_at: string };

async function squareNewCustomers(since: Date): Promise<SqCustomer[]> {
  const token = process.env.SQUARE_ACCESS_TOKEN;
  if (!token) throw new Error("SQUARE_ACCESS_TOKEN missing");
  const out: SqCustomer[] = [];
  let cursor: string | undefined;
  do {
    const res = await fetch("https://connect.squareup.com/v2/customers/search", {
      method: "POST",
      headers: { authorization: `Bearer ${token}`, "content-type": "application/json", "Square-Version": SQUARE_VERSION },
      body: JSON.stringify({
        limit: 100,
        cursor,
        query: {
          filter: { created_at: { start_at: since.toISOString() } },
          sort: { field: "CREATED_AT", order: "DESC" },
        },
      }),
    });
    const json: any = await res.json();
    if (!res.ok) throw new Error(`Square ${res.status}: ${JSON.stringify(json.errors || json)}`);
    out.push(...(json.customers ?? []));
    cursor = json.cursor;
  } while (cursor);
  return out;
}

async function brevoUpsert(c: SqCustomer): Promise<"created" | "updated" | "skipped"> {
  const key = process.env.BREVO_API_KEY;
  if (!key) throw new Error("BREVO_API_KEY missing");
  const email = (c.email_address || "").trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return "skipped";
  const attributes: Record<string, string> = {};
  if (c.given_name) attributes.FIRSTNAME = c.given_name.trim();
  if (c.family_name) attributes.LASTNAME = c.family_name.trim();
  const res = await fetch("https://api.brevo.com/v3/contacts", {
    method: "POST",
    headers: { "api-key": key, "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify({ email, attributes, listIds: [NEWSLETTER_LIST_ID, CLIENTS_LIST_ID], updateEnabled: true }),
  });
  if (res.status === 201) return "created";
  if (res.status === 204) return "updated"; // existed; lists/attributes merged
  throw new Error(`Brevo contacts ${res.status}: ${await res.text()}`);
}

export async function GET(req: Request) {
  if (!isAuthorized(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const dry = new URL(req.url).searchParams.get("dry") === "1";
  const since = new Date(Date.now() - LOOKBACK_DAYS * 86400000);

  try {
    const customers = await squareNewCustomers(since);
    const withEmail = customers.filter((c) => c.email_address);
    const results: { name: string; email: string; result: string }[] = [];

    for (const c of withEmail) {
      const name = [c.given_name, c.family_name].filter(Boolean).join(" ") || "(no name)";
      const result = dry ? "dry-run" : await brevoUpsert(c);
      results.push({ name, email: c.email_address!.toLowerCase(), result });
    }

    const created = results.filter((r) => r.result === "created").length;
    const updated = results.filter((r) => r.result === "updated").length;

    if (!dry && withEmail.length > 0) {
      await notifyLuca(
        `${NEWSLETTER_NAME}: ${created} new reader${created === 1 ? "" : "s"} from Square this week`,
        `Square customers created since ${since.toLocaleDateString("en-US")}: ${customers.length} (${withEmail.length} with email).\n` +
          `Added to the newsletter list: ${created} new · ${updated} already in Brevo (list membership refreshed).\n\n` +
          results.map((r) => `• ${r.name} — ${r.email} (${r.result})`).join("\n")
      );
    }

    return NextResponse.json({ ok: true, dry, since: since.toISOString(), found: customers.length, withEmail: withEmail.length, created, updated, results });
  } catch (e: any) {
    console.error("[newsletter/sync-square]", e);
    await notifyLuca(`${NEWSLETTER_NAME}: Square sync failed`, String(e?.message || e));
    return NextResponse.json({ ok: false, error: String(e?.message || e) }, { status: 500 });
  }
}
