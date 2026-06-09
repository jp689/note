from worker.models import DocumentJob
from worker.pipeline import chunk_text, process_document_job, should_run_ocr


def test_should_run_ocr_when_text_is_too_short() -> None:
    assert should_run_ocr("tiny")


def test_chunk_text_groups_lines() -> None:
    chunks = chunk_text("one\ntwo\nthree\nfour\n")

    assert chunks == ["one two", "three four"]


def test_process_document_job_builds_artifacts() -> None:
    job = DocumentJob(
        document_id="doc-test",
        title="Signals and Systems",
        storage_key="documents/doc-test/source.pdf",
    )

    artifacts = process_document_job(job)

    assert artifacts.document_id == "doc-test"
    assert len(artifacts.knowledge_points) >= 2
    assert len(artifacts.knowledge_points) <= 8
    first_point = artifacts.knowledge_points[0]
    assert first_point.chapter_title
    assert first_point.details["key_takeaways"]
    assert first_point.details["review_prompt"]
    assert first_point.details["confidence"] > 0
    assert artifacts.mindmap.nodes[0]["level"] == 0
    assert "summary" in artifacts.mindmap.nodes[0]
    assert "relation_type" in artifacts.mindmap.edges[0]
    assert len(artifacts.quiz.questions) >= 2


def test_process_document_job_generates_content_based_chinese_quiz() -> None:
    job = DocumentJob(
        document_id="doc-marx",
        title="《马克思主义原理》知识点整理.pdf",
        storage_key="documents/doc-marx/source.pdf",
    )

    text = (
        "马克思主义哲学强调实践是认识的基础。\n"
        "生产力和生产关系的矛盾运动推动社会形态发展。\n"
        "剩余价值理论揭示资本主义生产方式中的价值增殖机制。\n"
        "人民群众是历史创造者，需要结合具体历史条件理解社会变迁。"
    )

    artifacts = process_document_job(job, text.encode("utf-8"))

    stems = " ".join(str(question["stem"]) for question in artifacts.quiz.questions)
    options = " ".join(
        " ".join(question.get("options", []))
        for question in artifacts.quiz.questions
        if isinstance(question.get("options"), list)
    )

    assert "Answer this question" not in stems
    assert "Module" not in stems
    assert "Unrelated knowledge" not in options
    assert "马克思主义" in stems
    assert any("实践" in point.summary or "实践" in point.title for point in artifacts.knowledge_points)
