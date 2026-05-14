import Link from "next/link";
import { ReactNode } from "react";

const navigation = [
  { href: "/", label: "学习控制台" },
  { href: "/upload", label: "导入 PDF" },
  { href: "/knowledge", label: "知识库" },
  { href: "/quizzes/demo-quiz", label: "在线测评" },
  { href: "/reports/demo-attempt", label: "反馈中心" }
];

export function SiteShell({ children }: { children: ReactNode }) {
  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="absolute inset-0 -z-10 opacity-50 mesh-grid" />
      <header className="mx-auto flex max-w-7xl flex-col gap-6 px-6 pb-8 pt-8 lg:px-10">
        <div className="panel rounded-[28px] px-6 py-4 shadow-panel">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-2">
              <p className="text-sm uppercase tracking-[0.35em] text-ink/60">
                AI Study Notes
              </p>
              <div>
                <h1 className="display-face text-3xl text-ink lg:text-4xl">
                  用一份 PDF，长出一整套自学系统
                </h1>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-ink/70">
                  解析笔记、构建知识图谱、生成思维导图、自动出题并给出复习反馈。
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                className="rounded-full bg-ink px-5 py-3 text-sm font-medium text-paper transition hover:bg-ink/90"
                href="/upload"
              >
                新建学习项目
              </Link>
              <Link
                className="rounded-full border border-ink/15 bg-paper/70 px-5 py-3 text-sm font-medium text-ink transition hover:border-ink/25"
                href="/login"
              >
                登录
              </Link>
            </div>
          </div>
        </div>

        <nav className="flex flex-wrap gap-3">
          {navigation.map((item) => (
            <Link
              className="rounded-full border border-ink/10 bg-white/65 px-4 py-2 text-sm text-ink/75 transition hover:border-saffron/30 hover:bg-white"
              href={item.href}
              key={item.href}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </header>

      <main className="mx-auto max-w-7xl px-6 pb-16 lg:px-10">{children}</main>
    </div>
  );
}

