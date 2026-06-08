"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState, useMemo } from "react";
import { InlineAlert } from "../../components/ui-states";
import { LuminaIcon } from "../../components/lumina-icon";
import { loginUser, registerUser } from "../../lib/api";

type Mode = "login" | "register";

interface FieldErrors {
  email?: string;
  password?: string;
  fullName?: string;
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

function validateFullName(name: string): string | undefined {
  if (!name) return "请输入姓名";
  if (name.length < 2) return "姓名至少需要 2 个字符";
  if (name.length > 100) return "姓名不能超过 100 个字符";
  return undefined;
}

function getPasswordStrength(password: string): { score: number; label: string; color: string } {
  let score = 0;
  if (password.length >= 6) score++;
  if (password.length >= 10) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  if (score <= 1) return { score, label: "弱", color: "bg-error" };
  if (score <= 3) return { score, label: "中", color: "bg-warning" };
  return { score, label: "强", color: "bg-teal" };
}

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const trimmedEmail = email.trim();
  const trimmedName = fullName.trim();

  const passwordStrength = useMemo(() => getPasswordStrength(password), [password]);

  const canSubmit = useMemo(() => {
    const emailErr = validateEmail(trimmedEmail);
    const passErr = validatePassword(password);
    const nameErr = mode === "register" ? validateFullName(trimmedName) : undefined;
    return !emailErr && !passErr && !nameErr;
  }, [trimmedEmail, password, trimmedName, mode]);

  function validateField(field: string) {
    const errors: FieldErrors = {};
    if (field === "email") errors.email = validateEmail(trimmedEmail);
    if (field === "password") errors.password = validatePassword(password);
    if (field === "fullName") errors.fullName = validateFullName(trimmedName);
    setFieldErrors((prev) => ({ ...prev, ...errors }));
  }

  function handleBlur(field: string) {
    setTouched((prev) => ({ ...prev, [field]: true }));
    validateField(field);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting) return;

    // Validate all fields
    const emailErr = validateEmail(trimmedEmail);
    const passErr = validatePassword(password);
    const nameErr = mode === "register" ? validateFullName(trimmedName) : undefined;

    setFieldErrors({ email: emailErr, password: passErr, fullName: nameErr });
    setTouched({ email: true, password: true, fullName: true });

    if (emailErr || passErr || nameErr) {
      setError("请修正表单中的错误后重试");
      return;
    }

    setError("");
    setIsSubmitting(true);

    try {
      const response =
        mode === "login"
          ? await loginUser(trimmedEmail, password)
          : await registerUser(trimmedEmail, trimmedName, password);

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
      if (message.includes("already exists")) {
        setError("该邮箱已被注册，请直接登录或使用其他邮箱");
      } else if (message.includes("Invalid credentials")) {
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
          <h2 className="display-face text-xl font-bold text-ink">
            {mode === "login" ? "登录账户" : "创建账户"}
          </h2>
          <p className="mt-1 text-sm text-on-surface-variant">
            {mode === "login" ? "欢迎回来，请输入你的登录信息" : "注册一个新账户开始学习之旅"}
          </p>

          {/* Mode Toggle */}
          <div className="mt-5 inline-flex w-full rounded-2xl bg-surface-container-lowest/80 p-1">
            <button
              aria-pressed={mode === "login"}
              className={`flex-1 rounded-xl px-4 py-2.5 text-sm font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
                mode === "login"
                  ? "bg-primary text-on-primary shadow-soft"
                  : "text-on-surface-variant hover:bg-surface-container"
              }`}
              onClick={() => {
                setMode("login");
                setError("");
                setFieldErrors({});
              }}
              type="button"
            >
              登录
            </button>
            <button
              aria-pressed={mode === "register"}
              className={`flex-1 rounded-xl px-4 py-2.5 text-sm font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
                mode === "register"
                  ? "bg-primary text-on-primary shadow-soft"
                  : "text-on-surface-variant hover:bg-surface-container"
              }`}
              onClick={() => {
                setMode("register");
                setError("");
                setFieldErrors({});
              }}
              type="button"
            >
              注册
            </button>
          </div>

          {/* Form */}
          <form className="mt-6 grid gap-4" onSubmit={handleSubmit} noValidate>
            {/* Full Name (register only) */}
            {mode === "register" && (
              <div className="grid gap-1.5">
                <label className="text-sm font-medium text-on-surface-variant" htmlFor="fullName">
                  姓名
                </label>
                <div className="relative">
                  <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant/50">
                    <LuminaIcon className="text-[18px]" name="account_circle" />
                  </span>
                  <input
                    aria-invalid={Boolean(touched.fullName && fieldErrors.fullName)}
                    className="ui-input pl-10"
                    id="fullName"
                    onBlur={() => handleBlur("fullName")}
                    onChange={(e) => {
                      setFullName(e.target.value);
                      if (touched.fullName) validateField("fullName");
                    }}
                    placeholder="你的姓名"
                    type="text"
                    value={fullName}
                  />
                </div>
                {touched.fullName && fieldErrors.fullName && (
                  <p className="flex items-center gap-1.5 text-xs text-error">
                    <LuminaIcon className="text-[14px]" name="error" />
                    {fieldErrors.fullName}
                  </p>
                )}
              </div>
            )}

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
                  placeholder={mode === "register" ? "至少 6 个字符" : "输入密码"}
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
              {/* Password strength indicator (register only) */}
              {mode === "register" && password.length > 0 && (
                <div className="flex items-center gap-2">
                  <div className="flex flex-1 gap-1">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <div
                        key={i}
                        className={`h-1 flex-1 rounded-full transition-colors ${
                          i <= passwordStrength.score ? passwordStrength.color : "bg-surface-container"
                        }`}
                      />
                    ))}
                  </div>
                  <span className="text-xs font-medium text-on-surface-variant">
                    密码强度: {passwordStrength.label}
                  </span>
                </div>
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
              ) : mode === "login" ? (
                "登录"
              ) : (
                "创建账户"
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
    </div>
  );
}
