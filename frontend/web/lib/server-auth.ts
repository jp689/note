import { cookies } from "next/headers";

export function getServerToken(): string | undefined {
  return cookies().get("ai-study-token")?.value;
}
