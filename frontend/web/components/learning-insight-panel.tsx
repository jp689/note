import { KnowledgeNode } from "@ai-study-notes/contracts";
import { buildLearningInsight } from "../lib/document-insights";
import { LuminaIcon } from "./lumina-icon";

function InsightList({
  title,
  icon,
  items,
  empty
}: {
  title: string;
  icon: string;
  items: string[];
  empty: string;
}) {
  return (
    <div className="rounded-2xl border border-outline-variant/25 bg-surface-container-lowest/80 p-4">
      <div className="flex items-center gap-2">
        <LuminaIcon className="text-[18px] text-primary" name={icon} />
        <p className="text-sm font-bold text-ink">{title}</p>
      </div>
      <ul className="mt-3 space-y-2 text-sm leading-5 text-ink/70">
        {(items.length ? items : [empty]).map((item) => (
          <li className="flex gap-2" key={item}>
            <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/70" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function LearningInsightPanel({
  nodes,
  analysisVersion
}: {
  nodes: KnowledgeNode[];
  analysisVersion: number;
}) {
  const insight = buildLearningInsight(nodes);
  const relationCount = nodes.reduce((total, node) => total + (node.relations?.length ?? 0), 0);

  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl bg-surface-container-lowest/80 p-4">
          <p className="text-xs font-bold text-outline">知识点</p>
          <p className="mt-2 text-3xl font-semibold text-ink">{nodes.length}</p>
        </div>
        <div className="rounded-2xl bg-surface-container-lowest/80 p-4">
          <p className="text-xs font-bold text-outline">关系</p>
          <p className="mt-2 text-3xl font-semibold text-ink">{relationCount}</p>
        </div>
        <div className="rounded-2xl bg-surface-container-lowest/80 p-4">
          <p className="text-xs font-bold text-outline">分析版本</p>
          <p className="mt-2 text-3xl font-semibold text-ink">v{analysisVersion}</p>
        </div>
      </div>

      <div className="rounded-2xl bg-primary/10 p-4">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary">学习主线</p>
        <h3 className="mt-2 text-xl font-semibold text-ink">{insight.focusTitle}</h3>
        <p className="mt-3 text-sm leading-6 text-ink/70">{insight.overview}</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <InsightList
          empty="等待后台生成核心要点。"
          icon="checklist"
          items={insight.takeaways}
          title="核心要点"
        />
        <InsightList
          empty="等待后台生成关系说明。"
          icon="hub"
          items={insight.relationHighlights}
          title="关系提示"
        />
        <InsightList
          empty="等待后台生成易错提醒。"
          icon="warning"
          items={insight.pitfalls}
          title="易错提醒"
        />
        <InsightList
          empty="等待后台生成复习问题。"
          icon="quiz"
          items={insight.reviewPrompts}
          title="复习问题"
        />
      </div>

      {insight.examples.length ? (
        <InsightList
          empty=""
          icon="psychology_alt"
          items={insight.examples}
          title="例子/应用"
        />
      ) : null}
    </div>
  );
}
