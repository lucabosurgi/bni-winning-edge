import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { supabase, supabaseAdmin } from "@/lib/supabase";
import type { Member } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MODEL = process.env.CONCIERGE_MODEL || "claude-3-5-haiku-latest";
const REFERRED_BY = "Luca Bosurgi"; // BNI referral attribution

type InMsg = { role: "user" | "assistant"; content: string };

export async function POST(req: Request) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { reply: "The concierge isn't configured yet (missing API key)." },
      { status: 200 }
    );
  }

  let body: { messages?: InMsg[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ reply: "Bad request." }, { status: 400 });
  }
  const history = (body.messages ?? []).filter(
    (m) => m && (m.role === "user" || m.role === "assistant") && m.content
  );
  if (history.length === 0) {
    return NextResponse.json({ reply: "Tell me what you need help with." });
  }

  // Load the live directory (published members only).
  const { data } = await supabase
    .from("members")
    .select(
      "id, slug, business_name, contact_person, category, description, phone, email, website"
    )
    .eq("published", true);
  const members = (data as Partial<Member>[]) ?? [];

  const directory = members
    .map(
      (m) =>
        `- ${m.business_name} (${m.category}) — ${m.contact_person}. ${m.description} | page: /members/${m.slug} | phone: ${m.phone}`
    )
    .join("\n");

  const system = `You are the friendly concierge for BNI Winning Edge, a chapter of local business professionals in Spring Hill, Florida.

Your job: understand what the visitor needs and route them to the RIGHT member(s) from the directory below. Rules:
- ONLY recommend businesses that appear in the directory. Never invent a business or a member who isn't listed.
- When you recommend someone, link to their profile page using markdown, e.g. [Reynolds Home Services](/members/reynolds-home-services), and include their phone number.
- If nothing in the directory fits, say so honestly and suggest the closest option.
- Keep replies short, warm, and practical (2-4 sentences).
- After you've made a recommendation, offer to pass the visitor's details to the member so they get a call back. If the visitor shares their name and a phone or email AND what they need, call the capture_lead tool to log it. Then confirm warmly that the member will be in touch.

DIRECTORY (${members.length} members):
${directory || "(no members published yet)"}`;

  const tools: Anthropic.Tool[] = [
    {
      name: "capture_lead",
      description:
        "Log a visitor as a referral lead for a specific member. Call ONLY when the visitor has provided their name, a contact (phone or email), and a clear description of what they need.",
      input_schema: {
        type: "object",
        properties: {
          visitor_name: { type: "string" },
          visitor_contact: {
            type: "string",
            description: "The visitor's phone number or email address.",
          },
          request: {
            type: "string",
            description: "What the visitor needs, in a sentence.",
          },
          recommended_slug: {
            type: "string",
            description:
              "The slug of the recommended member (from their /members/<slug> page).",
          },
        },
        required: ["visitor_name", "visitor_contact", "request"],
      },
    },
  ];

  const anthropic = new Anthropic();
  const messages: Anthropic.MessageParam[] = history.map((m) => ({
    role: m.role,
    content: m.content,
  }));

  try {
    // Tool-use loop (bounded).
    for (let turn = 0; turn < 3; turn++) {
      const resp = await anthropic.messages.create({
        model: MODEL,
        max_tokens: 500,
        system,
        tools,
        messages,
      });

      const toolUses = resp.content.filter(
        (b): b is Anthropic.ToolUseBlock => b.type === "tool_use"
      );

      if (toolUses.length === 0 || resp.stop_reason !== "tool_use") {
        const text = resp.content
          .filter((b): b is Anthropic.TextBlock => b.type === "text")
          .map((b) => b.text)
          .join("\n")
          .trim();
        return NextResponse.json({
          reply: text || "How else can I help you find the right member?",
        });
      }

      // Execute tool calls (only capture_lead exists).
      messages.push({ role: "assistant", content: resp.content });
      const results: Anthropic.ToolResultBlockParam[] = [];
      for (const tu of toolUses) {
        if (tu.name === "capture_lead") {
          const ok = await saveLead(tu.input as LeadInput, members);
          results.push({
            type: "tool_result",
            tool_use_id: tu.id,
            content: ok
              ? "Lead saved. Confirm to the visitor that the member will reach out."
              : "Could not save the lead; apologize briefly and suggest they call the member directly.",
          });
        }
      }
      messages.push({ role: "user", content: results });
    }

    return NextResponse.json({
      reply:
        "Thanks! I've noted that down — a member of the network will be in touch shortly.",
    });
  } catch (err) {
    console.error("[concierge]", err);
    return NextResponse.json({
      reply:
        "Sorry, I'm having trouble right now. Please browse the directory above, or try again in a moment.",
    });
  }
}

type LeadInput = {
  visitor_name?: string;
  visitor_contact?: string;
  request?: string;
  recommended_slug?: string;
};

async function saveLead(
  input: LeadInput,
  members: Partial<Member>[]
): Promise<boolean> {
  try {
    const match = members.find((m) => m.slug === input.recommended_slug);
    const db = supabaseAdmin();
    const { error } = await db.from("leads").insert({
      visitor_name: input.visitor_name ?? null,
      visitor_contact: input.visitor_contact ?? null,
      request: input.request ?? null,
      recommended_member: match?.id ?? null,
      recommended_business: match?.business_name ?? null,
      referred_by: REFERRED_BY,
    });
    if (error) {
      console.error("[concierge] saveLead:", error.message);
      return false;
    }
    return true;
  } catch (e) {
    console.error("[concierge] saveLead threw:", e);
    return false;
  }
}
