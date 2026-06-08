from __future__ import annotations

import json
import logging
import math
from datetime import UTC, datetime
from hashlib import sha256
from pathlib import Path
from uuid import uuid4

from sqlalchemy import delete, desc, or_, select
from sqlalchemy.orm import Session, selectinload

from .. import models
from ..config import settings
from .deepseek import deepseek_service
from ..schemas import (
    AttemptReport,
    DocumentSummary,
    FeedbackHighlight,
    GenerateQuizRequest,
    KnowledgeNode,
    KnowledgeRelation,
    MindMapEdge,
    MindMapGraph,
    MindMapNode,
    PipelineChunk,
    PipelineCompleteRequest,
    QuizQuestion,
    QuizSession,
    ReviewQueueItem,
    SearchResult,
    SubmitQuizRequest,
    UserProfile,
)

logger = logging.getLogger(__name__)


def now_utc() -> datetime:
    return datetime.now(UTC)


def stable_embedding(text: str, dimensions: int = 1536) -> list[float]:
    seed = sha256(text.encode("utf-8")).digest()
    values: list[float] = []
    current = seed
    while len(values) < dimensions:
        current = sha256(current + seed).digest()
        values.extend(((byte / 255.0) * 2.0) - 1.0 for byte in current)
    return values[:dimensions]


def cosine(left: list[float], right: list[float]) -> float:
    if not left or not right:
        return 0.0
    length = min(len(left), len(right))
    dot = sum(left[index] * right[index] for index in range(length))
    left_norm = math.sqrt(sum(value * value for value in left[:length]))
    right_norm = math.sqrt(sum(value * value for value in right[:length]))
    if not left_norm or not right_norm:
        return 0.0
    return dot / (left_norm * right_norm)


def user_to_profile(user: models.User) -> UserProfile:
    return UserProfile(
        id=user.id,
        email=user.email,
        full_name=user.full_name,
        is_admin=user.is_admin,
        is_active=user.is_active,
    )


def document_to_summary(document: models.Document, job_id: str | None = None) -> DocumentSummary:
    return DocumentSummary(
        id=document.id,
        title=document.title,
        status=document.status,  # type: ignore[arg-type]
        source_type="pdf",
        page_count=document.page_count,
        uploaded_at=document.created_at,
        progress_label=document.progress_label,
        error_message=document.error_message,
        job_id=job_id,
        file_size=document.file_size,
        analysis_version=document.analysis_version,
    )


def _string_list(value: object) -> list[str]:
    if not isinstance(value, list):
        return []
    return [item for item in value if isinstance(item, str)]


def _optional_float(value: object) -> float | None:
    if isinstance(value, int | float):
        return float(value)
    return None


def knowledge_to_schema(node: models.KnowledgeNode) -> KnowledgeNode:
    details = node.details or {}
    return KnowledgeNode(
        id=node.id,
        document_id=node.document_id,
        title=node.title,
        summary=node.summary,
        tags=node.tags or [],
        source_pages=node.source_pages or [],
        difficulty=node.difficulty,  # type: ignore[arg-type]
        embedding=node.embedding or [],
        relations=[
            KnowledgeRelation(
                target_id=item["target_id"],
                label=item["label"],
                reason=str(item.get("reason") or ""),
                strength=_optional_float(item.get("strength")),
            )
            for item in (node.relations or [])
            if "target_id" in item and "label" in item
        ],
        chapter_title=node.chapter_title,
        key_takeaways=_string_list(details.get("key_takeaways")),
        examples=_string_list(details.get("examples")),
        pitfalls=_string_list(details.get("pitfalls")),
        review_prompt=str(details.get("review_prompt") or ""),
        confidence=_optional_float(details.get("confidence")),
    )


def quiz_to_schema(quiz: models.QuizSession) -> QuizSession:
    return QuizSession(
        id=quiz.id,
        document_id=quiz.document_id,
        generated_at=quiz.generated_at,
        status=quiz.status,  # type: ignore[arg-type]
        questions=[
            QuizQuestion(
                id=question.id,
                knowledge_node_id=question.knowledge_node_id,
                type=question.type,  # type: ignore[arg-type]
                stem=question.stem,
                options=question.options,
                answer=question.answer,
                explanation=question.explanation,
                difficulty=question.difficulty,  # type: ignore[arg-type]
            )
            for question in quiz.questions
        ],
    )


def mindmap_to_schema(graph: models.MindMapGraph) -> MindMapGraph:
    return MindMapGraph(
        document_id=graph.document_id,
        nodes=[MindMapNode(**node) for node in graph.nodes],
        edges=[MindMapEdge(**edge) for edge in graph.edges],
    )


def report_to_schema(report: models.FeedbackReport) -> AttemptReport:
    return AttemptReport(
        id=report.id,
        quiz_id=report.quiz_id,
        score=report.score,
        strengths=report.strengths or [],
        weak_points=[FeedbackHighlight(**item) for item in (report.weak_points or [])],
        next_review=report.next_review or [],
    )


