import Link from "next/link";
import { KnowledgeNetwork, StructuredNotes } from "../../../components/knowledge-workbench";
import { MindMapPreview } from "../../../components/mindmap-preview";
import { PdfPreview } from "../../../components/pdf-preview";
import { SectionCard } from "../../../components/section-card";
import { StatusPill } from "../../../components/status-pill";
import { EmptyState } from "../../../components/ui-states";
import { getDocument, getDocumentQuiz, getKnowledge, getMindMap } from "../../../lib/api";
import { getServerToken } from "../../../lib/server-auth";

export default async function DocumentDetailPage({
  params
}: {
  params: { id: string };
}) {
  const token = getServerToken();
  const [document, knowledge, graph, quiz] = await Promise.all([
    getDocument(params.id, token),
    getKnowledge(params.id, token),
    getMindMap(params.id, token),
    getDocumentQuiz(params.id, token)
  ]);

  return (
    <div className="space-y-8">
      <section className="panel rounded-3xl p-6 shadow-panel sm:p-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-outline">文档</p>
            <h2 className="display-face mt-3 break-words text-3xl font-bold text-ink sm:text-4xl">{document.title}</h2>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-ink/70">
              当前文档已进入 {document.progressLabel} 阶段。你可以在同一页面中核查原文、看结构化结果、浏览知识网络并进入测评。
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <StatusPill status={document.status} />
            <Link
              className="ui-button-primary"
              href={`/quizzes/${quiz.id}`}
            >
              开始测评
            </Link>
          </div>
        </div>
      </section>

      <div className="grid gap-8 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
        <SectionCard title="原始内容" eyebrow="PDF">
          <PdfPreview documentId={params.id} documentTitle={document.title} />
        </SectionCard>

        <SectionCard title="学习洞察" eyebrow="AI">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl bg-surface-container-lowest/80 p-4">
              <p className="text-xs font-bold text-outline">知识点</p>
              <p className="mt-2 text-3xl font-semibold text-ink">{knowledge.length}</p>
            </div>
            <div className="rounded-2xl bg-surface-container-lowest/80 p-4">
              <p className="text-xs font-bold text-outline">关系</p>
              <p className="mt-2 text-3xl font-semibold text-ink">{knowledge.reduce((total, node) => total + node.relations.length, 0)}</p>
            </div>
            <div className="rounded-2xl bg-surface-container-lowest/80 p-4">
              <p className="text-xs font-bold text-outline">分析版本</p>
              <p className="mt-2 text-3xl font-semibold text-ink">v{document.analysisVersion}</p>
            </div>
          </div>
          <p className="mt-5 text-sm leading-6 text-ink/70">
            右侧内容会把 PDF 拆成章节、知识点、关系和复习提示。旧文档重处理完成前会先用兼容数据展示。
          </p>
        </SectionCard>
      </div>

      <div className="grid gap-8">
        <SectionCard title="结构化笔记" eyebrow="笔记">
          {knowledge.length === 0 ? (
            <EmptyState
              description="文档处理完成后，结构化知识点会显示在这里。"
              icon="description"
              title="暂无结构化笔记"
            />
          ) : (
          <StructuredNotes nodes={knowledge} />
          )}
        </SectionCard>

        <SectionCard title="知识点网络" eyebrow="关系">
          {knowledge.length === 0 ? (
            <EmptyState
              description="系统抽取出知识点关系后，会在这里列出标签与节点关系。"
              icon="account_tree"
              title="暂无知识点关系"
            />
          ) : (
          <KnowledgeNetwork nodes={knowledge} />
          )}
        </SectionCard>

        <SectionCard title="思维导图" eyebrow="图谱">
          <MindMapPreview graph={graph} />
        </SectionCard>
      </div>
    </div>
  );
}
