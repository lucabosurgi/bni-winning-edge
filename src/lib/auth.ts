import { createHash } from "crypto";

/**
 * Lightweight admin gate. We never store the raw password in the cookie —
 * instead a hash derived from ADMIN_PASSWORD. Set ADMIN_PASSWORD in your env.
 */
export function adminToken(): string {
  const secret = process.env.ADMIN_PASSWORD || "";
  return createHash("sha256").update(`bni-winning-edge:${secret}`).digest("hex");
}

export function isAuthed(cookieValue?: string): boolean {
  return Boolean(process.env.ADMIN_PASSWORD) && cookieValue === adminToken();
}

export const ADMIN_COOKIE = "admin_auth";
