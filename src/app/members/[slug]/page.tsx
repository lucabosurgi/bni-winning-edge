import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getMemberBySlug, getPublishedMembers, initials } from "@/lib/members";

export const revalidate = 60;

// Pre-render a page for every published member (great for SEO / sharing).
export async function generateStaticParams() {
  const members = await getPublishedMembers();
  return members.map((m) => ({ slug: m.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const member = await getMemberBySlug(params.slug);
  if (!member) return { title: "Member not found" };
  const desc =
    member.description ?? `${member.business_name} — BNI Winning Edge member.`;
  return {
    title: member.business_name,
    description: desc,
    openGraph: {
      title: `${member.business_name} · BNI Winning Edge`,
      description: desc,
      images: member.logo_url ? [member.logo_url] : undefined,
    },
  };
}

function cleanUrl(url: string) {
  return url.replace(/^https?:\/\//, "").replace(/\/$/, "");
}

export default async function MemberPage({
  params,
}: {
  params: { slug: string };
}) {
  const member = await getMemberBySlug(params.slug);
  if (!member) notFound();

  const tel = member.phone ? member.phone.replace(/[^0-9+]/g, "") : null;

  return (
    <article>
      {/* Landing-style hero — this page is a real destination for a member's
          own marketing, so it leads with identity + primary calls to action. */}
      <section className="bg-gradient-to-b from-white to-slate-50 border-b border-slate-200">
        <div className="mx-auto max-w-3xl px-4 pt-8 pb-10">
          <Link
            href="/#directory"
            className="text-sm text-slate-500 hover:text-brand"
          >
            ← BNI Winning Edge directory
          </Link>

          <div className="mt-6 flex items-center gap-5">
            {member.logo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={member.logo_url}
                alt={`${member.business_name} logo`}
                className="h-24 w-24 rounded-2xl object-contain bg-white ring-1 ring-slate-100"
              />
            ) : (
              <span className="grid h-24 w-24 place-items-center rounded-2xl bg-brand/10 text-3xl font-bold text-brand">
                {initials(member.business_name)}
              </span>
            )}
            <div>
              {member.category && (
                <p className="text-sm font-semibold uppercase tracking-wide text-brand">
                  {member.category}
                </p>
              )}
              <h1 className="text-3xl font-black leading-tight text-brand-ink sm:text-4xl">
                {member.business_name}
              </h1>
              {member.contact_person && (
                <p className="text-slate-500">{member.contact_person}</p>
              )}
            </div>
          </div>

          {/* Primary CTAs */}
          <div className="mt-7 flex flex-wrap gap-3">
            {tel && (
              <a
                href={`tel:${tel}`}
                className="rounded-lg bg-brand px-5 py-3 font-medium text-white transition hover:bg-brand-dark"
              >
                📞 Call {member.phone}
              </a>
            )}
            {member.email && (
              <a
                href={`mailto:${member.email}`}
                className="rounded-lg bg-white px-5 py-3 font-medium text-brand ring-1 ring-brand/30 transition hover:ring-brand"
              >
                ✉️ Email
              </a>
            )}
            {member.website && (
              <a
                href={member.website}
                target="_blank"
                rel="noopener"
                className="rounded-lg bg-white px-5 py-3 font-medium text-slate-700 ring-1 ring-slate-300 transition hover:ring-slate-400"
              >
                🌐 Visit website
              </a>
            )}
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-3xl px-4 py-10">
        {member.photo_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={member.photo_url}
            alt={member.business_name}
            className="mb-8 w-full rounded-2xl object-cover"
          />
        )}

        {member.description && (
          <p className="text-lg leading-relaxed text-slate-700">
            {member.description}
          </p>
        )}

        {/* Full contact card */}
        <div className="mt-8 grid gap-3 rounded-2xl border border-slate-200 bg-white p-6 sm:grid-cols-2">
          {member.phone && (
            <a
              href={`tel:${tel}`}
              className="flex items-center gap-3 rounded-lg px-3 py-2 hover:bg-slate-50"
            >
              <span className="text-brand">📞</span>
              <span className="text-slate-700">{member.phone}</span>
            </a>
          )}
          {member.email && (
            <a
              href={`mailto:${member.email}`}
              className="flex items-center gap-3 rounded-lg px-3 py-2 hover:bg-slate-50"
            >
              <span className="text-brand">✉️</span>
              <span className="truncate text-slate-700">{member.email}</span>
            </a>
          )}
          {member.website && (
            <a
              href={member.website}
              target="_blank"
              rel="noopener"
              className="flex items-center gap-3 rounded-lg px-3 py-2 hover:bg-slate-50 sm:col-span-2"
            >
              <span className="text-brand">🌐</span>
              <span className="truncate text-slate-700">
                {cleanUrl(member.website)}
              </span>
            </a>
          )}
        </div>

        {/* Cross-link back to the network — turns member traffic into
            directory traffic and vice-versa. */}
        <div className="mt-8 rounded-2xl bg-brand/5 p-6 text-center">
          <p className="text-slate-700">
            {member.business_name} is a proud member of{" "}
            <span className="font-semibold">BNI Winning Edge</span> — a trusted
            network of local professionals in Spring Hill, FL.
          </p>
          <Link
            href="/#directory"
            className="mt-3 inline-block rounded-lg bg-brand px-5 py-2.5 text-sm font-medium text-white transition hover:bg-brand-dark"
          >
            Explore the whole network →
          </Link>
        </div>
      </div>
    </article>
  );
}
