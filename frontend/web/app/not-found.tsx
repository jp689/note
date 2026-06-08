import Link from "next/link";
import { LuminaIcon } from "../components/lumina-icon";

export default function NotFound() {
  return (
    <div className="mx-auto grid min-h-[60vh] max-w-3xl place-items-center">
      <section className="panel rounded-3xl p-8 text-center shadow-panel sm:p-12">
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <LuminaIcon className="text-[48px]" name="search" />
        </div>
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-outline">404</p>
        <h1 className="mt-3 text-3xl font-bold text-ink sm:text-4xl">页面未找到</h1>
        <p className="mt-4 max-w-md text-sm leading-6 text-ink/70">
          你访问的页面不存在或已被移除。请检查链接是否正确，或返回学习控制台继续。
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link className="ui-button-primary" href="/">
            <LuminaIcon className="text-[18px]" name="dashboard" />
            返回控制台
          </Link>
          <Link className="ui-button-ghost" href="/knowledge">
            <LuminaIcon className="text-[18px]" name="search" />
            知识库检索
          </Link>
        </div>
      </section>
    </div>
  );
}
