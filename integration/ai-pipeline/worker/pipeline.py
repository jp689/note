from __future__ import annotations

import json
import re
from hashlib import sha256
from io import BytesIO
from typing import Any
import urllib.request

from pypdf import PdfReader

from .config import settings
from .models import DocumentJob, KnowledgePoint, MindMapPayload, ProcessedArtifacts, QuizPayload

CHINESE_STOPWORDS = {
    "以及",
    "一个",
    "一种",
    "需要",
    "进行",
    "通过",
    "能够",
    "其中",
    "对于",
    "相关",
}


def stable_embedding(text: str, dimensions: int = 1536) -> list[float]:
    seed = sha256(text.encode("utf-8")).digest()
    values: list[float] = []
    current = seed
    while len(values) < dimensions:
        current = sha256(current + seed).digest()
        values.extend(((byte / 255.0) * 2.0) - 1.0 for byte in current)
    return values[:dimensions]


def extract_text(job: DocumentJob, pdf_bytes: bytes | None = None) -> str:
    if pdf_bytes:
        try:
            reader = PdfReader(BytesIO(pdf_bytes))
            page_text = [page.extract_text() or "" for page in reader.pages]
            text = "\n".join(part.strip() for part in page_text if part.strip())
            if text.strip():
                return text
        except Exception:
            pass
        for encoding in ("utf-8", "gb18030"):
            try:
                decoded = pdf_bytes.decode(encoding).strip()
            except UnicodeDecodeError:
                continue
            if decoded and "%PDF-" not in decoded[:32]:
                return decoded

    return (
        f"{job.title}\n"
        "1. 围绕文档标题提取核心概念和知识边界。\n"
        "2. 梳理关键机制、论证步骤和概念关系。\n"
        "3. 标注典型误区、应用场景和复习提示。\n"
    )


def should_run_ocr(text: str) -> bool:
    return len(text.strip()) < 40


def run_ocr_fallback(job: DocumentJob) -> str:
    return (
        f"{job.title}\n"
        "OCR 暂未返回足够文字，请重新处理或上传文字型 PDF。\n"
        "系统会先根据标题建立临时复习卡片，待 OCR 可用后覆盖为完整分析。\n"
    )


def chunk_text(text: str) -> list[str]:
    raw_lines = [line.strip() for line in text.splitlines() if line.strip()]
    if len(raw_lines) >= 2:
        return [
            " ".join(raw_lines[index : index + 2])
            for index in range(0, min(len(raw_lines), 16), 2)
        ]

    normalized = re.sub(r"\s+", " ", text.replace("\u3000", " ")).strip()
    sentences = [
        sentence.strip(" ：:;；、,，")
        for sentence in re.split(r"(?<=[。！？!?])|\n+", normalized)
        if sentence.strip(" ：:;；、,，")
    ]
    if len(sentences) <= 1:
        sentences = [part.strip() for part in re.split(r"[。；;.!?]", normalized) if part.strip()]
    chunks: list[str] = []
    current = ""
    for sentence in sentences:
        if current and len(current) + len(sentence) > 420:
            chunks.append(current)
            current = sentence
        else:
            current = f"{current} {sentence}".strip() if current else sentence
    if current:
        chunks.append(current)
    return chunks[:8] or [normalized[:420]]


def clean_title(title: str) -> str:
    return re.sub(r"\.pdf$", "", title, flags=re.IGNORECASE).strip(" 《》") or title


def extract_key_phrase(text: str, fallback: str) -> str:
    clean = re.sub(r"[\d\s《》“”\"'（）()【】\[\]：:；;，,。.!！?？]+", " ", text)
    candidates = re.findall(r"[\u4e00-\u9fffA-Za-z][\u4e00-\u9fffA-Za-z\-]{1,18}", clean)
    scored: list[tuple[int, str]] = []
    for candidate in candidates:
        if candidate in CHINESE_STOPWORDS:
            continue
        score = len(candidate)
        if any(marker in candidate for marker in ("主义", "理论", "实践", "矛盾", "关系", "价值", "机制", "历史", "哲学")):
            score += 12
        scored.append((score, candidate))
    if not scored:
        return fallback
    return max(scored, key=lambda item: item[0])[1][:24]


