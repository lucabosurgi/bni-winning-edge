/**
 * "Monday Food for the Mind" — Luca's weekly educational newsletter.
 *
 * One blog post per issue, newest → oldest, sent through Brevo to the
 * dedicated newsletter list. Everything here is server-only.
 *
 * Env (all already present in the Vercel project except CRON_SECRET):
 *   BREVO_API_KEY, ANTHROPIC_API_KEY, SUPABASE_SERVICE_ROLE_KEY,
 *   NEXT_PUBLIC_SUPABASE_URL, ADMIN_PASSWORD, CRON_SECRET
 */
import Anthropic from "@anthropic-ai/sdk";
import { supabaseAdmin } from "@/lib/supabase";

export const NEWSLETTER_LIST_ID = Number(process.env.NEWSLETTER_LIST_ID || 6);
export const NEWSLETTER_NAME = "Monday Food for the Mind";
export const BLOG_API = "https://lucabosurgi.com/wp-json/wp/v2/posts";
export const SIGNUP_URL =
  "https://d223c623.sibforms.com/serve/MUIFABMfNviNDxFPO7D0T0ZsocY0g28umx0LQJm_58OwCXZJ3rs9W4ZEVFBtBJf2YohvQAMloWdGHTZlsFVKIOzwvU1OP8KSXjojKcj9dlDRJInllnwzCwlMrwfEN-p8XK2ZlP2lxTanbWyE2uCwOXG5WnofcT4k8LtouutLalDKRvE6sxLA1Td9wPhgpKg7YRXglC0ir2DA4at1gA==";
const SENDER = { name: "Luca Bosurgi", email: "luca@mindfitnesslab.com" };
const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://www.winningedgepartners.com";
const MODEL = process.env.NEWSLETTER_MODEL || process.env.CONCIERGE_MODEL || "claude-haiku-4-5";

export type Post = {
  id: number;
  date: string;
  link: string;
  title: string;
  html: string;
  text: string;
  image?: string;
};

/** Accept either Vercel's cron header or Luca's admin password. */
export function isAuthorized(req: Request): boolean {
  const auth = req.headers.get("authorization") || "";
  const cron = process.env.CRON_SECRET;
  if (cron && auth === `Bearer ${cron}`) return true;
  const key = new URL(req.url).searchParams.get("key");
  const admin = process.env.ADMIN_PASSWORD;
  return Boolean(key && admin && key === admin);
}

