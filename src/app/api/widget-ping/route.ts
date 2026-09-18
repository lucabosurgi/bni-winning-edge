import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Cache-Control": "no-store",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

// Called by the member widget (public/widget/widget.js) once per page load.
// Records ONLY the member site's hostname — no visitor data of any kind.
export async function GET(req: Request) {
  const url = new URL(req.url);
  const host = (url.searchParams.get("h") ?? "").trim().toLowerCase().slice(0, 120);
  const valid = /^[a-z0-9]([a-z0-9.-]*[a-z0-9])?$/.test(host);

  if (
    !valid ||
    host === "localhost" ||
    host === "127.0.0.1" ||
    host.endsWith(".vercel.app") ||
    host.endsWith("winningedgepartners.com")
  ) {
    return NextResponse.json({ ok: true }, { headers: CORS });
  }

  try {
    const db = supabaseAdmin();
    const { data } = await db
      .from("widget_installs")
      .select("hits")
      .eq("host", host)
      .maybeSingle();
    if (data) {
      await db
        .from("widget_installs")
        .update({ last_seen: new Date().toISOString(), hits: (data.hits ?? 0) + 1 })
        .eq("host", host);
    } else {
      await db.from("widget_installs").insert({ host });
    }
  } catch (e) {
    // Never let tracking break the widget — log and move on.
    console.error("[widget-ping]", e);
  }

  return NextResponse.json({ ok: true }, { headers: CORS });
}
