"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { InlineAlert } from "../../../components/ui-states";
import { LuminaIcon } from "../../../components/lumina-icon";
import { loginUser } from "../../../lib/api";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const trimmedEmail = email.trim();
  const canSubmit = trimmedEmail.length > 0 && password.length >= 6;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting) return;

    if (!canSubmit) {
      setError("请输入管理员邮箱和密码");
      return;
    }

    setError("");
    setIsSubmitting(true);

    try {
      const response = await loginUser(trimmedEmail, password);

      if (!response.user.isAdmin) {
        setError("该账户没有管理员权限");
        setIsSubmitting(false);
        return;
      }

      localStorage.setItem("ai-study-token", response.accessToken);
      localStorage.setItem("ai-study-user", JSON.stringify(response.user));
      document.cookie = `ai-study-token=${response.accessToken}; path=/; max-age=604800; SameSite=Lax`;
      router.push("/admin");
      router.refresh();
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "登录失败，请稍后重试";
      if (message.includes("Invalid credentials")) {
        setError("邮箱或密码错误");
      } else if (message.includes("deactivated")) {
        setError("该账户已被停用");
      } else {
        setError(message);
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-ink/5 via-background to-primary/5 px-4">
      <div className="w-full max-w-md">
        {/* Brand */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-ink text-paper shadow-lift">
            <LuminaIcon className="text-[36px]" name="admin_panel_settings" />
          </div>
          <h1 className="display-face text-2xl font-bold text-ink">管理后台</h1>
          <p className="mt-1 text-sm text-on-surface-variant">仅限管理员访问</p>
        </div>

        {/* Card */}
        <div className="panel rounded-3xl p-6 shadow-panel sm:p-8">
          <h2 className="display-face text-lg font-bold text-ink">管理员登录</h2>
          <p className="mt-1 text-sm text-on-surface-variant">请输入管理员账户信息</p>

          <form className="mt-6 grid gap-4" onSubmit={handleSubmit} noValidate>
            {/* Email */}
            <div className="grid gap-1.5">
              <label className="text-sm font-medium text-on-surface-variant" htmlFor="email">
                管理员邮箱
              </label>
              <div className="relative">
                <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant/50">
                  <LuminaIcon className="text-[18px]" name="mail" />
                </span>
                <input
                  className="ui-input pl-10"
                  id="email"
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@example.com"
                  type="email"
                  value={email}
                />
              </div>
            </div>

            {/* Password */}
            <div className="grid gap-1.5">
              <label className="text-sm font-medium text-on-surface-variant" htmlFor="password">
                密码
              </label>
              <div className="relative">
                <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant/50">
                  <LuminaIcon className="text-[18px]" name="lock" />
                </span>
                <input
                  className="ui-input pl-10"
                  id="password"
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="输入密码"
                  type="password"
                  value={password}
                />
              </div>
            </div>

            {/* Error Alert */}
            {error && <InlineAlert message={error} />}

            {/* Submit */}
            <button
              className="ui-button-primary mt-2 w-full"
              disabled={isSubmitting || !canSubmit}
              type="submit"
            >
              {isSubmitting ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-on-primary/30 border-t-on-primary" />
                  验证中...
                </span>
              ) : (
                "登录管理后台"
              )}
            </button>
          </form>

          {/* Back to user login */}
          <div className="mt-6 text-center">
            <Link
              className="text-sm font-medium text-primary transition hover:text-primary-container"
              href="/login"
            >
              返回用户登录
            </Link>
          </div>
        </div>

        {/* Demo credentials hint */}
        <div className="mt-6 rounded-2xl border border-outline-variant/30 bg-surface-container-lowest/60 p-4">
          <p className="text-xs font-semibold text-on-surface-variant">演示账户</p>
          <p className="mt-1 text-xs text-on-surface-variant/70">
            邮箱: admin@example.com / 密码: admin123
          </p>
        </div>
      </div>
    </div>
  );
}
