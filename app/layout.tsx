import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Company Deep-Dive Engine - Candidate Decision Intelligence",
  description: "AI-powered company and role analysis tool. Get grounded intelligence before your interviews.",
  keywords: "job search, company analysis, role evaluation, interview preparation",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased bg-white text-gray-900">{children}</body>
    </html>
  );
}
