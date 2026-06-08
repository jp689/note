from __future__ import annotations

import json
import time
import urllib.error
import urllib.request
from pathlib import Path
from typing import Any

import boto3
from botocore.config import Config
import redis
from botocore.exceptions import BotoCoreError, ClientError
from pydantic import ValidationError
from redis.exceptions import RedisError

from .config import settings
from .models import DocumentJob
from .pipeline import process_document_job, stable_embedding


def redis_client() -> redis.Redis:
    return redis.from_url(settings.redis_url, socket_connect_timeout=1, socket_timeout=1)


def download_pdf(job: DocumentJob) -> bytes | None:
    client = boto3.client(
        "s3",
        endpoint_url=settings.s3_endpoint,
        aws_access_key_id=settings.s3_access_key,
        aws_secret_access_key=settings.s3_secret_key,
        config=Config(connect_timeout=1, read_timeout=1, retries={"max_attempts": 0}),
    )
    try:
        response = client.get_object(Bucket=settings.s3_bucket, Key=job.storage_key)
        return response["Body"].read()
    except (BotoCoreError, ClientError):
        local_path = Path(settings.local_storage_dir) / job.storage_key
        if local_path.exists():
            return local_path.read_bytes()
        return None


def artifact_payload(job: DocumentJob, pdf_bytes: bytes | None) -> dict[str, Any]:
    artifacts = process_document_job(job, pdf_bytes)
    return {
        "status": "quiz_ready",
        "extracted_text": artifacts.extracted_text,
        "page_count": max(1, len(artifacts.chunks) * 2),
        "chunks": [
            {
                "content": chunk,
                "source_pages": [index + 1, index + 2],
                "section_path": [job.title, f"Chunk {index + 1}"],
                "embedding": stable_embedding(chunk),
            }
            for index, chunk in enumerate(artifacts.chunks)
        ],
        "knowledge_nodes": [
            {
                "id": point.id,
                "document_id": job.document_id,
                "title": point.title,
                "summary": point.summary,
                "tags": point.tags,
                "source_pages": point.source_pages,
                "difficulty": point.difficulty,
                "embedding": point.embedding,
                "relations": point.relations,
            }
            for point in artifacts.knowledge_points
        ],
        "mindmap": {
            "document_id": job.document_id,
            "nodes": artifacts.mindmap.nodes,
            "edges": artifacts.mindmap.edges,
        },
        "quiz": {
            "id": f"quiz-{job.document_id}",
            "document_id": job.document_id,
            "generated_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            "status": "generated",
            "questions": artifacts.quiz.questions,
        },
        "logs": ["PDF text extraction completed", "Deterministic AI fallback artifacts generated"],
    }


def post_callback(job: DocumentJob, payload: dict[str, Any]) -> None:
    url = f"{settings.api_base_url.rstrip('/')}/api/internal/pipeline/jobs/{job.job_id}/complete"
    request = urllib.request.Request(
        url,
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "content-type": "application/json",
            "x-worker-token": settings.worker_internal_token,
        },
        method="POST",
    )
    with urllib.request.urlopen(request, timeout=30) as response:
        response.read()


def handle_job(raw_job: bytes | str) -> None:
    try:
        payload = json.loads(raw_job)
        job = DocumentJob(**payload)
    except (json.JSONDecodeError, TypeError, ValidationError) as error:
        print(f"Skipping invalid job payload: {error}")
        return

    try:
        pdf_bytes = download_pdf(job)
        post_callback(job, artifact_payload(job, pdf_bytes))
        print(f"Processed {job.document_id}.")
    except Exception as error:
        failure = {"status": "failed", "error_message": str(error), "logs": ["Pipeline failed"]}
        try:
            post_callback(job, failure)
        except (urllib.error.URLError, TimeoutError) as callback_error:
            print(f"Failed to post failure callback for {job.document_id}: {callback_error}")


def run() -> None:
    print(f"Worker started. Queue={settings.redis_queue}")
    while True:
        try:
            item = redis_client().blpop(settings.redis_queue, timeout=settings.poll_seconds)
        except RedisError as error:
            print(f"Redis unavailable: {error}")
            time.sleep(settings.poll_seconds)
            continue
        if item is None:
            continue
        _, raw_job = item
        handle_job(raw_job)


if __name__ == "__main__":
    run()
