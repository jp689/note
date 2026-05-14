import {
  AttemptReport,
  DocumentSummary,
  KnowledgeNode,
  MindMapGraph,
  QuizSession,
  ReviewQueueItem,
  SearchResult
} from "@ai-study-notes/contracts";

export const documents: DocumentSummary[] = [
  {
    id: "doc-neural-learning",
    title: "神经网络与学习理论笔记",
    status: "quiz_ready",
    sourceType: "pdf",
    pageCount: 86,
    uploadedAt: "2026-04-01T08:30:00.000Z",
    progressLabel: "结构化完成，已生成首轮题库"
  },
  {
    id: "doc-control-systems",
    title: "自动控制基础复习提纲",
    status: "structured",
    sourceType: "pdf",
    pageCount: 42,
    uploadedAt: "2026-03-29T14:10:00.000Z",
    progressLabel: "知识点已拆解，思维导图待确认"
  },
  {
    id: "doc-economics",
    title: "宏观经济学课堂记录",
    status: "parsing",
    sourceType: "pdf",
    pageCount: 33,
    uploadedAt: "2026-03-27T18:20:00.000Z",
    progressLabel: "OCR 回退中，预计 2 分钟后可查看"
  }
];

export const knowledgeNodes: KnowledgeNode[] = [
  {
    id: "kn-gradient-descent",
    documentId: "doc-neural-learning",
    title: "梯度下降的收敛条件",
    summary: "从学习率、损失曲面和局部极值三方面整理出优化过程中的稳定边界。",
    tags: ["优化", "机器学习", "收敛性"],
    sourcePages: [8, 9, 10],
    difficulty: "intermediate",
    relations: [
      { targetId: "kn-backprop", label: "支撑" },
      { targetId: "kn-generalization", label: "影响" }
    ]
  },
  {
    id: "kn-backprop",
    documentId: "doc-neural-learning",
    title: "反向传播的链式法则",
    summary: "将层级梯度拆成局部导数与上游误差，形成逐层参数更新框架。",
    tags: ["反向传播", "链式法则"],
    sourcePages: [11, 12, 13],
    difficulty: "basic",
    relations: [{ targetId: "kn-gradient-descent", label: "依赖" }]
  },
  {
    id: "kn-generalization",
    documentId: "doc-neural-learning",
    title: "模型泛化与偏差方差权衡",
    summary: "通过训练误差与测试误差关系解释欠拟合、过拟合和正则化策略。",
    tags: ["泛化", "正则化", "偏差方差"],
    sourcePages: [23, 24, 25],
    difficulty: "advanced",
    relations: [{ targetId: "kn-regularization", label: "展开" }]
  },
  {
    id: "kn-regularization",
    documentId: "doc-neural-learning",
    title: "L1/L2 正则化比较",
    summary: "比较稀疏性、权重衰减和不同先验假设下的约束特征。",
    tags: ["L1", "L2", "正则化"],
    sourcePages: [26, 27],
    difficulty: "intermediate",
    relations: [{ targetId: "kn-generalization", label: "补充" }]
  }
];

export const mindMap: MindMapGraph = {
  documentId: "doc-neural-learning",
  nodes: [
    { id: "root", label: "神经网络学习理论", group: "root" },
    { id: "chapter-1", label: "优化基础", group: "chapter" },
    { id: "chapter-2", label: "误差传播", group: "chapter" },
    { id: "chapter-3", label: "泛化能力", group: "chapter" },
    { id: "node-gradient", label: "梯度下降", group: "concept" },
    { id: "node-backprop", label: "反向传播", group: "concept" },
    { id: "node-generalization", label: "偏差方差", group: "concept" },
    { id: "node-practice", label: "错题回放", group: "practice" }
  ],
  edges: [
    { source: "root", target: "chapter-1", label: "章节" },
    { source: "root", target: "chapter-2", label: "章节" },
    { source: "root", target: "chapter-3", label: "章节" },
    { source: "chapter-1", target: "node-gradient", label: "核心概念" },
    { source: "chapter-2", target: "node-backprop", label: "核心概念" },
    { source: "chapter-3", target: "node-generalization", label: "核心概念" },
    { source: "node-generalization", target: "node-practice", label: "复习入口" }
  ]
};