def make_takeaways(chunk: str, title: str) -> list[str]:
    parts = [part.strip() for part in re.split(r"[。；;.!?！？]", chunk) if part.strip()]
    takeaways = parts[:2] or [chunk[:120]]
    if len(takeaways) == 1:
        takeaways.append(f"复习时要说明「{title}」的定义、依据和适用条件。")
    return takeaways[:3]


def as_string_list(value: object, limit: int) -> list[str]:
    if not isinstance(value, list):
        return []
    return [str(item).strip() for item in value if str(item).strip()][:limit]


def as_float(value: object, fallback: float) -> float:
    try:
        return float(value)
    except (TypeError, ValueError):
        return fallback


def _ai_credentials() -> tuple[str, str, str] | None:
    api_key = settings.deepseek_api_key or settings.openai_api_key
    if not api_key:
        return None
    base_url = settings.deepseek_base_url if settings.deepseek_api_key else settings.openai_base_url
    model = settings.deepseek_model
    return base_url.rstrip("/"), api_key, model


def _extract_json_object(text: str) -> dict[str, Any]:
    start = text.find("{")
    end = text.rfind("}") + 1
    if start < 0 or end <= start:
        return {}
    try:
        payload = json.loads(text[start:end])
    except json.JSONDecodeError:
        return {}
    return payload if isinstance(payload, dict) else {}