def review_to_schema(item: models.ReviewQueueItem) -> ReviewQueueItem:
    return ReviewQueueItem(
        knowledge_node_id=item.knowledge_node_id,
        title=item.title,
        priority=item.priority,  # type: ignore[arg-type]
        recommendation=item.recommendation,
    )


def build_demo_payload(document: models.Document) -> PipelineCompleteRequest:
    title_root = document.title.replace(".pdf", "").strip() or "Untitled document"
    chunks = [
        PipelineChunk(content=f"{title_root} 的核心定义和学习边界。", source_pages=[1, 2]),
        PipelineChunk(content=f"{title_root} 的关键机制、步骤和公式。", source_pages=[3, 4]),
        PipelineChunk(content=f"{title_root} 的典型误区、应用场景和复习建议。", source_pages=[5, 6]),
    ]
    knowledge_nodes = [
        KnowledgeNode(
            id=f"{document.id}-kn-1",
            document_id=document.id,
            title=f"{title_root} / 核心定义",
            summary=chunks[0].content,
            tags=["definition", "overview", "pdf"],
            source_pages=[1, 2],
            difficulty="basic",
            embedding=stable_embedding(chunks[0].content),
            relations=[KnowledgeRelation(target_id=f"{document.id}-kn-2", label="leads_to")],
        ),
        KnowledgeNode(
            id=f"{document.id}-kn-2",
            document_id=document.id,
            title=f"{title_root} / 关键机制",
            summary=chunks[1].content,
            tags=["mechanism", "workflow", "analysis"],
            source_pages=[3, 4],
            difficulty="intermediate",
            embedding=stable_embedding(chunks[1].content),
            relations=[KnowledgeRelation(target_id=f"{document.id}-kn-3", label="supports")],
        ),
        KnowledgeNode(
            id=f"{document.id}-kn-3",
            document_id=document.id,
            title=f"{title_root} / 应用与误区",
            summary=chunks[2].content,
            tags=["application", "mistakes", "review"],
            source_pages=[5, 6],
            difficulty="advanced",
            embedding=stable_embedding(chunks[2].content),
            relations=[KnowledgeRelation(target_id=f"{document.id}-kn-2", label="revisits")],
        ),
    ]
    mindmap = MindMapGraph(
        document_id=document.id,
        nodes=[
            MindMapNode(id=f"{document.id}-root", label=title_root, group="root"),
            MindMapNode(id=f"{document.id}-chapter-1", label="知识总览", group="chapter"),
            MindMapNode(id=f"{document.id}-chapter-2", label="核心机制", group="chapter"),
            MindMapNode(id=f"{document.id}-chapter-3", label="练习反馈", group="chapter"),
            MindMapNode(id=f"{document.id}-concept-1", label="定义", group="concept"),
            MindMapNode(id=f"{document.id}-concept-2", label="机制", group="concept"),
            MindMapNode(id=f"{document.id}-practice", label="复习闭环", group="practice"),
        ],
        edges=[
            MindMapEdge(source=f"{document.id}-root", target=f"{document.id}-chapter-1", label="chapter"),
            MindMapEdge(source=f"{document.id}-root", target=f"{document.id}-chapter-2", label="chapter"),
            MindMapEdge(source=f"{document.id}-root", target=f"{document.id}-chapter-3", label="chapter"),
            MindMapEdge(source=f"{document.id}-chapter-1", target=f"{document.id}-concept-1", label="extract"),
            MindMapEdge(source=f"{document.id}-chapter-2", target=f"{document.id}-concept-2", label="expand"),
            MindMapEdge(source=f"{document.id}-chapter-3", target=f"{document.id}-practice", label="practice"),
        ],
    )
    quiz = QuizSession(
        id=f"quiz-{uuid4().hex[:10]}",
        document_id=document.id,
        generated_at=now_utc(),
        questions=[
            QuizQuestion(
                id=f"{document.id}-q-1",
                knowledge_node_id=knowledge_nodes[0].id,
                type="multiple_choice",
                stem=f"以下哪一项最适合作为《{title_root}》的一级知识锚点？",
                options=["核心定义", "无关背景", "随机术语", "噪声片段"],
                answer="核心定义",
                explanation="一级知识锚点应该承载文档主题和后续知识展开。",
                difficulty="basic",
            ),
            QuizQuestion(
                id=f"{document.id}-q-2",
                knowledge_node_id=knowledge_nodes[1].id,
                type="true_false",
                stem="结构化笔记应该保留来源页码，便于核验。",
                options=["True", "False"],
                answer="True",
                explanation="页码引用可以降低 AI 结果不可追溯的风险。",
                difficulty="basic",
            ),
            QuizQuestion(
                id=f"{document.id}-q-3",
                knowledge_node_id=knowledge_nodes[2].id,
                type="short_answer",
                stem="说明你会优先复习哪个知识区域，并给出理由。",
                answer="优先复习关键机制和高频误区，因为它们会影响迁移应用和后续测评表现。",
                explanation="好的回答应包含优先级、理由和后续练习动作。",
                difficulty="advanced",
            ),
        ],
    )
    return PipelineCompleteRequest(
        status="quiz_ready",
        extracted_text="\n".join(chunk.content for chunk in chunks),
        page_count=6,
        chunks=chunks,
        knowledge_nodes=knowledge_nodes,
        mindmap=mindmap,
        quiz=quiz,
    )


