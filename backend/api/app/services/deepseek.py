"""
DeepSeek API service for generating knowledge nodes, mind maps, and quiz questions.

Uses Alibaba Cloud's DashScope API (compatible with OpenAI format) to generate
structured learning content from document text.
"""

from __future__ import annotations

import json
import logging
from typing import Any

import requests

from ..config import settings

logger = logging.getLogger(__name__)


class DeepSeekError(Exception):
    """Raised when DeepSeek API returns an error."""
    pass


class DeepSeekService:
    """Service for interacting with DeepSeek API via Alibaba Cloud DashScope."""

    def __init__(self) -> None:
        self.base_url = settings.deepseek_base_url
        self.api_key = settings.deepseek_api_key
        self.model = settings.deepseek_model

    @property
    def is_configured(self) -> bool:
        """Check if DeepSeek is properly configured."""
        return bool(self.api_key)

    def _get_headers(self) -> dict[str, str]:
        """Get request headers with authorization."""
        return {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }

    def _call_api(self, messages: list[dict[str, str]], temperature: float = 0.7) -> str:
        """
        Call DeepSeek API with messages.

        Args:
            messages: List of message dictionaries
            temperature: Sampling temperature

        Returns:
            Generated text response
        """
        if not self.is_configured:
            raise DeepSeekError("DeepSeek API key not configured")

        headers = self._get_headers()
        payload = {
            "model": self.model,
            "messages": messages,
            "temperature": temperature,
            "max_tokens": 4096,
        }

        try:
            response = requests.post(
                f"{self.base_url}/chat/completions",
                headers=headers,
                json=payload,
                timeout=120,
            )
            response.raise_for_status()
            result = response.json()
            return result["choices"][0]["message"]["content"]
        except requests.exceptions.RequestException as e:
            raise DeepSeekError(f"DeepSeek API request failed: {e}")
        except (KeyError, IndexError) as e:
            raise DeepSeekError(f"Invalid DeepSeek API response: {e}")

    def generate_knowledge_nodes(self, document_title: str, text_chunks: list[str]) -> list[dict[str, Any]]:
        """
        Generate knowledge nodes from document text.

        Args:
            document_title: Title of the document
            text_chunks: List of text chunks from the document

        Returns:
            List of knowledge node dictionaries
        """
        combined_text = "\n\n".join(text_chunks[:3])  # Limit to first 3 chunks

        prompt = f"""你是一个专业的知识提取专家。请从以下文档内容中提取关键知识点，生成知识节点。

文档标题：{document_title}

文档内容：
{combined_text}

请按照以下JSON格式返回知识节点数组（最多5个节点）：
[
  {{
    "title": "知识点标题",
    "summary": "知识点摘要（100-200字）",
    "tags": ["标签1", "标签2"],
    "difficulty": "basic/intermediate/advanced",
    "chapter_title": "所属章节",
    "key_takeaways": ["核心要点1", "核心要点2"],
    "examples": ["应用例子"],
    "pitfalls": ["常见误区"],
    "review_prompt": "复习提示问题",
    "confidence": 0.85
  }}
]

要求：
1. 提取核心概念、关键机制、重要应用场景
2. 每个知识点应该有清晰的定义和解释
3. 标签应该反映知识点的属性和关联
4. 难度等级根据理解难度划分
5. chapter_title、key_takeaways、examples、pitfalls、review_prompt 必须面向学生复习
6. confidence 使用 0 到 1 的小数
7. 只返回JSON数组，不要有其他文字"""

        messages = [
            {"role": "system", "content": "你是一个专业的知识提取和结构化专家，擅长从文档中提取关键知识点并组织成结构化的知识图谱。"},
            {"role": "user", "content": prompt},
        ]

        response_text = self._call_api(messages, temperature=0.3)

        try:
            # Try to extract JSON from response
            json_start = response_text.find("[")
            json_end = response_text.rfind("]") + 1
            if json_start >= 0 and json_end > json_start:
                json_str = response_text[json_start:json_end]
                nodes = json.loads(json_str)
                return nodes if isinstance(nodes, list) else []
        except json.JSONDecodeError:
            logger.warning("Failed to parse knowledge nodes JSON from DeepSeek response")

        return []

    def generate_mindmap(self, document_title: str, knowledge_nodes: list[dict[str, Any]]) -> dict[str, Any]:
        """
        Generate mind map structure from knowledge nodes.

        Args:
            document_title: Title of the document
            knowledge_nodes: List of knowledge node dictionaries

        Returns:
            Mind map dictionary with nodes and edges
        """
        nodes_text = "\n".join([
            f"- {node.get('title', 'Unknown')}: {node.get('summary', '')[:50]}..."
            for node in knowledge_nodes
        ])

        prompt = f"""你是一个思维导图设计专家。请根据以下知识节点设计一个思维导图结构。

文档标题：{document_title}

知识节点：
{nodes_text}

请按照以下JSON格式返回思维导图结构：
{{
  "nodes": [
    {{"id": "root", "label": "{document_title}", "group": "root"}},
    {{"id": "chapter-1", "label": "章节标题", "group": "chapter"}},
    {{"id": "concept-1", "label": "概念标题", "group": "concept", "summary": "一句话摘要", "source_pages": [1], "level": 2, "knowledge_node_id": "knowledge-id"}}
  ],
  "edges": [
    {{"source": "root", "target": "chapter-1", "label": "章节", "relation_type": "contains", "strength": 0.9}},
    {{"source": "chapter-1", "target": "concept-1", "label": "知识点", "relation_type": "contains", "strength": 0.8}}
  ]
}}

要求：
1. 创建清晰的层次结构：root -> chapter -> concept
2. 章节应该反映知识的主要分类
3. 概念应该对应具体的知识点
4. 边的标签应该反映关系类型
5. 只返回JSON对象，不要有其他文字"""

        messages = [
            {"role": "system", "content": "你是一个思维导图设计专家，擅长将知识组织成清晰的层次结构。"},
            {"role": "user", "content": prompt},
        ]

        response_text = self._call_api(messages, temperature=0.3)

        try:
            # Try to extract JSON from response
            json_start = response_text.find("{")
            json_end = response_text.rfind("}") + 1
            if json_start >= 0 and json_end > json_start:
                json_str = response_text[json_start:json_end]
                mindmap = json.loads(json_str)
                return mindmap if isinstance(mindmap, dict) else {}
        except json.JSONDecodeError:
            logger.warning("Failed to parse mindmap JSON from DeepSeek response")

        return {}

    def generate_quiz_questions(
        self,
        document_title: str,
        knowledge_nodes: list[dict[str, Any]],
        question_count: int = 5
    ) -> list[dict[str, Any]]:
        """
        Generate quiz questions from knowledge nodes.

        Args:
            document_title: Title of the document
            knowledge_nodes: List of knowledge node dictionaries
            question_count: Number of questions to generate

        Returns:
            List of quiz question dictionaries
        """
        nodes_text = "\n".join([
            f"- {node.get('title', 'Unknown')}: {node.get('summary', '')[:100]}..."
            for node in knowledge_nodes
        ])

        prompt = f"""你是一个教育测评专家。请根据以下知识节点设计{question_count}道测验题目。

文档标题：{document_title}

知识节点：
{nodes_text}

请按照以下JSON格式返回测验题目数组：
[
  {{
    "knowledge_node_title": "对应知识点标题",
    "type": "multiple_choice/true_false/short_answer",
    "stem": "题目内容",
    "options": ["选项A", "选项B", "选项C", "选项D"],
    "answer": "正确答案",
    "explanation": "答案解析",
    "difficulty": "basic/intermediate/advanced"
  }}
]

要求：
1. 题目类型多样化：选择题、判断题、简答题
2. 覆盖不同难度等级
3. 选择题需要4个选项
4. 判断题选项为["True", "False"]
5. 简答题的answer应该是参考答案
6. 每道题都要有详细的解析
7. 只返回JSON数组，不要有其他文字"""

        messages = [
            {"role": "system", "content": "你是一个教育测评专家，擅长设计高质量的测验题目来评估学生对知识点的掌握程度。"},
            {"role": "user", "content": prompt},
        ]

        response_text = self._call_api(messages, temperature=0.3)

        try:
            # Try to extract JSON from response
            json_start = response_text.find("[")
            json_end = response_text.rfind("]") + 1
            if json_start >= 0 and json_end > json_start:
                json_str = response_text[json_start:json_end]
                questions = json.loads(json_str)
                return questions if isinstance(questions, list) else []
        except json.JSONDecodeError:
            logger.warning("Failed to parse quiz questions JSON from DeepSeek response")

        return []


# Singleton instance
deepseek_service = DeepSeekService()