def _call_text_model(prompt: str) -> dict[str, Any]:
    credentials = _ai_credentials()
    if not credentials:
        return {}
    base_url, api_key, model = credentials
    body = json.dumps(
        {
            "model": model,
            "temperature": 0.25,
            "max_tokens": 4096,
            "messages": [
                {
                    "role": "system",
                    "content": "你是严谨的课程资料解析助手，只输出可解析 JSON，不编造原文不存在的信息。",
                },
                {"role": "user", "content": prompt},
            ],
        }
    ).encode("utf-8")
    request = urllib.request.Request(
        f"{base_url}/chat/completions",
        data=body,
        headers={
            "authorization": f"Bearer {api_key}",
            "content-type": "application/json",
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(request, timeout=120) as response:
            result = json.loads(response.read().decode("utf-8"))
    except Exception:
        return {}
    try:
        content = result["choices"][0]["message"]["content"]
    except (KeyError, IndexError, TypeError):
        return {}
    return _extract_json_object(str(content))


def generate_ai_artifacts(job: DocumentJob, chunks: list[str]) -> tuple[list[KnowledgePoint], QuizPayload] | None:
    title_root = clean_title(job.title)
    source_text = "\n\n".join(f"[片段 {index + 1}]\n{chunk}" for index, chunk in enumerate(chunks[:8]))
    prompt = f"""请根据 PDF 识别文字生成学习结构，必须使用中文，不能输出英文模板题。

文档标题：{title_root}

识别文字：
{source_text}

返回 JSON 对象，格式如下：
{{
  "knowledge_points": [
    {{
      "title": "从原文抽取的知识点标题",
      "summary": "120字以内摘要，必须来自识别文字",
      "tags": ["标签"],
      "difficulty": "basic/intermediate/advanced",
      "chapter_title": "章节或主题名",
      "key_takeaways": ["要点1", "要点2"],
      "examples": ["原文相关例子或应用"],
      "pitfalls": ["易错点"],
      "review_prompt": "复习提问",
      "confidence": 0.8
    }}
  ],
  "quiz": [
    {{
      "knowledge_node_index": 0,
      "type": "multiple_choice/true_false/short_answer",
      "stem": "中文题干，必须考察原文概念",
      "options": ["选择题四项或判断题True/False"],
      "answer": "答案",
      "explanation": "解析",
      "difficulty": "basic/intermediate/advanced"
    }}
  ]
}}

要求：
1. 最多 8 个 knowledge_points，至少 3 道 quiz。
2. title 不得是 Module、知识点1 这类占位标题。
3. quiz.stem 不得包含 Answer this question。
4. 选择题干扰项必须是同主题常见误解，不能是 Random fact、Noise block、Unrelated knowledge。
5. 只返回 JSON 对象。"""
    payload = _call_text_model(prompt)
    raw_points = payload.get("knowledge_points")
    raw_quiz = payload.get("quiz")
    if not isinstance(raw_points, list) or not raw_points:
        return None

    points: list[KnowledgePoint] = []
    for index, raw in enumerate(raw_points[:8]):
        if not isinstance(raw, dict):
            continue
        title = str(raw.get("title") or "").strip()
        summary = str(raw.get("summary") or "").strip()
        if not title or "Module" in title or not summary:
            continue
        difficulty = raw.get("difficulty") if raw.get("difficulty") in {"basic", "intermediate", "advanced"} else "basic"
        takeaways = as_string_list(raw.get("key_takeaways"), 4)
        points.append(
            KnowledgePoint(
                id=f"{job.document_id}-kp-{index + 1}",
                document_id=job.document_id,
                title=title[:80],
                summary=summary,
                source_pages=[index + 1, index + 2],
                tags=as_string_list(raw.get("tags"), 5) or [title_root[:12]],
                difficulty=difficulty,
                embedding=stable_embedding(f"{title}\n{summary}"),
                chapter_title=str(raw.get("chapter_title") or f"{title_root} · 第 {index // 3 + 1} 组"),
                details={
                    "key_takeaways": takeaways or make_takeaways(summary, title),
                    "examples": as_string_list(raw.get("examples"), 3),
                    "pitfalls": as_string_list(raw.get("pitfalls"), 3),
                    "review_prompt": str(raw.get("review_prompt") or f"解释「{title}」并引用原文依据。"),
                    "confidence": as_float(raw.get("confidence"), 0.78),
                },
            )
        )
    if not points:
        return None
    for index, point in enumerate(points[:-1]):
        point.relations = [
            {
                "target_id": points[index + 1].id,
                "label": "leads_to",
                "reason": "模型根据识别文字判定为相邻学习路径。",
                "strength": 0.74,
            }
        ]

    questions: list[dict[str, object]] = []
    if isinstance(raw_quiz, list):
        for index, raw in enumerate(raw_quiz[: max(3, min(8, len(points)))]):
            if not isinstance(raw, dict):
                continue
            point_index = raw.get("knowledge_node_index")
            if not isinstance(point_index, int) or point_index < 0 or point_index >= len(points):
                point_index = min(index, len(points) - 1)
            point = points[point_index]
            question_type = raw.get("type") if raw.get("type") in {"multiple_choice", "true_false", "short_answer"} else "short_answer"
            stem = str(raw.get("stem") or "").strip()
            if not stem or "Answer this question" in stem:
                continue
            question: dict[str, object] = {
                "id": f"{point.id}-q-{index + 1}",
                "knowledge_node_id": point.id,
                "type": question_type,
                "stem": stem,
                "answer": raw.get("answer") or "",
                "difficulty": raw.get("difficulty") if raw.get("difficulty") in {"basic", "intermediate", "advanced"} else point.difficulty,
                "explanation": str(raw.get("explanation") or point.summary),
            }
            options = raw.get("options")
            if question_type != "short_answer":
                question["options"] = [str(option) for option in options if isinstance(option, str)][:4] if isinstance(options, list) else ["True", "False"]
            questions.append(question)

    return points, QuizPayload(questions=questions or generate_quiz(points).questions)


def structure_knowledge(job: DocumentJob, chunks: list[str]) -> list[KnowledgePoint]:
    title_root = clean_title(job.title)
    source_chunks = chunks[:8]
    points: list[KnowledgePoint] = []
    for index, chunk in enumerate(source_chunks):
        phrase = extract_key_phrase(chunk, f"{title_root}知识点{index + 1}")
        takeaways = make_takeaways(chunk, phrase)
        points.append(
            KnowledgePoint(
            id=f"{job.document_id}-kp-{index + 1}",
            document_id=job.document_id,
            title=phrase,
            summary=chunk,
            source_pages=[index + 1, index + 2],
            tags=[title_root[:12], phrase[:12], f"section-{index + 1}"],
            difficulty="basic" if index == 0 else "intermediate" if index == 1 else "advanced",
            embedding=stable_embedding(f"{job.title}\n{chunk}"),
            chapter_title=f"{title_root} · 第 {index // 3 + 1} 组",
            details={
                "key_takeaways": takeaways,
                "examples": [f"结合原文说明「{phrase}」如何支撑 {title_root} 的论述。"],
                "pitfalls": [f"不要只背「{phrase}」这个词，要能说清它与上下文的关系。"],
                "review_prompt": f"闭卷解释「{phrase}」的含义，并引用一个原文依据。",
                "confidence": max(0.58, 0.9 - index * 0.05),
            },
        )
        )
    for index, point in enumerate(points[:-1]):
        point.relations = [
            {
                "target_id": points[index + 1].id,
                "label": "leads_to",
                "reason": "相邻片段在原文中连续出现，适合按学习路径串联。",
                "strength": 0.68,
            }
        ]
    return points


def build_mindmap(job: DocumentJob, points: list[KnowledgePoint]) -> MindMapPayload:
    nodes = [
        {
            "id": f"{job.document_id}-root",
            "label": job.title,
            "group": "root",
            "summary": "文档学习总览",
            "source_pages": [],
            "level": 0,
        }
    ]
    edges: list[dict[str, Any]] = []
    chapter_ids: dict[str, str] = {}
    for index, point in enumerate(points, start=1):
        chapter_id = chapter_ids.get(point.chapter_title)
        if chapter_id is None:
            chapter_id = f"{job.document_id}-chapter-{len(chapter_ids) + 1}"
            chapter_ids[point.chapter_title] = chapter_id
            nodes.append(
                {
                    "id": chapter_id,
                    "label": point.chapter_title,
                    "group": "chapter",
                    "summary": "按原文顺序聚合的知识章节",
                    "source_pages": point.source_pages,
                    "level": 1,
                }
            )
            edges.append(
                {
                    "source": f"{job.document_id}-root",
                    "target": chapter_id,
                    "label": "章节",
                    "relation_type": "contains",
                    "strength": 0.9,
                }
            )
        node_id = f"{job.document_id}-node-{index}"
        nodes.append(
            {
                "id": node_id,
                "label": point.title,
                "group": "concept",
                "knowledge_node_id": point.id,
                "summary": point.summary[:160],
                "source_pages": point.source_pages,
                "level": 2,
            }
        )
        edges.append(
            {
                "source": chapter_id,
                "target": node_id,
                "label": "知识点",
                "relation_type": "contains",
                "strength": 0.84,
            }
        )
    return MindMapPayload(nodes=nodes, edges=edges)


def generate_quiz(points: list[KnowledgePoint]) -> QuizPayload:
    questions = []
    for index, point in enumerate(points, start=1):
        document_topic = str(point.tags[0]) if point.tags else "文档"
        question_type = (
            "multiple_choice" if index == 1 else "true_false" if index == 2 else "short_answer"
        )
        question = {
            "id": f"{point.id}-q",
            "knowledge_node_id": point.id,
            "type": question_type,
            "stem": f"在《{document_topic}》中，关于「{point.title}」，下列哪项最符合原文分析？" if question_type == "multiple_choice"
            else f"判断：《{document_topic}》中理解「{point.title}」时必须结合原文语境和相关概念关系。"
            if question_type == "true_false"
            else f"请结合《{document_topic}》说明「{point.title}」的核心含义，并指出它在文档中的作用。",
            "answer": point.details.get("key_takeaways", [point.summary])[0] if question_type == "multiple_choice" else "True",
            "difficulty": "basic" if index == 1 else "intermediate",
            "explanation": point.summary,
        }
        if question_type != "short_answer":
            correct = str(question["answer"])
            question["options"] = [
                correct,
                f"只记住「{point.title}」名词，不需要理解关系",
                "脱离原文语境直接套用概念",
                "把相邻章节的概念混为同一含义",
            ]
        else:
            question["answer"] = f"应说明「{point.title}」的定义、原文依据、上下游概念关系和一个例子。"
        questions.append(question)
    return QuizPayload(questions=questions)


def process_document_job(job: DocumentJob, pdf_bytes: bytes | None = None) -> ProcessedArtifacts:
    text = extract_text(job, pdf_bytes)
    if should_run_ocr(text):
        text = run_ocr_fallback(job)

    chunks = chunk_text(text)
    ai_artifacts = generate_ai_artifacts(job, chunks)
    if ai_artifacts:
        points, quiz = ai_artifacts
    else:
        points = structure_knowledge(job, chunks)
        quiz = generate_quiz(points)
    mindmap = build_mindmap(job, points)

    return ProcessedArtifacts(
        document_id=job.document_id,
        extracted_text=text,
        chunks=chunks,
        knowledge_points=points,
        mindmap=mindmap,
        quiz=quiz,
    )
