
import type { Metadata } from "next";
import "./globals.css";
import { Header } from "@/components/Header";

const siteUrl =
  process.env.NEXT_PUBLIC_APP_URL ??
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : "http://localhost:3000");

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "Company Deep-Dive Engine - Candidate Decision Intelligence",
  description: "AI-powered company and role analysis tool. Get grounded intelligence before your interviews.",
  keywords: "job search, company analysis, role evaluation, interview preparation",
  icons: {
    icon: "/icon.svg",
    shortcut: "/icon.svg",
    apple: "/icon.svg",
  },
  openGraph: {
    title: "Company Deep-Dive Engine",
    description: "AI-powered company and role analysis tool. Get grounded intelligence before your interviews.",
    images: [
      {
        url: "/social-preview.svg",
        width: 1200,
        height: 630,
        alt: "Company Deep-Dive Engine social preview",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Company Deep-Dive Engine",
    description: "AI-powered company and role analysis tool. Get grounded intelligence before your interviews.",
    images: ["/social-preview.svg"],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased bg-stone-50 text-gray-900" suppressHydrationWarning>
        <Header />
        {children}
      </body>
    </html>
  );
}
