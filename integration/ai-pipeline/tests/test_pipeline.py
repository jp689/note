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
    assert len(artifacts.quiz.questions) >= 2
