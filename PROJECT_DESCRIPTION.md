# 项目结构与功能说明文档

> 本文件为 AI Study Notes (Lumina AI) 项目的完整技术文档，供后续 Agent 快速接手和维护。

---

## 一、项目基本介绍

- **项目名称**: AI Study Notes (AI 自学笔记平台) / Lumina AI (AI 灵感学习空间)
- **项目类型**: 全栈 Web 应用 (Monorepo 架构)
- **项目核心功能**: 将用户上传的 PDF 笔记/课件自动转化为结构化知识、思维导图、测评题库、反馈报告和智能复习队列
- **项目面向的用户**: 学生、备考人员、自学者——需要将 PDF 资料进行 AI 智能学习的人群
- **项目的主要交互流程**: 登录 → 上传 PDF → 系统自动 OCR + AI 生成知识节点/思维导图/题库 → 答题测评 → AI 评分反馈 → 复习队列 → 知识库检索
- **项目的整体完成度判断**: MVP (最小可行产品) 已完成，核心学习闭环 (上传 → 生成 → 测评 → 复习) 已跑通，PDF 预览、通知、设置、数据报表、AI 简答题评分等功能均已实现

---

## 二、技术栈说明

### 前端框架 / 构建工具
| 类别 | 技术 |
|------|------|
| 框架 | Next.js 14.2.32 (App Router) |
| UI 库 | React 18.3.1 |
| 语言 | TypeScript 5.5.4 |
| 样式 | Tailwind CSS 3.4.10 + PostCSS + 自定义 CSS 组件 |
| 图表 | ECharts 5.5.1 + echarts-for-react 3.0.2 |
| 图谱 | ReactFlow 11.11.4 (思维导图可视化) |
| 图标 | 自定义 SVG 图标组件 (`LuminaIcon`) |
| 字体 | Google Fonts Inter |

### 后端技术
| 类别 | 技术 |
|------|------|
| 框架 | FastAPI |
| ORM | SQLAlchemy 2.0+ |
| 数据库 | PostgreSQL 16 + pgvector (向量检索) |
| 缓存/队列 | Redis 7 |
| 对象存储 | MinIO (S3 兼容) |
| 配置 | pydantic-settings |
| 认证 | JWT (HS256, 手动实现) |
| 构建 | setuptools |

### 外部 AI 服务 (可选)
| 服务 | 用途 |
|------|------|
| DeepSeek / 阿里云百炼 | 知识节点生成、思维导图生成、测评题生成 |
| OpenAI | 嵌入向量 (Embedding) |
| PaddleOCR | PDF/图片文字识别 |

### 部署方式
- Docker Compose 编排 (postgres + redis + minio + api + worker + web)
- 本地开发模式 (SQLite 回退 + 本地文件存储)

---

## 三、项目目录结构说明

