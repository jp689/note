/**
 * Lumina 编辑器和助手页面展示数据
 *
 * 这些数据用于编辑器和助手页面的 UI 展示。
 * 其他展示数据已移至 fixtures/lumina-fixtures.ts
 */

export const assistantPrompts = [
  {
    title: "总结上次会议",
    description: "获取 Q3 产品同步会议的关键要点。",
    icon: "summarize"
  },
  {
    title: "查找关于项目 X 的笔记",
    description: "整理 2023 年以来所有关于项目 X 的引用。",
    icon: "query_stats"
  },
  {
    title: "起草跟进邮件",
    description: "根据客户反馈记录撰写一封邮件。",
    icon: "edit_note"
  },
  {
    title: "综合研究成果",
    description: "将 UX 研究与最近的工单进行交叉比对。",
    icon: "lightbulb"
  }
];

export const assistantFlow = [
  {
    title: "扫描近期笔记",
    description: "在 0.4 秒内处理了 142 条条目",
    tone: "primary"
  },
  {
    title: "聚类「项目 X」",
    description: "识别出 3 个主要文档线程",
    tone: "secondary"
  },
  {
    title: "准备就绪",
    description: "等待用户输入...",
    tone: "outline"
  }
];

export const editorOutline = [
  { label: "UI 的演进", progress: "100%", muted: false },
  { label: "增强创造力", progress: "60%", muted: false },
  { label: "伦理约束", progress: "0%", muted: true }
];

export const editorCitations = [
  { type: "文章", title: "使用 AI 设计：2024 年 UX 现状", source: "uxdesign.cc" },
  { type: "白皮书", title: "神经设计系统与交互性", source: "research.lumina.ai" }
];
