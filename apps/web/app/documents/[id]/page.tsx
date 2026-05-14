import Link from "next/link";
import { MindMapPreview } from "../../../components/mindmap-preview";
import { SectionCard } from "../../../components/section-card";
import { StatusPill } from "../../../components/status-pill";
import { getDocument, getDocumentQuiz, getKnowledge, getMindMap } from "../../../lib/api";

export default async function DocumentDetailPage({
  params
}: {
  params: { id: string };
}) {
  const [document, knowledge, graph, quiz] = await Promise.all([
    getDocument(params.id),
    getKnowledge(params.id),
    getMindMap(params.id),
    getDocumentQuiz(params.id)
  ]);

  return (
    <div className="space-y-8">
      <section className="panel rounded-[32px] p-8 shadow-panel">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-ink/45">Document Workspace</p>
            <h2 className="display-face mt-3 text-4xl text-ink">{document.title}</h2>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-ink/70">
              当前文档已进入 {document.progressLabel} 阶段。你可以在同一页面中核查原文、看结构化结果、浏览知识网络并进入测评。
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <StatusPill status={document.status} />
            <Link
              className="rounded-full bg-saffron px-5 py-3 text-sm font-medium text-white"
              href={`/quizzes/${quiz.id}`}
            >
              开始测评
            </Link>
          </div>
        </div>
      </section>

      <div className="grid gap-8">
        <SectionCard title="原始内容" eyebrow="View 01">
          <div className="rounded-[24px] bg-white/75 p-6">
            <p className="text-sm leading-7 text-ink/75">
              这里会嵌入原始 PDF 阅读器，并将知识点页码与段落高亮双向绑定。当前 scaffold
              使用概要占位，完整接线后会展示上传文件预览与页码跳转。
            </p>
          </div>
        </SectionCard>

        <SectionCard title="结构化笔记" eyebrow="View 02">
          <div className="grid gap-4 lg:grid-cols-2">
            {knowledge.map((node) => (
              <div className="rounded-[24px] bg-white/75 p-5" key={node.id}>
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-lg font-semibold text-ink">{node.title}</h3>
                  <span className="rounded-full bg-accent-soft px-3 py-1 text-xs font-medium text-saffron">
                    {node.difficulty}
                  </span>
                </div>
                <p className="mt-3 text-sm leading-6 text-ink/70">{node.summary}</p>
                <p className="mt-4 text-xs uppercase tracking-[0.25em] text-ink/40">
                  来源页码: {node.sourcePages.join(" / ")}
                </p>
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard title="知识点网络" eyebrow="View 03">
          <div className="grid gap-4 lg:grid-cols-2">
            {knowledge.map((node) => (
              <div className="rounded-[24px] border border-ink/10 bg-white/70 p-5" key={node.id}>
                <p className="text-sm font-semibold text-ink">{node.title}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {node.tags.map((tag) => (
                    <span
                      className="rounded-full bg-mist px-3 py-1 text-xs font-medium text-ink/70"
                      key={tag}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
                <div className="mt-4 space-y-2 text-sm text-ink/70">
                  {node.relations.map((relation) => (
                    <p key={`${node.id}-${relation.targetId}`}>
                      关系: {relation.label} {"->"} {relation.targetId}
                    </p>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard title="思维导图" eyebrow="View 04">
          <MindMapPreview graph={graph} />
        </SectionCard>
      </div>
    </div>
  );
}
