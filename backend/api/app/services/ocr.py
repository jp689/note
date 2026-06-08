"""
PaddleOCR API service for PDF text extraction.

Uses PaddleOCR-VL API to extract text from PDF documents,
with polling for async job completion.
"""

from __future__ import annotations

import json
import logging
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Any

import requests

from ..config import settings

logger = logging.getLogger(__name__)


@dataclass
class OcrPage:
    """Represents extracted content from a single PDF page."""
    page_number: int
    markdown_text: str
    images: dict[str, bytes]


@dataclass
class OcrResult:
    """Complete OCR extraction result."""
    pages: list[OcrPage]
    full_text: str
    page_count: int


class PaddleOcrError(Exception):
    """Raised when PaddleOCR API returns an error."""
    pass


class PaddleOcrService:
    """Service for interacting with PaddleOCR API."""

    def __init__(self) -> None:
        self.api_url = settings.paddleocr_api_url
        self.token = settings.paddleocr_token
        self.model = settings.paddleocr_model
        self.poll_interval = settings.paddleocr_poll_interval
        self.max_poll_attempts = settings.paddleocr_max_poll_attempts

    @property
    def is_configured(self) -> bool:
        """Check if PaddleOCR is properly configured."""
        return bool(self.token)

    def _get_headers(self) -> dict[str, str]:
        """Get request headers with authorization."""
        return {"Authorization": f"bearer {self.token}"}

    def _get_optional_payload(self) -> dict[str, bool]:
        """Get optional OCR parameters."""
        return {
            "useDocOrientationClassify": False,
            "useDocUnwarping": False,
            "useChartRecognition": False,
        }

    def submit_job(self, file_path: str) -> str:
        """
        Submit a PDF file for OCR processing.

        Args:
            file_path: Path to the local PDF file or URL

        Returns:
            Job ID for polling
        """
        headers = self._get_headers()
        optional_payload = self._get_optional_payload()

        if file_path.startswith("http"):
            # URL Mode
            headers["Content-Type"] = "application/json"
            payload = {
                "fileUrl": file_path,
                "model": self.model,
                "optionalPayload": optional_payload,
            }
            response = requests.post(self.api_url, json=payload, headers=headers, timeout=30)
        else:
            # Local File Mode
            if not Path(file_path).exists():
                raise FileNotFoundError(f"File not found: {file_path}")

            data = {
                "model": self.model,
                "optionalPayload": json.dumps(optional_payload),
            }

            with open(file_path, "rb") as f:
                files = {"file": f}
                response = requests.post(
                    self.api_url, headers=headers, data=data, files=files, timeout=60
                )

        if response.status_code != 200:
            raise PaddleOcrError(
                f"PaddleOCR API error: {response.status_code} - {response.text}"
            )

        result = response.json()
        job_id = result.get("data", {}).get("jobId")
        if not job_id:
            raise PaddleOcrError(f"No job ID in response: {result}")

        logger.info("PaddleOCR job submitted: %s", job_id)
        return job_id

    def poll_job(self, job_id: str) -> dict[str, Any]:
        """
        Poll for job completion.

        Args:
            job_id: The job ID to poll

        Returns:
            Job result data
        """
        headers = self._get_headers()
        job_url = f"{self.api_url}/{job_id}"

        for attempt in range(self.max_poll_attempts):
            response = requests.get(job_url, headers=headers, timeout=30)
            if response.status_code != 200:
                raise PaddleOcrError(
                    f"Polling error: {response.status_code} - {response.text}"
                )

            data = response.json().get("data", {})
            state = data.get("state")

            if state == "done":
                logger.info("PaddleOCR job completed: %s", job_id)
                return data
            elif state == "failed":
                error_msg = data.get("errorMsg", "Unknown error")
                raise PaddleOcrError(f"PaddleOCR job failed: {error_msg}")
            elif state in ("pending", "running"):
                progress = data.get("extractProgress", {})
                total = progress.get("totalPages", "?")
                extracted = progress.get("extractedPages", "?")
                logger.debug(
                    "PaddleOCR job %s: %s (%s/%s pages)", job_id, state, extracted, total
                )
            else:
                logger.warning("Unknown PaddleOCR job state: %s", state)

            time.sleep(self.poll_interval)

        raise PaddleOcrError(
            f"PaddleOCR job timed out after {self.max_poll_attempts * self.poll_interval}s"
        )

    def download_result(self, result_data: dict[str, Any]) -> OcrResult:
        """
        Download and parse OCR results.

        Args:
            result_data: Job result data from poll_job

        Returns:
            Parsed OCR result
        """
        json_url = result_data.get("resultUrl", {}).get("jsonUrl")
        if not json_url:
            raise PaddleOcrError("No result URL in job data")

        response = requests.get(json_url, timeout=60)
        response.raise_for_status()

        pages: list[OcrPage] = []
        full_text_parts: list[str] = []
        page_num = 0

        for line in response.text.strip().split("\n"):
            line = line.strip()
            if not line:
                continue

            try:
                result = json.loads(line).get("result", {})
            except json.JSONDecodeError:
                logger.warning("Failed to parse JSONL line: %s", line[:100])
                continue

            for layout_result in result.get("layoutParsingResults", []):
                markdown = layout_result.get("markdown", {})
                text = markdown.get("text", "")

                # Download embedded images
                images: dict[str, bytes] = {}
                for img_name, img_url in markdown.get("images", {}).items():
                    try:
                        img_response = requests.get(img_url, timeout=30)
                        img_response.raise_for_status()
                        images[img_name] = img_response.content
                    except Exception as e:
                        logger.warning("Failed to download image %s: %s", img_name, e)

                page = OcrPage(
                    page_number=page_num + 1,
                    markdown_text=text,
                    images=images,
                )
                pages.append(page)
                full_text_parts.append(text)
                page_num += 1

        return OcrResult(
            pages=pages,
            full_text="\n\n".join(full_text_parts),
            page_count=len(pages),
        )

    def extract_from_file(self, file_path: str) -> OcrResult:
        """
        Full OCR extraction pipeline: submit, poll, download.

        Args:
            file_path: Path to the local PDF file or URL

        Returns:
            Complete OCR extraction result
        """
        if not self.is_configured:
            raise PaddleOcrError("PaddleOCR token not configured")

        job_id = self.submit_job(file_path)
        result_data = self.poll_job(job_id)
        return self.download_result(result_data)


# Singleton instance
ocr_service = PaddleOcrService()
