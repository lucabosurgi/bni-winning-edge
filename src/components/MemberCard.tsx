import Link from "next/link";
import { initials } from "@/lib/members";
import type { Member } from "@/lib/types";

export default function MemberCard({ member }: { member: Member }) {
  return (
    <Link
      href={`/members/${member.slug}`}
      className="group flex flex-col rounded-xl border border-slate-200 bg-white p-5 transition hover:border-brand/40 hover:shadow-md"
    >
      <div className="flex items-center gap-4">
        {member.logo_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={member.logo_url}
            alt={`${member.business_name} logo`}
            className="h-14 w-14 rounded-lg object-contain bg-white ring-1 ring-slate-100"
          />
        ) : (
          <span className="grid h-14 w-14 place-items-center rounded-lg bg-brand/10 text-lg font-bold text-brand">
            {initials(member.business_name)}
          </span>
        )}
        <div className="min-w-0">
          <h3 className="truncate font-semibold text-brand-ink group-hover:text-brand">
            {member.business_name}
          </h3>
          {member.contact_person && (
            <p className="truncate text-sm text-slate-500">
              {member.contact_person}
            </p>
          )}
        </div>
      </div>

      {member.description && (
        <p className="mt-3 line-clamp-3 text-sm text-slate-600">
          {member.description}
        </p>
      )}

      <span className="mt-4 text-sm font-medium text-brand opacity-0 transition group-hover:opacity-100">
        View profile →
      </span>
    </Link>
  );
}