def apply_pipeline_result(
    db: Session,
    job: models.TaskJob,
    payload: PipelineCompleteRequest,
) -> models.Document:
    document = db.get(models.Document, job.document_id)
    if document is None:
        raise KeyError(job.document_id)
    if job.status == "completed":
        return document

    if payload.status == "failed":
        document.status = "failed"
        document.error_message = payload.error_message or "Pipeline failed"
        document.progress_label = "文档处理失败，可稍后重试"
        job.status = "failed"
        job.error_message = document.error_message
        db.commit()
        return document

    existing_knowledge_ids = db.scalars(
        select(models.KnowledgeNode.id).where(models.KnowledgeNode.document_id == document.id)
    ).all()
    if existing_knowledge_ids:
        db.execute(
            delete(models.ReviewQueueItem).where(
                models.ReviewQueueItem.user_id == document.user_id,
                models.ReviewQueueItem.knowledge_node_id.in_(existing_knowledge_ids),
            )
        )

    existing_quiz_ids = db.scalars(
        select(models.QuizSession.id).where(models.QuizSession.document_id == document.id)
    ).all()
    if existing_quiz_ids:
        db.execute(delete(models.FeedbackReport).where(models.FeedbackReport.quiz_id.in_(existing_quiz_ids)))
        db.execute(delete(models.QuizAnswer).where(models.QuizAnswer.quiz_id.in_(existing_quiz_ids)))
        db.execute(delete(models.QuizQuestion).where(models.QuizQuestion.quiz_id.in_(existing_quiz_ids)))
        db.execute(delete(models.QuizSession).where(models.QuizSession.id.in_(existing_quiz_ids)))

    db.execute(delete(models.DocumentChunk).where(models.DocumentChunk.document_id == document.id))
    db.execute(delete(models.KnowledgeNode).where(models.KnowledgeNode.document_id == document.id))
    db.execute(delete(models.MindMapGraph).where(models.MindMapGraph.document_id == document.id))

    chunks = payload.chunks or [
        PipelineChunk(content=payload.extracted_text or document.title, source_pages=[1])
    ]
    for index, chunk in enumerate(chunks):
        db.add(
            models.DocumentChunk(
                id=f"chunk-{uuid4().hex[:12]}",
                document_id=document.id,
                chunk_index=index,
                content=chunk.content,
                source_pages=chunk.source_pages,
                section_path=chunk.section_path,
                embedding=chunk.embedding or stable_embedding(chunk.content),
            )
        )

    for node in payload.knowledge_nodes:
        db.add(
            models.KnowledgeNode(
                id=node.id,
                document_id=document.id,
                title=node.title,
                summary=node.summary,
                tags=node.tags,
                source_pages=node.source_pages,
                difficulty=node.difficulty,
                embedding=node.embedding or stable_embedding(f"{node.title}\n{node.summary}"),
                relations=[
                    {
                        "target_id": relation.target_id,
                        "label": relation.label,
                        "reason": relation.reason,
                        "strength": relation.strength,
                    }
                    for relation in node.relations
                ],
                chapter_title=node.chapter_title,
                details={
                    "key_takeaways": node.key_takeaways,
                    "examples": node.examples,
                    "pitfalls": node.pitfalls,
                    "review_prompt": node.review_prompt,
                    "confidence": node.confidence,
                },
            )
        )

    if payload.mindmap:
        db.add(
            models.MindMapGraph(
                id=f"map-{uuid4().hex[:12]}",
                document_id=document.id,
                version=1,
                nodes=[node.model_dump() for node in payload.mindmap.nodes],
                edges=[edge.model_dump() for edge in payload.mindmap.edges],
            )
        )

    if payload.quiz:
        quiz = models.QuizSession(
            id=payload.quiz.id,
            user_id=document.user_id,
            document_id=document.id,
            status=payload.quiz.status,
            generated_at=payload.quiz.generated_at,
        )
        db.add(quiz)
        for question in payload.quiz.questions:
            db.add(
                models.QuizQuestion(
                    id=question.id,
                    quiz_id=quiz.id,
                    document_id=document.id,
                    knowledge_node_id=question.knowledge_node_id,
                    type=question.type,
                    stem=question.stem,
                    options=question.options,
                    answer=question.answer,
                    explanation=question.explanation,
                    difficulty=question.difficulty,
                )
            )

    document.status = "quiz_ready"
    document.error_message = None
    document.page_count = max(document.page_count, payload.page_count, 1)
    document.analysis_version = 2
    document.progress_label = "知识图谱、思维导图和首轮测评已生成"
    job.status = "completed"

    # Create notification for document processing completion
    db.add(
        models.Notification(
            id=f"notif-{uuid4().hex[:10]}",
            user_id=document.user_id,
            type="success",
            title="文档处理完成",
            message=f"「{document.title}」已完成处理，可以开始测评了。",
            is_read=False,
            link=f"/documents/{document.id}",
        )
    )

    db.commit()
    db.refresh(document)
    return document


