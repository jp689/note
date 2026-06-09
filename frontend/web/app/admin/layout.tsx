"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ReactNode, useEffect, useState } from "react";
import { LuminaIcon } from "../../components/lumina-icon";

const adminNav = [
  { href: "/admin", label: "控制面板", icon: "dashboard" },
  { href: "/admin/users", label: "用户管理", icon: "people" },
  { href: "/admin/notes", label: "笔记管理", icon: "article" },
  { href: "/admin/files", label: "文件管理", icon: "folder_shared" },
  { href: "/admin/ai", label: "AI 管理", icon: "auto_awesome" },
  { href: "/admin/settings", label: "系统设置", icon: "settings" },
  { href: "/admin/logs", label: "日志管理", icon: "fact_check" },
];

function isActivePath(pathname: string, href: string) {
  if (href === "/admin") return pathname === "/admin";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function AdminLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [userName, setUserName] = useState("管理员");

  useEffect(() => {
    if (pathname === "/admin/login") return;
    try {
      const token = localStorage.getItem("ai-study-token");
      const userRaw = localStorage.getItem("ai-study-user");
      if (!token || !userRaw) {
        router.push("/admin/login");
        return;
      }
      const user = JSON.parse(userRaw);
      if (!user.isAdmin) {
        router.push("/admin/login");
        return;
      }
      setUserName(user.fullName || user.email || "管理员");
    } catch {
      router.push("/admin/login");
    }
  }, [pathname, router]);

  if (pathname === "/admin/login") {
    return <>{children}</>;
  }

  function handleLogout() {
    localStorage.removeItem("ai-study-token");
    localStorage.removeItem("ai-study-user");
    document.cookie = "ai-study-token=; path=/; max-age=0; SameSite=Lax";
    router.push("/admin/login");
  }

  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar */}
      <aside className="glass-panel fixed left-0 top-0 z-50 flex h-screen w-64 flex-col border-r border-outline-variant/40 p-5">
        <div className="flex items-center gap-3 px-1 py-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-ink text-paper">
            <LuminaIcon className="text-[22px]" name="admin_panel_settings" />
          </div>
          <div>
            <p className="text-lg font-bold leading-tight text-ink">管理后台</p>
            <p className="text-xs font-semibold tracking-wide text-on-surface-variant">Admin Panel</p>
          </div>
        </div>

        <nav className="mt-8 flex flex-1 flex-col gap-2">
          {adminNav.map((item) => {
            const active = isActivePath(pathname, item.href);
            return (
              <Link
                key={item.href}
                className={`flex min-h-12 items-center gap-3 rounded-xl px-4 py-3 text-base transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
                  active
                    ? "bg-ink text-paper shadow-lift"
                    : "text-on-surface-variant hover:bg-surface-container"
                }`}
                href={item.href}
              >
                <LuminaIcon filled={active} name={item.icon} />
                <span className="font-semibold">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-outline-variant/25 pt-5">
          <div className="flex items-center gap-3 px-4 py-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-on-primary text-sm font-bold">
              {userName.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-on-surface">{userName}</p>
              <p className="text-xs text-on-surface-variant">管理员</p>
            </div>
          </div>
          <button
            className="mt-2 flex w-full items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-semibold text-error transition hover:bg-error-container/60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-error"
            onClick={handleLogout}
            type="button"
          >
            <LuminaIcon name="logout" />
            退出登录
          </button>
          <Link
            className="mt-1 flex w-full items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-semibold text-on-surface-variant transition hover:bg-surface-container"
            href="/"
          >
            <LuminaIcon name="arrow_forward" />
            返回前台
          </Link>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 pl-64">
        <header className="glass-panel sticky top-0 z-40 flex h-16 items-center justify-between border-b border-outline-variant/35 px-8">
          <h2 className="text-lg font-bold text-ink">
            {pathname === "/admin" && "控制面板"}
            {pathname === "/admin/users" && "用户管理"}
            {pathname.startsWith("/admin/users/") && "用户详情"}
            {pathname === "/admin/notes" && "笔记管理"}
            {pathname === "/admin/files" && "文件管理"}
            {pathname === "/admin/ai" && "AI 管理"}
            {pathname === "/admin/settings" && "系统设置"}
            {pathname === "/admin/logs" && "日志管理"}
          </h2>
          <div className="flex items-center gap-3">
            <span className="text-sm text-on-surface-variant">欢迎回来，{userName}</span>
          </div>
        </header>
        <main className="min-h-[calc(100vh-64px)] overflow-x-hidden px-8 py-6">
          {children}
        </main>
      </div>
    </div>
  );
}
