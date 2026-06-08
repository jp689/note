import Link from "next/link";
import { ReviewCompleteButton } from "../../components/review-complete-button";
import { SectionCard } from "../../components/section-card";
import { EmptyState } from "../../components/ui-states";
import { getLatestReport, getReviewQueue } from "../../lib/api";
import { getServerToken } from "../../lib/server-auth";

export default async function ReviewPage() {
  const token = getServerToken();
  const [report, queue] = await Promise.all([getLatestReport(token), getReviewQueue(token)]);

  return (
    <div className="mx-auto grid max-w-[1180px] gap-8">
      <section className="panel rounded-3xl p-6 shadow-panel sm:p-8">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-outline">复习</p>
        <h1 className="mt-3 text-3xl font-bold text-ink sm:text-4xl">反馈与复习队列</h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-ink/70">
          汇总最近一次测评反馈，并把薄弱知识点沉淀到复习队列中。
        </p>
      </section>

      <section className="grid gap-8 xl:grid-cols-[0.9fr_1.1fr]">
        <SectionCard title="最近反馈" eyebrow="测评">
          {report ? (
            <Link className="ui-card-interactive block" href={`/reports/${report.id}`}>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-outline">综合得分</p>
              <p className="mt-3 text-6xl font-semibold text-ink">{report.score}</p>
              <div className="mt-5 grid gap-3">
                {report.weakPoints.slice(0, 2).map((point) => (
                  <div className="rounded-2xl bg-mist/60 p-4" key={point.knowledgeNodeId}>
                    <p className="font-semibold text-ink">{point.title}</p>
                    <p className="mt-2 text-sm leading-6 text-ink/70">{point.reason}</p>
                  </div>
                ))}
              </div>
            </Link>
          ) : (
            <EmptyState
              description="完成一次测评后，这里会展示最近得分和薄弱知识点。"
              icon="insights"
              title="暂无反馈"
            />
          )}
        </SectionCard>

        <SectionCard title="待复习知识点" eyebrow="队列">
          <div className="grid gap-4">
            {queue.length === 0 ? (
              <EmptyState
                actionHref="/upload"
                actionLabel="导入 PDF"
                description="完成测评后，薄弱知识点会自动进入复习队列。"
                icon="fact_check"
                title="当前没有待复习项"
              />
            ) : (
              queue.map((item) => (
                <article className="ui-card" key={item.knowledgeNodeId}>
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-3">
                        <h2 className="text-lg font-semibold text-ink">{item.title}</h2>
                        <span className="ui-chip">
                          {item.priority}
                        </span>
                      </div>
                      <p className="mt-3 text-sm leading-6 text-ink/70">{item.recommendation}</p>
                    </div>
                    <ReviewCompleteButton knowledgeNodeId={item.knowledgeNodeId} />
                  </div>
                </article>
              ))
            )}
          </div>
        </SectionCard>
      </section>
    </div>
  );
}
