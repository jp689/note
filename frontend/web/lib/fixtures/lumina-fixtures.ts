/**
 * Lumina UI 展示数据
 *
 * 这些数据用于页面 UI 展示和原型验证，尚未接入后端 API。
 * 当后端接口就绪后，应替换为真实数据源。
 */

export const workspaceStats = [
  { label: "笔记", value: "124" },
  { label: "存储", value: "42%" }
];

export const starredNotes = [
  {
    title: "Lumina 项目路线图",
    summary: "下一代 AI 工作空间界面的核心架构原则...",
    tag: "战略",
    updated: "更新于 2小时前",
    art: "lumina-ribbon-art"
  },
  {
    title: "设计系统令牌 (Tokens)",
    summary: "定义设计系统的语义化调色板和排版比例...",
    tag: "设计",
    updated: "更新于 5小时前",
    art: "lumina-field-art"
  }
];

export const recentNotes = [
  {
    title: "用户访谈综合报告",
    summary: "汇总了 12 位参与者关于侧边栏导航和核心编辑器移动端响应能力的反馈...",
    icon: "description",
    updated: "昨天",
    featured: true
  },
  {
    title: "视觉情绪板",
    summary: "Lumina 玻璃拟态风格的灵感来源。",
    icon: "image"
  },
  {
    title: "功能积压",
    summary: "Q4 发布版本的优先级列表。",
    icon: "lightbulb"
  },
  {
    title: "漏洞与打磨",
    summary: "2.4 版本中发现的 UI 回归问题。",
    icon: "bug_report"
  },
  {
    title: "AI 提示词库",
    summary: "提示词工程的最佳实践。",
    icon: "auto_awesome"
  }
];

export const weeklyInsightItems = [
  { title: "UI 中的心理模型", caption: "推荐阅读", icon: "psychology", tone: "secondary" },
  { title: "连接到 Notion", caption: "自动同步", icon: "link", tone: "primary" }
];

export const quickTasks = [
  { label: "审阅「设计系统」草案", done: false },
  { label: "归档旧的冲刺笔记", done: false },
  { label: "提交 AI 摘要反馈", done: true }
];

export const libraryFolders = [
  {
    title: "项目",
    count: "42 个项目",
    description: "活跃的工作流程和正在进行的计划。",
    icon: "folder",
    chips: ["#f0d4c9", "#bc5637", "#febb88"]
  },
  {
    title: "研究",
    count: "128 个项目",
    description: "学术论文、笔记和技术深度研究。",
    icon: "menu_book",
    tags: ["物理", "AI 伦理"]
  },
  {
    title: "个人",
    count: "15 个项目",
    description: "日记、每日日志和私人思考。",
    icon: "person",
    updated: "2小时前更新"
  }
];

export const libraryNotes = [
  {
    title: "现代主义建筑评论",
    date: "2023年10月24日",
    tags: ["设计", "AI已分类"],
    words: "1,240",
    icon: "description",
    selected: true
  },
  {
    title: "Q3 产品策略路线图",
    date: "2023年10月23日",
    tags: ["规划"],
    words: "850",
    icon: "article",
    selected: true
  },
  {
    title: "品牌草图与概念",
    date: "2023年10月22日",
    tags: ["视觉"],
    words: "312",
    icon: "draw",
    selected: true
  },
  {
    title: "神经网络：入门指南",
    date: "2023年10月21日",
    tags: ["技术"],
    words: "4,890",
    icon: "description",
    selected: false
  }
];