def _get_pdf_file_path(document: models.Document) -> str | None:
    """Get the local file path for a stored PDF document."""
    local_root = Path(settings.local_storage_dir).resolve()
    file_path = (local_root / document.file_key).resolve()
    try:
        file_path.relative_to(local_root)
    except ValueError:
        return None
    return str(file_path) if file_path.exists() else None


def _build_payload_from_ocr(document: models.Document, ocr_text: str, page_count: int) -> PipelineCompleteRequest:
    """Build pipeline payload from OCR-extracted text using DeepSeek AI."""
    title_root = document.title.replace(".pdf", "").strip() or "Untitled document"

    # Split text into chunks (max ~2000 chars each)
    max_chunk_size = 2000
    raw_chunks: list[str] = []
    current_chunk = ""

    for paragraph in ocr_text.split("\n"):
        paragraph = paragraph.strip()
        if not paragraph:
            continue
        if len(current_chunk) + len(paragraph) > max_chunk_size and current_chunk:
            raw_chunks.append(current_chunk)
            current_chunk = paragraph
        else:
            current_chunk = f"{current_chunk}\n{paragraph}" if current_chunk else paragraph

    if current_chunk:
        raw_chunks.append(current_chunk)

    # Ensure at least one chunk
    if not raw_chunks:
        raw_chunks = [f"{title_root} 的文档内容。"]

    # Limit to 8 chunks max for richer v2 analysis without overloading prompts.
    raw_chunks = raw_chunks[:8]

    chunks = [
        PipelineChunk(
            content=chunk,
            source_pages=[i * 2 + 1, i * 2 + 2],
        )
        for i, chunk in enumerate(raw_chunks)
    ]

    # Try to use DeepSeek for intelligent content generation
    knowledge_nodes = []
    mindmap = None
    quiz = None

    try:
        from .deepseek import deepseek_service, DeepSeekError

        if deepseek_service.is_configured:
            logger.info("Using DeepSeek AI for content generation")

            # Generate knowledge nodes using DeepSeek
            ai_nodes = deepseek_service.generate_knowledge_nodes(title_root, raw_chunks)

            if ai_nodes:
                selected_ai_nodes = ai_nodes[:8]
                for i, node_data in enumerate(selected_ai_nodes):  # Max 8 knowledge nodes
                    node_id = f"{document.id}-kn-{i + 1}"
                    difficulty = node_data.get("difficulty", "basic")
                    if difficulty not in ("basic", "intermediate", "advanced"):
                        difficulty = "basic"

                    tags = node_data.get("tags", [])
                    if not isinstance(tags, list):
                        tags = []

                    knowledge_nodes.append(
                        KnowledgeNode(
                            id=node_id,
                            document_id=document.id,
                            title=node_data.get("title", f"{title_root} / 知识点 {i + 1}"),
                            summary=node_data.get("summary", chunks[i].content[:200]),
                            tags=tags,
                            source_pages=chunks[i].source_pages if i < len(chunks) else [1],
                            difficulty=difficulty,
                            embedding=stable_embedding(node_data.get("summary", "")),
                            relations=[
                                KnowledgeRelation(
                                    target_id=f"{document.id}-kn-{i + 2}",
                                    label="leads_to" if i == 0 else "supports",
                                    reason="相邻知识点在同一学习路径中连续出现。",
                                    strength=0.7,
                                )
                            ] if i < len(selected_ai_nodes) - 1 else [],
                            chapter_title=str(node_data.get("chapter_title") or f"章节 {i // 3 + 1}"),
                            key_takeaways=[
                                item for item in node_data.get("key_takeaways", []) if isinstance(item, str)
                            ][:4],
                            examples=[item for item in node_data.get("examples", []) if isinstance(item, str)][:3],
                            pitfalls=[item for item in node_data.get("pitfalls", []) if isinstance(item, str)][:3],
                            review_prompt=str(
                                node_data.get("review_prompt")
                                or f"复述「{node_data.get('title', title_root)}」的核心含义。"
                            ),
                            confidence=_optional_float(node_data.get("confidence")) or 0.72,
                        )
                    )

            # Generate mind map using DeepSeek
            if knowledge_nodes:
                ai_mindmap = deepseek_service.generate_mindmap(
                    title_root,
                    [{"title": node.title, "summary": node.summary} for node in knowledge_nodes]
                )

                if ai_mindmap and "nodes" in ai_mindmap and "edges" in ai_mindmap:
                    # Process nodes
                    mindmap_nodes = []
                    for node in ai_mindmap["nodes"]:
                        if isinstance(node, dict) and "id" in node and "label" in node:
                            group = node.get("group", "concept")
                            if group not in ("root", "chapter", "concept", "practice"):
                                group = "concept"
                            mindmap_nodes.append(
                                MindMapNode(
                                    id=f"{document.id}-{node['id']}",
                                    label=node["label"],
                                    group=group,
                                    knowledge_node_id=node.get("knowledge_node_id"),
                                    summary=str(node.get("summary") or ""),
                                    source_pages=node.get("source_pages") if isinstance(node.get("source_pages"), list) else [],
                                    level=int(node.get("level") or 1),
                                )
                            )

                    # Process edges
                    mindmap_edges = []
                    for edge in ai_mindmap["edges"]:
                        if isinstance(edge, dict) and "source" in edge and "target" in edge:
                            mindmap_edges.append(
                                MindMapEdge(
                                    source=f"{document.id}-{edge['source']}",
                                    target=f"{document.id}-{edge['target']}",
                                    label=edge.get("label", "related"),
                                    relation_type=str(edge.get("relation_type") or "related"),
                                    strength=_optional_float(edge.get("strength")),
                                )
                            )

                    if mindmap_nodes:
                        mindmap = MindMapGraph(
                            document_id=document.id,
                            nodes=mindmap_nodes,
                            edges=mindmap_edges,
                        )

            # Generate quiz questions using DeepSeek
            if knowledge_nodes:
                ai_questions = deepseek_service.generate_quiz_questions(
                    title_root,
                    [{"title": node.title, "summary": node.summary} for node in knowledge_nodes],
                    question_count=3,
                )

                if ai_questions:
                    quiz_questions = []
                    for i, q_data in enumerate(ai_questions[:3]):
                        q_type = q_data.get("type", "multiple_choice")
                        if q_type not in ("multiple_choice", "true_false", "short_answer"):
                            q_type = "multiple_choice"

                        # Find matching knowledge node
                        kn_title = q_data.get("knowledge_node_title", "")
                        kn_id = knowledge_nodes[0].id
                        for node in knowledge_nodes:
                            if node.title == kn_title:
                                kn_id = node.id
                                break

                        # Parse options
                        options = q_data.get("options", [])
                        if not isinstance(options, list):
                            options = []

                        # For true_false, ensure options are correct
                        if q_type == "true_false":
                            options = ["True", "False"]

                        quiz_questions.append(
                            QuizQuestion(
                                id=f"{document.id}-q-{i + 1}",
                                knowledge_node_id=kn_id,
                                type=q_type,
                                stem=q_data.get("stem", f"关于{title_root}的问题"),
                                options=options if options else None,
                                answer=q_data.get("answer", ""),
                                explanation=q_data.get("explanation", ""),
                                difficulty=q_data.get("difficulty", "basic"),
                            )
                        )

                    if quiz_questions:
                        quiz = QuizSession(
                            id=f"quiz-{uuid4().hex[:10]}",
                            document_id=document.id,
                            generated_at=now_utc(),
                            questions=quiz_questions,
                        )

        else:
            logger.info("DeepSeek not configured, using fallback generation")

    except DeepSeekError as e:
        logger.warning("DeepSeek generation failed: %s, using fallback", e)
    except Exception as e:
        logger.warning("Unexpected error in DeepSeek generation: %s, using fallback", e)

    # Fallback to template-based generation if DeepSeek failed or not configured
    if not knowledge_nodes:
        node_titles = ["核心定义", "关键概念", "重要机制", "应用场景", "总结与回顾"]

        for i, chunk in enumerate(chunks[:8]):  # Max 8 knowledge nodes
            node_id = f"{document.id}-kn-{i + 1}"
            difficulty = "basic" if i == 0 else "intermediate" if i == 1 else "advanced"
            tags = ["definition", "overview"] if i == 0 else ["concept", "analysis"] if i == 1 else ["application", "review"]

            knowledge_nodes.append(
                KnowledgeNode(
                    id=node_id,
                    document_id=document.id,
                    title=f"{title_root} / {node_titles[i % len(node_titles)]}",
                    summary=chunk.content[:200] + "..." if len(chunk.content) > 200 else chunk.content,
                    tags=tags,
                    source_pages=chunk.source_pages,
                    difficulty=difficulty,
                    embedding=stable_embedding(chunk.content),
                    relations=[
                        KnowledgeRelation(
                            target_id=f"{document.id}-kn-{i + 2}",
                            label="leads_to" if i == 0 else "supports",
                            reason="原文片段顺序相邻，适合连续复习。",
                            strength=0.66,
                        )
                    ] if i < len(chunks) - 1 else [],
                    chapter_title=f"章节 {i // 3 + 1}",
                    key_takeaways=[
                        chunk.content[:120],
                        "把这个知识点和前后片段串起来复述。",
                    ],
                    examples=[f"用「{title_root}」中的片段 {i + 1} 举一个应用例子。"],
                    pitfalls=["只记关键词而不理解关系，会影响后续测评。"],
                    review_prompt=f"闭卷解释「{title_root} / {node_titles[i % len(node_titles)]}」。",
                    confidence=max(0.58, 0.86 - i * 0.04),
                )
            )

    if not mindmap:
        node_titles = ["核心定义", "关键概念", "重要机制", "应用场景", "总结与回顾"]
        mindmap_nodes = [
            MindMapNode(id=f"{document.id}-root", label=title_root, group="root", summary="文档学习总览", level=0),
        ]
        mindmap_edges = []

        for i in range(min(8, len(knowledge_nodes))):
            chapter_id = f"{document.id}-chapter-{i + 1}"
            concept_id = f"{document.id}-concept-{i + 1}"
            mindmap_nodes.append(
                MindMapNode(
                    id=chapter_id,
                    label=knowledge_nodes[i].chapter_title or node_titles[i % len(node_titles)],
                    group="chapter",
                    summary="按原文顺序聚合的章节",
                    source_pages=knowledge_nodes[i].source_pages,
                    level=1,
                )
            )
            mindmap_nodes.append(
                MindMapNode(
                    id=concept_id,
                    label=knowledge_nodes[i].title,
                    group="concept",
                    knowledge_node_id=knowledge_nodes[i].id,
                    summary=knowledge_nodes[i].summary[:160],
                    source_pages=knowledge_nodes[i].source_pages,
                    level=2,
                )
            )
            mindmap_edges.append(
                MindMapEdge(
                    source=f"{document.id}-root",
                    target=chapter_id,
                    label="章节",
                    relation_type="contains",
                    strength=0.9,
                )
            )
            mindmap_edges.append(
                MindMapEdge(
                    source=chapter_id,
                    target=concept_id,
                    label="知识点",
                    relation_type="contains",
                    strength=0.82,
                )
            )

        mindmap = MindMapGraph(
            document_id=document.id,
            nodes=mindmap_nodes,
            edges=mindmap_edges,
        )

    if not quiz:
        quiz = QuizSession(
            id=f"quiz-{uuid4().hex[:10]}",
            document_id=document.id,
            generated_at=now_utc(),
            questions=[
                QuizQuestion(
                    id=f"{document.id}-q-1",
                    knowledge_node_id=knowledge_nodes[0].id,
                    type="multiple_choice",
                    stem=f"以下哪一项最适合作为《{title_root}》的一级知识锚点？",
                    options=["核心定义", "无关背景", "随机术语", "噪声片段"],
                    answer="核心定义",
                    explanation="一级知识锚点应该承载文档主题和后续知识展开。",
                    difficulty="basic",
                ),
                QuizQuestion(
                    id=f"{document.id}-q-2",
                    knowledge_node_id=knowledge_nodes[0].id,
                    type="true_false",
                    stem="结构化笔记应该保留来源页码，便于核验。",
                    options=["True", "False"],
                    answer="True",
                    explanation="页码引用可以降低 AI 结果不可追溯的风险。",
                    difficulty="basic",
                ),
                QuizQuestion(
                    id=f"{document.id}-q-3",
                    knowledge_node_id=knowledge_nodes[-1].id,
                    type="short_answer",
                    stem="说明你会优先复习哪个知识区域，并给出理由。",
                    answer="优先复习关键机制和高频误区，因为它们会影响迁移应用和后续测评表现。",
                    explanation="好的回答应包含优先级、理由和后续练习动作。",
                    difficulty="advanced",
                ),
            ],
        )

    return PipelineCompleteRequest(
        status="quiz_ready",
        extracted_text="\n".join(chunk.content for chunk in chunks),
        page_count=max(page_count, len(chunks)),
        chunks=chunks,
        knowledge_nodes=knowledge_nodes,
        mindmap=mindmap,
        quiz=quiz,
    )


