import { KnowledgeNode, KnowledgeRelation } from "@ai-study-notes/contracts";

export interface KnowledgeChapterGroup {
  chapterTitle: string;
  sourcePages: number[];
  nodes: KnowledgeNode[];
}

export interface RelationSummaryItem {
  sourceId: string;
  sourceTitle: string;
  targetId: string;
  targetTitle: string;
  relation: KnowledgeRelation;
}

export interface LearningInsight {
  focusTitle: string;
  overview: string;
  takeaways: string[];
  examples: string[];
  pitfalls: string[];
  reviewPrompts: string[];
  relationHighlights: string[];
}

export function groupKnowledgeByChapter(nodes: KnowledgeNode[]): KnowledgeChapterGroup[] {
  const groups = new Map<string, KnowledgeChapterGroup>();
  for (const node of nodes) {
    const chapterTitle = node.chapterTitle?.trim() || "未归类章节";
    const group = groups.get(chapterTitle) ?? {
      chapterTitle,
      sourcePages: [],
      nodes: []
    };
    group.nodes.push(node);
    group.sourcePages = Array.from(new Set([...group.sourcePages, ...(node.sourcePages ?? [])])).sort(
      (left, right) => left - right
    );
    groups.set(chapterTitle, group);
  }
  return Array.from(groups.values());
}

export function buildRelationSummary(selectedNodeId: string, nodes: KnowledgeNode[]): {
  incoming: RelationSummaryItem[];
  outgoing: RelationSummaryItem[];
} {
  const byId = new Map(nodes.map((node) => [node.id, node]));
  const incoming: RelationSummaryItem[] = [];
  const outgoing: RelationSummaryItem[] = [];

  for (const node of nodes) {
    for (const relation of node.relations ?? []) {
      const target = byId.get(relation.targetId);
      if (!target) continue;
      const item = {
        sourceId: node.id,
        sourceTitle: node.title,
        targetId: target.id,
        targetTitle: target.title,
        relation
      };
      if (relation.targetId === selectedNodeId) {
        incoming.push(item);
      }
      if (node.id === selectedNodeId) {
        outgoing.push(item);
      }
    }
  }

  return { incoming, outgoing };
}

function uniqueStrings(items: Array<string | undefined | null>): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const item of items) {
    const value = item?.trim();
    if (!value || seen.has(value)) continue;
    seen.add(value);
    result.push(value);
  }
  return result;
}

export function buildLearningInsight(nodes: KnowledgeNode[]): LearningInsight {
  const ranked = [...nodes].sort((left, right) => {
    const leftScore = (left.relations?.length ?? 0) + (left.keyTakeaways?.length ?? 0);
    const rightScore = (right.relations?.length ?? 0) + (right.keyTakeaways?.length ?? 0);
    return rightScore - leftScore;
  });
  const focus = ranked[0];
  const focusTitle = focus?.title ?? "等待生成";
  const overview = focus
    ? `本轮分析以「${focus.title}」为主线：${focus.summary}`
    : "文档还没有可展示的知识点，后台处理完成后会在这里生成学习主线、复习要点和易错提醒。";

  const takeaways = uniqueStrings(nodes.flatMap((node) => node.keyTakeaways ?? [])).slice(0, 5);
  const examples = uniqueStrings(nodes.flatMap((node) => node.examples ?? [])).slice(0, 3);
  const pitfalls = uniqueStrings(nodes.flatMap((node) => node.pitfalls ?? [])).slice(0, 4);
  const reviewPrompts = uniqueStrings(nodes.map((node) => node.reviewPrompt)).slice(0, 4);
  const byId = new Map(nodes.map((node) => [node.id, node]));
  const relationHighlights = uniqueStrings(
    nodes.flatMap((node) =>
      (node.relations ?? []).map((relation) => {
        const target = byId.get(relation.targetId);
        const targetTitle = target?.title ?? relation.targetId;
        const reason = relation.reason || relation.label;
        return `${node.title} -> ${targetTitle}: ${reason}`;
      })
    )
  ).slice(0, 4);

  return {
    focusTitle,
    overview,
    takeaways: takeaways.length ? takeaways : nodes.slice(0, 3).map((node) => node.summary),
    examples,
    pitfalls,
    reviewPrompts,
    relationHighlights
  };
}
