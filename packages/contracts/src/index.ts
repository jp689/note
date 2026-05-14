export type DocumentStatus =
  | "uploaded"
  | "parsing"
  | "structured"
  | "quiz_ready"
  | "failed";

export type QuizQuestionType = "multiple_choice" | "true_false" | "short_answer";

export type Difficulty = "basic" | "intermediate" | "advanced";

export interface UserProfile {
  id: string;
  email: string;
  fullName: string;
}

export interface AuthResponse {
  accessToken: string;
  user: UserProfile;
}

export interface UploadDocumentRequest {
  filename: string;
  contentType: string;
  sizeBytes: number;
}

export interface DocumentSummary {
  id: string;
  title: string;
  status: DocumentStatus;
  sourceType: "pdf";
  pageCount: number;
  uploadedAt: string;
  progressLabel: string;
}

export interface KnowledgeRelation {
  targetId: string;
  label: string;
}

export interface KnowledgeNode {
  id: string;
  documentId: string;
  title: string;
  summary: string;
  tags: string[];
  sourcePages: number[];
  difficulty: Difficulty;
  embedding?: number[];
  relations: KnowledgeRelation[];
}

export interface MindMapNode {
  id: string;
  label: string;
  group: "root" | "chapter" | "concept" | "practice";
}

export interface MindMapEdge {
  source: string;
  target: string;
  label: string;
}

export interface MindMapGraph {
  documentId: string;
  nodes: MindMapNode[];
  edges: MindMapEdge[];
}

export interface QuizQuestion {
  id: string;
  knowledgeNodeId: string;
  type: QuizQuestionType;
  stem: string;
  options?: string[];
  answer: string | string[];
  explanation: string;
  difficulty: Difficulty;
}

export interface QuizSession {
  id: string;
  documentId: string;
  generatedAt: string;
  questions: QuizQuestion[];
}

export interface FeedbackHighlight {
  knowledgeNodeId: string;
  title: string;
  reason: string;
  action: string;
}

export interface AttemptReport {
  id: string;
  quizId: string;
  score: number;
  strengths: string[];
  weakPoints: FeedbackHighlight[];
  nextReview: string[];
}

export interface ReviewQueueItem {
  knowledgeNodeId: string;
  title: string;
  priority: "high" | "medium" | "low";
  recommendation: string;
}

export interface SearchResult {
  node: KnowledgeNode;
  matchType: "keyword" | "semantic";
  snippet: string;
}

export interface DocumentProcessResponse {
  documentId: string;
  status: DocumentStatus;
  queued: boolean;
  message: string;
}

export interface UploadContentResponse {
  document: DocumentSummary;
  receivedBytes: number;
}

export interface GenerateQuizRequest {
  documentId: string;
  knowledgeNodeIds?: string[];
  questionCount?: number;
  difficulty?: Difficulty | null;
}

export interface QuizAnswerSubmission {
  questionId: string;
  answer: string;
}

export interface SubmitQuizRequest {
  answers: QuizAnswerSubmission[];
}

export interface SubmitQuizResponse {
  attemptId: string;
  score: number;
  status: "scored" | "needs_review";
}