export const quiz: QuizSession = {
  id: "demo-quiz",
  documentId: "doc-neural-learning",
  generatedAt: "2026-04-01T09:00:00.000Z",
  questions: [
    {
      id: "q1",
      knowledgeNodeId: "kn-gradient-descent",
      type: "multiple_choice",
      stem: "当学习率过大时，梯度下降最常见的直接表现是什么？",
      options: ["收敛加快", "训练震荡甚至发散", "模型自动正则化", "梯度恒为零"],
      answer: "训练震荡甚至发散",
      explanation: "学习率过大会导致参数更新步幅过大，容易跨过最优点并在损失面上来回震荡。",
      difficulty: "basic"
    },
    {
      id: "q2",
      knowledgeNodeId: "kn-backprop",
      type: "true_false",
      stem: "反向传播本质上依赖链式法则逐层计算梯度。",
      options: ["正确", "错误"],
      answer: "正确",
      explanation: "链式法则将输出误差拆分到各层参数，是反向传播的理论基础。",
      difficulty: "basic"
    },
    {
      id: "q3",
      knowledgeNodeId: "kn-generalization",
      type: "short_answer",
      stem: "简述偏差与方差的关系，以及正则化为何能够改善泛化。",
      answer: "偏差方差权衡说明模型复杂度影响拟合能力与泛化误差，正则化通过限制模型复杂度降低方差。",
      explanation: "回答应覆盖偏差方差权衡、模型复杂度与泛化误差，以及正则化的约束作用。",
      difficulty: "advanced"
    }
  ]
};

export const report: AttemptReport = {
  id: "demo-attempt",
  quizId: "demo-quiz",
  score: 82,
  strengths: [
    "基础优化概念识别准确",
    "能正确定位反向传播的核心原理",
    "对正则化的目的有初步掌握"
  ],
  weakPoints: [
    {
      knowledgeNodeId: "kn-generalization",
      title: "模型泛化与偏差方差权衡",
      reason: "简答中只提到过拟合，未解释方差随复杂度变化的机制。",
      action: "回看第 23 至 25 页，并重新总结泛化误差曲线。"
    },
    {
      knowledgeNodeId: "kn-regularization",
      title: "L1/L2 正则化比较",
      reason: "缺少 L1 稀疏性与 L2 权重平滑的差异描述。",
      action: "补充一张比较表，并针对各自适用场景举例。"
    }
  ],
  nextReview: [
    "24 小时内重做 3 道泛化能力题",
    "两天后用思维导图复述正则化分支",
    "下次测评加入 1 道综合简答题"
  ]
};

export const reviewQueue: ReviewQueueItem[] = [
  {
    knowledgeNodeId: "kn-generalization",
    title: "模型泛化与偏差方差权衡",
    priority: "high",
    recommendation: "先看知识点摘要，再做一轮短答复述。"
  },
  {
    knowledgeNodeId: "kn-regularization",
    title: "L1/L2 正则化比较",
    priority: "medium",
    recommendation: "做对比卡片，区分稀疏性和权重衰减。"
  },
  {
    knowledgeNodeId: "kn-gradient-descent",
    title: "梯度下降的收敛条件",
    priority: "low",
    recommendation: "复刷 2 道客观题巩固边界条件。"
  }
];

export const searchResults: SearchResult[] = knowledgeNodes.map((node, index) => ({
  node,
  matchType: index % 2 === 0 ? "semantic" : "keyword",
  snippet: `${node.summary} 可回溯到页码 ${node.sourcePages.join("、")}。`
}));

