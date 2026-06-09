"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState, useMemo } from "react";
import { InlineAlert } from "../../components/ui-states";
import { LuminaIcon } from "../../components/lumina-icon";
import { loginUser } from "../../lib/api";

interface FieldErrors {
  email?: string;
  password?: string;
}

function validateEmail(email: string): string | undefined {
  if (!email) return "请输入邮箱地址";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return "请输入有效的邮箱格式";
  return undefined;
}

function validatePassword(password: string): string | undefined {
  if (!password) return "请输入密码";
  if (password.length < 6) return "密码至少需要 6 个字符";
  if (password.length > 128) return "密码不能超过 128 个字符";
  return undefined;
}

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRegistrationNoticeOpen, setIsRegistrationNoticeOpen] = useState(false);
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const trimmedEmail = email.trim();

  const canSubmit = useMemo(() => {
    const emailErr = validateEmail(trimmedEmail);
    const passErr = validatePassword(password);
    return !emailErr && !passErr;
  }, [trimmedEmail, password]);

  function validateField(field: string) {
    const errors: FieldErrors = {};
    if (field === "email") errors.email = validateEmail(trimmedEmail);
    if (field === "password") errors.password = validatePassword(password);
    setFieldErrors((prev) => ({ ...prev, ...errors }));
  }

  function handleBlur(field: string) {
    setTouched((prev) => ({ ...prev, [field]: true }));
    validateField(field);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting) return;

    const emailErr = validateEmail(trimmedEmail);
    const passErr = validatePassword(password);

    setFieldErrors({ email: emailErr, password: passErr });
    setTouched({ email: true, password: true });

    if (emailErr || passErr) {
      setError("请修正表单中的错误后重试");
      return;
    }

    setError("");
    setIsSubmitting(true);

    try {
      const response = await loginUser(trimmedEmail, password);

      localStorage.setItem("ai-study-token", response.accessToken);
      localStorage.setItem("ai-study-user", JSON.stringify(response.user));
      document.cookie = `ai-study-token=${response.accessToken}; path=/; max-age=604800; SameSite=Lax`;

      if (response.user.isAdmin) {
        router.push("/admin");
      } else {
        router.push("/");
      }
      router.refresh();
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "登录失败，请稍后重试";
      if (message.includes("Invalid credentials")) {
        setError("邮箱或密码错误，请重试");
      } else if (message.includes("deactivated")) {
        setError("该账户已被停用，请联系管理员");
      } else {
        setError(message);
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        {/* Brand */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-on-primary shadow-soft">
            <LuminaIcon className="text-[32px]" filled name="smart_toy" />
          </div>
          <h1 className="display-face text-2xl font-bold text-ink">Lumina AI</h1>
          <p className="mt-1 text-sm text-on-surface-variant">AI 灵感学习空间</p>
        </div>

        {/* Card */}
        <div className="panel rounded-3xl p-6 shadow-panel sm:p-8">
          <h2 className="display-face text-xl font-bold text-ink">登录账户</h2>
          <p className="mt-1 text-sm text-on-surface-variant">欢迎回来，请输入你的登录信息</p>

          {/* Mode Toggle */}
          <div className="mt-5 inline-flex w-full rounded-2xl bg-surface-container-lowest/80 p-1">
            <button
              aria-pressed
              className="flex-1 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-on-primary shadow-soft transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              onClick={() => setError("")}
              type="button"
            >
              登录
            </button>
            <button
              aria-haspopup="dialog"
              aria-pressed={false}
              className="flex-1 rounded-xl px-4 py-2.5 text-sm font-semibold text-on-surface-variant transition hover:bg-surface-container focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              onClick={() => setIsRegistrationNoticeOpen(true)}
              type="button"
            >
              注册
            </button>
          </div>

          {/* Form */}
          <form className="mt-6 grid gap-4" onSubmit={handleSubmit} noValidate>
            {/* Email */}
            <div className="grid gap-1.5">
              <label className="text-sm font-medium text-on-surface-variant" htmlFor="email">
                邮箱
              </label>
              <div className="relative">
                <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant/50">
                  <LuminaIcon className="text-[18px]" name="mail" />
                </span>
                <input
                  aria-invalid={Boolean(touched.email && fieldErrors.email)}
                  className="ui-input pl-10"
                  id="email"
                  onBlur={() => handleBlur("email")}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (touched.email) validateField("email");
                  }}
                  placeholder="you@example.com"
                  type="email"
                  value={email}
                />
              </div>
              {touched.email && fieldErrors.email && (
                <p className="flex items-center gap-1.5 text-xs text-error">
                  <LuminaIcon className="text-[14px]" name="error" />
                  {fieldErrors.email}
                </p>
              )}
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
                  aria-invalid={Boolean(touched.password && fieldErrors.password)}
                  className="ui-input pl-10"
                  id="password"
                  onBlur={() => handleBlur("password")}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (touched.password) validateField("password");
                  }}
                  placeholder="输入密码"
                  type="password"
                  value={password}
                />
              </div>
              {touched.password && fieldErrors.password && (
                <p className="flex items-center gap-1.5 text-xs text-error">
                  <LuminaIcon className="text-[14px]" name="error" />
                  {fieldErrors.password}
                </p>
              )}
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
                  处理中...
                </span>
              ) : (
                "登录"
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="my-6 flex items-center gap-3">
            <div className="h-px flex-1 bg-outline-variant/40" />
            <span className="text-xs font-medium text-on-surface-variant/60">或者</span>
            <div className="h-px flex-1 bg-outline-variant/40" />
          </div>

          {/* Admin Login Link */}
          <Link
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-outline-variant/40 bg-surface-container-lowest/60 px-4 py-2.5 text-sm font-semibold text-on-surface-variant transition hover:bg-surface-container focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            href="/admin/login"
          >
            <LuminaIcon className="text-[18px]" name="admin_panel_settings" />
            管理员登录
          </Link>
        </div>

        {/* Footer */}
        <p className="mt-6 text-center text-xs text-on-surface-variant/60">
          登录即表示同意我们的服务条款和隐私政策
        </p>
      </div>
      {isRegistrationNoticeOpen ? (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-ink/45 px-4">
          <div
            aria-labelledby="registration-notice-title"
            aria-modal="true"
            className="panel w-full max-w-sm rounded-3xl p-6 shadow-panel"
            role="dialog"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-container text-primary">
              <LuminaIcon className="text-[26px]" name="info" />
            </div>
            <h3
              className="display-face mt-5 text-xl font-bold text-ink"
              id="registration-notice-title"
            >
              注册功能未开放
            </h3>
            <p className="mt-3 text-sm leading-6 text-on-surface-variant">
              当前仅支持由管理员创建账户，请联系管理员开通后再登录使用。
            </p>
            <button
              className="ui-button-primary mt-6 w-full"
              onClick={() => setIsRegistrationNoticeOpen(false)}
              type="button"
            >
              我知道了
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
