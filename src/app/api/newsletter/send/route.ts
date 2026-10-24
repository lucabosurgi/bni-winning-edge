import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { notifyLuca } from "@/lib/notify";
import {
  isAuthorized,
  nextUnsentPost,
  renderEmail,
  sendIssue,
  summarize,
  NEWSLETTER_NAME,
} from "@/lib/newsletter";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Weekly newsletter job. Triggered by the Vercel cron in vercel.json.
 *
 *   GET /api/newsletter/send                       (cron, Bearer CRON_SECRET)
 *   GET /api/newsletter/send?key=ADMIN&preview=1   → returns the HTML, sends nothing
 *   GET /api/newsletter/send?key=ADMIN             → sends the next issue now
 *
 * Picks the newest blog post that has not been sent, newest → oldest.
 * Idempotent: an issue row is written before sending, so a retry can
 * never send the same post twice.
 */
export async function GET(req: Request) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const url = new URL(req.url);
  const preview = url.searchParams.get("preview") === "1";

  try {
    const { post, remaining, total } = await nextUnsentPost();
    if (!post) {
      await notifyLuca(
        `${NEWSLETTER_NAME}: all ${total} articles have been sent`,
        "The weekly newsletter has reached the oldest article. Publish a new post on lucabosurgi.com and it will go out on the next scheduled run."
      );
      return NextResponse.json({ ok: true, sent: false, reason: "no unsent posts", total });
    }

    const issueNo = total - remaining + 1;
    const summary = await summarize(post);
    const html = renderEmail(post, summary, issueNo);

    if (preview) {
      return new NextResponse(html, { headers: { "content-type": "text/html; charset=utf-8" } });
    }

    const db = supabaseAdmin();
    // Claim the post first (unique post_id) so a double trigger cannot double-send.
    const { error: claimErr } = await db.from("newsletter_issues").insert({
      post_id: post.id,
      issue_no: issueNo,
      title: post.title,
      url: post.link,
      subject: summary.subject,
    });
    if (claimErr) {
      return NextResponse.json({ ok: false, error: `claim failed: ${claimErr.message}` }, { status: 409 });
    }

    const campaignId = await sendIssue(post, summary, html, issueNo);
    await db
      .from("newsletter_issues")
      .update({ campaign_id: campaignId, sent_at: new Date().toISOString() })
      .eq("post_id", post.id);

    await notifyLuca(
      `${NEWSLETTER_NAME} #${issueNo} sent: ${post.title}`,
      `Subject: ${summary.subject}\n\n${summary.bullets.map((b) => "• " + b).join("\n")}\n\n${post.link}\n\nBrevo campaign #${campaignId}. ${remaining - 1} article(s) still to come.`
    );

    return NextResponse.json({ ok: true, sent: true, issueNo, postId: post.id, title: post.title, campaignId, remaining: remaining - 1 });
  } catch (e: any) {
    console.error("[newsletter/send]", e);
    await notifyLuca(`${NEWSLETTER_NAME}: this week's issue did NOT go out`, String(e?.message || e));
    return NextResponse.json({ ok: false, error: String(e?.message || e) }, { status: 500 });
  }
}
