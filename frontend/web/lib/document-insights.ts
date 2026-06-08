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
