"use client";

import { LuminaIcon } from "../../components/lumina-icon";
import { assistantFlow, assistantPrompts } from "../../lib/lumina-data";
import { useState } from "react";
import { useToast } from "../../components/toast-provider";

export default function AssistantPage() {
  const [question, setQuestion] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [enableContext, setEnableContext] = useState(false);
  const [enableWebAccess, setEnableWebAccess] = useState(false);
  const toast = useToast();

  async function handleSubmit() {
    if (!question.trim() || isSubmitting) return;

    setIsSubmitting(true);

    // 模拟 AI 处理延迟
    await new Promise(resolve => setTimeout(resolve, 1500));

    setIsSubmitting(false);
    toast.showToast("AI 助手功能即将上线，敬请期待！", "info");
    setQuestion("");
  }

  function handlePromptClick(prompt: string) {
    setQuestion(prompt);
  }
  return (
    <div className="-mx-5 -my-8 grid min-h-[calc(100vh-64px)] min-w-0 overflow-hidden bg-background sm:-mx-6 lg:-mx-12 lg:-my-10 xl:grid-cols-[minmax(0,1fr)_400px]">
      <section className="flex min-h-[calc(100vh-64px)] min-w-0 flex-col items-center justify-center px-5 py-12">
        <div className="w-full max-w-[840px] min-w-0">
          <header className="mb-10 text-center">
            <div className="mx-auto mb-7 flex h-20 w-20 items-center justify-center rounded-2xl bg-primary text-on-primary shadow-soft">
              <LuminaIcon className="text-[46px]" filled name="auto_awesome" />
            </div>
            <h1 className="text-4xl font-bold tracking-tight text-primary sm:text-5xl">
              深度搜索与对话
            </h1>
            <p className="mt-2 text-lg text-outline">围绕笔记、知识点和测评记录进行追问。</p>
            <p className="mt-1 text-sm font-semibold text-warning">Beta · Phase 2 — AI 对话能力开发中</p>
          </header>

          <div className="min-w-0 overflow-hidden rounded-3xl border border-outline-variant/50 bg-surface-container-lowest/80 p-2 shadow-lift">
            <div className="flex min-w-0 items-center gap-3 px-4 py-2 sm:gap-4">
              <LuminaIcon className="shrink-0 text-primary/70" name="search" />
              <textarea
                aria-label="助手问题输入框"
                className="h-16 min-w-0 flex-1 resize-none border-0 bg-transparent py-3 text-base text-on-surface outline-none placeholder:text-outline/70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary sm:text-lg"
                disabled={isSubmitting}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="输入你的问题..."
                value={question}
              />
              <button
                aria-label="发送问题"
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary text-on-primary shadow-soft transition active:scale-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-50 sm:h-12 sm:w-12"
                disabled={!question.trim() || isSubmitting}
                onClick={handleSubmit}
                type="button"
              >
                <LuminaIcon name="arrow_forward" />
              </button>
            </div>
            <div className="flex flex-col gap-3 border-t border-outline-variant/35 px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-wrap gap-2">
                {[
                  ["attach_file", "上下文", enableContext, () => setEnableContext(!enableContext)],
                  ["language", "网络访问", enableWebAccess, () => setEnableWebAccess(!enableWebAccess)]
                ].map(([icon, label, enabled, toggle]) => (
                  <button
                    className={`ui-button-ghost min-h-10 rounded-xl px-3 py-2 ${
                      enabled ? "bg-primary/10 text-primary" : ""
                    }`}
                    disabled={isSubmitting}
                    key={label as string}
                    onClick={toggle as () => void}
                    type="button"
                  >
                    <LuminaIcon className="text-[20px]" name={icon as string} />
                    {label as string}
                  </button>
                ))}
              </div>
              <p className="hidden text-sm font-semibold text-outline/80 sm:block">对话能力接入后可发送</p>
            </div>
          </div>

          <section className="mt-14 min-w-0">
            <p className="mb-5 px-1 text-xs font-bold uppercase tracking-[0.16em] text-outline">
              推荐提示词
            </p>
            <div className="grid min-w-0 gap-5 md:grid-cols-2">
              {assistantPrompts.map((prompt) => (
                <button
                  className="group flex items-start gap-4 rounded-2xl border border-outline-variant/45 bg-surface-container-lowest p-5 text-left transition hover:border-primary/35 hover:shadow-lift focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary sm:p-6"
                  disabled={isSubmitting}
                  key={prompt.title}
                  onClick={() => handlePromptClick(prompt.title)}
                  type="button"
                >
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary transition group-hover:scale-105">
                    <LuminaIcon filled name={prompt.icon} />
                  </span>
                  <span>
                    <span className="block font-bold text-on-surface">{prompt.title}</span>
                    <span className="mt-1 block text-sm leading-6 text-outline">{prompt.description}</span>
                  </span>
                </button>
              ))}
            </div>
          </section>
        </div>
      </section>

      <aside className="hidden border-l border-outline-variant/35 bg-surface-container-lowest/65 p-10 xl:flex xl:flex-col xl:overflow-y-auto">
        <div className="mb-8 flex items-center justify-between">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-outline">参考上下文</p>
          <button
            aria-label="打开参考上下文"
            className="rounded-xl p-2 text-primary transition hover:bg-primary/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            onClick={() => toast.showToast("参考上下文功能即将上线，敬请期待！", "info")}
            type="button"
          >
            <LuminaIcon name="open_in_new" />
          </button>
        </div>

        <article className="rounded-3xl border border-outline-variant/45 bg-surface-container-lowest p-7 shadow-lift">
          <div className="mb-6 flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-secondary" />
            <span className="text-sm font-bold tracking-wide text-secondary">项目 X</span>
            <span className="ml-auto text-sm font-semibold text-outline">2023年10月12日</span>
          </div>
          <h2 className="text-2xl font-bold text-on-surface">初始架构与范围</h2>
          <div className="mt-5 grid gap-5 leading-7 text-on-surface-variant">
            <p>项目 X 的核心目标是革新 Lumina 生态系统中语义数据的存储方式...</p>
            <ul className="grid gap-3">
              {["将向量数据库扩展至 1000 万个嵌入。", "实现低于 100 毫秒的检索速度。"].map(
                (item) => (
                  <li className="flex items-start gap-3" key={item}>
                    <LuminaIcon className="mt-0.5 text-[20px] text-primary" name="check_circle" />
                    <span>{item}</span>
                  </li>
                )
              )}
            </ul>
            <div className="rounded-2xl border border-outline-variant/35 bg-surface-container-low p-4">
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-outline">命中文档</p>
              <div className="mt-4 grid gap-3">
                {["架构草案.pdf", "向量检索评估.md", "接口延迟记录.csv"].map((file, index) => (
                  <div className="flex items-center justify-between rounded-xl bg-surface-container-lowest px-3 py-2 text-sm" key={file}>
                    <span className="font-semibold text-on-surface">{file}</span>
                    <span className="text-outline">{92 - index * 7}%</span>
                  </div>
                ))}
              </div>
            </div>
            <p>下一步工作涉及弥合推理引擎与前端 UI 之间的延迟...</p>
          </div>
          <div className="mt-8 border-t border-outline-variant/25 pt-7">
            <p className="mb-4 text-xs font-bold uppercase tracking-[0.12em] text-outline">
              关联实体
            </p>
            <div className="flex flex-wrap gap-2">
              {["#向量数据库", "#AI基础设施", "+3 更多"].map((tag) => (
                <span
                  className="rounded-full bg-surface-container px-4 py-1.5 text-sm font-semibold text-on-surface-variant"
                  key={tag}
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </article>

        <section className="mt-10 px-2">
          <h2 className="mb-6 font-bold text-on-surface">助手逻辑流程</h2>
          <div className="relative grid gap-8 pl-7 before:absolute before:bottom-2 before:left-[9px] before:top-2 before:w-px before:bg-outline-variant/35">
            {assistantFlow.map((step) => (
              <div className="relative" key={step.title}>
                <span
                  className={`absolute -left-[26px] top-1 h-4 w-4 rounded-full border-2 bg-background ${
                    step.tone === "primary"
                      ? "border-primary"
                      : step.tone === "secondary"
                        ? "border-secondary"
                        : "border-outline/50"
                  }`}
                />
                <p
                  className={`text-sm font-bold ${
                    step.tone === "primary"
                      ? "text-primary"
                      : step.tone === "secondary"
                        ? "text-secondary"
                        : "text-outline"
                  }`}
                >
                  {step.title}
                </p>
                <p className="mt-1 text-sm text-outline">{step.description}</p>
              </div>
            ))}
          </div>
        </section>
      </aside>
    </div>
  );
}
