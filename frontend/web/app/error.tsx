"use client";

import { useEffect } from "react";
import { InlineAlert } from "../components/ui-states";

export default function Error({
  error,
  reset
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    if (process.env.NODE_ENV === "development") {
      console.error(error);
    }
  }, [error]);

  return (
    <div className="mx-auto max-w-3xl">
      <section className="panel rounded-3xl p-6 shadow-panel sm:p-8">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-outline">Error</p>
        <h1 className="mt-3 text-3xl font-bold text-ink sm:text-4xl">页面暂时无法打开</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-ink/70">
          数据同步时出现问题。你可以重试当前页面，或稍后回到学习控制台继续。
        </p>
        <div className="mt-6">
          <InlineAlert message={error.message || "请求失败，请稍后重试。"} />
        </div>
        <button className="ui-button-primary mt-6" onClick={reset} type="button">
          重试
        </button>
      </section>
    </div>
  );
}
