from __future__ import annotations

import time

from .config import settings
from .models import DocumentJob
from .pipeline import process_document_job
from .queue import queue


def seed_demo_job() -> None:
    if queue.has_jobs():
        return
    queue.push(
        DocumentJob(
            document_id="doc-demo-worker",
            title="Demo PDF Notes",
            storage_key="documents/doc-demo-worker/demo.pdf",
        )
    )


def run() -> None:
    seed_demo_job()
    print(f"Worker started. Polling queue every {settings.poll_seconds} seconds.")
    while True:
        job = queue.pop()
        if job is None:
            time.sleep(settings.poll_seconds)
            continue
        artifacts = process_document_job(job)
        print(
            f"Processed {artifacts.document_id}: "
            f"{len(artifacts.knowledge_points)} knowledge points, "
            f"{len(artifacts.quiz.questions)} questions."
        )
        time.sleep(settings.poll_seconds)


if __name__ == "__main__":
    run()
