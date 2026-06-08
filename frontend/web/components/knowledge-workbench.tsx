"use client";

import { KnowledgeNode } from "@ai-study-notes/contracts";
import { useMemo, useState } from "react";
import { buildRelationSummary, groupKnowledgeByChapter } from "../lib/document-insights";
import { LuminaIcon } from "./lumina-icon";

function formatPages(pages: number[] = []) {
  return pages.length ? `P. ${pages.join(" / ")}` : "页码待补充";
}

function difficultyLabel(value: string) {
  if (value === "advanced") return "进阶";
  if (value === "intermediate") return "中阶";
  return "基础";
}

export function StructuredNotes({ nodes }: { nodes: KnowledgeNode[] }) {
  const groups = useMemo(() => groupKnowledgeByChapter(nodes), [nodes]);

  if (!groups.length) {
    return (
      <div className="rounded-2xl border border-dashed border-outline-variant/50 bg-surface-container-lowest/80 p-8 text-center">
        <p className="font-semibold text-ink">结构化笔记正在生成</p>
        <p className="mt-2 text-sm text-on-surface-variant">后台会把 PDF 拆成章节、要点、例子和复习提示。</p>
      </div>
    );
  }

  return (
    <div className="grid gap-5">
      {groups.map((group, index) => (
        <section className="rounded-2xl border border-outline-variant/35 bg-surface-container-lowest/80 p-5" key={group.chapterTitle}>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-outline">Chapter {index + 1}</p>
              <h3 className="mt-2 text-xl font-semibold text-ink">{group.chapterTitle}</h3>
            </div>
            <span className="ui-chip">{formatPages(group.sourcePages)}</span>
          </div>

          <div className="mt-5 grid gap-4">
            {group.nodes.map((node) => (
              <article className="rounded-2xl border border-outline-variant/25 bg-surface-container-low/55 p-4" key={node.id}>
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div className="min-w-0">
                    <h4 className="text-lg font-semibold text-ink">{node.title}</h4>
                    <p className="mt-2 text-sm leading-6 text-ink/70">{node.summary}</p>
                  </div>
                  <div className="flex shrink-0 flex-wrap gap-2">
                    <span className="ui-chip">{difficultyLabel(node.difficulty)}</span>
                    <span className="ui-chip">{formatPages(node.sourcePages)}</span>
                  </div>
                </div>

                <div className="mt-4 grid gap-3 md:grid-cols-3">
                  <div className="rounded-xl bg-surface-container-lowest/80 p-3">
                    <p className="text-xs font-bold text-primary">核心要点</p>
                    <ul className="mt-2 space-y-1 text-sm leading-5 text-ink/70">
                      {(node.keyTakeaways?.length ? node.keyTakeaways : [node.summary]).slice(0, 3).map((item) => (
                        <li key={item}>· {item}</li>
                      ))}
                    </ul>
                  </div>
                  <div className="rounded-xl bg-surface-container-lowest/80 p-3">
                    <p className="text-xs font-bold text-teal">例子</p>
                    <p className="mt-2 text-sm leading-5 text-ink/70">{node.examples?.[0] ?? "结合原文页码补一个自己的例子。"}</p>
                  </div>
                  <div className="rounded-xl bg-surface-container-lowest/80 p-3">
                    <p className="text-xs font-bold text-error">易错点</p>
                    <p className="mt-2 text-sm leading-5 text-ink/70">{node.pitfalls?.[0] ?? "复习时注意概念边界和适用条件。"}</p>
                  </div>
                </div>

                <div className="mt-4 flex flex-col gap-3 rounded-xl bg-primary/10 p-3 text-sm text-primary sm:flex-row sm:items-center sm:justify-between">
                  <span className="font-semibold">{node.reviewPrompt || `闭卷复述「${node.title}」。`}</span>
                  {typeof node.confidence === "number" ? <span className="shrink-0">置信度 {Math.round(node.confidence * 100)}%</span> : null}
                </div>
              </article>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

export function KnowledgeNetwork({ nodes }: { nodes: KnowledgeNode[] }) {
  const [selectedId, setSelectedId] = useState(nodes[0]?.id ?? "");
  const selected = nodes.find((node) => node.id === selectedId) ?? nodes[0];
  const relationSummary = useMemo(
    () => buildRelationSummary(selected?.id ?? "", nodes),
    [nodes, selected?.id]
  );

  if (!selected) {
    return (
      <div className="rounded-2xl border border-dashed border-outline-variant/50 bg-surface-container-lowest/80 p-8 text-center">
        <p className="font-semibold text-ink">知识点网络正在生成</p>
        <p className="mt-2 text-sm text-on-surface-variant">完成后会显示节点摘要、关系原因和关系强度。</p>
      </div>
    );
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[0.85fr_1.15fr]">
      <div className="grid max-h-[560px] gap-3 overflow-y-auto pr-1">
        {nodes.map((node) => (
          <button
            className={`rounded-2xl border p-4 text-left transition ${
              node.id === selected.id
                ? "border-primary/50 bg-primary/10 shadow-soft"
                : "border-outline-variant/35 bg-surface-container-lowest/80 hover:border-primary/30"
            }`}
            key={node.id}
            onClick={() => setSelectedId(node.id)}
            type="button"
          >
            <div className="flex items-center justify-between gap-3">
              <p className="font-semibold text-ink">{node.title}</p>
              <span className="text-xs font-semibold text-primary">{node.relations?.length ?? 0} 关系</span>
            </div>
            <p className="mt-2 line-clamp-2 text-sm leading-5 text-ink/65">{node.summary}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {(node.tags ?? []).slice(0, 3).map((tag) => (
                <span className="rounded-full bg-mist px-2.5 py-1 text-xs text-ink/70" key={tag}>{tag}</span>
              ))}
            </div>
          </button>
        ))}
      </div>

      <div className="rounded-2xl border border-outline-variant/35 bg-surface-container-lowest/80 p-5">
        <div className="flex items-start gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <LuminaIcon className="text-[24px]" name="hub" />
          </span>
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-outline">Selected Node</p>
            <h3 className="mt-1 text-2xl font-semibold text-ink">{selected.title}</h3>
            <p className="mt-2 text-sm leading-6 text-ink/70">{selected.summary}</p>
          </div>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <RelationList title="前置/支撑它" items={relationSummary.incoming} empty="暂无入向关系" />
          <RelationList title="它指向/延展" items={relationSummary.outgoing} empty="暂无出向关系" />
        </div>
      </div>
    </div>
  );
}

function RelationList({
  title,
  items,
  empty
}: {
  title: string;
  items: ReturnType<typeof buildRelationSummary>["incoming"];
  empty: string;
}) {
  return (
    <div>
      <p className="text-sm font-bold text-ink">{title}</p>
      <div className="mt-3 grid gap-3">
        {items.length ? items.map((item) => (
          <div className="rounded-xl bg-surface-container-low/70 p-3 text-sm" key={`${item.sourceId}-${item.targetId}`}>
            <p className="font-semibold text-ink">{item.sourceTitle} {"->"} {item.targetTitle}</p>
            <p className="mt-1 text-ink/65">{item.relation.reason || item.relation.label}</p>
            {typeof item.relation.strength === "number" ? (
              <p className="mt-2 text-xs font-semibold text-primary">强度 {Math.round(item.relation.strength * 100)}%</p>
            ) : null}
          </div>
        )) : <p className="rounded-xl bg-surface-container-low/70 p-3 text-sm text-ink/60">{empty}</p>}
      </div>
    </div>
  );
}
