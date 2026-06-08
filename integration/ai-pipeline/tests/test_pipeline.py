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
