import type { Metadata } from "next";
import "./globals.css";
import Concierge from "@/components/Concierge";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://bniwinningedge.com";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "BNI Winning Edge — Trusted Local Businesses in Spring Hill, FL",
    template: "%s · BNI Winning Edge",
  },
  description:
    "The trusted network of local business professionals in Spring Hill, Florida. Find a vetted, recommended member for whatever you need — or ask our concierge.",
  openGraph: {
    siteName: "BNI Winning Edge",
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
                BNI Winning Edge
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
              BNI Winning Edge is a chapter of Business Network International —
              local professionals who refer real business to one another.
            </p>
            <p className="mt-2">
              © {new Date().getFullYear()} BNI Winning Edge. Member logos and
              photos are used with permission.
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