```
note/                              # 项目根目录
├── .env.example                   # 环境变量模板 (重要!)
├── .env                           # 实际环境变量 (不入版本控制)
├── package.json                   # Monorepo 工作区定义
├── README.md                      # 项目说明
├── DEEPSEEK_USAGE_GUIDE.md        # DeepSeek 使用指南
├── frontend/
│   ├── web/                       # ⭐ Next.js 前端应用
│   │   ├── app/                   # Next.js App Router 页面
│   │   │   ├── layout.tsx         # 根布局 (SiteShell + Toast)
│   │   │   ├── page.tsx           # 首页 (学习控制台)
│   │   │   ├── globals.css        # 全局样式 + Tailwind 组件
│   │   │   ├── login/page.tsx     # 登录/注册页
│   │   │   ├── upload/page.tsx    # PDF 上传页
│   │   │   ├── knowledge/page.tsx # 知识库检索页
│   │   │   ├── review/page.tsx    # 复习队列页
│   │   │   ├── settings/page.tsx  # 用户设置页
│   │   │   ├── documents/[id]/    # 文档详情页
│   │   │   ├── quizzes/[id]/      # 测评答题页
│   │   │   ├── reports/[id]/      # 评分报告页
│   │   │   ├── editor/            # 编辑器页
│   │   │   ├── assistant/         # AI 助手页
│   │   │   └── admin/             # 管理后台
│   │   │       ├── layout.tsx     # 管理后台布局
│   │   │       ├── page.tsx       # 管理仪表盘
│   │   │       ├── login/page.tsx # 管理员登录
│   │   │       ├── users/page.tsx # 用户管理
│   │   │       └── reports/page.tsx # 数据报表
│   │   ├── components/            # ⭐ 共享 React 组件
│   │   │   ├── site-shell.tsx     # 侧边栏 + 顶栏 + 底部导航
│   │   │   ├── lumina-icon.tsx    # 自定义 SVG 图标
│   │   │   ├── quiz-runner.tsx    # 测评答题组件
│   │   │   ├── mindmap-preview.tsx# 思维导图组件 (ReactFlow)
│   │   │   ├── pdf-preview.tsx    # PDF 预览组件 (iframe)
│   │   │   ├── notification-panel.tsx # 通知面板组件
│   │   │   ├── search-panel.tsx   # 搜索面板
│   │   │   ├── toast-provider.tsx # 全局 Toast 提示
│   │   │   ├── user-avatar.tsx    # 用户头像
│   │   │   └── ui-states.tsx      # 空状态、加载、错误组件
│   │   ├── lib/                   # ⭐ API 和数据层
│   │   │   ├── api.ts             # 所有 API 请求封装
│   │   │   ├── mock-data.ts       # 开发用 Mock 数据
│   │   │   ├── server-auth.ts     # 服务端认证工具
│   │   │   └── fixtures/          # 测试数据
│   │   ├── public/                # 静态资源 (当前为空)
│   │   ├── tailwind.config.ts     # Tailwind 配置 (自定义主题色)
│   │   ├── next.config.mjs        # Next.js 配置
│   │   └── package.json           # 前端依赖
│   └── design-references/         # UI 设计参考 (HTML/截图)
├── backend/
│   └── api/                       # ⭐ FastAPI 后端
│       ├── app/
│       │   ├── main.py            # FastAPI 入口
│       │   ├── config.py          # 配置管理 (pydantic-settings)
│       │   ├── models.py          # SQLAlchemy 数据模型
│       │   ├── schemas.py         # Pydantic 请求/响应模型
│       │   ├── security.py        # JWT 认证 + 密码哈希
│       │   ├── database.py        # 数据库连接管理
│       │   ├── seed.py            # 演示用户种子数据
│       │   ├── queueing.py        # Redis 任务队列
│       │   ├── storage.py         # S3/本地文件存储
│       │   ├── routers/           # API 路由
│       │   │   ├── auth.py        # /api/auth/*
│       │   │   ├── documents.py   # /api/documents/*
│       │   │   ├── quizzes.py     # /api/quizzes/*
│       │   │   ├── reports.py     # /api/reports/*
│       │   │   ├── notifications.py # /api/notifications/*
│       │   │   ├── user_settings.py # /api/user/*
│       │   │   └── admin.py       # /api/admin/*
│       │   └── services/          # 业务服务
│       │       ├── pipeline.py    # ⭐ 核心处理流水线
│       │       ├── deepseek.py    # DeepSeek AI 集成
│       │       ├── ocr.py         # PaddleOCR 集成
│       │       └── embedding.py   # 嵌入向量服务
│       ├── pyproject.toml         # Python 项目配置
│       └── tests/                 # 测试
├── integration/
│   ├── contracts/                 # ⭐ 前后端共享类型定义
│   │   └── src/index.ts           # TypeScript 接口定义
│   └── ai-pipeline/               # ⭐ AI 处理 Worker
│       └── worker/                # Redis 消费者
│           └── main.py            # Worker 入口
└── infrastructure/
    ├── docker-compose.yml         # Docker 编排配置
    └── docker/                    # Dockerfile 文件
        ├── api.Dockerfile
        ├── web.Dockerfile
        └── ai-pipeline.Dockerfile
```

---

## 四、核心功能模块拆解

### 1. 认证系统

