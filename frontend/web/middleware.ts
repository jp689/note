import { NextRequest, NextResponse } from "next/server";
import { getAuthRedirectPath } from "./lib/auth-routes";

const TOKEN_COOKIE = "ai-study-token";

export function middleware(request: NextRequest) {
  const token = request.cookies.get(TOKEN_COOKIE)?.value;
  const redirectPath = getAuthRedirectPath(request.nextUrl.pathname, Boolean(token));

  if (!redirectPath) {
    return NextResponse.next();
  }

  const redirectUrl = request.nextUrl.clone();
  redirectUrl.pathname = redirectPath;
  redirectUrl.search = "";
  return NextResponse.redirect(redirectUrl);
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|biao.png).*)"]
};
