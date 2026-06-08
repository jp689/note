import { FeedbackChart } from "../../../components/feedback-chart";
import { SectionCard } from "../../../components/section-card";
import { EmptyState } from "../../../components/ui-states";
import { getReport, getReviewQueue } from "../../../lib/api";
import { getServerToken } from "../../../lib/server-auth";

export default async function ReportPage({
  params
}: {
  params: { id: string };
}) {
  const token = getServerToken();
  const [report, queue] = await Promise.all([getReport(params.id, token), getReviewQueue(token)]);

  return (
    <div className="space-y-8">
      <section className="grid gap-8 xl:grid-cols-[1.05fr_0.95fr]">
        <SectionCard title="测评反馈报告" eyebrow="报告">
          <div className="ui-card">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-outline">综合得分</p>
            <p className="mt-3 text-6xl font-semibold text-ink">{report.score}</p>
            <div className="mt-6 space-y-4">
              {report.strengths.map((strength) => (
                <div className="rounded-2xl bg-mist/60 px-4 py-3 text-sm text-ink" key={strength}>
                  {strength}
                </div>
              ))}
            </div>
          </div>
        </SectionCard>

        <SectionCard title="掌握度曲线" eyebrow="数据">
          <FeedbackChart report={report} />
        </SectionCard>
      </section>

      <section className="grid gap-8 xl:grid-cols-[1.05fr_0.95fr]">
        <SectionCard title="薄弱知识点" eyebrow="弱项">
          <div className="grid gap-4">
            {report.weakPoints.length === 0 ? (
              <EmptyState
                description="本轮测评没有发现需要优先处理的薄弱点。"
                icon="verified"
                title="暂无薄弱知识点"
              />
            ) : (
            report.weakPoints.map((weakPoint) => (
              <div className="ui-card" key={weakPoint.knowledgeNodeId}>
                <h3 className="text-lg font-semibold text-ink">{weakPoint.title}</h3>
                <p className="mt-3 text-sm leading-6 text-ink/70">错误原因: {weakPoint.reason}</p>
                <p className="mt-2 text-sm leading-6 text-ink/70">建议动作: {weakPoint.action}</p>
              </div>
            ))
            )}
          </div>
        </SectionCard>

        <SectionCard title="下一轮复习" eyebrow="安排">
          <div className="grid gap-4">
            {queue.length === 0 ? (
              <EmptyState
                description="新的复习项会根据测评反馈自动生成。"
                icon="fact_check"
                title="暂无复习安排"
              />
            ) : (
            queue.map((item) => (
              <div className="ui-card" key={item.knowledgeNodeId}>
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-lg font-semibold text-ink">{item.title}</h3>
                  <span className="ui-chip">
                    {item.priority}
                  </span>
                </div>
                <p className="mt-3 text-sm leading-6 text-ink/70">{item.recommendation}</p>
              </div>
            ))
            )}
          </div>
        </SectionCard>
      </section>
    </div>
  );
}
