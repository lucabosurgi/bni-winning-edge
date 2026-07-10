"use client";

import { useRouter } from "next/navigation";

export default function AdminLogout() {
  const router = useRouter();
  async function logout() {
    await fetch("/api/admin/logout", { method: "POST" });
    router.refresh();
  }
  return (
    <button
      onClick={logout}
      className="text-sm text-slate-500 hover:text-brand"
    >
      Sign out
    </button>
  );
}
