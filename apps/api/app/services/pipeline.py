from __future__ import annotations

from datetime import UTC, datetime
from uuid import uuid4

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
    QuizQuestion,
    QuizSession,
    ReviewQueueItem,
    SubmitQuizRequest,
)
from ..store import StudyStore


def _now() -> datetime:
    return datetime.now(UTC)


def build_document_artifacts(
    document: DocumentSummary,
) -> tuple[list[KnowledgeNode], MindMapGraph, QuizSession]:
    title_root = document.title.replace(".pdf", "").strip()
    knowledge_nodes = [
        KnowledgeNode(
            id=f"{document.id}-kn-1",
            document_id=document.id,
            title=f"{title_root} / Core Definitions",
            summary="Extract the document theme, first-level concepts, and primary boundaries.",
            tags=["definition", "overview", "core"],
            source_pages=[1, 2],
            difficulty="basic",
            embedding=[0.12, 0.88, 0.44],
            relations=[KnowledgeRelation(target_id=f"{document.id}-kn-2", label="leads_to")],
        ),
        KnowledgeNode(
            id=f"{document.id}-kn-2",
            document_id=document.id,
            title=f"{title_root} / Key Mechanisms",
            summary="Transform steps, formulas, and logic flows into study-ready knowledge nodes.",
            tags=["mechanism", "workflow", "analysis"],
            source_pages=[3, 4, 5],
            difficulty="intermediate",
            embedding=[0.36, 0.61, 0.29],
            relations=[KnowledgeRelation(target_id=f"{document.id}-kn-3", label="supports")],
        ),
        KnowledgeNode(
            id=f"{document.id}-kn-3",
            document_id=document.id,
            title=f"{title_root} / Applications and Pitfalls",
            summary="Collect common exercises, mistakes, and cross-topic links for review feedback.",
            tags=["application", "mistakes", "practice"],
            source_pages=[6, 7, 8],
            difficulty="advanced",
            embedding=[0.71, 0.33, 0.55],
            relations=[KnowledgeRelation(target_id=f"{document.id}-kn-2", label="revisits")],
        ),
    ]

    graph = MindMapGraph(
        document_id=document.id,
        nodes=[
            MindMapNode(id=f"{document.id}-root", label=title_root, group="root"),
            MindMapNode(id=f"{document.id}-chapter-1", label="Knowledge Overview", group="chapter"),
            MindMapNode(id=f"{document.id}-chapter-2", label="Core Mechanisms", group="chapter"),
            MindMapNode(id=f"{document.id}-chapter-3", label="Review Signals", group="chapter"),
            MindMapNode(id=f"{document.id}-concept-1", label="Definitions", group="concept"),
            MindMapNode(id=f"{document.id}-concept-2", label="Mechanisms", group="concept"),
            MindMapNode(id=f"{document.id}-practice", label="Practice Loop", group="practice"),
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
        generated_at=_now(),
        questions=[
            QuizQuestion(
                id=f"{document.id}-q-1",
                knowledge_node_id=knowledge_nodes[0].id,
                type="multiple_choice",
                stem=f"Which option best matches the first-level theme of {title_root}?",
                options=["Concept overview", "Random detail", "Irrelevant extension", "Noise sample"],
                answer="Concept overview",
                explanation="A good first-level theme becomes the anchor for the document outline.",
                difficulty="basic",
            ),
            QuizQuestion(
                id=f"{document.id}-q-2",
                knowledge_node_id=knowledge_nodes[1].id,
                type="true_false",
                stem="Structured notes should preserve page references for verification.",
                options=["True", "False"],
                answer="True",
                explanation="Page references reduce hallucination risk and help users validate outputs.",
                difficulty="basic",
            ),
            QuizQuestion(
                id=f"{document.id}-q-3",
                knowledge_node_id=knowledge_nodes[2].id,
                type="short_answer",
                stem="Explain which knowledge area should be reviewed first and why.",
                answer="Review the highest-impact mistakes around core mechanisms first, because they affect retention and transfer.",
                explanation="A strong answer should include priority, reasoning, and impact on future practice.",
                difficulty="advanced",
            ),
        ],
    )

    return knowledge_nodes, graph, quiz


def process_document(store: StudyStore, document_id: str) -> DocumentSummary:
    document = store.get_document(document_id)
    if document is None:
        raise KeyError(document_id)

    document.status = "parsing"
    document.progress_label = "Extracting text and checking whether OCR fallback is needed"
    store.set_document(document)

    knowledge_nodes, graph, quiz = build_document_artifacts(document)

    document.status = "quiz_ready"
    document.page_count = max(document.page_count, 8)
    document.progress_label = "Knowledge graph, mind map, and first quiz have been generated"
    store.set_document(document)
    store.set_knowledge(document.id, knowledge_nodes)
    store.set_mindmap(document.id, graph)
    store.set_quiz(quiz)
    return document


def generate_quiz(store: StudyStore, request: GenerateQuizRequest) -> QuizSession:
    document = store.get_document(request.document_id)
    if document is None:
        raise KeyError(request.document_id)

    knowledge_nodes = store.get_knowledge(request.document_id)
    if request.knowledge_node_ids:
        selected_ids = set(request.knowledge_node_ids)
        knowledge_nodes = [node for node in knowledge_nodes if node.id in selected_ids]

    if not knowledge_nodes:
        knowledge_nodes, _, _ = build_document_artifacts(document)

    questions: list[QuizQuestion] = []
    for index, node in enumerate(knowledge_nodes[: max(1, request.question_count)]):
        question_type = (
            "multiple_choice" if index == 0 else "true_false" if index == 1 else "short_answer"
        )
        options = None
        answer: str | list[str] = "True"
        if question_type == "multiple_choice":
            options = [node.title, "Random background", "Unrelated metric", "Historical noise"]
            answer = node.title
        elif question_type == "true_false":
            options = ["True", "False"]
        else:
            answer = (
                f"Summarize {node.title}, cite the supporting pages, and explain why it matters for review."
            )

        questions.append(
            QuizQuestion(
                id=f"{node.id}-generated-{index + 1}",
                knowledge_node_id=node.id,
                type=question_type,
                stem=f"Answer this question about '{node.title}'.",
                options=options,
                answer=answer,
                explanation=f"Focus on this summary: {node.summary}",
                difficulty=request.difficulty or node.difficulty,
            )
        )

    quiz = QuizSession(
        id=f"quiz-{uuid4().hex[:10]}",
        document_id=request.document_id,
        generated_at=_now(),
        questions=questions,
    )
    store.set_quiz(quiz)
    return quiz


def submit_quiz(
    store: StudyStore, quiz_id: str, request: SubmitQuizRequest
) -> tuple[int, AttemptReport]:
    quiz = store.get_quiz(quiz_id)
    if quiz is None:
        raise KeyError(quiz_id)

    answers = {item.question_id: item.answer for item in request.answers}
    objective_questions = [question for question in quiz.questions if question.type != "short_answer"]
    objective_correct = sum(
        1 for question in objective_questions if answers.get(question.id) == question.answer
    )
    objective_score = int((objective_correct / max(1, len(objective_questions))) * 100)

    short_answer_questions = [question for question in quiz.questions if question.type == "short_answer"]
    llm_score = 0
    weak_points: list[FeedbackHighlight] = []

    for question in short_answer_questions:
        answer = answers.get(question.id, "")
        if len(answer.strip()) >= 24:
            llm_score += 80
        else:
            llm_score += 55
            weak_points.append(
                FeedbackHighlight(
                    knowledge_node_id=question.knowledge_node_id,
                    title=question.stem,
                    reason="The answer is too short to show concept, evidence, and application.",
                    action="Add the definition, page evidence, and one self-explained example.",
                )
            )

    final_score = objective_score
    if short_answer_questions:
        final_score = int((objective_score + (llm_score // len(short_answer_questions))) / 2)

    if not weak_points:
        weak_points = [
            FeedbackHighlight(
                knowledge_node_id=quiz.questions[-1].knowledge_node_id,
                title="Cross-topic explanation",
                reason="The next step is improving connections across related knowledge nodes.",
                action="Use the mind map to restate upstream and downstream links before the next quiz.",
            )
        ]

    report = AttemptReport(
        id=f"attempt-{uuid4().hex[:10]}",
        quiz_id=quiz.id,
        score=final_score,
        strengths=[
            "Objective question recognition is stable",
            "Core concepts can already be recalled",
            "Knowledge is starting to transfer into quiz answers",
        ],
        weak_points=weak_points,
        next_review=[
            "Redo a short quiz on the same topic within 24 hours",
            "Return to the source PDF and validate the cited pages",
            "Create a smaller mind map revision from the feedback",
        ],
    )
    store.set_report(report)
    store.set_review_queue(
        [
            ReviewQueueItem(
                knowledge_node_id=point.knowledge_node_id,
                title=point.title,
                priority="high",
                recommendation=point.action,
            )
            for point in weak_points
        ]
    )
    return final_score, report
