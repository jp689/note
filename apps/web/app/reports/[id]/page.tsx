import { FeedbackChart } from "../../../components/feedback-chart";
import { SectionCard } from "../../../components/section-card";
import { getReport, getReviewQueue } from "../../../lib/api";

export default async function ReportPage({
  params
}: {
  params: { id: string };
}) {
  const [report, queue] = await Promise.all([getReport(params.id), getReviewQueue()]);

  return (
    <div className="space-y-8">
      <section className="grid gap-8 xl:grid-cols-[1.05fr_0.95fr]">
        <SectionCard title="测评反馈报告" eyebrow="Feedback Report">
          <div className="rounded-[28px] bg-white/75 p-6">
            <p className="text-xs uppercase tracking-[0.25em] text-ink/40">综合得分</p>
            <p className="mt-3 text-6xl font-semibold text-ink">{report.score}</p>
            <div className="mt-6 space-y-4">
              {report.strengths.map((strength) => (
                <div className="rounded-[20px] bg-mist/60 px-4 py-3 text-sm text-ink" key={strength}>
                  {strength}
                </div>
              ))}
            </div>
          </div>
        </SectionCard>

        <SectionCard title="掌握度曲线" eyebrow="Analytics">
          <FeedbackChart report={report} />
        </SectionCard>
      </section>

      <section className="grid gap-8 xl:grid-cols-[1.05fr_0.95fr]">
        <SectionCard title="薄弱知识点" eyebrow="Weak Points">
          <div className="grid gap-4">
            {report.weakPoints.map((weakPoint) => (
              <div className="rounded-[24px] bg-white/75 p-5" key={weakPoint.knowledgeNodeId}>
                <h3 className="text-lg font-semibold text-ink">{weakPoint.title}</h3>
                <p className="mt-3 text-sm leading-6 text-ink/70">错误原因: {weakPoint.reason}</p>
                <p className="mt-2 text-sm leading-6 text-ink/70">建议动作: {weakPoint.action}</p>
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard title="下一轮复习" eyebrow="Review Queue">
          <div className="grid gap-4">
            {queue.map((item) => (
              <div className="rounded-[24px] bg-white/75 p-5" key={item.knowledgeNodeId}>
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-lg font-semibold text-ink">{item.title}</h3>
                  <span className="rounded-full bg-accent-soft px-3 py-1 text-xs font-medium text-saffron">
                    {item.priority}
                  </span>
                </div>
                <p className="mt-3 text-sm leading-6 text-ink/70">{item.recommendation}</p>
              </div>
            ))}
          </div>
        </SectionCard>
      </section>
    </div>
  );
}
