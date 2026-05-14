"use client";

import { MindMapGraph } from "@ai-study-notes/contracts";
import { useMemo } from "react";
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
  const nodes = useMemo<Node[]>(
    () =>
      graph.nodes.map((node, index) => ({
        id: node.id,
        data: {
          label: (
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-ink/45">
                {node.group}
              </p>
              <p className="mt-1 text-sm font-semibold text-ink">{node.label}</p>
            </div>
          ),
          group: node.group
        },
        position: {
          x: (index % 3) * 230 + (node.group === "root" ? 130 : 0),
          y: Math.floor(index / 3) * 160 + (node.group === "concept" ? 50 : 0)
        },
        style: {
          border: `1px solid ${nodeColor(node.group)}20`,
          borderRadius: 20,
          background: `${nodeColor(node.group)}12`,
          width: 190,
          padding: 12
        }
      })),
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
        style: { stroke: "#1f6b6c", strokeWidth: 1.5 },
        labelStyle: { fill: "#102134", fontSize: 12 }
      })),
    [graph.edges]
  );

  return (
    <div className="h-[420px] overflow-hidden rounded-[24px] border border-ink/10 bg-white/65">
      <ReactFlow fitView nodes={nodes} edges={edges}>
        <MiniMap nodeColor={(node) => nodeColor(String(node.data?.group ?? "concept"))} />
        <Controls />
        <Background color="#b7c5c3" gap={18} />
      </ReactFlow>
    </div>
  );
}