def process_document_inline(db: Session, document: models.Document, job: models.TaskJob) -> models.Document:
    document.status = "parsing"
    document.progress_label = "正在提取文本并生成知识结构"
    job.status = "running"
    db.commit()

    # Try OCR extraction if configured
    ocr_text = None
    page_count = 1

    try:
        from .ocr import ocr_service, PaddleOcrError

        if ocr_service.is_configured:
            file_path = _get_pdf_file_path(document)
            if file_path:
                logger.info("Starting OCR extraction for document %s", document.id)
                document.progress_label = "正在使用 PaddleOCR 提取文本..."
                db.commit()

                ocr_result = ocr_service.extract_from_file(file_path)
                ocr_text = ocr_result.full_text
                page_count = ocr_result.page_count
                logger.info(
                    "OCR extraction completed: %d pages, %d chars",
                    page_count,
                    len(ocr_text),
                )
            else:
                logger.warning("PDF file not found for document %s, using fallback", document.id)
        else:
            logger.info("PaddleOCR not configured, using fallback demo payload")
    except PaddleOcrError as e:
        logger.warning("OCR extraction failed: %s, using fallback", e)
    except Exception as e:
        logger.warning("Unexpected OCR error: %s, using fallback", e)

    # Build payload from OCR text or fallback to demo
    if ocr_text:
        payload = _build_payload_from_ocr(document, ocr_text, page_count)
    else:
        payload = build_demo_payload(document)

    return apply_pipeline_result(db, job, payload)