| 项目 | 说明 |
|------|------|
| **相关文件** | `backend/api/app/routers/auth.py`, `backend/api/app/security.py`, `frontend/web/app/login/page.tsx` |
| **主要功能** | 用户注册、登录、JWT Token 管理、Rate Limiting |
| **关键变量/函数** | `create_access_token()`, `decode_access_token()`, `hash_password()`, `verify_password()`, `get_current_user()` |
| **输入/输出** | 输入: email + password → 输出: `{ accessToken, user: UserProfile }` |
| **与其他模块关系** | 所有 API 路由依赖 `get_current_user()` 进行鉴权 |
| **注意事项** | JWT 使用自定义 HS256 实现 (非 pyjwt 库)，密码哈希使用 PBKDF2-SHA256，登录有 10 次/分钟 Rate Limit |

### 2. PDF 上传与处理流水线

| 项目 | 说明 |
|------|------|
| **相关文件** | `frontend/web/app/upload/page.tsx`, `backend/api/app/routers/documents.py`, `backend/api/app/services/pipeline.py` |
| **主要功能** | PDF 上传 → OCR 文本提取 → 知识节点生成 → 思维导图构建 → 测评题生成 |
| **关键函数** | `process_document_inline()`, `_build_payload_from_ocr()`, `apply_pipeline_result()`, `build_demo_payload()` |
| **处理流程** | 1) `uploadDocumentMetadata` 创建文档记录 2) `uploadDocumentContent` 上传 PDF 到 MinIO 3) `processDocument` 触发处理 4) 前端轮询状态直到 `quiz_ready` |
| **注意事项** | 当 Redis 不可用时自动回退到内联处理模式；OCR 不可用时回退到模板化生成；最大上传 30MB |

### 3. DeepSeek AI 内容生成

| 项目 | 说明 |
|------|------|
| **相关文件** | `backend/api/app/services/deepseek.py`, `backend/api/app/services/pipeline.py` |
| **主要功能** | 使用 DeepSeek 模型生成知识节点、思维导图、测评题 |
| **关键函数** | `generate_knowledge_nodes()`, `generate_mindmap()`, `generate_quiz_questions()`, `_call_api()` |
| **输入/输出** | 输入: 文档标题 + 文本块 → 输出: 知识节点列表 + 思维导图 + 测评题 |
| **配置** | 环境变量: `API_DEEPSEEK_BASE_URL`, `API_DEEPSEEK_API_KEY`, `API_DEEPSEEK_MODEL` |
| **注意事项** | 未配置 API Key 时使用模板化回退；调用失败自动降级到确定性生成 |

### 4. 测评系统

| 项目 | 说明 |
|------|------|
| **相关文件** | `frontend/web/components/quiz-runner.tsx`, `frontend/web/app/quizzes/[id]/page.tsx`, `backend/api/app/routers/quizzes.py`, `backend/api/app/services/pipeline.py` |
| **主要功能** | 生成测评题 → 用户答题 → AI 评分 → 生成反馈报告 |
| **题目类型** | `multiple_choice` (选择题), `true_false` (判断题), `short_answer` (简答题) |
| **评分逻辑** | 客观题即时评分; 简答题使用 DeepSeek AI 进行 rubric 评分（概念准确性 40 分、逻辑完整性 30 分、证据支撑 20 分、语言表达 10 分），未配置 API 时回退到规则评分 |
| **关键函数** | `submitQuiz()` (前端), `submit_quiz()` (后端), `_ai_score_short_answer()` (AI 评分) |
| **注意事项** | AI 评分需要配置 `API_DEEPSEEK_API_KEY`；评分完成后自动创建通知 |

### 5. 反馈报告与复习队列

| 项目 | 说明 |
|------|------|
| **相关文件** | `frontend/web/app/review/page.tsx`, `frontend/web/app/reports/[id]/page.tsx`, `backend/api/app/routers/reports.py` |
| **主要功能** | 生成评分报告、薄弱点分析、复习建议、智能复习队列 |
| **数据结构** | `AttemptReport` (评分报告), `ReviewQueueItem` (复习项), `FeedbackHighlight` (薄弱点) |
| **队列逻辑** | 答错的客观题和低分简答题自动进入复习队列，每次测评后清空重建 |
| **关键函数** | `complete_review_item()` (前端), review queue CRUD (后端) |

### 6. 知识库检索