function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<\/(p|div|h[1-6]|li|br)>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#8217;|&rsquo;/g, "’")
    .replace(/&#8216;|&lsquo;/g, "‘")
    .replace(/&#8220;|&ldquo;/g, "“")
    .replace(/&#8221;|&rdquo;/g, "”")
    .replace(/&#8211;|&ndash;/g, "–")
    .replace(/&#8212;|&mdash;/g, "—")
    .replace(/&#8230;|&hellip;/g, "…")
    .replace(/&quot;/g, '"')
    .replace(/&#039;|&apos;/g, "'")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/** All published posts, newest first. */
export async function fetchPosts(): Promise<Post[]> {
  const out: Post[] = [];
  for (let page = 1; page <= 5; page++) {
    const url = `${BLOG_API}?per_page=100&page=${page}&orderby=date&order=desc&_embed=wp:featuredmedia&_fields=id,date,link,title,content,_links,_embedded`;
    const res = await fetch(url, {
      headers: { accept: "application/json", "user-agent": "MindFitnessLab-Newsletter/1.0" },
      cache: "no-store",
    });
    if (!res.ok) {
      if (page > 1) break;
      throw new Error(`Blog API ${res.status}`);
    }
    const rows = (await res.json()) as any[];
    for (const r of rows) {
      const html = r?.content?.rendered ?? "";
      out.push({
        id: r.id,
        date: r.date,
        link: r.link,
        title: stripHtml(r?.title?.rendered ?? ""),
        html,
        text: stripHtml(html),
        image: r?._embedded?.["wp:featuredmedia"]?.[0]?.source_url || undefined,
      });
    }
    const totalPages = Number(res.headers.get("x-wp-totalpages") || 1);
    if (page >= totalPages) break;
  }
  return out;
}

/** Newest post that has not been sent yet. */
export async function nextUnsentPost(): Promise<{ post: Post | null; remaining: number; total: number }> {
  const posts = await fetchPosts();
  const db = supabaseAdmin();
  const { data } = await db.from("newsletter_issues").select("post_id");
  const sent = new Set((data ?? []).map((r: any) => Number(r.post_id)));
  const unsent = posts.filter((p) => !sent.has(p.id));
  return { post: unsent[0] ?? null, remaining: unsent.length, total: posts.length };
}

export type Summary = { intro: string; bullets: string[]; subject: string };

/** 3–4 educational takeaways + a one-line intro, written by Claude. */
export async function summarize(post: Post): Promise<Summary> {
  const anthropic = new Anthropic();
  const prompt = `You write the weekly email "${NEWSLETTER_NAME}" for Luca Bosurgi, a Master Hypnotist and Mind Fitness Coach. The email is purely EDUCATIONAL: thoughts and facts about the mind, relationships and the nervous system. It must never sound like it is selling anything — no offers, no "book", "call", "program", "session", "consultation", no urgency, no superlatives about Luca.

Vocabulary rules: never use the words therapy, hypnotherapy, treatment, treat, cure, diagnose, patient. Say "work with" instead of "treat". Plain, warm, direct English for ordinary readers in Florida.

From the article below produce JSON only, no markdown:
{
  "subject": "<email subject, max 60 chars, curiosity + clarity, no clickbait, no emoji>",
  "intro": "<ONE sentence, max 28 words, in Luca's first-person voice, setting up why this topic matters this week>",
  "bullets": ["<takeaway 1>", "<takeaway 2>", "<takeaway 3>", "<optional takeaway 4>"]
}
Each bullet: one sentence, max 22 words, a concrete fact, mechanism or insight a reader can keep even without reading the article. 3 or 4 bullets.

ARTICLE TITLE: ${post.title}
ARTICLE TEXT:
${post.text.slice(0, 12000)}`;

  const resp = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 600,
    temperature: 0.4,
    messages: [{ role: "user", content: prompt }],
  });
  const raw = resp.content.map((c: any) => (c.type === "text" ? c.text : "")).join("");
  const json = raw.slice(raw.indexOf("{"), raw.lastIndexOf("}") + 1);
  const parsed = JSON.parse(json);
  const bullets: string[] = (parsed.bullets ?? []).map((b: string) => String(b).trim()).filter(Boolean).slice(0, 4);
  if (bullets.length < 3) throw new Error("summary too short");
  return {
    subject: String(parsed.subject || post.title).slice(0, 80),
    intro: String(parsed.intro || "").trim(),
    bullets,
  };
}

/** Newsletter-only unsubscribe link, personalised by Brevo at send time. */
export function unsubscribeUrl(): string {
  return `${SITE}/api/newsletter/unsubscribe?e={{ contact.EMAIL | urlencode }}`;
}

/** First ~2 paragraphs of the article as a teaser. */
function teaser(post: Post): string {
  const paras = post.text.split(/\n+/).map((p) => p.trim()).filter((p) => p.length > 60);
  let out = "";
  for (const p of paras) {
    out += `<p style="margin:0 0 14px 0">${esc(p)}</p>`;
    if (out.length > 700) break;
  }
  return out;
}

export function renderEmail(post: Post, s: Summary, issueNo: number): string {
  const bullets = s.bullets
    .map(
      (b) =>
        `<tr><td valign="top" style="padding:0 10px 10px 0;color:#2f6f5e;font-size:18px;line-height:24px">•</td><td style="padding:0 0 10px 0;font-size:16px;line-height:24px;color:#222">${esc(b)}</td></tr>`
    )
    .join("");
  const hero = post.image
    ? `<tr><td style="padding:0 0 22px 0"><a href="${esc(post.link)}" style="text-decoration:none"><img src="${esc(post.image)}" width="600" alt="" style="display:block;width:100%;max-width:600px;height:auto;border-radius:8px"></a></td></tr>`
    : "";
  const dateStr = new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "America/New_York" });

  return `<!doctype html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(s.subject)}</title></head>
<body style="margin:0;padding:0;background:#f4f3ef;font-family:Georgia,'Times New Roman',serif">
<span style="display:none;font-size:1px;color:#f4f3ef;max-height:0;overflow:hidden">${esc(s.intro)}</span>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f4f3ef"><tr><td align="center" style="padding:28px 12px">
<table role="presentation" width="600" cellspacing="0" cellpadding="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:12px">
<tr><td style="padding:28px 36px 10px 36px;font-family:Helvetica,Arial,sans-serif">
  <div style="font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#2f6f5e;font-weight:bold">${esc(NEWSLETTER_NAME)}</div>
  <div style="font-size:12px;color:#888;margin-top:4px">Issue ${issueNo} · ${dateStr}</div>
</td></tr>
<tr><td style="padding:10px 36px 0 36px">
  <h1 style="margin:0 0 16px 0;font-size:28px;line-height:34px;color:#1b1b1b;font-weight:normal">${esc(post.title)}</h1>
  <p style="margin:0 0 22px 0;font-size:17px;line-height:26px;color:#333;font-style:italic">${esc(s.intro)}</p>
</td></tr>
${hero ? `<tr><td style="padding:0 36px">${`<table role="presentation" width="100%" cellspacing="0" cellpadding="0">${hero}</table>`}</td></tr>` : ""}
<tr><td style="padding:0 36px 8px 36px">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f6faf8;border-left:4px solid #2f6f5e;border-radius:6px"><tr><td style="padding:18px 20px 8px 20px;font-family:Helvetica,Arial,sans-serif">
    <div style="font-size:12px;letter-spacing:1.5px;text-transform:uppercase;color:#2f6f5e;font-weight:bold;margin-bottom:12px">In short</div>
    <table role="presentation" cellspacing="0" cellpadding="0">${bullets}</table>
  </td></tr></table>
</td></tr>
<tr><td style="padding:22px 36px 6px 36px;font-size:17px;line-height:27px;color:#2a2a2a">${teaser(post)}</td></tr>
<tr><td style="padding:6px 36px 30px 36px">
  <a href="${esc(post.link)}" style="display:inline-block;background:#2f6f5e;color:#ffffff;text-decoration:none;font-family:Helvetica,Arial,sans-serif;font-size:15px;font-weight:bold;padding:13px 22px;border-radius:6px">Read the full article →</a>
</td></tr>
<tr><td style="padding:0 36px 30px 36px;font-size:16px;line-height:25px;color:#333">
  <p style="margin:0 0 6px 0">Until next Monday — be the captain of your mind, not its passenger.</p>
  <p style="margin:0">Luca Bosurgi<br><span style="font-size:14px;color:#777;font-family:Helvetica,Arial,sans-serif">Master Hypnotist &amp; Mind Fitness Coach · Mind Fitness Lab, Spring Hill, Florida<br><a href="https://lucabosurgi.com" style="color:#2f6f5e;text-decoration:none">lucabosurgi.com</a> — more articles, books and the thinking behind this newsletter</span></p>
</td></tr>
<tr><td style="padding:20px 36px 26px 36px;border-top:1px solid #eee;font-family:Helvetica,Arial,sans-serif;font-size:12px;line-height:19px;color:#888">
  <p style="margin:0 0 10px 0">Know someone who would enjoy one thoughtful read every Monday about the mind? Forward this email — they can <a href="${esc(SIGNUP_URL)}" style="color:#2f6f5e">subscribe here</a>.</p>
  <p style="margin:0 0 10px 0">You receive this because you are a client, a friend, or a fellow member of Luca's business network.</p>
  <p style="margin:0">
    <a href="${unsubscribeUrl()}" style="color:#2f6f5e">Unsubscribe from this weekly newsletter only</a> &nbsp;·&nbsp;
    <a href="{{ unsubscribe }}" style="color:#888">Unsubscribe from all Mind Fitness Lab emails</a>
  </p>
  <p style="margin:10px 0 0 0">Mind Fitness Lab · 5331 Commercial Way, Suite 204, Spring Hill, FL 34606 · <a href="https://lucabosurgi.com" style="color:#888">lucabosurgi.com</a></p>
</td></tr>
</table></td></tr></table>
</body></html>`;
}

async function brevo(path: string, init: RequestInit & { json?: unknown } = {}) {
  const key = process.env.BREVO_API_KEY;
  if (!key) throw new Error("BREVO_API_KEY missing");
  const res = await fetch(`https://api.brevo.com/v3${path}`, {
    ...init,
    headers: { "api-key": key, accept: "application/json", "content-type": "application/json", ...(init.headers || {}) },
    body: init.json !== undefined ? JSON.stringify(init.json) : init.body,
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`Brevo ${path} ${res.status}: ${text}`);
  return text ? JSON.parse(text) : {};
}

/** Create the Brevo campaign for this issue and send it now. Returns campaign id. */
export async function sendIssue(post: Post, s: Summary, html: string, issueNo: number): Promise<number> {
  const created = await brevo("/emailCampaigns", {
    method: "POST",
    json: {
      name: `MFM #${issueNo} — ${post.title}`.slice(0, 200),
      subject: s.subject,
      previewText: s.intro.slice(0, 150),
      sender: SENDER,
      replyTo: SENDER.email,
      htmlContent: html,
      recipients: { listIds: [NEWSLETTER_LIST_ID] },
      inlineImageActivation: false,
      mirrorActive: true,
    },
  });
  const id = Number(created.id);
  await brevo(`/emailCampaigns/${id}/sendNow`, { method: "POST" });
  return id;
}

/** Remove one email from the newsletter list only (contact stays in all other lists). */
export async function removeFromNewsletter(email: string): Promise<boolean> {
  try {
    await brevo(`/contacts/lists/${NEWSLETTER_LIST_ID}/contacts/remove`, {
      method: "POST",
      json: { emails: [email] },
    });
    return true;
  } catch (e: any) {
    // Brevo returns 400 "contact not in list" when already removed — treat as done.
    if (/not in|does not exist|invalid_parameter/i.test(String(e?.message))) return true;
    console.error("[newsletter] remove failed", e);
    return false;
  }
}
