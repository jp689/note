import {
  AttemptReport,
  AuthResponse,
  DocumentProcessResponse,
  DocumentSummary,
  KnowledgeNode,
  MindMapGraph,
  QuizSession,
  ReviewQueueItem,
  SearchResult,
  SubmitQuizRequest,
  SubmitQuizResponse,
  UploadContentResponse,
  UploadDocumentRequest
} from "@ai-study-notes/contracts";
import {
  documents,
  knowledgeNodes,
  mindMap,
  quiz,
  report,
  reviewQueue,
  searchResults
} from "./mock-data";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";
const INTERNAL_API_BASE_URL = process.env.INTERNAL_API_BASE_URL ?? API_BASE_URL;

export function buildApiUrl(path: string): string {
  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }

  const baseUrl = typeof window === "undefined" ? INTERNAL_API_BASE_URL : API_BASE_URL;
  return `${baseUrl}${path}`;
}

async function getJson<T>(path: string, fallback: T): Promise<T> {
  try {
    const response = await fetch(buildApiUrl(path), {
      cache: "no-store"
    });
    if (!response.ok) {
      throw new Error(`API request failed for ${path}`);
    }
    return (await response.json()) as T;
  } catch {
    return fallback;
  }
}

async function requestJson<T>(
  path: string,
  init: RequestInit & { token?: string } = {}
): Promise<T> {
  const headers = new Headers(init.headers);
  if (!headers.has("content-type") && init.body) {
    headers.set("content-type", "application/json");
  }
  if (init.token) {
    headers.set("authorization", `Bearer ${init.token}`);
  }

  const response = await fetch(buildApiUrl(path), {
    ...init,
    headers
  });

  if (!response.ok) {
    const detail = await response
      .json()
      .then((payload) => payload.detail)
      .catch(() => response.statusText);
    throw new Error(typeof detail === "string" ? detail : "API request failed");
  }

  return (await response.json()) as T;
}

export async function loginUser(email: string, password: string): Promise<AuthResponse> {
  return requestJson<AuthResponse>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password })
  });
}

export async function registerUser(
  email: string,
  fullName: string,
  password: string
): Promise<AuthResponse> {
  return requestJson<AuthResponse>("/api/auth/register", {
    method: "POST",
    body: JSON.stringify({ email, fullName, password })
  });
}

export async function getDashboardData(): Promise<{
  documents: DocumentSummary[];
  reviewQueue: ReviewQueueItem[];
  report: AttemptReport;
}> {
  return {
    documents: await getJson("/api/documents", documents),
    reviewQueue: await getReviewQueue(),
    report
  };
}

export async function getDocument(documentId: string): Promise<DocumentSummary> {
  return getJson(
    `/api/documents/${documentId}/status`,
    documents.find((document) => document.id === documentId) ?? documents[0]
  );
}

export async function getKnowledge(documentId?: string): Promise<KnowledgeNode[]> {
  if (!documentId) {
    return knowledgeNodes;
  }
  return getJson(`/api/documents/${documentId}/knowledge`, knowledgeNodes);
}

export async function getMindMap(documentId: string): Promise<MindMapGraph> {
  return getJson(`/api/documents/${documentId}/mindmap`, mindMap);
}

export async function uploadDocumentMetadata(
  payload: UploadDocumentRequest
): Promise<{ document: DocumentSummary; uploadUrl: string }> {
  return requestJson("/api/documents/upload", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export async function uploadDocumentContent(
  uploadUrl: string,
  file: File,
  onProgress: (progress: number) => void
): Promise<UploadContentResponse> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", buildApiUrl(uploadUrl));
    xhr.setRequestHeader("content-type", file.type || "application/pdf");
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        onProgress(Math.round((event.loaded / event.total) * 100));
      }
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        onProgress(100);
        resolve(JSON.parse(xhr.responseText) as UploadContentResponse);
        return;
      }
      reject(new Error(xhr.responseText || "PDF upload failed"));
    };
    xhr.onerror = () => reject(new Error("Network error while uploading PDF"));
    xhr.send(file);
  });
}

export async function processDocument(documentId: string): Promise<DocumentProcessResponse> {
  return requestJson<DocumentProcessResponse>(`/api/documents/${documentId}/process`, {
    method: "POST"
  });
}

export async function getDocumentQuiz(documentId: string): Promise<QuizSession> {
  return getJson(`/api/documents/${documentId}/quiz`, quiz);
}

export async function searchKnowledge(query = ""): Promise<SearchResult[]> {
  const searchPath = `/api/knowledge/search?q=${encodeURIComponent(query)}`;
  return getJson(searchPath, searchResults);
}

export async function getQuiz(quizId: string): Promise<QuizSession> {
  return getJson(`/api/quizzes/${quizId}`, quiz);
}

export async function submitQuiz(
  quizId: string,
  payload: SubmitQuizRequest
): Promise<SubmitQuizResponse> {
  return requestJson<SubmitQuizResponse>(`/api/quizzes/${quizId}/submit`, {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export async function getReport(attemptId: string): Promise<AttemptReport> {
  return getJson(`/api/reports/${attemptId}`, report);
}

export async function getReviewQueue(): Promise<ReviewQueueItem[]> {
  return getJson("/api/review-queue", reviewQueue);
}