| 项目 | 说明 |
|------|------|
| **相关文件** | `frontend/web/app/knowledge/page.tsx`, `frontend/web/components/search-panel.tsx`, `backend/api/app/services/pipeline.py` (`search_knowledge`) |
| **主要功能** | 关键词搜索 + 语义向量搜索混合检索 |
| **搜索逻辑** | 先进行关键词匹配，再进行余弦相似度向量匹配 (阈值 0.72) |
| **嵌入实现** | 默认使用 SHA-256 确定性回退模式，可配置 OpenAI Embedding API |
| **注意事项** | 语义搜索基于 `stable_embedding()` 函数 (SHA-256 哈希生成伪向量)，非真实向量模型 |

### 7. 管理后台

| 项目 | 说明 |
|------|------|
| **相关文件** | `frontend/web/app/admin/page.tsx`, `frontend/web/app/admin/users/page.tsx`, `frontend/web/app/admin/reports/page.tsx`, `backend/api/app/routers/admin.py` |
| **主要功能** | 用户管理 (列表/搜索/创建/编辑/停用)、系统统计 (ECharts 图表)、数据报表 |
| **统计指标** | 总用户数、活跃用户、管理员数、文档总数、文档状态分布 |
| **权限控制** | 管理后台路由需要 `is_admin` 权限 |
| **注意事项** | 管理员登录入口与普通用户分开 (`/admin/login`) |

### 8. 思维导图可视化

| 项目 | 说明 |
|------|------|
| **相关文件** | `frontend/web/components/mindmap-preview.tsx` |
| **主要功能** | 使用 ReactFlow 渲染知识图谱 |
| **节点类型** | `root` (根节点), `chapter` (章节), `concept` (概念), `practice` (实践) |
| **节点颜色** | root=#d87233, chapter=#1f6b6c, concept=#102134, practice=#7c8d48 |

### 9. PDF 预览

| 项目 | 说明 |
|------|------|
| **相关文件** | `frontend/web/components/pdf-preview.tsx`, `backend/api/app/routers/documents.py`, `backend/api/app/storage.py` |
| **主要功能** | 在文档详情页内嵌 PDF 查看器，支持展开/收起和下载 |
| **实现方式** | 使用 iframe 嵌入 PDF，后端提供 `/api/documents/{id}/download` 接口返回文件流 |
| **注意事项** | 依赖浏览器内置 PDF 阅读器；如浏览器不支持则提示下载 |

### 10. 通知系统

| 项目 | 说明 |
|------|------|
| **相关文件** | `frontend/web/components/notification-panel.tsx`, `backend/api/app/routers/notifications.py`, `backend/api/app/models.py` (Notification) |
| **主要功能** | 通知列表展示、未读计数、标记已读、全部已读 |
| **触发时机** | 文档处理完成、测评完成、复习提醒时自动创建通知 |
| **API 路由** | `GET /api/notifications`, `POST /api/notifications/read`, `POST /api/notifications/read-all` |

### 11. 用户设置

| 项目 | 说明 |
|------|------|
| **相关文件** | `frontend/web/app/settings/page.tsx`, `backend/api/app/routers/user_settings.py` |
| **主要功能** | 修改个人资料（姓名、邮箱）、修改密码 |
| **API 路由** | `GET/PATCH /api/user/profile`, `POST /api/user/change-password` |

---

## 五、数据流和交互流程

### 完整用户流程

```
1. 访问首页 (/) → 未登录显示登录按钮
2. 点击登录 → 跳转 /login → 输入邮箱密码 → 后端返回 JWT Token
3. Token 存储到 localStorage + Cookie → 跳转首页
4. 点击"导入 PDF" → 跳转 /upload → 拖拽或选择 PDF 文件
5. 前端调用 uploadDocumentMetadata → 后端创建 Document 记录
6. 前端调用 uploadDocumentContent → PDF 上传到 MinIO
7. 前端调用 processDocument → 后端创建 TaskJob，触发处理
8. 前端轮询 getDocument 状态 (最多 20 次，每次 1.5 秒)
9. 处理完成 → 跳转 /documents/[id] → 展示知识点 + 思维导图
10. 点击"开始测评" → 跳转 /quizzes/[id] → 答题
11. 提交测评 → 后端评分 → 跳转 /reports/[id] → 展示分数和反馈
12. 薄弱点自动进入 /review 复习队列
13. 在 /knowledge 检索所有文档的知识点
```

