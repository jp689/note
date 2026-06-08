"use client";

import Link from "next/link";
import { MouseEvent } from "react";
import { LuminaIcon } from "./lumina-icon";

export function LogoutLink() {
  function handleLogout(event: MouseEvent<HTMLAnchorElement>) {
    event.preventDefault();
    localStorage.removeItem("ai-study-token");
    localStorage.removeItem("ai-study-user");
    document.cookie = "ai-study-token=; path=/; max-age=0; SameSite=Lax";
    window.location.href = "/login";
  }

  return (
    <Link
      className="flex min-h-11 items-center gap-3 rounded-xl px-4 py-2.5 text-error transition hover:bg-error-container/60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-error"
      href="/login"
      onClick={handleLogout}
    >
      <LuminaIcon name="logout" />
      退出登录
    </Link>
  );
}
