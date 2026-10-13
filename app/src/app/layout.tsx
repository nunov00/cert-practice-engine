import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { InstallApp } from "@/components/InstallApp";
import { UpdateCheck } from "@/components/UpdateCheck";
import { BrandMark } from "@/components/BrandMark";
import { SITE_DISCLAIMER, SITE_NAME, SITE_SHORT_NAME, SITE_TAGLINE } from "@/lib/site";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: SITE_NAME, template: `%s · ${SITE_NAME}` },
  description: "Original practice questions with explanations for professional certification exams.",
  appleWebApp: { capable: true, title: SITE_SHORT_NAME, statusBarStyle: "default" },
  formatDetection: { telephone: false },
  // Next only emits the newer tag; older iOS versions still look for this one.
  other: { "apple-mobile-web-app-capable": "yes" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#1b1d20" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <header className="site">
          <div className="container">
            <Link href="/" className="brand" aria-label={`${SITE_NAME} home`}>
              <BrandMark />
              <span>{SITE_NAME}</span>
            </Link>
            <nav className="site-nav" aria-label="Main">
              <Link href="/#all-exams">Exams</Link>
              <InstallApp />
            </nav>
          </div>
        </header>
        <UpdateCheck />
        <main className="container">{children}</main>
        <footer className="site">
          <div className="container">
            <p className="footer-brand">
              <BrandMark /> {SITE_NAME} · {SITE_TAGLINE}
            </p>
            <p>{SITE_DISCLAIMER}</p>
            <p>Your answers and progress stay in this browser. There are no accounts and nothing is sent to us.</p>
            <p>All questions are original and written for practice. They are not real exam questions.</p>
          </div>
        </footer>
      </body>
    </html>
  );
}
