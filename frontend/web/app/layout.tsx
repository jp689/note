import type { Metadata } from "next";
import { SiteShell } from "../components/site-shell";
import { ToastProvider } from "../components/toast-provider";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI 自学笔记平台",
  description: "PDF 笔记结构化、知识库检索、测评反馈和复习队列。",
  icons: {
    icon: "/biao.png",
    apple: "/biao.png"
  }
};

export default function RootLayout({
  children
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body>
        <ToastProvider>
          <SiteShell>{children}</SiteShell>
        </ToastProvider>
      </body>
    </html>
  );
}
