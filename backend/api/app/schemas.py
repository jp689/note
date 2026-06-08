from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


def to_camel(value: str) -> str:
    head, *tail = value.split("_")
    return head + "".join(part.capitalize() for part in tail)


class CamelModel(BaseModel):
    model_config = ConfigDict(populate_by_name=True, alias_generator=to_camel)

DocumentStatus = Literal["uploaded", "parsing", "structured", "quiz_ready", "failed"]
Difficulty = Literal["basic", "intermediate", "advanced"]
QuizQuestionType = Literal["multiple_choice", "true_false", "short_answer"]
Priority = Literal["high", "medium", "low"]
MatchType = Literal["keyword", "semantic"]


class UserProfile(CamelModel):
    id: str
    email: str
    full_name: str
    is_admin: bool = False
    is_active: bool = True


class AuthRequest(CamelModel):
    email: str
    password: str


class RegisterRequest(AuthRequest):
    full_name: str


class AuthResponse(CamelModel):
    access_token: str
    user: UserProfile


class UploadDocumentRequest(CamelModel):
    filename: str
    content_type: str
    size_bytes: int


class DocumentSummary(CamelModel):
    id: str
    title: str
    status: DocumentStatus
    source_type: Literal["pdf"] = "pdf"
    page_count: int = 0
    uploaded_at: datetime
    progress_label: str
    error_message: str | None = None
    job_id: str | None = None
    file_size: int = 0


class UploadDocumentResponse(CamelModel):
    document: DocumentSummary
    upload_url: str


class UploadContentResponse(CamelModel):
    document: DocumentSummary
    received_bytes: int


class KnowledgeRelation(CamelModel):
    target_id: str
    label: str


class KnowledgeNode(CamelModel):
    id: str
    document_id: str
    title: str
    summary: str
    tags: list[str] = Field(default_factory=list)
    source_pages: list[int] = Field(default_factory=list)
    difficulty: Difficulty
    embedding: list[float] = Field(default_factory=list)
    relations: list[KnowledgeRelation] = Field(default_factory=list)


class MindMapNode(CamelModel):
    id: str
    label: str
    group: Literal["root", "chapter", "concept", "practice"]


class MindMapEdge(CamelModel):
    source: str
    target: str
    label: str


class MindMapGraph(CamelModel):
    document_id: str
    nodes: list[MindMapNode]
    edges: list[MindMapEdge]


class QuizQuestion(CamelModel):
    id: str
    knowledge_node_id: str
    type: QuizQuestionType
    stem: str
    options: list[str] | None = None
    answer: str | list[str]
    explanation: str
    difficulty: Difficulty


class QuizSession(CamelModel):
    id: str
    document_id: str
    generated_at: datetime
    status: Literal["generated", "in_progress", "submitted", "graded"] = "generated"
    questions: list[QuizQuestion]


class GenerateQuizRequest(CamelModel):
    document_id: str
    knowledge_node_ids: list[str] = Field(default_factory=list)
    question_count: int = 5
    difficulty: Difficulty | None = None


class QuizAnswerSubmission(CamelModel):
    question_id: str
    answer: str


class SubmitQuizRequest(CamelModel):
    answers: list[QuizAnswerSubmission]


class SubmitQuizResponse(CamelModel):
    attempt_id: str
    score: int
    status: Literal["scored", "needs_review"]


class FeedbackHighlight(CamelModel):
    knowledge_node_id: str
    title: str
    reason: str
    action: str


class AttemptReport(CamelModel):
    id: str
    quiz_id: str
    score: int
    strengths: list[str]
    weak_points: list[FeedbackHighlight]
    next_review: list[str]


class ReviewQueueItem(CamelModel):
    knowledge_node_id: str
    title: str
    priority: Priority
    recommendation: str


class SearchResult(CamelModel):
    node: KnowledgeNode
    match_type: MatchType
    snippet: str
    score: float | None = None
    source_pages: list[int] = Field(default_factory=list)
    document_title: str = ""


class DocumentProcessResponse(CamelModel):
    document_id: str
    status: DocumentStatus
    queued: bool
    message: str
    job_id: str | None = None


class PipelineChunk(CamelModel):
    content: str
    source_pages: list[int] = Field(default_factory=list)
    section_path: list[str] = Field(default_factory=list)
    embedding: list[float] = Field(default_factory=list)


class PipelineCompleteRequest(CamelModel):
    status: Literal["quiz_ready", "failed"] = "quiz_ready"
    error_message: str | None = None
    extracted_text: str = ""
    page_count: int = 0
    chunks: list[PipelineChunk] = Field(default_factory=list)
    knowledge_nodes: list[KnowledgeNode] = Field(default_factory=list)
    mindmap: MindMapGraph | None = None
    quiz: QuizSession | None = None
    logs: list[str] = Field(default_factory=list)
