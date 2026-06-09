import {
  AdminDetailedStats,
  AdminDashboard,
  AdminAiUsageResponse,
  AdminFileListResponse,
  AdminLogsResponse,
  AdminNoteListResponse,
  AdminSettings,
  AdminSettingsUpdate,
  AdminStats,
  AdminUserCreate,
  AdminUserListResponse,
  AdminUserUpdate,
  AdminUserUpdateProfile,
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
import { buildApiUrl as resolveApiUrl } from "./api-url";

const ENABLE_MOCK_FALLBACK =
  process.env.NODE_ENV !== "production" || process.env.NEXT_PUBLIC_ENABLE_MOCK_FALLBACK === "true";
const ENABLE_READ_FALLBACK = process.env.NEXT_PUBLIC_ENABLE_API_READ_FALLBACK !== "false";
const TOKEN_KEY = "ai-study-token";

export function buildApiUrl(path: string): string {
  return resolveApiUrl(path);
}

function getBrowserToken(): string | undefined {
  if (typeof window === "undefined") {
    return undefined;
  }
  return localStorage.getItem(TOKEN_KEY) ?? undefined;
}

async function getJson<T>(path: string, fallback: T, token?: string): Promise<T> {
  try {
    const headers = new Headers();
    const authToken = token ?? getBrowserToken();
    if (authToken) {
      headers.set("authorization", `Bearer ${authToken}`);
    }
    const response = await fetch(buildApiUrl(path), {
      headers,
      cache: "no-store"
    });
    if (!response.ok) {
      throw new Error(`API request failed for ${path}`);
    }
    return (await response.json()) as T;
  } catch (error) {
    if (ENABLE_MOCK_FALLBACK || ENABLE_READ_FALLBACK) {
      return fallback;
    }
    throw error;
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
  const authToken = init.token ?? getBrowserToken();
  if (authToken) {
    headers.set("authorization", `Bearer ${authToken}`);
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
  report: AttemptReport | null;
}> {
  return {
    documents: await getJson("/api/documents", documents),
    reviewQueue: await getReviewQueue(),
    report: await getLatestReport()
  };
}

export async function getServerDashboardData(token?: string): Promise<{
  documents: DocumentSummary[];
  reviewQueue: ReviewQueueItem[];
  report: AttemptReport | null;
}> {
  return {
    documents: await getJson("/api/documents", [], token),
    reviewQueue: await getJson("/api/review-queue", [], token),
    report: await getJson<AttemptReport | null>("/api/reports/latest", null, token)
  };
}

export async function getDocument(documentId: string, token?: string): Promise<DocumentSummary> {
  return getJson(
    `/api/documents/${documentId}/status`,
    documents.find((document) => document.id === documentId) ?? documents[0],
    token
  );
}

export async function getKnowledge(documentId?: string, token?: string): Promise<KnowledgeNode[]> {
  if (!documentId) {
    return knowledgeNodes;
  }
  return getJson(`/api/documents/${documentId}/knowledge`, knowledgeNodes, token);
}

export async function getMindMap(documentId: string, token?: string): Promise<MindMapGraph> {
  return getJson(`/api/documents/${documentId}/mindmap`, mindMap, token);
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
    const token = getBrowserToken();
    if (token) {
      xhr.setRequestHeader("authorization", `Bearer ${token}`);
    }
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

export async function getDocumentQuiz(documentId: string, token?: string): Promise<QuizSession> {
  return getJson(`/api/documents/${documentId}/quiz`, quiz, token);
}

export async function searchKnowledge(query = "", token?: string): Promise<SearchResult[]> {
  const searchPath = `/api/knowledge/search?q=${encodeURIComponent(query)}`;
  return getJson(searchPath, searchResults, token);
}

export async function getQuiz(quizId: string, token?: string): Promise<QuizSession> {
  return getJson(`/api/quizzes/${quizId}`, quiz, token);
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

export async function getReport(attemptId: string, token?: string): Promise<AttemptReport> {
  return getJson(`/api/reports/${attemptId}`, report, token);
}

export async function getLatestReport(token?: string): Promise<AttemptReport | null> {
  return getJson<AttemptReport | null>("/api/reports/latest", null, token);
}

export async function getReviewQueue(token?: string): Promise<ReviewQueueItem[]> {
  return getJson("/api/review-queue", reviewQueue, token);
}

export async function completeReviewItem(knowledgeNodeId: string): Promise<ReviewQueueItem> {
  return requestJson<ReviewQueueItem>(
    `/api/review-queue/${encodeURIComponent(knowledgeNodeId)}/complete`,
    {
      method: "POST"
    }
  );
}

// Admin API
export async function getAdminStats(): Promise<AdminStats> {
  return requestJson<AdminStats>("/api/admin/stats");
}

export async function getAdminUsers(
  page = 1,
  pageSize = 20,
  search = "",
  isActive?: boolean,
  isAdmin?: boolean,
): Promise<AdminUserListResponse> {
  const params = new URLSearchParams({
    page: String(page),
    page_size: String(pageSize),
    ...(search ? { search } : {}),
    ...(isActive !== undefined ? { is_active: String(isActive) } : {}),
    ...(isAdmin !== undefined ? { is_admin: String(isAdmin) } : {}),
  });
  return requestJson<AdminUserListResponse>(`/api/admin/users?${params}`);
}

export async function updateAdminUser(
  userId: string,
  payload: AdminUserUpdate
): Promise<{ id: string; email: string; fullName: string; isAdmin: boolean; isActive: boolean }> {
  return requestJson(`/api/admin/users/${userId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function deleteAdminUser(userId: string): Promise<void> {
  await requestJson(`/api/admin/users/${userId}`, {
    method: "DELETE",
  });
}

export async function getAdminDetailedStats(): Promise<AdminDetailedStats> {
  return requestJson<AdminDetailedStats>("/api/admin/stats/detailed");
}

export async function getAdminDashboard(): Promise<AdminDashboard> {
  return requestJson<AdminDashboard>("/api/admin/dashboard");
}

export async function getAdminNotes(
  page = 1,
  pageSize = 20,
  search = ""
): Promise<AdminNoteListResponse> {
  const params = new URLSearchParams({
    page: String(page),
    page_size: String(pageSize),
    ...(search ? { search } : {}),
  });
  return requestJson<AdminNoteListResponse>(`/api/admin/notes?${params}`);
}

export async function deleteAdminNote(documentId: string): Promise<void> {
  await requestJson(`/api/admin/notes/${documentId}`, {
    method: "DELETE",
  });
}

export async function getAdminFiles(
  page = 1,
  pageSize = 20,
  search = ""
): Promise<AdminFileListResponse> {
  const params = new URLSearchParams({
    page: String(page),
    page_size: String(pageSize),
    ...(search ? { search } : {}),
  });
  return requestJson<AdminFileListResponse>(`/api/admin/files?${params}`);
}

export async function deleteAdminFile(documentId: string): Promise<void> {
  await requestJson(`/api/admin/files/${documentId}`, {
    method: "DELETE",
  });
}

export async function getAdminAiUsage(page = 1, pageSize = 20): Promise<AdminAiUsageResponse> {
  const params = new URLSearchParams({
    page: String(page),
    page_size: String(pageSize),
  });
  return requestJson<AdminAiUsageResponse>(`/api/admin/ai-usage?${params}`);
}

export async function getAdminSettings(): Promise<AdminSettings> {
  return requestJson<AdminSettings>("/api/admin/settings");
}

export async function updateAdminSettings(payload: AdminSettingsUpdate): Promise<AdminSettings> {
  return requestJson<AdminSettings>("/api/admin/settings", {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function getAdminLogs(): Promise<AdminLogsResponse> {
  return requestJson<AdminLogsResponse>("/api/admin/logs");
}

export async function createAdminUser(payload: AdminUserCreate): Promise<{ id: string; email: string; fullName: string; isAdmin: boolean; isActive: boolean }> {
  return requestJson("/api/admin/users", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateAdminUserProfile(
  userId: string,
  payload: AdminUserUpdateProfile
): Promise<{ id: string; email: string; fullName: string; isAdmin: boolean; isActive: boolean }> {
  return requestJson(`/api/admin/users/${userId}/profile`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

// Document PDF download
export function getDocumentDownloadUrl(documentId: string): string {
  return buildApiUrl(`/api/documents/${documentId}/download`);
}

// Notifications API
export async function getNotifications(): Promise<{
  items: { id: string; type: string; title: string; message: string; isRead: boolean; link: string | null; createdAt: string }[];
  unreadCount: number;
}> {
  return requestJson("/api/notifications");
}

export async function markNotificationsRead(notificationIds: string[]): Promise<void> {
  await requestJson("/api/notifications/read", {
    method: "POST",
    body: JSON.stringify({ notificationIds }),
  });
}

export async function markAllNotificationsRead(): Promise<void> {
  await requestJson("/api/notifications/read-all", {
    method: "POST",
  });
}

// User Settings API
export async function getUserProfile(): Promise<{
  id: string;
  email: string;
  fullName: string;
  isAdmin: boolean;
  isActive: boolean;
}> {
  return requestJson("/api/user/profile");
}

export async function updateUserProfile(payload: {
  fullName?: string;
  email?: string;
}): Promise<{
  id: string;
  email: string;
  fullName: string;
  isAdmin: boolean;
  isActive: boolean;
}> {
  return requestJson("/api/user/profile", {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function changePassword(payload: {
  currentPassword: string;
  newPassword: string;
}): Promise<{ status: string; message: string }> {
  return requestJson("/api/user/change-password", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
