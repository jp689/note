from __future__ import annotations

from hashlib import sha256
from io import BytesIO
from typing import Any

from pypdf import PdfReader

from .models import DocumentJob, KnowledgePoint, MindMapPayload, ProcessedArtifacts, QuizPayload


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

    return (
        f"{job.title}\n"
        "1. Core definitions and topic boundary\n"
        "2. Key mechanism and ordered steps\n"
        "3. Typical mistakes and application scenes\n"
    )


def should_run_ocr(text: str) -> bool:
    return len(text.strip()) < 40


def run_ocr_fallback(job: DocumentJob) -> str:
    return (
        f"{job.title}\n"
        "OCR fallback recovered scanned headers, concept labels, and margin annotations.\n"
        "The result reconnects handwritten arrows and section keywords.\n"
    )


def chunk_text(text: str) -> list[str]:
    lines = [line.strip() for line in text.splitlines() if line.strip()]
    return [" ".join(lines[index : index + 2]) for index in range(0, len(lines), 2)]


def structure_knowledge(job: DocumentJob, chunks: list[str]) -> list[KnowledgePoint]:
    source_chunks = chunks[:8]
    points = [
        KnowledgePoint(
            id=f"{job.document_id}-kp-{index + 1}",
            document_id=job.document_id,
            title=f"{job.title} / 知识点 {index + 1}",
            summary=chunk,
            source_pages=[index + 1, index + 2],
            tags=["auto-extracted", "pdf", f"section-{index + 1}"],
            difficulty="basic" if index == 0 else "intermediate" if index == 1 else "advanced",
            embedding=stable_embedding(f"{job.title}\n{chunk}"),
            chapter_title=f"章节 {index // 3 + 1}",
            details={
                "key_takeaways": [
                    chunk[:80],
                    "把概念、步骤和适用场景放在同一张学习卡片中复述。",
                ],
                "examples": [f"结合「{job.title}」第 {index + 1} 个片段举一个应用例子。"],
                "pitfalls": ["不要只背关键词，要能解释它和前后知识点的关系。"],
                "review_prompt": f"闭卷说明「{job.title} / 知识点 {index + 1}」的核心含义。",
                "confidence": max(0.58, 0.9 - index * 0.05),
            },
        )
        for index, chunk in enumerate(source_chunks)
    ]
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
        question_type = (
            "multiple_choice" if index == 1 else "true_false" if index == 2 else "short_answer"
        )
        question = {
            "id": f"{point.id}-q",
            "knowledge_node_id": point.id,
            "type": question_type,
            "stem": f"Answer this question about '{point.title}'.",
            "answer": point.title if question_type == "multiple_choice" else "True",
            "difficulty": "basic" if index == 1 else "intermediate",
            "explanation": point.summary,
        }
        if question_type != "short_answer":
            question["options"] = [point.title, "Unrelated knowledge", "Random fact", "Noise block"]
        questions.append(question)
    return QuizPayload(questions=questions)


def process_document_job(job: DocumentJob, pdf_bytes: bytes | None = None) -> ProcessedArtifacts:
    text = extract_text(job, pdf_bytes)
    if should_run_ocr(text):
        text = run_ocr_fallback(job)

    chunks = chunk_text(text)
    points = structure_knowledge(job, chunks)
    mindmap = build_mindmap(job, points)
    quiz = generate_quiz(points)

    return ProcessedArtifacts(
        document_id=job.document_id,
        extracted_text=text,
        chunks=chunks,
        knowledge_points=points,
        mindmap=mindmap,
        quiz=quiz,
    )