def get_latest_quiz(db: Session, document_id: str, user_id: str) -> models.QuizSession | None:
    return db.scalar(
        select(models.QuizSession)
        .options(selectinload(models.QuizSession.questions))
        .where(models.QuizSession.document_id == document_id, models.QuizSession.user_id == user_id)
        .order_by(desc(models.QuizSession.generated_at))
    )


def generate_quiz(db: Session, user: models.User, request: GenerateQuizRequest) -> QuizSession:
    document = db.scalar(
        select(models.Document).where(models.Document.id == request.document_id, models.Document.user_id == user.id)
    )
    if document is None:
        raise KeyError(request.document_id)

    query = select(models.KnowledgeNode).where(models.KnowledgeNode.document_id == document.id)
    if request.knowledge_node_ids:
        query = query.where(models.KnowledgeNode.id.in_(request.knowledge_node_ids))
    nodes = db.scalars(query).all()
    if not nodes:
        payload = build_demo_payload(document)
        nodes = [
            models.KnowledgeNode(
                id=node.id,
                document_id=document.id,
                title=node.title,
                summary=node.summary,
                tags=node.tags,
                source_pages=node.source_pages,
                difficulty=node.difficulty,
                embedding=node.embedding,
                relations=[{"target_id": relation.target_id, "label": relation.label} for relation in node.relations],
            )
            for node in payload.knowledge_nodes
        ]

    quiz = models.QuizSession(
        id=f"quiz-{uuid4().hex[:10]}",
        user_id=user.id,
        document_id=document.id,
        status="generated",
        generated_at=now_utc(),
    )
    db.add(quiz)
    for index, node in enumerate(nodes[: max(1, request.question_count)]):
        question_type = "multiple_choice" if index == 0 else "true_false" if index == 1 else "short_answer"
        options = None
        answer: str | list[str] = "True"
        if question_type == "multiple_choice":
            options = [node.title, "随机背景材料", "无关指标", "历史噪声"]
            answer = node.title
        elif question_type == "true_false":
            options = ["True", "False"]
        else:
            answer = f"概括 {node.title}，引用来源页码，并说明它为什么影响复习。"

        db.add(
            models.QuizQuestion(
                id=f"{node.id}-generated-{uuid4().hex[:6]}",
                quiz_id=quiz.id,
                document_id=document.id,
                knowledge_node_id=node.id,
                type=question_type,
                stem=f"回答关于「{node.title}」的问题。",
                options=options,
                answer=answer,
                explanation=f"重点参考：{node.summary}",
                difficulty=request.difficulty or node.difficulty,
            )
        )
    db.commit()
    quiz = db.scalar(
        select(models.QuizSession).options(selectinload(models.QuizSession.questions)).where(models.QuizSession.id == quiz.id)
    )
    return quiz_to_schema(quiz)


