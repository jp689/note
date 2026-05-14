from __future__ import annotations

from copy import deepcopy
from dataclasses import dataclass, field
from datetime import UTC, datetime
from hashlib import sha256
from threading import Lock
from uuid import uuid4

from .schemas import (
    AttemptReport,
    AuthResponse,
    DocumentSummary,
    FeedbackHighlight,
    KnowledgeNode,
    KnowledgeRelation,
    MindMapEdge,
    MindMapGraph,
    MindMapNode,
    QuizQuestion,
    QuizSession,
    ReviewQueueItem,
    SearchResult,
    UserProfile,
)


def _now() -> datetime:
    return datetime.now(UTC)


@dataclass
class StoredUser:
    profile: UserProfile
    password_hash: str


@dataclass
class StudyStore:
    users: dict[str, StoredUser] = field(default_factory=dict)
    documents: dict[str, DocumentSummary] = field(default_factory=dict)
    knowledge: dict[str, list[KnowledgeNode]] = field(default_factory=dict)
    mindmaps: dict[str, MindMapGraph] = field(default_factory=dict)
    quizzes: dict[str, QuizSession] = field(default_factory=dict)
    reports: dict[str, AttemptReport] = field(default_factory=dict)
    review_queue: list[ReviewQueueItem] = field(default_factory=list)
    lock: Lock = field(default_factory=Lock)

    def __post_init__(self) -> None:
        self._seed()

    def _seed(self) -> None:
        demo_user = UserProfile(
            id="user-demo",
            email="demo@example.com",
            full_name="Demo User",
        )
        self.users[demo_user.email] = StoredUser(
            profile=demo_user,
            password_hash=self.hash_password("password123"),
        )

        document = DocumentSummary(
            id="doc-neural-learning",
            title="Neural Learning Notes",
            status="quiz_ready",
            page_count=86,
            uploaded_at=_now(),
            progress_label="Knowledge structure and initial quiz are ready",
        )
        self.documents[document.id] = document

        knowledge_nodes = [
            KnowledgeNode(
                id="kn-gradient-descent",
                document_id=document.id,
                title="Gradient Descent Convergence",
                summary="Organizes stability conditions around learning rate, loss surface, and local minima.",
                tags=["optimization", "machine-learning", "convergence"],
                source_pages=[8, 9, 10],
                difficulty="intermediate",
                relations=[
                    KnowledgeRelation(target_id="kn-backprop", label="supports"),
                    KnowledgeRelation(target_id="kn-generalization", label="influences"),
                ],
            ),
            KnowledgeNode(
                id="kn-backprop",
                document_id=document.id,
                title="Backpropagation and Chain Rule",
                summary="Breaks layer-wise gradients into local derivatives and upstream error signals.",
                tags=["backprop", "chain-rule"],
                source_pages=[11, 12, 13],
                difficulty="basic",
                relations=[KnowledgeRelation(target_id="kn-gradient-descent", label="depends_on")],
            ),
            KnowledgeNode(
                id="kn-generalization",
                document_id=document.id,
                title="Generalization and Bias-Variance",
                summary="Explains underfitting, overfitting, and regularization through train-test error gaps.",
                tags=["generalization", "regularization", "bias-variance"],
                source_pages=[23, 24, 25],
                difficulty="advanced",
                relations=[KnowledgeRelation(target_id="kn-regularization", label="expands_to")],
            ),
        ]
        self.knowledge[document.id] = knowledge_nodes

        self.mindmaps[document.id] = MindMapGraph(
            document_id=document.id,
            nodes=[
                MindMapNode(id="root", label="Neural Learning Theory", group="root"),
                MindMapNode(id="chapter-1", label="Optimization Basics", group="chapter"),
                MindMapNode(id="chapter-2", label="Error Propagation", group="chapter"),
                MindMapNode(id="chapter-3", label="Generalization", group="chapter"),
                MindMapNode(id="node-gradient", label="Gradient Descent", group="concept"),
                MindMapNode(id="node-backprop", label="Backpropagation", group="concept"),
                MindMapNode(id="node-generalization", label="Bias and Variance", group="concept"),
                MindMapNode(id="node-practice", label="Mistake Review", group="practice"),
            ],
            edges=[
                MindMapEdge(source="root", target="chapter-1", label="chapter"),
                MindMapEdge(source="root", target="chapter-2", label="chapter"),
                MindMapEdge(source="root", target="chapter-3", label="chapter"),
                MindMapEdge(source="chapter-1", target="node-gradient", label="concept"),
                MindMapEdge(source="chapter-2", target="node-backprop", label="concept"),
                MindMapEdge(source="chapter-3", target="node-generalization", label="concept"),
                MindMapEdge(source="node-generalization", target="node-practice", label="review"),
            ],
        )

        self.review_queue = [
            ReviewQueueItem(
                knowledge_node_id="kn-generalization",
                title="Generalization and Bias-Variance",
                priority="high",
                recommendation="Review the summary, then restate it in your own words.",
            ),
            ReviewQueueItem(
                knowledge_node_id="kn-gradient-descent",
                title="Gradient Descent Convergence",
                priority="medium",
                recommendation="Redo two objective questions around learning-rate boundaries.",
            ),
        ]

        quiz = QuizSession(
            id="demo-quiz",
            document_id=document.id,
            generated_at=_now(),
            questions=[
                QuizQuestion(
                    id="q1",
                    knowledge_node_id="kn-gradient-descent",
                    type="multiple_choice",
                    stem="What is the most common direct effect of an overly large learning rate?",
                    options=[
                        "Faster convergence",
                        "Oscillation or divergence during training",
                        "Automatic regularization",
                        "Zero gradients everywhere",
                    ],
                    answer="Oscillation or divergence during training",
                    explanation="Large updates can overshoot minima and cause repeated oscillation.",
                    difficulty="basic",
                ),
                QuizQuestion(
                    id="q2",
                    knowledge_node_id="kn-backprop",
                    type="true_false",
                    stem="Backpropagation depends on the chain rule to compute gradients layer by layer.",
                    options=["True", "False"],
                    answer="True",
                    explanation="The chain rule is the theoretical basis for propagating error signals.",
                    difficulty="basic",
                ),
                QuizQuestion(
                    id="q3",
                    knowledge_node_id="kn-generalization",
                    type="short_answer",
                    stem="Explain the bias-variance tradeoff and why regularization helps generalization.",
                    answer="The bias-variance tradeoff links model complexity to fit and generalization; regularization reduces variance by constraining complexity.",
                    explanation="A strong answer should cover the tradeoff, model complexity, and why regularization matters.",
                    difficulty="advanced",
                ),
            ],
        )
        self.quizzes[quiz.id] = quiz

        self.reports["demo-attempt"] = AttemptReport(
            id="demo-attempt",
            quiz_id=quiz.id,
            score=82,
            strengths=[
                "Recognizes core optimization ideas well",
                "Can identify the main principle behind backpropagation",
                "Shows initial understanding of regularization goals",
            ],
            weak_points=[
                FeedbackHighlight(
                    knowledge_node_id="kn-generalization",
                    title="Generalization and Bias-Variance",
                    reason="The explanation mentions overfitting but misses how variance changes with complexity.",
                    action="Revisit pages 23 to 25 and rewrite the generalization error curve.",
                )
            ],
            next_review=[
                "Redo three generalization questions within 24 hours",
                "Use the mind map to restate the regularization branch in two days",
            ],
        )

    @staticmethod
    def hash_password(password: str) -> str:
        return sha256(password.encode("utf-8")).hexdigest()

    def register(self, email: str, full_name: str, password: str) -> AuthResponse:
        with self.lock:
            profile = UserProfile(id=f"user-{uuid4().hex[:8]}", email=email, full_name=full_name)
            self.users[email] = StoredUser(
                profile=profile,
                password_hash=self.hash_password(password),
            )
        return AuthResponse(access_token=f"token-{profile.id}", user=profile)

    def login(self, email: str, password: str) -> AuthResponse | None:
        user = self.users.get(email)
        if not user:
            return None
        if user.password_hash != self.hash_password(password):
            return None
        return AuthResponse(access_token=f"token-{user.profile.id}", user=user.profile)

    def create_document(self, title: str) -> DocumentSummary:
        clean_title = title.strip() or "Untitled document.pdf"
        document = DocumentSummary(
            id=f"doc-{uuid4().hex[:10]}",
            title=clean_title,
            status="uploaded",
            page_count=0,
            uploaded_at=_now(),
            progress_label="File uploaded and waiting for processing",
        )
        self.documents[document.id] = document
        return document

    def list_documents(self) -> list[DocumentSummary]:
        return sorted(
            (deepcopy(document) for document in self.documents.values()),
            key=lambda document: document.uploaded_at,
            reverse=True,
        )

    def get_document(self, document_id: str) -> DocumentSummary | None:
        document = self.documents.get(document_id)
        return deepcopy(document) if document else None

    def set_document(self, document: DocumentSummary) -> None:
        self.documents[document.id] = document

    def set_knowledge(self, document_id: str, nodes: list[KnowledgeNode]) -> None:
        self.knowledge[document_id] = deepcopy(nodes)

    def set_mindmap(self, document_id: str, graph: MindMapGraph) -> None:
        self.mindmaps[document_id] = deepcopy(graph)

    def set_quiz(self, quiz: QuizSession) -> None:
        self.quizzes[quiz.id] = deepcopy(quiz)

    def set_report(self, report: AttemptReport) -> None:
        self.reports[report.id] = deepcopy(report)

    def set_review_queue(self, items: list[ReviewQueueItem]) -> None:
        self.review_queue = deepcopy(items)

    def get_knowledge(self, document_id: str) -> list[KnowledgeNode]:
        return deepcopy(self.knowledge.get(document_id, []))

    def get_mindmap(self, document_id: str) -> MindMapGraph | None:
        graph = self.mindmaps.get(document_id)
        return deepcopy(graph) if graph else None

    def get_quiz(self, quiz_id: str) -> QuizSession | None:
        quiz = self.quizzes.get(quiz_id)
        return deepcopy(quiz) if quiz else None

    def get_latest_quiz_for_document(self, document_id: str) -> QuizSession | None:
        quizzes = [
            quiz for quiz in self.quizzes.values() if quiz.document_id == document_id
        ]
        if not quizzes:
            return None
        latest = max(quizzes, key=lambda quiz: quiz.generated_at)
        return deepcopy(latest)

    def get_report(self, report_id: str) -> AttemptReport | None:
        report = self.reports.get(report_id)
        return deepcopy(report) if report else None

    def get_review_queue(self) -> list[ReviewQueueItem]:
        return deepcopy(self.review_queue)

    def search_knowledge(self, query: str) -> list[SearchResult]:
        results: list[SearchResult] = []
        lowered = query.lower()
        for nodes in self.knowledge.values():
            for node in nodes:
                text = " ".join([node.title, node.summary, *node.tags]).lower()
                match_type = "keyword" if lowered and lowered in text else "semantic"
                results.append(
                    SearchResult(
                        node=node,
                        match_type=match_type,
                        snippet=f"{node.summary} Source pages: {', '.join(map(str, node.source_pages))}.",
                    )
                )
        return results


store = StudyStore()
