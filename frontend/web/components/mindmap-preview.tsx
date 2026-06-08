"use client";

import { MindMapGraph } from "@ai-study-notes/contracts";
import { useMemo, useState } from "react";
import ReactFlow, {
  Background,
  Controls,
  Edge,
  MarkerType,
  MiniMap,
  Node
} from "reactflow";
import "reactflow/dist/style.css";

function nodeColor(group: string) {
  switch (group) {
    case "root":
      return "#d87233";
    case "chapter":
      return "#1f6b6c";
    case "practice":
      return "#7c8d48";
    default:
      return "#102134";
  }
}

export function MindMapPreview({ graph }: { graph: MindMapGraph }) {
  const [selectedId, setSelectedId] = useState(graph.nodes[0]?.id ?? "");
  const selected = graph.nodes.find((node) => node.id === selectedId) ?? graph.nodes[0];

  const nodes = useMemo<Node[]>(
    () =>
      graph.nodes.map((node, index) => {
        const level = node.level ?? (node.group === "root" ? 0 : node.group === "chapter" ? 1 : 2);
        const sameLevelIndex = graph.nodes
          .slice(0, index)
          .filter((candidate) => (candidate.level ?? (candidate.group === "root" ? 0 : candidate.group === "chapter" ? 1 : 2)) === level)
          .length;
        return {
        id: node.id,
        data: {
          label: (
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-ink/45">
                {node.group}
              </p>
              <p className="mt-1 text-sm font-semibold text-ink">{node.label}</p>
              {node.sourcePages?.length ? <p className="mt-1 text-xs text-ink/50">P. {node.sourcePages.join(" / ")}</p> : null}
            </div>
          ),
          group: node.group
        },
        position: {
          x: level * 280,
          y: sameLevelIndex * 130 + (level === 0 ? 100 : 0)
        },
        style: {
          border: `1px solid ${nodeColor(node.group)}20`,
          borderRadius: 16,
          background: `${nodeColor(node.group)}12`,
          width: 220,
          padding: 12
        }
      };
      }),
    [graph.nodes]
  );

  const edges = useMemo<Edge[]>(
    () =>
      graph.edges.map((edge, index) => ({
        id: `${edge.source}-${edge.target}-${index}`,
        source: edge.source,
        target: edge.target,
        label: edge.label,
        animated: true,
        markerEnd: { type: MarkerType.ArrowClosed, color: "#1f6b6c" },
        style: { stroke: "#1f6b6c", strokeWidth: Math.max(1.5, (edge.strength ?? 0.6) * 2.2) },
        labelStyle: { fill: "#102134", fontSize: 12 }
      })),
    [graph.edges]
  );

  if (!graph.nodes.length) {
    return (
      <div className="rounded-2xl border border-dashed border-outline-variant/50 bg-surface-container-lowest/80 p-8 text-center">
        <p className="font-semibold text-ink">思维导图正在生成</p>
        <p className="mt-2 text-sm text-on-surface-variant">后台会按章节和概念层级重建图谱。</p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[1fr_280px]">
      <div className="h-[560px] overflow-hidden rounded-2xl border border-outline-variant/35 bg-surface-container-lowest/70">
      <ReactFlow fitView nodes={nodes} edges={edges} onNodeClick={(_, node) => setSelectedId(node.id)}>
        <MiniMap nodeColor={(node) => nodeColor(String(node.data?.group ?? "concept"))} />
        <Controls />
        <Background color="#b7c5c3" gap={18} />
      </ReactFlow>
      </div>
      <aside className="rounded-2xl border border-outline-variant/35 bg-surface-container-lowest/80 p-5">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-outline">图谱详情</p>
        <h3 className="mt-2 text-lg font-semibold text-ink">{selected?.label ?? "未选择节点"}</h3>
        <p className="mt-3 text-sm leading-6 text-ink/70">{selected?.summary || "点击图谱节点查看摘要、来源页码和层级信息。"}</p>
        <div className="mt-5 grid gap-2 text-sm text-ink/70">
          <p>层级：{selected?.level ?? "-"}</p>
          <p>类型：{selected?.group ?? "-"}</p>
          <p>页码：{selected?.sourcePages?.join(" / ") || "待补充"}</p>
        </div>
        <div className="mt-6 flex flex-wrap gap-2 text-xs">
          {["root", "chapter", "concept", "practice"].map((group) => (
            <span className="rounded-full px-3 py-1 font-semibold" style={{ background: `${nodeColor(group)}18`, color: nodeColor(group) }} key={group}>
              {group}
            </span>
          ))}
        </div>
      </aside>
    </div>
  );
}