def _ai_score_short_answer(question_stem: str, reference_answer: str, user_answer: str) -> tuple[int, str]:
    """
    Use DeepSeek AI to score a short answer with rubric-based evaluation.
    Falls back to rule-based scoring if AI is unavailable.

    Returns: (score, feedback)
    """
    if not deepseek_service.is_configured:
        score = 80 if len(user_answer.strip()) >= 24 else 55
        feedback = "答案内容充实，涵盖关键要素。" if score >= 70 else "答案过短，未体现概念、证据和应用。"
        return score, feedback

    prompt = f"""你是一位教育评估专家，请根据评分标准对学生作答进行评分。

题目：{question_stem}

参考答案：{reference_answer}

学生作答：{user_answer}

请按照以下标准评分（0-100分）：
1. 概念准确性（40分）：是否包含核心概念和关键术语
2. 逻辑完整性（30分）：论述是否有逻辑，结构是否清晰
3. 证据支撑（20分）：是否有具体例子或证据支持
4. 语言表达（10分）：表达是否清晰准确

请按照以下JSON格式返回评分结果：
{{
  "score": 85,
  "feedback": "简要评语（50字以内）"
}}

只返回JSON对象，不要有其他文字。"""

    try:
        messages = [
            {"role": "system", "content": "你是一位严格的教育评估专家，擅长根据评分标准对学生作答进行客观评分。"},
            {"role": "user", "content": prompt},
        ]
        response_text = deepseek_service._call_api(messages, temperature=0.2)
        json_start = response_text.find("{")
        json_end = response_text.rfind("}") + 1
        if json_start >= 0 and json_end > json_start:
            json_str = response_text[json_start:json_end]
            result = json.loads(json_str)
            score = max(0, min(100, int(result.get("score", 60))))
            feedback = result.get("feedback", "AI 评分完成")
            return score, feedback
    except Exception as e:
        logger.warning("AI short answer scoring failed, falling back to rule-based: %s", e)

    # Fallback to rule-based scoring
    score = 80 if len(user_answer.strip()) >= 24 else 55
    feedback = "答案内容充实，涵盖关键要素。" if score >= 70 else "答案过短，未体现概念、证据和应用。"
    return score, feedback


