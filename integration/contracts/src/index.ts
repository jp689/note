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
  isAdmin: boolean;
  isActive: boolean;
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
  errorMessage?: string | null;
  jobId?: string | null;
  fileSize: number;
  analysisVersion: number;
}

export interface KnowledgeRelation {
  targetId: string;
  label: string;
  reason?: string;
  strength?: number | null;
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
  chapterTitle?: string | null;
  keyTakeaways?: string[];
  examples?: string[];
  pitfalls?: string[];
  reviewPrompt?: string;
  confidence?: number | null;
}

export interface MindMapNode {
  id: string;
  label: string;
  group: "root" | "chapter" | "concept" | "practice";
  knowledgeNodeId?: string | null;
  summary?: string;
  sourcePages?: number[];
  level?: number;
}

export interface MindMapEdge {
  source: string;
  target: string;
  label: string;
  relationType?: string;
  strength?: number | null;
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
  status: "generated" | "in_progress" | "submitted" | "graded";
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
  score?: number | null;
  sourcePages: number[];
  documentTitle: string;
}

export interface DocumentProcessResponse {
  documentId: string;
  status: DocumentStatus;
  queued: boolean;
  message: string;
  jobId?: string | null;
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

export interface AdminStats {
  totalUsers: number;
  activeUsers: number;
  adminUsers: number;
  totalDocuments: number;
}

export interface AdminDetailedStats {
  totalUsers: number;
  activeUsers: number;
  adminUsers: number;
  totalDocuments: number;
  documentsByStatus: Record<string, number>;
  recentDocuments: { id: string; title: string; status: string; createdAt: string }[];
  recentUsers: { id: string; email: string; fullName: string; createdAt: string }[];
}

export interface AdminUserListResponse {
  users: UserProfile[];
  total: number;
  page: number;
  pageSize: number;
}

export interface AdminUserUpdate {
  isActive?: boolean;
  isAdmin?: boolean;
}

export interface AdminUserCreate {
  email: string;
  fullName: string;
  password: string;
  isAdmin?: boolean;
  isActive?: boolean;
}

export interface AdminUserUpdateProfile {
  email?: string;
  fullName?: string;
  password?: string;
}
