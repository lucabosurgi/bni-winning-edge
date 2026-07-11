import SearchDirectory from "@/components/SearchDirectory";
import { getPublishedMembers } from "@/lib/members";

export const revalidate = 60;

export default async function HomePage() {
  const members = await getPublishedMembers();

  return (
    <>
      <section className="bg-gradient-to-b from-white to-slate-50">
        <div className="mx-auto max-w-6xl px-4 py-16 text-center">
          <p className="text-sm font-semibold uppercase tracking-wide text-brand">
            Spring Hill, Florida
          </p>
          <h1 className="mt-3 text-4xl font-black tracking-tight text-brand-ink sm:text-5xl">
            The crème de la crème
            <br className="hidden sm:block" /> of Spring Hill business.
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg text-slate-600">
            BNI Winning Edge is a hand-picked team of the area&apos;s finest
            local professionals — vetted for craftsmanship, fair pricing, and
            integ. Every member puts their own name and reputation on the
            line for the businesses they refer, so you get the best service at
            the best price, backed by the trust of the entire group. Browse the
            directory, or ask our concierge and we&apos;ll match you with exactly
            the right pro.
          </p>
          <div className="mt-8 flex justify-center gap-3">
            <a
              href="#directory"
              className="rounded-lg bg-brand px-6 py-3 font-medium text-white transition hover:bg-brand-dark"
            >
              Browse the directory
            </a>
            <a
              href="#directory"
              className="rounded-lg bg-white px-6 py-3 font-medium text-brand ring-1 ring-brand/30 transition hover:ring-brand"
            >
              {members.length} members
            </a>
          </div>
        </div>
      </section>

      {members.length === 0 ? (
        <section className="mx-auto max-w-6xl px-4 py-16 text-center text-slate-500">
          <p>
            The directory is being prepared. Members appear here as soon as
            they approve their profile.
          </p>
        </section>
      ) : (
        <SearchDirectory members={members} />
      )}
    </>
  );
}
