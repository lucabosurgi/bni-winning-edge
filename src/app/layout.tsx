import type { Metadata } from "next";
import "./globals.css";
import Concierge from "@/components/Concierge";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://winningedgepartners.com";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Winning Edge Partners — Trusted Local Businesses in Spring Hill, FL",
    template: "%s · Winning Edge Partners",
  },
  description:
    "The trusted network of local business professionals in Spring Hill, Florida. Find a vetted, recommended member for whatever you need — or ask our concierge.",
  openGraph: {
    siteName: "Winning Edge Partners",
    type: "website",
    url: siteUrl,
  },
  twitter: { card: "summary_large_image" },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen flex flex-col">
        <header className="bg-brand text-white">
          <div className="mx-auto max-w-6xl px-4 py-4 flex items-center justify-between">
            <a href="/" className="flex items-center gap-3">
              <span className="grid h-9 w-9 place-items-center rounded bg-white/15 font-black tracking-tight">
                WE
              </span>
              <span className="font-semibold leading-tight">
                Winning Edge Partners
                <span className="block text-xs font-normal text-white/70">
                  Spring Hill, Florida
                </span>
              </span>
            </a>
            <a
              href="/#directory"
              className="text-sm font-medium text-white/90 hover:text-white"
            >
              Member Directory
            </a>
          </div>
        </header>

        <main className="flex-1">{children}</main>

        {/* Concierge lives site-wide, so it works whether a member sends
            traffic to the main page or to their own profile page. */}
        <Concierge />


        <footer className="mt-16 border-t border-slate-200 bg-white">
          <div className="mx-auto max-w-6xl px-4 py-8 text-sm text-slate-500">
            <p>
              Winning Edge Partners is a network of trusted local professionals in
              Spring Hill, Florida who refer real business to one another.
            </p>
            <p className="mt-2">
              © {new Date().getFullYear()} Winning Edge Partners. Member logos and
              photos are used with permission.
            </p>
            <p className="mt-2">
              Members: <a href="/kit" className="underline hover:text-slate-700">get your badge kit</a>{" "}
              &middot; <a href="/listing" className="underline hover:text-slate-700">update or add your listing</a>
            </p>
            <p className="mt-2">
              Design &amp; development by{" "}
              <a
                href="https://lucabosurgi.com/mind-fitness-lab-design-and-development/"
                target="_blank"
                rel="noopener"
                className="font-medium text-brand hover:underline"
              >
                Mind Fitness Lab
              </a>
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
