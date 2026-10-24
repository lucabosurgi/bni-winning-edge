import { NextResponse } from "next/server";
import { removeFromNewsletter, NEWSLETTER_NAME, SIGNUP_URL } from "@/lib/newsletter";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Newsletter-ONLY unsubscribe. Removes the address from the newsletter list
 * in Brevo; the contact stays in every other list and is never blocklisted.
 *
 *   GET  /api/newsletter/unsubscribe?e=<email>   → confirmation page
 *   POST /api/newsletter/unsubscribe  (form)      → performs the removal
 */
function page(title: string, body: string) {
  return new NextResponse(
    `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title>
<style>body{margin:0;background:#f4f3ef;font-family:Helvetica,Arial,sans-serif;color:#222}.card{max-width:520px;margin:60px auto;background:#fff;border-radius:12px;padding:36px}h1{font-family:Georgia,serif;font-weight:normal;font-size:26px;margin:0 0 14px}p{font-size:16px;line-height:24px}button{background:#2f6f5e;color:#fff;border:0;border-radius:6px;padding:12px 20px;font-size:15px;font-weight:bold;cursor:pointer}a{color:#2f6f5e}.muted{color:#777;font-size:13px}</style></head>
<body><div class="card"><h1>${title}</h1>${body}</div></body></html>`,
    { headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" } }
  );
}

function cleanEmail(v: string | null): string {
  const e = (v || "").trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e) && e.length < 200 ? e : "";
}

export async function GET(req: Request) {
  const email = cleanEmail(new URL(req.url).searchParams.get("e"));
  if (!email) {
    return page("Unsubscribe", `<p>We could not read your email address from this link. Please use the unsubscribe link at the bottom of the newsletter.</p>`);
  }
  return page(
    `Leave “${NEWSLETTER_NAME}”?`,
    `<p>This removes <strong>${email}</strong> from the weekly newsletter only. You will still receive appointment confirmations and any other messages from Mind Fitness Lab.</p>
     <form method="post"><input type="hidden" name="e" value="${email}"><button type="submit">Yes, unsubscribe me from the newsletter</button></form>
     <p class="muted">Changed your mind? Just close this page.</p>`
  );
}

export async function POST(req: Request) {
  const form = await req.formData().catch(() => null);
  const email = cleanEmail(form ? String(form.get("e") || "") : null);
  if (!email) return page("Unsubscribe", `<p>Invalid request.</p>`);
  const ok = await removeFromNewsletter(email);
  if (!ok) {
    return page("Something went wrong", `<p>We could not update your preferences just now. Please reply to the newsletter email and Luca will remove you by hand.</p>`);
  }
  return page(
    "Done — you are unsubscribed",
    `<p><strong>${email}</strong> will no longer receive “${NEWSLETTER_NAME}”. Everything else from Mind Fitness Lab is unchanged.</p>
     <p class="muted">Want back in later? <a href="${SIGNUP_URL}">Subscribe again here</a>.</p>`
  );
}
