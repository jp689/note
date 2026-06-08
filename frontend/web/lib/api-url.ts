const DEFAULT_SERVER_API_BASE_URL = "http://localhost:8000";

export interface BuildApiUrlOptions {
  isServer?: boolean;
  publicApiBaseUrl?: string;
  internalApiBaseUrl?: string;
}

function cleanBaseUrl(baseUrl: string): string {
  return baseUrl.replace(/\/+$/, "");
}

export function resolveApiBaseUrl({
  isServer = typeof window === "undefined",
  publicApiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL,
  internalApiBaseUrl = process.env.INTERNAL_API_BASE_URL
}: BuildApiUrlOptions = {}): string {
  if (isServer) {
    return internalApiBaseUrl || publicApiBaseUrl || DEFAULT_SERVER_API_BASE_URL;
  }

  return publicApiBaseUrl || "";
}

export function buildApiUrl(path: string, options: BuildApiUrlOptions = {}): string {
  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }

  const baseUrl = resolveApiBaseUrl(options);
  if (!baseUrl) {
    return path;
  }

  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${cleanBaseUrl(baseUrl)}${normalizedPath}`;
}