def submit_quiz(db: Session, user: models.User, quiz_id: str, request: SubmitQuizRequest) -> tuple[int, AttemptReport]:
    quiz = db.scalar(
        select(models.QuizSession)
        .options(selectinload(models.QuizSession.questions))
        .where(models.QuizSession.id == quiz_id, models.QuizSession.user_id == user.id)
    )
    if quiz is None:
        raise KeyError(quiz_id)

    answers = {item.question_id: item.answer for item in request.answers}
    attempt_id = f"attempt-{uuid4().hex[:10]}"
    objective_questions = [question for question in quiz.questions if question.type != "short_answer"]
    objective_correct = 0
    weak_points: list[FeedbackHighlight] = []

    for question in quiz.questions:
        answer = answers.get(question.id, "")
        is_correct = None
        score = None
        feedback = None
        if question.type == "short_answer":
            reference_answer = question.answer if isinstance(question.answer, str) else str(question.answer)
            score, feedback = _ai_score_short_answer(question.stem, reference_answer, answer)
            if score < 70:
                weak_points.append(
                    FeedbackHighlight(
                        knowledge_node_id=question.knowledge_node_id,
                        title=question.stem,
                        reason=feedback,
                        action="补充定义、页码证据和一个自己的例子。",
                    )
                )
        else:
            is_correct = answer == question.answer
            objective_correct += 1 if is_correct else 0
            score = 100 if is_correct else 0
            if not is_correct:
                weak_points.append(
                    FeedbackHighlight(
                        knowledge_node_id=question.knowledge_node_id,
                        title=question.stem,
                        reason="客观题答案与标准答案不一致。",
                        action="回到对应知识点摘要并重新完成同类型题目。",
                    )
                )
        db.add(
            models.QuizAnswer(
                id=f"answer-{uuid4().hex[:12]}",
                attempt_id=attempt_id,
                quiz_id=quiz.id,
                question_id=question.id,
                user_answer=answer,
                is_correct=is_correct,
                score=score,
                feedback=feedback,
            )
        )

    objective_score = int((objective_correct / max(1, len(objective_questions))) * 100)
    short_scores = []
    for question in quiz.questions:
        if question.type == "short_answer":
            answer = answers.get(question.id, "")
            reference_answer = question.answer if isinstance(question.answer, str) else str(question.answer)
            score, _ = _ai_score_short_answer(question.stem, reference_answer, answer)
            short_scores.append(score)
    final_score = objective_score if not short_scores else int((objective_score + sum(short_scores) / len(short_scores)) / 2)

    if not weak_points and quiz.questions:
        weak_points = [
            FeedbackHighlight(
                knowledge_node_id=quiz.questions[-1].knowledge_node_id,
                title="跨知识点解释",
                reason="下一步需要提升知识点之间的连接表达。",
                action="用思维导图复述上下游关系后再做一次小测。",
            )
        ]

    report = models.FeedbackReport(
        id=attempt_id,
        quiz_id=quiz.id,
        user_id=user.id,
        score=final_score,
        strengths=["客观题识别较稳定", "核心概念已经可以回忆", "知识正在迁移到测评作答"],
        weak_points=[item.model_dump() for item in weak_points],
        next_review=["24 小时内重做同主题短测", "回到源 PDF 核验相关页码", "根据反馈重画一个更小的思维导图"],
    )
    db.add(report)
    db.execute(delete(models.ReviewQueueItem).where(models.ReviewQueueItem.user_id == user.id))
    for item in weak_points:
        db.add(
            models.ReviewQueueItem(
                id=f"review-{uuid4().hex[:12]}",
                user_id=user.id,
                knowledge_node_id=item.knowledge_node_id,
                title=item.title,
                priority="high",
                recommendation=item.action,
            )
        )
    quiz.status = "graded"

    # Create notification for quiz completion
    db.add(
        models.Notification(
            id=f"notif-{uuid4().hex[:10]}",
            user_id=user.id,
            type="success",
            title="测评完成",
            message=f"你已完成测评，得分 {final_score} 分。点击查看详情。",
            is_read=False,
            link=f"/reports/{attempt_id}",
        )
    )
    # Create review reminder notification if there are weak points
    if weak_points:
        db.add(
            models.Notification(
                id=f"notif-{uuid4().hex[:10]}",
                user_id=user.id,
                type="review_reminder",
                title="复习提醒",
                message=f"你有 {len(weak_points)} 个薄弱知识点需要复习。",
                is_read=False,
                link="/review",
            )
        )

    db.commit()
    db.refresh(report)
    return final_score, report_to_schema(report)


def search_knowledge(db: Session, user: models.User, query: str) -> list[SearchResult]:
    lowered = query.strip().lower()
    query_embedding = stable_embedding(lowered or "knowledge")
    rows = db.execute(
        select(models.KnowledgeNode, models.Document)
        .join(models.Document, models.Document.id == models.KnowledgeNode.document_id)
        .where(models.Document.user_id == user.id)
    ).all()
    results: list[SearchResult] = []
    for node, document in rows:
        searchable = " ".join([node.title, node.summary, " ".join(node.tags or [])]).lower()
        keyword_match = bool(lowered and lowered in searchable)
        score = 1.0 if keyword_match else max(0.0, cosine(query_embedding, node.embedding or []))
        if lowered and not keyword_match and score < 0.72:
            continue
        results.append(
            SearchResult(
                node=knowledge_to_schema(node),
                match_type="keyword" if keyword_match else "semantic",
                snippet=f"{node.summary} 来源页码: {', '.join(map(str, node.source_pages or []))}.",
                score=round(score, 4),
                source_pages=node.source_pages or [],
                document_title=document.title,
            )
        )
    return sorted(results, key=lambda item: item.score or 0, reverse=True)
