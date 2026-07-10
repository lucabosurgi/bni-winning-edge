import { supabase } from "./supabase";
import type { Member } from "./types";

/** All published members, ordered by category then business name. */
export async function getPublishedMembers(): Promise<Member[]> {
  const { data, error } = await supabase
    .from("members")
    .select("*")
    .eq("published", true)
    .order("category", { ascending: true })
    .order("business_name", { ascending: true });

  if (error) {
    console.error("[members] getPublishedMembers:", error.message);
    return [];
  }
  return (data as Member[]) ?? [];
}

/** A single published member by slug (for the detail page). */
export async function getMemberBySlug(slug: string): Promise<Member | null> {
  const { data, error } = await supabase
    .from("members")
    .select("*")
    .eq("slug", slug)
    .eq("published", true)
    .maybeSingle();

  if (error) {
    console.error("[members] getMemberBySlug:", error.message);
    return null;
  }
  return (data as Member) ?? null;
}

export function groupByCategory(members: Member[]): Record<string, Member[]> {
  return members.reduce<Record<string, Member[]>>((acc, m) => {
    const key = m.category ?? "Other";
    (acc[key] ??= []).push(m);
    return acc;
  }, {});
}

/** Initials fallback used when a member has no logo yet. */
export function initials(name: string): string {
  return name
    .replace(/\(.*?\)/g, "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}
