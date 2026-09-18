import { cookies } from "next/headers";
import { isAuthed, ADMIN_COOKIE } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import AdminLogin from "@/components/AdminLogin";
import AdminLogout from "@/components/AdminLogout";

export const dynamic = "force-dynamic";
export const metadata = { title: "Admin — Leads", robots: { index: false } };

type Lead = {
  id: string;
  created_at: string;
  visitor_name: string | null;
  visitor_contact: string | null;
  request: string | null;
  recommended_business: string | null;
  referred_by: string | null;
  status: string | null;
};

type WidgetInstall = {
  host: string;
  first_seen: string;
  last_seen: string;
  hits: number;
};

type MemberSite = {
  business_name: string;
  website: string | null;
};

function matchMember(host: string, members: MemberSite[]) {
  const norm = (s: string) =>
    s
      .toLowerCase()
      .replace(/^https?:\/\//, "")
      .replace(/^www\./, "")
      .replace(/\/.*$/, "");
  const h = host.replace(/^www\./, "");
  const found = members.find((m) => {
    if (!m.website) return false;
    const w = norm(m.website);
    return w === h || h.endsWith("." + w) || w.endsWith("." + h);
  });
  return found?.business_name ?? null;
}

function fmtDate(iso: string) {
  try {
    return new Date(iso).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export default async function AdminPage() {
  if (!isAuthed(cookies().get(ADMIN_COOKIE)?.value)) {
    return <AdminLogin />;
  }

  let leads: Lead[] = [];
  let loadError = "";
  try {
    const db = supabaseAdmin();
    const { data, error } = await db
      .from("leads")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) loadError = error.message;
    leads = (data as Lead[]) ?? [];
  } catch (e) {
    loadError =
      "Could not connect to the database. Check SUPABASE_SERVICE_ROLE_KEY.";
  }

  let installs: WidgetInstall[] = [];
  let memberSites: MemberSite[] = [];
  let installsNote = "";
  try {
    const db = supabaseAdmin();
    const { data, error } = await db
      .from("widget_installs")
      .select("*")
      .order("last_seen", { ascending: false });
    if (error) {
      installsNote =
        "Widget tracking is not active yet (the widget_installs table has not been created).";
    } else {
      installs = (data as WidgetInstall[]) ?? [];
    }
    const { data: mems } = await db
      .from("members")
      .select("business_name, website");
    memberSites = (mems as MemberSite[]) ?? [];
  } catch {
    installsNote = "Could not load widget installs.";
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-brand-ink">Leads &amp; Referrals</h1>
          <p className="text-sm text-slate-500">
            {leads.length} captured by the concierge
          </p>
        </div>
        <div className="flex items-center gap-4">
          <a
            href="/api/admin/export"
            className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-dark"
          >
            Download CSV
          </a>
          <AdminLogout />
        </div>
      </div>

      {loadError && (
        <p className="mt-6 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          {loadError}
        </p>
      )}

      {leads.length === 0 && !loadError ? (
        <p className="mt-12 text-center text-slate-500">
          No leads yet. When the concierge captures one, it appears here.
        </p>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                <th className="px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3 font-medium">Visitor</th>
                <th className="px-4 py-3 font-medium">Contact</th>
                <th className="px-4 py-3 font-medium">Request</th>
                <th className="px-4 py-3 font-medium">Referred to</th>
                <th className="px-4 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {leads.map((l) => (
                <tr key={l.id} className="align-top">
                  <td className="whitespace-nowrap px-4 py-3 text-slate-500">
                    {fmtDate(l.created_at)}
                  </td>
                  <td className="px-4 py-3 font-medium text-brand-ink">
                    {l.visitor_name || "—"}
                  </td>
                  <td className="px-4 py-3 text-slate-700">
                    {l.visitor_contact || "—"}
                  </td>
                  <td className="px-4 py-3 text-slate-700">{l.request || "—"}</td>
                  <td className="px-4 py-3 text-slate-700">
                    {l.recommended_business || "—"}
                  </td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-600">
                      {l.status || "new"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="mt-12">
        <h2 className="text-xl font-bold text-brand-ink">Widget installs</h2>
        <p className="text-sm text-slate-500">
          Member sites where the spotlight widget is live (updated every time the
          widget loads on their site).
        </p>
        {installsNote && (
          <p className="mt-4 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-700">
            {installsNote}
          </p>
        )}
        {installs.length === 0 && !installsNote ? (
          <p className="mt-6 text-sm text-slate-500">
            No widget activity yet. As soon as a member pastes the widget on their
            site and it loads once, they appear here.
          </p>
        ) : installs.length > 0 ? (
          <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200 bg-white">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-medium">Website</th>
                  <th className="px-4 py-3 font-medium">Member</th>
                  <th className="px-4 py-3 font-medium">First seen</th>
                  <th className="px-4 py-3 font-medium">Last seen</th>
                  <th className="px-4 py-3 font-medium">Loads</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {installs.map((w) => (
                  <tr key={w.host}>
                    <td className="px-4 py-3 font-medium text-brand-ink">
                      <a
                        href={"https://" + w.host}
                        target="_blank"
                        rel="noreferrer"
                        className="hover:underline"
                      >
                        {w.host}
                      </a>
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {matchMember(w.host, memberSites) || "—"}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-slate-500">
                      {fmtDate(w.first_seen)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-slate-500">
                      {fmtDate(w.last_seen)}
                    </td>
                    <td className="px-4 py-3 text-slate-700">{w.hits}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </div>

      <p className="mt-6 text-xs text-slate-400">
        All referrals are attributed to {leads[0]?.referred_by || "Luca Bosurgi"}{" "}
        for referral reporting. This page is private and excluded from search engines.
      </p>
    </div>
  );
}
