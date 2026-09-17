import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Body = {
  name?: string;
  business?: string;
  contact?: string;
  type?: string;
  message?: string;
};

export async function POST(req: Request) {
  let body: Body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Bad request." }, { status: 400 });
  }

  const name = String(body.name ?? "").trim().slice(0, 200);
  const business = String(body.business ?? "").trim().slice(0, 200);
  const contact = String(body.contact ?? "").trim().slice(0, 200);
  const message = String(body.message ?? "").trim().slice(0, 2000);

  if (!business || !contact) {
    return NextResponse.json(
      { ok: false, error: "Please include your business name and a way to reach you." },
      { status: 400 }
    );
  }

  const t = body.type === "join" || body.type === "upgrade" ? body.type : "update";
  const label =
    t === "join"
      ? "NEW MEMBER LISTING REQUEST"
      : t === "upgrade"
        ? "PREMIUM PAGE UPGRADE REQUEST"
        : "LISTING UPDATE REQUEST";

  try {
    const db = supabaseAdmin();
    const { error } = await db.from("leads").insert({
      visitor_name: name || null,
      visitor_contact: contact,
      request: `[${label}] ${business} \u2014 ${message || "(no details given)"}`,
      recommended_business: business,
      referred_by: "Member request form",
    });
    if (error) {
      console.error("[member-request]", error.message);
      return NextResponse.json(
        { ok: false, error: "Could not save your request. Please email luca@mindfitnesslab.com." },
        { status: 500 }
      );
    }
  } catch (e) {
    console.error("[member-request] threw:", e);
    return NextResponse.json(
      { ok: false, error: "Could not save your request. Please email luca@mindfitnesslab.com." },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
