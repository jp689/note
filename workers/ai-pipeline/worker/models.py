from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field


class DocumentJob(BaseModel):
    document_id: str
    title: str
    storage_key: str
    source_type: Literal["pdf"] = "pdf"


class KnowledgePoint(BaseModel):
    id: str
    title: str
    summary: str
    source_pages: list[int] = Field(default_factory=list)
    tags: list[str] = Field(default_factory=list)


class MindMapPayload(BaseModel):
    nodes: list[dict[str, str]]
    edges: list[dict[str, str]]


class QuizPayload(BaseModel):
    questions: list[dict[str, object]]


class ProcessedArtifacts(BaseModel):
    document_id: str
    extracted_text: str
    chunks: list[str]
    knowledge_points: list[KnowledgePoint]
    mindmap: MindMapPayload
    quiz: QuizPayload

