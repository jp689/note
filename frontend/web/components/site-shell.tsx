"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ReactNode } from "react";
import { LuminaIcon } from "./lumina-icon";
import { LogoutLink } from "./logout-link";
import { NotificationPanel } from "./notification-panel";
import { SearchPanel } from "./search-panel";
import { UserAvatar } from "./user-avatar";
import { useToast } from "./toast-provider";

const navigation = [
  { href: "/", label: "学习控制台", shortLabel: "首页", icon: "dashboard" },
  { href: "/upload", label: "导入 PDF", shortLabel: "导入", icon: "upload_file" },
  { href: "/knowledge", label: "知识库", shortLabel: "知识库", icon: "folder_shared" },
  { href: "/review", label: "反馈复习", shortLabel: "复习", icon: "fact_check" }
];

const smartFolders = [
  { name: "待复习知识点", href: "/review" },
  { name: "最近测评", href: "/reports/demo-attempt" }
];

function isActivePath(pathname: string, href: string) {
  if (href === "/") {
    return pathname === "/";
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

function BrandMark({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <div
        className={`flex items-center justify-center rounded-xl bg-primary text-on-primary shadow-soft ${
          compact ? "h-9 w-9" : "h-11 w-11"
        }`}
      >
        <LuminaIcon className={compact ? "text-[22px]" : "text-[28px]"} filled name="smart_toy" />
      </div>
      <div>
        <p className={`${compact ? "text-xl" : "text-2xl"} font-bold leading-tight text-primary`}>
          Lumina
        </p>
        <p className="text-xs font-semibold tracking-wide text-on-surface-variant">AI 灵感空间</p>
      </div>
    </div>
  );
}

export function SiteShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const toast = useToast();

  // Login and admin pages have their own layouts
  const isFullscreenPage = pathname === "/login" || pathname.startsWith("/admin");
  if (isFullscreenPage) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen overflow-x-hidden bg-background text-on-surface">
      <aside className="glass-panel fixed left-0 top-0 z-50 hidden h-screen w-sidebar flex-col border-r border-outline-variant/40 p-5 lg:flex">
        <div className="px-1 py-4">
          <BrandMark />
        </div>

        <nav className="mt-8 flex flex-1 flex-col gap-2">
          {navigation.map((item) => {
            const active = isActivePath(pathname, item.href);
            return (
            <Link
                className={`flex min-h-12 items-center gap-3 rounded-xl px-4 py-3 text-base transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
                  active
                    ? "bg-primary text-on-primary shadow-lift"
                    : "text-on-surface-variant hover:bg-surface-container"
                }`}
                href={item.href}
                key={item.href}
              >
                <LuminaIcon filled={active} name={item.icon} />
                <span className="font-semibold">{item.label}</span>
              </Link>
            );
          })}
          <div className="mt-7 border-t border-outline-variant/30 pt-6">
            <p className="px-4 text-xs font-bold uppercase tracking-[0.16em] text-outline">
              智能文件夹
            </p>
            <div className="mt-3 grid gap-1">
              {smartFolders.map((folder) => (
                <Link
                  className="flex min-h-11 items-center justify-between rounded-xl px-4 py-2.5 text-left text-sm text-on-surface-variant opacity-70 transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary hover:bg-surface-container"
                  href={folder.href}
                  key={folder.name}
                >
                  <span className="flex items-center gap-3">
                    <LuminaIcon className="text-[18px] text-primary" filled name="auto_awesome" />
                    {folder.name}
                  </span>
                  <span className="rounded-md bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
                    AI
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </nav>

        <div className="grid gap-4 border-t border-outline-variant/25 pt-5">
          <div className="rounded-2xl bg-primary-container p-4 text-on-primary">
            <p className="font-bold">MVP 学习闭环</p>
            <p className="mt-1 text-sm leading-5 text-on-primary/85">PDF、知识库、测评和复习队列已接入。</p>
            <Link
              className="ui-button-primary mt-4 w-full bg-surface text-primary hover:bg-surface-container-low text-center block"
              href="/"
            >
              查看状态
            </Link>
          </div>
          <div className="grid gap-1">
            <Link
              className="flex min-h-11 items-center gap-3 rounded-xl px-4 py-2.5 text-on-surface-variant transition hover:bg-surface-container focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              href="/review"
            >
              <LuminaIcon name="help" />
              复习中心
            </Link>
            <LogoutLink />
          </div>
        </div>
      </aside>

      <div className="min-h-screen min-w-0 lg:pl-sidebar">
        <header className="glass-panel sticky top-0 z-40 flex h-16 items-center justify-between border-b border-outline-variant/35 px-4 sm:px-6 lg:px-12">
          <div className="flex min-w-0 flex-1 items-center gap-5">
            <div className="lg:hidden">
              <BrandMark compact />
            </div>
            <SearchPanel />
          </div>

          <nav className="hidden items-center gap-7 xl:flex">
            {navigation.slice(0, 3).map((item) => {
              const active = isActivePath(pathname, item.href);
              return (
                <Link
                  className={`border-b-2 pb-1 text-sm font-bold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary ${
                    active
                      ? "border-primary text-primary"
                      : "border-transparent text-on-surface-variant hover:text-primary"
                  }`}
                  href={item.href}
                  key={item.href}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="ml-4 flex items-center gap-2 sm:gap-3">
            <div className="hidden sm:block">
              <NotificationPanel />
            </div>
            <Link
              aria-label="设置"
              className="hidden h-11 w-11 items-center justify-center rounded-full text-on-surface-variant opacity-70 transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary hover:bg-surface-container sm:flex"
              href="/settings"
            >
              <LuminaIcon name="settings" />
            </Link>
            <UserAvatar />
            <Link
              className="ui-button-primary hidden md:inline-flex"
              href="/upload"
            >
              导入 PDF
            </Link>
          </div>
        </header>

        <main className="min-h-[calc(100vh-64px)] min-w-0 overflow-x-hidden px-4 py-6 pb-28 sm:px-6 lg:px-12 lg:py-10">
          {children}
        </main>
      </div>

      <nav className="glass-panel fixed bottom-0 left-0 right-0 z-50 grid grid-cols-4 border-t border-outline-variant/35 px-2 py-3 lg:hidden">
        {navigation.map((item) => {
          const active = isActivePath(pathname, item.href);
          return (
            <Link
              className={`min-h-12 min-w-0 flex flex-col items-center justify-center gap-1 rounded-xl text-xs font-semibold transition hover:bg-surface-container/70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
                active ? "text-primary" : "text-on-surface-variant"
              }`}
              href={item.href}
              key={item.href}
            >
              <LuminaIcon className="text-[24px]" filled={active} name={item.icon} />
              <span>{item.shortLabel}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
