from __future__ import annotations

from .models import DocumentJob, KnowledgePoint, MindMapPayload, ProcessedArtifacts, QuizPayload


def extract_text(job: DocumentJob) -> str:
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
    return [
        KnowledgePoint(
            id=f"{job.document_id}-kp-{index + 1}",
            title=f"{job.title} / Module {index + 1}",
            summary=chunk,
            source_pages=[index + 1, index + 2],
            tags=["auto-extracted", "pdf", "knowledge"],
        )
        for index, chunk in enumerate(chunks[:3])
    ]


def build_mindmap(job: DocumentJob, points: list[KnowledgePoint]) -> MindMapPayload:
    nodes = [{"id": f"{job.document_id}-root", "label": job.title, "group": "root"}]
    edges: list[dict[str, str]] = []
    for index, point in enumerate(points, start=1):
        node_id = f"{job.document_id}-node-{index}"
        nodes.append({"id": node_id, "label": point.title, "group": "concept"})
        edges.append({"source": f"{job.document_id}-root", "target": node_id, "label": "contains"})
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


def process_document_job(job: DocumentJob) -> ProcessedArtifacts:
    text = extract_text(job)
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
