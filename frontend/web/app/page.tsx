import Link from "next/link";
import { MetricCard } from "../components/metric-card";
import { SectionCard } from "../components/section-card";
import { StatusPill } from "../components/status-pill";
import { EmptyState } from "../components/ui-states";
import { getServerDashboardData } from "../lib/api";
import { getServerToken } from "../lib/server-auth";

export default async function HomePage() {
  const token = getServerToken();
  const { documents, reviewQueue, report } = await getServerDashboardData(token);
  const readyCount = documents.filter((document) => document.status === "quiz_ready").length;
  const parsingCount = documents.filter((document) => document.status === "parsing").length;

  return (
    <div className="mx-auto grid max-w-[1280px] gap-8">
      <section className="panel rounded-3xl p-6 shadow-panel sm:p-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-outline">学习总览</p>
            <h1 className="mt-3 text-3xl font-bold text-ink sm:text-4xl">AI 自学笔记控制台</h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-ink/70">
              {token
                ? "上传 PDF 后，系统会生成结构化笔记、知识图谱、测评题和复习队列。"
                : "请先登录，再上传 PDF 并查看你的学习闭环。"}
            </p>
          </div>
          <Link className="ui-button-primary shrink-0" href={token ? "/upload" : "/login"}>
            {token ? "导入 PDF" : "登录"}
          </Link>
        </div>
      </section>

      <section className="grid gap-5 md:grid-cols-3">
        <MetricCard label="文档总数" value={String(documents.length)} caption="已导入并纳入学习空间的资料" />
        <MetricCard label="可测评文档" value={String(readyCount)} caption="已经生成题库，可直接进入测评" />
        <MetricCard label="处理中" value={String(parsingCount)} caption="正在抽取文本、知识点和题库" />
      </section>

      <section className="grid gap-8 xl:grid-cols-[1.2fr_0.8fr]">
        <SectionCard title="最近文档" eyebrow="资料">
          <div className="grid gap-4">
            {documents.length === 0 ? (
              <EmptyState
                actionHref="/upload"
                actionLabel="导入 PDF"
                description="先上传一份课程笔记或复习提纲，系统会自动生成结构化笔记、题库和复习队列。"
                icon="upload_file"
                title="还没有文档"
              />
            ) : (
              documents.slice(0, 6).map((document) => (
                <Link
                  className="ui-card-interactive grid gap-3"
                  href={`/documents/${document.id}`}
                  key={document.id}
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <h2 className="text-lg font-semibold text-ink">{document.title}</h2>
                    <StatusPill status={document.status} />
                  </div>
                  <p className="text-sm leading-6 text-ink/70">{document.progressLabel}</p>
                  <p className="text-xs uppercase tracking-[0.2em] text-ink/40">
                    {document.pageCount || 0} 页 · {((document.fileSize ?? 0) / 1024).toFixed(1)} KB
                  </p>
                </Link>
              ))
            )}
          </div>
        </SectionCard>

        <div className="grid gap-8">
          <SectionCard title="最近反馈" eyebrow="测评">
            {report ? (
              <Link className="ui-card-interactive block" href={`/reports/${report.id}`}>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-outline">综合得分</p>
                <p className="mt-3 text-5xl font-semibold text-ink">{report.score}</p>
                <p className="mt-4 text-sm leading-6 text-ink/70">
                  {report.weakPoints[0]?.reason ?? "本轮测评暂无明显薄弱点。"}
                </p>
              </Link>
            ) : (
              <EmptyState
                description="完成首轮测评后，系统会在这里显示得分、薄弱点和下一步复习建议。"
                icon="insights"
                title="暂无反馈报告"
              />
            )}
          </SectionCard>

          <SectionCard title="复习队列" eyebrow="待办">
            <div className="grid gap-3">
              {reviewQueue.length === 0 ? (
                <EmptyState
                  description="当测评发现薄弱知识点时，它们会自动进入这里。"
                  icon="fact_check"
                  title="暂无待复习知识点"
                />
              ) : (
                reviewQueue.slice(0, 4).map((item) => (
                  <div className="ui-card" key={item.knowledgeNodeId}>
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-semibold text-ink">{item.title}</p>
                      <span className="ui-chip">
                        {item.priority}
                      </span>
                    </div>
                    <p className="mt-2 text-sm leading-6 text-ink/70">{item.recommendation}</p>
                  </div>
                ))
              )}
            </div>
          </SectionCard>
        </div>
      </section>
    </div>
  );
}
