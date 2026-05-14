import type { Metadata } from "next";
import { SiteShell } from "../components/site-shell";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI Study Notes",
  description: "Upload PDFs, structure knowledge, generate quizzes, and track feedback."
};

export default function RootLayout({
  children
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body>
        <SiteShell>{children}</SiteShell>
      </body>
    </html>
  );
}

