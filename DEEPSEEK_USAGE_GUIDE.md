# DeepSeek 使用指南

## 快速开始

### 1. 配置 API 密钥

您的 DeepSeek API 密钥已经配置在 `.env` 文件中：

```env
API_DEEPSEEK_BASE_URL=https://dashscope.aliyuncs.com/compatible-mode/v1
API_DEEPSEEK_API_KEY=<replace-with-your-api-key>
API_DEEPSEEK_MODEL=deepseek-v3
```

### 2. 启动应用

#### 启动后端
```bash
cd backend/api
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

#### 启动前端
```bash
cd frontend/web
npm run dev
```

### 3. 使用流程

1. **访问应用**: 打开浏览器访问 `http://localhost:3000`
2. **登录**: 使用演示账户或注册新账户
3. **上传文档**: 点击"上传"按钮上传 PDF 文档
4. **等待处理**: 系统会自动处理文档并生成：
   - 知识节点
   - 思维导图
   - 测验题目

## 功能详解

### 知识节点生成

DeepSeek 会从文档中提取关键知识点，每个节点包含：
- **标题**: 知识点的名称
- **摘要**: 知识点的详细说明
- **标签**: 分类标签
- **难度**: basic/intermediate/advanced

### 思维导图生成

系统会创建层次化的思维导图：
- **根节点**: 文档标题
- **章节节点**: 主要知识分类
- **概念节点**: 具体知识点

### 测验题目生成

系统会生成多样化的测验题目：
- **选择题**: 4个选项的单选题
- **判断题**: True/False 判断题
- **简答题**: 开放性问题

## 高级配置

### 修改生成参数

在 `backend/api/app/services/deepseek.py` 中可以调整：

```python
# 修改生成数量
def generate_knowledge_nodes(self, document_title: str, text_chunks: list[str]) -> list[dict[str, Any]]:
    # 修改 max_nodes 参数
    max_nodes = 5  # 默认最多5个节点

def generate_quiz_questions(self, document_title: str, knowledge_nodes: list[dict[str, Any]], question_count: int = 5) -> list[dict[str, Any]]:
    # 修改 question_count 参数
    question_count = 5  # 默认5道题
```

### 调整生成质量

```python
# 在 _call_api 方法中调整温度参数
def _call_api(self, messages: list[dict[str, str]], temperature: float = 0.7) -> str:
    # temperature: 0.0-1.0，越低越确定性
    # 知识提取: 0.3 (更确定性)
    # 创意生成: 0.7 (更创造性)
```

## 故障排除

### 问题1: API 连接失败
**症状**: 日志显示 "DeepSeek API request failed"
**解决方案**:
1. 检查网络连接
2. 验证 API 密钥是否正确
3. 检查 API 端点是否可访问

### 问题2: 生成内容质量不佳
**症状**: 生成的知识节点或测验题目不符合预期
**解决方案**:
1. 调整温度参数 (降低 temperature 值)
2. 优化提示词 (修改 `deepseek.py` 中的 prompt)
3. 增加输入文本质量

### 问题3: 处理速度慢
**症状**: 文档处理时间过长
**解决方案**:
1. 减少生成数量 (降低 max_nodes, question_count)
2. 缩短输入文本长度
3. 检查网络延迟

## 监控和日志

### 查看日志
```bash
# 后端日志
cd backend/api
uvicorn app.main:app --reload --log-level debug

# 查看特定日志
grep -i "deepseek" logs/app.log
```

### 关键日志信息
- `Using DeepSeek AI for content generation`: DeepSeek 正在使用
- `DeepSeek not configured, using fallback generation`: 使用回退模式
- `DeepSeek generation failed`: 生成失败，使用回退

## 性能优化

### 1. 缓存配置
考虑添加 Redis 缓存来存储生成结果：

```python
# 在 config.py 中添加
redis_cache_url: str = "redis://localhost:6379/1"
cache_ttl: int = 3600  # 1小时缓存
```

### 2. 批量处理
对于多个文档，考虑批量处理：

```python
# 在 pipeline.py 中添加批量处理支持
async def process_batch_documents(self, documents: list[Document]) -> list[PipelineResult]:
    # 并行处理多个文档
```

### 3. 异步处理
使用异步处理提高并发性能：

```python
# 在 deepseek.py 中使用异步请求
import aiohttp

async def _call_api_async(self, messages: list[dict[str, str]]) -> str:
    async with aiohttp.ClientSession() as session:
        async with session.post(url, json=payload) as response:
            return await response.json()
```

## 安全建议

### 1. API 密钥管理
- 不要将 API 密钥提交到版本控制系统
- 使用环境变量或密钥管理服务
- 定期轮换 API 密钥

### 2. 输入验证
- 验证上传文档的类型和大小
- 清理用户输入，防止注入攻击
- 限制生成内容的长度

### 3. 访问控制
- 实施用户认证和授权
- 限制 API 调用频率
- 监控异常访问模式

## 扩展功能

### 1. 多模型支持
考虑支持多个 AI 模型：

```python
# 在 config.py 中添加
ai_provider: str = "deepseek"  # deepseek, openai, azure
fallback_provider: str = "template"
```

### 2. 自定义提示词
允许用户自定义生成提示词：

```python
# 在 schemas.py 中添加
class CustomPromptRequest(BaseModel):
    knowledge_prompt: str = None
    mindmap_prompt: str = None
    quiz_prompt: str = None
```

### 3. 导出功能
支持导出生成的内容：

```python
# 在 routers/documents.py 中添加导出路由
@router.get("/{document_id}/export")
async def export_document(document_id: str, format: str = "json"):
    # 支持 JSON, Markdown, PDF 等格式
```

## 最佳实践

### 1. 文档质量
- 上传清晰、结构化的 PDF 文档
- 确保文档内容完整，避免扫描件模糊
- 文档大小建议在 10MB 以内

### 2. 内容优化
- 对于技术文档，增加专业术语
- 对于学术论文，保持原文结构
- 对于教材，注意章节划分

### 3. 结果验证
- 定期检查生成内容的质量
- 收集用户反馈，优化生成策略
- 建立质量评估机制

## 常见问题

### Q1: 为什么生成的知识节点数量不同？
A1: 系统根据文档内容自动决定节点数量，通常在 3-5 个之间。您可以通过修改 `max_nodes` 参数调整。

### Q2: 如何提高测验题目的质量？
A2: 确保上传的文档内容清晰、结构完整。同时可以调整温度参数和提示词。

### Q3: 系统支持哪些文档格式？
A3: 目前主要支持 PDF 格式。未来可能支持 Word、PPT 等格式。

### Q4: 如何查看生成的中间结果？
A4: 检查后端日志，可以看到详细的生成过程和中间结果。

## 技术支持

如有问题或建议，请：
1. 查看日志文件获取详细信息
2. 检查配置是否正确
3. 参考本文档的故障排除部分
4. 联系开发团队获取支持
