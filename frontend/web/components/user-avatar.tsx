"use client";

import { useEffect, useState } from "react";

function getInitial(): string {
  if (typeof window === "undefined") return "U";
  try {
    const raw = localStorage.getItem("ai-study-user");
    if (raw) {
      const user = JSON.parse(raw);
      if (user.fullName) return user.fullName.charAt(0).toUpperCase();
      if (user.email) return user.email.charAt(0).toUpperCase();
    }
  } catch {
    // ignore
  }
  return "U";
}

export function UserAvatar() {
  const [initial, setInitial] = useState("U");

  useEffect(() => {
    setInitial(getInitial());
  }, []);

  return (
    <div className="flex h-9 w-9 items-center justify-center rounded-full border border-outline-variant/50 bg-surface-container-high text-sm font-bold text-primary">
      {initial}
    </div>
  );
}
