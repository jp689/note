"use client";

import { LuminaIcon } from "../../components/lumina-icon";
import { editorCitations, editorOutline } from "../../lib/lumina-data";
import { useState } from "react";
import { useToast } from "../../components/toast-provider";

const toolbarActions = [
  { icon: "auto_fix_high", label: "展开", active: true },
  { icon: "unfold_less", label: "缩短" },
  { icon: "summarize", label: "总结" },
  { icon: "tune", label: "语气调节" }
];

export default function EditorPage() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeAction, setActiveAction] = useState("展开");
  const toast = useToast();

  async function handleToolbarAction(action: string) {
    if (isProcessing) return;

    setIsProcessing(true);
    setActiveAction(action);

    // 模拟 AI 处理延迟
    await new Promise(resolve => setTimeout(resolve, 1000));

    setIsProcessing(false);
    toast.showToast(`AI ${action}功能即将上线，敬请期待！`, "info");
  }
  return (
    <div className="-mx-5 -my-8 grid min-h-[calc(100vh-64px)] min-w-0 overflow-hidden bg-surface-container-lowest sm:-mx-6 lg:-mx-12 lg:-my-10 xl:grid-cols-[minmax(0,1fr)_320px]">
      <main className="min-w-0 overflow-hidden px-5 py-10 sm:px-8 lg:px-12">
        <div className="relative mx-auto w-full max-w-[840px] min-w-0">
          <header className="mb-10">
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-warning/10 px-3 py-1 text-xs font-bold text-warning">
                Beta · Phase 2
              </span>
              <span className="rounded-full bg-surface-container-high px-3 py-1 text-xs font-bold text-on-surface-variant">
                设计哲学
              </span>
              <span className="text-sm font-semibold text-outline">2分钟前修改</span>
            </div>
            <h1 className="break-words text-4xl font-bold tracking-tight text-on-surface sm:text-5xl">
              AI 设计系统的未来
            </h1>
            <div className="mt-5 h-1 w-24 rounded-full bg-primary" />
          </header>

          <div className="sticky top-20 z-10 mb-8 flex min-w-0 justify-center">
            <div className="glass-panel flex max-w-full flex-wrap items-center justify-center gap-1 rounded-2xl border border-outline-variant/45 p-1 shadow-lift">
              {toolbarActions.map((action) => (
                <button
                  className={`inline-flex min-h-10 items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
                    activeAction === action.label
                      ? "text-primary hover:bg-primary/5"
                      : "text-on-surface-variant hover:bg-surface-container-low"
                  }`}
                  disabled={isProcessing}
                  key={action.label}
                  onClick={() => handleToolbarAction(action.label)}
                  type="button"
                >
                  <LuminaIcon className="text-[19px]" filled={activeAction === action.label} name={action.icon} />
                  <span className="hidden sm:inline">{action.label}</span>
                </button>
              ))}
            </div>
          </div>

          <article className="grid min-w-0 gap-7 break-words text-lg leading-9 text-on-surface-variant">
            <p>
              设计系统正在经历一场根本性的转变。我们正在从静态的可重用组件库转向能够实时适应用户需求的动态、情景感知框架。将大语言模型（LLM）集成到设计工作流中，不仅仅是为了自动化，更是为了增强人类的能力。
            </p>
            <blockquote className="rounded-2xl border border-primary/20 bg-primary/5 p-5 font-medium italic text-on-surface">
              “未来的设计师将不再绘制像素；他们将定义约束和意图，AI 则在这些范围内生成体验。”
            </blockquote>
            <p>
              在这种新范式下，一致性不再由死板的规则维持，而是通过语义理解来保证。Lumina AI
              正代表了这种进化，一个高实用性工具与极简设计相结合的避风港，旨在促进深度专注。
            </p>
            <div>
              <p>我们正在探索 AI 优先设计系统的三大核心支柱：</p>
              <ol className="mt-4 grid gap-3">
                {[
                  "基于设备约束的生成式布局。",
                  "针对可读性优化的自适应排版。",
                  "用于即时品牌切换的语义令牌映射。"
                ].map((item, index) => (
                  <li
                    className="rounded-xl border border-outline-variant/25 bg-surface-container-low px-4 py-3 text-on-surface"
                    key={item}
                  >
                    {index + 1}. {item}
                  </li>
                ))}
              </ol>
            </div>
            <div className="flex items-center gap-2 text-primary">
              <span className="h-6 w-1 rounded-full bg-primary" />
              <span className="font-semibold italic">AI 正在思考...</span>
            </div>
          </article>
        </div>
      </main>

      <aside className="hidden border-l border-outline-variant/35 bg-surface-container-low p-6 xl:block">
        <div className="grid gap-7">
          <section>
            <h2 className="mb-4 flex items-center gap-2 text-sm font-bold uppercase tracking-[0.12em] text-outline">
              <LuminaIcon className="text-[18px]" name="format_list_bulleted" />
              智能大纲
            </h2>
            <div className="grid gap-4">
              {editorOutline.map((item) => (
                <div className={item.muted ? "opacity-55" : ""} key={item.label}>
                  <div className="flex items-center justify-between text-sm font-semibold text-on-surface">
                    <span>{item.label}</span>
                  </div>
                  <div className="mt-2 h-1 overflow-hidden rounded-full bg-surface-container-high">
                    <div className="h-full rounded-full bg-primary" style={{ width: item.progress }} />
                  </div>
                </div>
              ))}
            </div>
          </section>

          <div className="h-px bg-outline-variant/30" />

          <section>
            <h2 className="mb-4 flex items-center gap-2 text-sm font-bold uppercase tracking-[0.12em] text-outline">
              <LuminaIcon className="text-[18px]" name="library_books" />
              AI 引用
            </h2>
            <div className="grid gap-4">
              {editorCitations.map((citation) => (
                <article
                  className="rounded-xl border border-outline-variant/35 bg-surface-container-lowest p-4 shadow-sm"
                  key={citation.title}
                >
                  <p className="text-xs font-bold text-primary">{citation.type}</p>
                  <h3 className="mt-2 font-semibold leading-6 text-on-surface">{citation.title}</h3>
                  <p className="mt-2 flex items-center gap-1 text-xs font-semibold text-outline">
                    <LuminaIcon className="text-[15px]" name="link" />
                    {citation.source}
                  </p>
                </article>
              ))}
            </div>
          </section>

          <section className="relative grid rounded-2xl border border-outline-variant/35 bg-surface-container-lowest p-5 text-on-surface">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-outline">概念图状态</p>
              <p className="mt-2 font-bold">3 个章节已标注，2 个关系待确认</p>
              <div className="mt-4 h-2 overflow-hidden rounded-full bg-surface-container-high">
                <div className="h-full w-3/5 rounded-full bg-primary" />
              </div>
            </div>
          </section>
        </div>
      </aside>
    </div>
  );
}
