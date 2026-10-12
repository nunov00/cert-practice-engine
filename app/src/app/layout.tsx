import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { SITE_DISCLAIMER, SITE_NAME } from "@/lib/site";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: SITE_NAME, template: `%s · ${SITE_NAME}` },
  description: "Original practice questions with explanations for professional certification exams.",
};

export const viewport: Viewport = { width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <header className="site">
          <div className="container">
            <Link href="/" className="brand">
              {SITE_NAME}
            </Link>
          </div>
        </header>
        <main className="container">{children}</main>
        <footer className="site">
          <div className="container">
            <p>{SITE_DISCLAIMER}</p>
            <p>All questions are original and written for practice. They are not real exam questions.</p>
          </div>
        </footer>
      </body>
    </html>
  );
}
