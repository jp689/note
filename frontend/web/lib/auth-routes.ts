const PUBLIC_PATHS = new Set(["/login", "/admin/login"]);

export function isPublicAuthPath(pathname: string): boolean {
  return PUBLIC_PATHS.has(pathname);
}

export function getAuthRedirectPath(pathname: string, hasToken: boolean): string | null {
  if (hasToken || isPublicAuthPath(pathname)) {
    return null;
  }

  if (pathname.startsWith("/admin")) {
    return "/admin/login";
  }

  return "/login";
}
