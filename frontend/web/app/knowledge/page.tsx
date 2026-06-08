import Link from "next/link";
import { SectionCard } from "../../components/section-card";
import { StatusPill } from "../../components/status-pill";
import { EmptyState } from "../../components/ui-states";
import { getServerDashboardData, searchKnowledge } from "../../lib/api";
import { getServerToken } from "../../lib/server-auth";

export default async function KnowledgePage({
  searchParams
}: {
  searchParams?: { q?: string };
}) {
  const token = getServerToken();
  const query = searchParams?.q ?? "";
  const [{ documents }, results] = await Promise.all([
    getServerDashboardData(token),
    searchKnowledge(query, token)
  ]);

  return (
    <div className="mx-auto grid max-w-[1280px] gap-8">
      <section className="panel rounded-3xl p-6 shadow-panel sm:p-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-outline">知识库</p>
            <h1 className="mt-3 text-3xl font-bold text-ink sm:text-4xl">知识库检索</h1>
            <p className="mt-3 text-sm leading-6 text-ink/70">
              同时召回关键词命中和语义相近的知识点，并保留来源文档与页码。
            </p>
          </div>
          <form className="flex w-full max-w-xl flex-col gap-3 sm:flex-row" action="/knowledge">
            <label className="sr-only" htmlFor="knowledge-search">
              搜索知识点
            </label>
            <input
              aria-label="搜索知识点、标签或概念"
              className="ui-input min-w-0 flex-1"
              defaultValue={query}
              id="knowledge-search"
              name="q"
              placeholder="搜索知识点、标签或概念"
            />
            <button className="ui-button-primary sm:w-auto" type="submit">
              搜索
            </button>
          </form>
        </div>
      </section>

      <section className="grid gap-8 xl:grid-cols-[0.9fr_1.1fr]">
        <SectionCard title="文档导航" eyebrow="资料">
          <div className="grid gap-4">
            {documents.length === 0 ? (
              <EmptyState
                actionHref="/upload"
                actionLabel="导入 PDF"
                description="上传并处理 PDF 后，文档会在这里作为检索入口。"
                icon="folder_shared"
                title="暂无文档"
              />
            ) : (
              documents.map((document) => (
                <Link className="ui-card-interactive block" href={`/documents/${document.id}`} key={document.id}>
                  <div className="flex items-center justify-between gap-3">
                    <h2 className="font-semibold text-ink">{document.title}</h2>
                    <StatusPill status={document.status} />
                  </div>
                  <p className="mt-3 text-sm leading-6 text-ink/70">{document.progressLabel}</p>
                </Link>
              ))
            )}
          </div>
        </SectionCard>

        <SectionCard title="检索结果" eyebrow="结果">
          <div className="grid gap-4">
            {results.length === 0 ? (
              <EmptyState
                actionHref="/upload"
                actionLabel="上传资料"
                description={query ? "换一个关键词再试，或检查资料是否已经完成处理。" : "输入关键词开始检索，或先上传一份资料建立知识库。"}
                icon="search"
                title={query ? "没有找到结果" : "开始一次检索"}
              />
            ) : (
              results.map((result) => (
                <article className="ui-card" key={`${result.node.id}-${result.matchType}`}>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <h2 className="text-lg font-semibold text-ink">{result.node.title}</h2>
                    <span className="ui-chip">
                      {result.matchType} · {Math.round((result.score ?? 0) * 100)}%
                    </span>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-ink/70">{result.snippet}</p>
                  <p className="mt-4 text-xs uppercase tracking-[0.2em] text-ink/40">
                    {result.documentTitle} · 页码 {result.sourcePages.join(" / ") || "待补充"}
                  </p>
                </article>
              ))
            )}
          </div>
        </SectionCard>
      </section>
    </div>
  );
}
