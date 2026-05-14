"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { loginUser, registerUser } from "../../lib/api";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("demo@example.com");
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("password123");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      const response =
        mode === "login"
          ? await loginUser(email, password)
          : await registerUser(email, fullName || email.split("@")[0], password);

      localStorage.setItem("ai-study-token", response.accessToken);
      localStorage.setItem("ai-study-user", JSON.stringify(response.user));
      router.push("/");
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "登录失败，请稍后重试");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl">
      <div className="panel rounded-[32px] p-8 shadow-panel">
        <p className="text-xs uppercase tracking-[0.3em] text-ink/45">Authentication</p>
        <h2 className="display-face mt-3 text-4xl text-ink">
          {mode === "login" ? "进入你的自学控制台" : "创建学习账户"}
        </h2>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-ink/70">
          第一版采用邮箱登录，登录后即可同步 PDF、知识库、题目记录和复习队列。
        </p>

        <div className="mt-6 inline-flex rounded-full bg-white/75 p-1">
          <button
            className={`rounded-full px-4 py-2 text-sm font-medium ${
              mode === "login" ? "bg-ink text-paper" : "text-ink/70"
            }`}
            onClick={() => setMode("login")}
            type="button"
          >
            登录
          </button>
          <button
            className={`rounded-full px-4 py-2 text-sm font-medium ${
              mode === "register" ? "bg-ink text-paper" : "text-ink/70"
            }`}
            onClick={() => setMode("register")}
            type="button"
          >
            注册
          </button>
        </div>

        <form className="mt-8 grid gap-5" onSubmit={handleSubmit}>
          {mode === "register" ? (
            <label className="grid gap-2">
              <span className="text-sm font-medium text-ink/75">姓名</span>
              <input
                className="rounded-[22px] border border-ink/10 bg-white/75 px-4 py-3 outline-none transition focus:border-saffron/40"
                onChange={(event) => setFullName(event.target.value)}
                placeholder="你的姓名"
                type="text"
                value={fullName}
              />
            </label>
          ) : null}
          <label className="grid gap-2">
            <span className="text-sm font-medium text-ink/75">邮箱</span>
            <input
              className="rounded-[22px] border border-ink/10 bg-white/75 px-4 py-3 outline-none transition focus:border-saffron/40"
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              required
              type="email"
              value={email}
            />
          </label>
          <label className="grid gap-2">
            <span className="text-sm font-medium text-ink/75">密码</span>
            <input
              className="rounded-[22px] border border-ink/10 bg-white/75 px-4 py-3 outline-none transition focus:border-saffron/40"
              minLength={6}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="输入密码"
              required
              type="password"
              value={password}
            />
          </label>
          {error ? (
            <div className="rounded-[20px] bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          ) : null}
          <button
            className="mt-2 rounded-full bg-ink px-5 py-3 text-sm font-medium text-paper disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isSubmitting}
            type="submit"
          >
            {isSubmitting
              ? "处理中..."
              : mode === "login"
                ? "登录并进入学习空间"
                : "注册并进入学习空间"}
          </button>
        </form>
      </div>
    </div>
  );
}