### 状态管理

- **前端状态**: React 组件内 `useState` + URL Params，无全局状态管理库
- **认证状态**: `localStorage` + `Cookie` (双重存储，支持 SSR)
- **服务端状态**: 每次页面请求通过 `getServerToken()` 获取 token 并调用 API
- **Mock 回退**: 开发环境 API 请求失败时自动返回 `mock-data.ts` 中的数据

### 异步逻辑

- PDF 上传使用 XMLHttpRequest 上传进度监听
- 文档处理状态使用前端轮询 (polling)
- 管理后台数据使用 `useEffect` + `useState` 异步加载

---

## 六、API 与外部服务说明

### API 文件位置
- 前端 API 封装: `frontend/web/lib/api.ts`
- 后端路由: `backend/api/app/routers/`
- 共享类型: `integration/contracts/src/index.ts`

### API 路由列表

| 路由 | 方法 | 用途 | 前端调用位置 |
|------|------|------|-------------|
| `/api/auth/register` | POST | 用户注册 | `login/page.tsx` |
| `/api/auth/login` | POST | 用户登录 | `login/page.tsx` |
| `/api/documents` | GET | 获取文档列表 | `page.tsx` (首页) |
| `/api/documents/upload` | POST | 创建文档记录 | `upload/page.tsx` |
| `/api/documents/{id}/content` | PUT | 上传 PDF 内容 | `upload/page.tsx` |
| `/api/documents/{id}/process` | POST | 触发文档处理 | `upload/page.tsx` |
| `/api/documents/{id}/status` | GET | 获取文档状态 | `upload/page.tsx` (轮询) |
| `/api/documents/{id}/knowledge` | GET | 获取知识节点 | `documents/[id]/page.tsx` |
| `/api/documents/{id}/mindmap` | GET | 获取思维导图 | `documents/[id]/page.tsx` |
| `/api/documents/{id}/quiz` | GET | 获取测评题 | `documents/[id]/page.tsx` |
| `/api/knowledge/search` | GET | 知识库搜索 | `knowledge/page.tsx` |
| `/api/quizzes/{id}` | GET | 获取测评详情 | `quizzes/[id]/page.tsx` |
| `/api/quizzes/{id}/submit` | POST | 提交测评答案 | `quiz-runner.tsx` |
| `/api/reports/{id}` | GET | 获取评分报告 | `reports/[id]/page.tsx` |
| `/api/reports/latest` | GET | 获取最新报告 | `review/page.tsx` |
| `/api/review-queue` | GET | 获取复习队列 | `review/page.tsx` |
| `/api/review-queue/{id}/complete` | POST | 完成复习项 | `review/page.tsx` |
| `/api/admin/stats` | GET | 管理统计 | `admin/page.tsx` |
| `/api/admin/stats/detailed` | GET | 详细统计 | `admin/page.tsx` |
| `/api/admin/users` | GET/POST | 用户管理 | `admin/users/page.tsx` |
| `/api/admin/users/{id}` | PATCH/DELETE | 编辑/删除用户 | `admin/users/page.tsx` |
| `/api/documents/{id}/download` | GET | 下载原始 PDF | `documents/[id]/page.tsx` |
| `/api/notifications` | GET | 获取通知列表 | `notification-panel.tsx` |
| `/api/notifications/read` | POST | 标记通知已读 | `notification-panel.tsx` |
| `/api/notifications/read-all` | POST | 全部标记已读 | `notification-panel.tsx` |
| `/api/user/profile` | GET/PATCH | 用户资料管理 | `settings/page.tsx` |
| `/api/user/change-password` | POST | 修改密码 | `settings/page.tsx` |
| `/api/user/preferences` | GET/PATCH | 用户偏好设置 | `settings/page.tsx` |
| `/api/internal/pipeline/jobs/{id}/complete` | POST | Worker 回调 | ai-pipeline worker |

### 环境变量

