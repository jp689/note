import Link from "next/link";
import { SectionCard } from "../../components/section-card";
import { searchKnowledge } from "../../lib/api";

export default async function KnowledgePage() {
  const results = await searchKnowledge();

  return (
    <div className="space-y-8">
      <SectionCard title="知识库检索" eyebrow="Knowledge Base">
        <div className="rounded-[26px] bg-white/75 p-5">
          <div className="flex flex-col gap-4 lg:flex-row">
            <input
              className="flex-1 rounded-full border border-ink/10 bg-white px-5 py-3 text-sm outline-none"
              defaultValue="泛化 / 正则化 / 梯度下降"
              placeholder="搜索关键词或自然语言问题"
              readOnly
            />
            <button className="rounded-full bg-ink px-5 py-3 text-sm font-medium text-paper">
              搜索
            </button>
          </div>
          <p className="mt-3 text-sm leading-6 text-ink/70">
            MVP 采用关键词检索与语义检索双路召回，结果可直接回跳到知识点和原文页码。
          </p>
        </div>
      </SectionCard>

      <div className="grid gap-4">
        {results.map((result) => (
          <div className="panel rounded-[26px] p-6 shadow-panel" key={result.node.id}>
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-3">
                  <h3 className="text-xl font-semibold text-ink">{result.node.title}</h3>
                  <span className="rounded-full bg-teal-soft px-3 py-1 text-xs font-medium text-teal-800">
                    {result.matchType}
                  </span>
                </div>
                <p className="mt-3 text-sm leading-6 text-ink/70">{result.snippet}</p>
              </div>
              <Link
                className="rounded-full border border-ink/10 bg-white px-5 py-3 text-sm font-medium text-ink"
                href={`/documents/${result.node.documentId}`}
              >
                回到文档
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

