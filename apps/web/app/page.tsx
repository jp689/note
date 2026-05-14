import Link from "next/link";
import { MetricCard } from "../components/metric-card";
import { SectionCard } from "../components/section-card";
import { StatusPill } from "../components/status-pill";
import { getDashboardData } from "../lib/api";

export default async function HomePage() {
  const data = await getDashboardData();

  return (
    <div className="space-y-8">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="已导入文档" value="12" caption="其中 9 份已完成知识结构化与首轮题库生成。" />
        <MetricCard label="知识节点" value="248" caption="按章节、概念、公式、错题线索自动聚类。" />
        <MetricCard label="本周得分" value={`${data.report.score}`} caption="客观题和 AI rubric 评分汇总后的当前均分。" />
        <MetricCard label="待复习" value={`${data.reviewQueue.length}`} caption="按错因、时间窗和掌握度动态排序。" />
      </section>

      <section className="grid gap-8 xl:grid-cols-[1.35fr_0.95fr]">
        <SectionCard
          title="学习控制台"
          eyebrow="Dashboard"
          action={
            <Link
              className="rounded-full bg-saffron px-4 py-2 text-sm font-medium text-white"
              href="/upload"
            >
              上传新笔记
            </Link>
          }
        >
          <div className="grid gap-4">
            {data.documents.map((document) => (
              <div
                className="rounded-[24px] border border-ink/10 bg-white/75 p-5"
                key={document.id}
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-[0.25em] text-ink/40">
                      PDF 笔记项目
                    </p>
                    <h3 className="mt-2 text-xl font-semibold text-ink">{document.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-ink/70">
                      {document.pageCount} 页，{document.progressLabel}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <StatusPill status={document.status} />
                    <Link
                      className="rounded-full border border-ink/10 bg-white px-4 py-2 text-sm font-medium text-ink"
                      href={`/documents/${document.id}`}
                    >
                      查看详情
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard title="复习引擎" eyebrow="Review Queue">
          <div className="grid gap-4">
            {data.reviewQueue.map((item) => (
              <div className="rounded-[24px] bg-white/75 p-5" key={item.knowledgeNodeId}>
                <div className="flex items-center justify-between gap-4">
                  <h3 className="text-lg font-semibold text-ink">{item.title}</h3>
                  <span className="rounded-full bg-teal-soft px-3 py-1 text-xs font-medium text-teal-800">
                    {item.priority}
                  </span>
                </div>
                <p className="mt-3 text-sm leading-6 text-ink/70">{item.recommendation}</p>
              </div>
            ))}

            <div className="rounded-[24px] bg-ink p-5 text-paper">
              <p className="text-xs uppercase tracking-[0.28em] text-paper/55">Next Loop</p>
              <p className="mt-3 text-lg font-semibold">今晚 20:00 自动生成下一轮 8 题混合测评</p>
              <p className="mt-2 text-sm leading-6 text-paper/75">
                题目将优先覆盖泛化能力、正则化和错题回放相关知识点。
              </p>
            </div>
          </div>
        </SectionCard>
      </section>
    </div>
  );
}

