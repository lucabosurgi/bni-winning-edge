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

      <p className="mt-6 text-xs text-slate-400">
        All referrals are attributed to {leads[0]?.referred_by || "Luca Bosurgi"}{" "}
        for BNI reporting. This page is private and excluded from search engines.
      </p>
    </div>
  );
}