| 变量名 | 说明 | 默认值 |
|--------|------|--------|
| `NEXT_PUBLIC_API_BASE_URL` | 前端 API 地址 | `http://localhost:8000` |
| `API_SECRET_KEY` | JWT 签名密钥 | `change-me` (生产必须修改) |
| `API_DATABASE_URL` | 数据库连接 | `postgresql+psycopg://postgres:postgres@localhost:5432/ai_study_notes` |
| `API_DEEPSEEK_API_KEY` | DeepSeek API 密钥 | 空 (回退到模板模式) |
| `API_PADDLEOCR_TOKEN` | PaddleOCR 密钥 | 空 (跳过 OCR) |
| `API_OPENAI_API_KEY` | OpenAI API 密钥 | 空 (使用确定性嵌入) |

### 接口失败处理

- API 请求失败时，前端 `getJson()` 函数在开发环境下自动返回 Mock 数据 (`mock-data.ts`)
- 生产环境 (`ENABLE_MOCK_FALLBACK=false`) 会直接抛出错误
- DeepSeek 调用失败自动降级到模板化内容生成
- OCR 调用失败自动跳过 OCR，使用回退模式

---

## 七、样式与资源说明

### 视觉风格

- **设计语言**: Material Design 3 风格 (MD3)
- **主色调**: 暖橙色系 (#9c3e21 primary, #d87233 saffron)
- **辅助色**: 紫色系 (#855229 secondary, #8c4a32 tertiary)
- **特殊色**: teal (#1f6b6c), moss (#7c8d48), ink (#102133), paper (#f5efe4)
- **背景**: 暖米色 (#fff8f6) + 毛玻璃效果
- **圆角**: 大量使用 2xl (16px) 和 3xl (24px) 圆角

### CSS 文件

| 文件 | 说明 |
|------|------|
| `frontend/web/app/globals.css` | 全局样式、Tailwind 组件定义、CSS 变量 |
| `frontend/web/tailwind.config.ts` | Tailwind 主题配置 (颜色、阴影、字体、间距) |

### 自定义 Tailwind 组件

- `.ui-button-primary` / `.ui-button-secondary` / `.ui-button-ghost` - 按钮
- `.ui-input` - 输入框
- `.ui-card` / `.ui-card-interactive` - 卡片
- `.ui-chip` - 标签
- `.ui-alert-error` - 错误提示
- `.ui-empty` - 空状态
- `.panel` / `.glass-panel` - 面板 (毛玻璃效果)

### 资源说明

- **当前无图片/音频/视频资源**: 项目完全使用 SVG 图标和 CSS 样式，无外部媒体资源
- **图标**: `frontend/web/components/lumina-icon.tsx` 包含全部自定义 SVG 图标
- **字体**: 使用 Google Fonts Inter，本地 fallback 到系统字体

---

## 八、运行与部署说明

### 本地开发

#### 前端
```bash
cd frontend/web
npm install
npm run dev
# 访问 http://localhost:3000
```

#### 后端
```bash
cd backend/api
pip install -e .
uvicorn app.main:app --reload --port 8000
# API 文档: http://localhost:8000/docs
```

#### Worker (可选)
```bash
cd integration/ai-pipeline
pip install -e .
python -m worker.main
```

### Docker 部署 (推荐)
```bash
# 复制环境变量
cp .env.example .env

# 启动所有服务
docker compose -f infrastructure/docker-compose.yml up --build

# 服务端口:
# - Web: 3000
# - API: 8000
# - PostgreSQL: 5432
# - Redis: 6379
# - MinIO: 9000 (API), 9001 (Console)
```

### 打包命令
```bash
npm run build:web   # 构建前端
npm run lint:web    # 前端代码检查
```

### 浏览器权限要求

- 无特殊权限要求 (无摄像头、麦克风等)
- 需要 localStorage 支持 (存储 JWT Token)
- 需要 fetch API 支持 (现代浏览器)

### 推荐 Node 版本

- Node.js >= 18 (Next.js 14 要求)
- Python >= 3.11 (FastAPI + Pydantic v2 要求)

---

## 九、目前可能存在的问题

### 已完成的功能 (原 Phase 2 功能)

1. **PDF 预览**: `documents/[id]/page.tsx` 中使用 `<PdfPreview>` 组件，通过 iframe 嵌入 PDF 查看器，支持展开/收起和下载
2. **通知功能**: 新增 `NotificationPanel` 组件，支持通知列表、未读计数、标记已读；后端新增 `Notification` 模型和 `/api/notifications` 路由
3. **设置功能**: 新增 `/settings` 页面，支持修改个人资料（姓名、邮箱）和修改密码；后端新增 `/api/user/profile` 和 `/api/user/change-password` 路由
4. **数据报表**: 新增 `/admin/reports` 页面，使用 ECharts 展示用户分布、文档状态分布、用户与文档对比等图表
5. **简答题 AI 评分**: 后端 `submit_quiz` 函数集成 DeepSeek API，使用 rubric 评分标准对简答题进行 AI 评分（概念准确性 40 分、逻辑完整性 30 分、证据支撑 20 分、语言表达 10 分），未配置 API 时回退到规则评分

### 代码质量问题

1. **Mock 数据与真实数据混合**: `api.ts` 中开发环境自动返回 Mock 数据，可能导致测试不准确
2. **硬编码的轮询逻辑**: `upload/page.tsx` 中轮询 20 次 x 1.5 秒 = 最多 30 秒等待
3. **嵌入向量非真实语义**: `stable_embedding()` 使用 SHA-256 哈希生成伪向量，语义搜索实际为关键词匹配
4. **错误处理不一致**: 部分 API 使用 `throw error`，部分使用 Mock 回退

### 安全风险

1. **API Key 暴露风险**: `.env` 文件可能被误提交 (已在 `.gitignore` 中)
2. **JWT 密钥**: `API_SECRET_KEY` 默认值为 `change-me`，生产环境必须修改
3. **Worker Token**: `API_WORKER_INTERNAL_TOKEN` 默认值为 `dev-worker-token`
4. **CORS 配置**: 生产环境需要正确配置 `API_CORS_ORIGINS`

### 潜在问题

1. **文件上传大小限制**: 前端 `MAX_FILE_SIZE_BYTES = 30MB`，后端 `max_upload_bytes` 默认也是 30MB，需保持一致
2. **数据库迁移**: 使用 `auto_create_tables=True`，生产环境应使用 Alembic 迁移
3. **前端缓存**: API 请求使用 `cache: "no-store"`，可能影响性能
4. **错误边界**: 部分页面缺少 Error Boundary 处理

### 未使用的文件

1. `frontend/button-analysis.md` - 似乎是分析文档，非代码文件
2. `frontend/design-references/` - 设计参考文件，非运行时依赖

---

## 十、后续 Agent 修改指南

### 修改首页

- **主要文件**: `frontend/web/app/page.tsx` (首页组件)
- **布局文件**: `frontend/web/components/site-shell.tsx` (侧边栏导航)
- **通知组件**: `frontend/web/components/notification-panel.tsx` (通知面板)
- **设置页面**: `frontend/web/app/settings/page.tsx` (用户设置)
- **样式文件**: `frontend/web/tailwind.config.ts` (主题色)

### 修改核心交互逻辑

- **上传流程**: `frontend/web/app/upload/page.tsx` + `backend/api/app/routers/documents.py`
- **处理流水线**: `backend/api/app/services/pipeline.py` (核心！900+ 行)
- **测评流程**: `frontend/web/components/quiz-runner.tsx` + `backend/api/app/routers/quizzes.py`
- **AI 评分**: `backend/api/app/services/pipeline.py` 中的 `_ai_score_short_answer()` 函数
- **复习流程**: `frontend/web/app/review/page.tsx` + `backend/api/app/routers/reports.py`
- **通知系统**: `frontend/web/components/notification-panel.tsx` + `backend/api/app/routers/notifications.py`
- **用户设置**: `frontend/web/app/settings/page.tsx` + `backend/api/app/routers/user_settings.py`

### 修改 AI 生成逻辑

- **DeepSeek 集成**: `backend/api/app/services/deepseek.py`
- **OCR 集成**: `backend/api/app/services/ocr.py`
- **嵌入向量**: `backend/api/app/services/embedding.py` (或 `pipeline.py` 中的 `stable_embedding`)
- **回退逻辑**: `backend/api/app/services/pipeline.py` 中的 `_build_payload_from_ocr()`
- **AI 评分**: `backend/api/app/services/pipeline.py` 中的 `_ai_score_short_answer()` 函数

### 修改样式

- **全局样式**: `frontend/web/app/globals.css`
- **Tailwind 主题**: `frontend/web/tailwind.config.ts`
- **组件样式**: 各组件文件中的 className (Tailwind 类)

### 修改部署配置

- **Docker Compose**: `infrastructure/docker-compose.yml`
- **Dockerfile**: `infrastructure/docker/` 目录下
- **环境变量**: `.env` + `.env.example`
- **Python 依赖**: `backend/api/pyproject.toml`
- **Node 依赖**: `frontend/web/package.json` + 根 `package.json`

### 新增功能优先入手点

1. **新增 API**: 在 `backend/api/app/routers/` 下新建路由文件，在 `main.py` 中注册
2. **新增页面**: 在 `frontend/web/app/` 下新建目录和 `page.tsx`
3. **新增组件**: 在 `frontend/web/components/` 下新建组件
4. **新增数据模型**: 在 `backend/api/app/models.py` 中添加，在 `schemas.py` 中添加 Pydantic 模型
5. **修改共享类型**: 在 `integration/contracts/src/index.ts` 中修改，前后端同步更新
6. **新增 API 调用**: 在 `frontend/web/lib/api.ts` 中添加请求函数

### 修改前必须谨慎的文件

1. `backend/api/app/services/pipeline.py` - 核心业务逻辑，修改需充分测试
2. `backend/api/app/security.py` - 安全相关，修改需谨慎
3. `backend/api/app/config.py` - 配置管理，修改需同步更新 `.env`
4. `frontend/web/lib/api.ts` - 所有 API 调用入口
5. `integration/contracts/src/index.ts` - 前后端共享类型，修改需同步
6. `backend/api/app/models.py` - 数据模型，修改需同步更新数据库迁移
7. `frontend/web/components/site-shell.tsx` - 全局布局，修改需测试所有页面

---

## 十一、项目总结

### 这个项目是做什么的

**AI Study Notes** (品牌名 Lumina AI) 是一个 AI 驱动的自学笔记平台。它允许学生上传 PDF 课件/笔记，系统自动使用 OCR 和大语言模型 (DeepSeek) 提取文本、生成结构化知识节点、构建思维导图、创建测评题库，并提供 AI 评分反馈和智能复习队列，形成完整的学习闭环。

### 核心亮点

1. **完整学习闭环**: 上传 → 知识提取 → 思维导图 → 测评 → 反馈 → 复习 → 检索
2. **AI 驱动**: DeepSeek 生成知识节点、思维导图和测评题；AI rubric 评分简答题
3. **优雅降级**: 无 AI API 时自动使用模板化回退，无 Redis 时使用内联处理
4. **现代 UI**: Material Design 3 风格，毛玻璃效果，响应式布局
5. **前后端共享类型**: TypeScript 接口定义保证前后端数据一致性
6. **功能全面**: PDF 预览、通知系统、用户设置、管理报表等完整功能

### 当前代码组织情况

- **Monorepo 架构**: 前端、后端、集成、基础设施清晰分离
- **模块化设计**: 路由、服务、模型、Schema 分层清晰
- **API 契约**: 前后端通过 `@ai-study-notes/contracts` 共享类型定义
- **Mock 支持**: 开发环境自动回退到 Mock 数据，便于独立开发
- **Docker 支持**: 完整的 Docker Compose 编排
- **功能完整**: MVP 功能已全部实现，包括 PDF 预览、通知、设置、数据报表、AI 评分等

### 后续维护最应该注意什么

1. **安全配置**: 生产环境必须修改 `API_SECRET_KEY`、`API_WORKER_INTERNAL_TOKEN`、数据库密码
2. **AI 服务稳定性**: DeepSeek API 调用需做好重试和降级处理
3. **嵌入向量质量**: 当前使用 SHA-256 伪向量，如需真实语义搜索需接入真正的 Embedding 模型
4. **AI 评分质量**: 简答题 AI 评分依赖 DeepSeek API，需确保 API 可用性；评分结果可能因模型版本变化而有所不同
5. **性能优化**: 文档处理是耗时操作，建议增加 WebSocket 实时状态推送替代前端轮询
6. **通知系统**: 通知目前存储在数据库中，大量通知可能影响查询性能，建议定期清理过期通知

---

> 文档生成时间: 2026-05-28
> 基于代码库 commit 状态分析