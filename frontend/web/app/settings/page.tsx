"use client";

import { useEffect, useState } from "react";
import { LuminaIcon } from "../../components/lumina-icon";
import { LoadingPanel } from "../../components/ui-states";
import { useToast } from "../../components/toast-provider";
import {
  changePassword,
  getUserProfile,
  updateUserProfile,
} from "../../lib/api";

export default function SettingsPage() {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);

  // Profile state
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [originalFullName, setOriginalFullName] = useState("");
  const [originalEmail, setOriginalEmail] = useState("");

  // Password state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  useEffect(() => {
    getUserProfile()
      .then((profile) => {
        setFullName(profile.fullName);
        setEmail(profile.email);
        setOriginalFullName(profile.fullName);
        setOriginalEmail(profile.email);
      })
      .catch(() => showToast("加载用户信息失败", "warning"))
      .finally(() => setLoading(false));
  }, [showToast]);

  async function handleSaveProfile() {
    if (!fullName.trim()) {
      showToast("姓名不能为空", "warning");
      return;
    }
    if (!email.trim()) {
      showToast("邮箱不能为空", "warning");
      return;
    }

    setSaving(true);
    try {
      await updateUserProfile({
        fullName: fullName !== originalFullName ? fullName : undefined,
        email: email !== originalEmail ? email : undefined,
      });
      setOriginalFullName(fullName);
      setOriginalEmail(email);
      showToast("个人资料已更新", "success");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "更新失败", "warning");
    } finally {
      setSaving(false);
    }
  }

  async function handleChangePassword() {
    if (!currentPassword) {
      showToast("请输入当前密码", "warning");
      return;
    }
    if (newPassword.length < 6) {
      showToast("新密码至少需要 6 个字符", "warning");
      return;
    }
    if (newPassword !== confirmPassword) {
      showToast("两次输入的新密码不一致", "warning");
      return;
    }

    setChangingPassword(true);
    try {
      await changePassword({ currentPassword, newPassword });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      showToast("密码修改成功", "success");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "密码修改失败", "warning");
    } finally {
      setChangingPassword(false);
    }
  }

  if (loading) return <LoadingPanel label="加载设置..." />;

  const hasProfileChanges =
    fullName !== originalFullName || email !== originalEmail;

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      {/* Header */}
      <section>
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <LuminaIcon className="text-[28px]" name="settings" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-ink">设置</h2>
            <p className="text-sm text-on-surface-variant">
              管理你的个人资料和账户安全
            </p>
          </div>
        </div>
      </section>

      {/* Profile Section */}
      <section className="panel rounded-3xl p-6 shadow-panel sm:p-8">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal/10 text-teal">
            <LuminaIcon className="text-[22px]" name="person" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-ink">个人资料</h3>
            <p className="text-xs text-on-surface-variant">
              更新你的基本信息
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-ink" htmlFor="fullName">
              姓名
            </label>
            <input
              className="ui-input w-full"
              id="fullName"
              onChange={(e) => setFullName(e.target.value)}
              placeholder="输入你的姓名"
              value={fullName}
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-ink" htmlFor="email">
              邮箱
            </label>
            <input
              className="ui-input w-full"
              id="email"
              onChange={(e) => setEmail(e.target.value)}
              placeholder="输入你的邮箱"
              type="email"
              value={email}
            />
          </div>

          <div className="flex justify-end pt-2">
            <button
              className="ui-button-primary"
              disabled={!hasProfileChanges || saving}
              onClick={handleSaveProfile}
              type="button"
            >
              {saving ? "保存中..." : "保存修改"}
            </button>
          </div>
        </div>
      </section>

      {/* Password Section */}
      <section className="panel rounded-3xl p-6 shadow-panel sm:p-8">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-saffron/10 text-saffron">
            <LuminaIcon className="text-[22px]" name="lock" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-ink">修改密码</h3>
            <p className="text-xs text-on-surface-variant">
              更新你的账户密码
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-ink" htmlFor="currentPassword">
              当前密码
            </label>
            <input
              className="ui-input w-full"
              id="currentPassword"
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="输入当前密码"
              type="password"
              value={currentPassword}
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-ink" htmlFor="newPassword">
              新密码
            </label>
            <input
              className="ui-input w-full"
              id="newPassword"
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="输入新密码（至少 6 个字符）"
              type="password"
              value={newPassword}
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-ink" htmlFor="confirmPassword">
              确认新密码
            </label>
            <input
              className="ui-input w-full"
              id="confirmPassword"
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="再次输入新密码"
              type="password"
              value={confirmPassword}
            />
          </div>

          <div className="flex justify-end pt-2">
            <button
              className="ui-button-primary"
              disabled={
                !currentPassword || !newPassword || !confirmPassword || changingPassword
              }
              onClick={handleChangePassword}
              type="button"
            >
              {changingPassword ? "修改中..." : "修改密码"}
            </button>
          </div>
        </div>
      </section>

      {/* About Section */}
      <section className="panel rounded-3xl p-6 shadow-panel sm:p-8">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-ink/10 text-ink">
            <LuminaIcon className="text-[22px]" name="info" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-ink">关于</h3>
            <p className="text-xs text-on-surface-variant">
              应用版本信息
            </p>
          </div>
        </div>

        <div className="space-y-3 text-sm text-on-surface-variant">
          <div className="flex items-center justify-between">
            <span>应用名称</span>
            <span className="font-medium text-ink">Lumina AI</span>
          </div>
          <div className="flex items-center justify-between">
            <span>版本</span>
            <span className="font-medium text-ink">1.0.0 MVP</span>
          </div>
          <div className="flex items-center justify-between">
            <span>技术栈</span>
            <span className="font-medium text-ink">Next.js + FastAPI</span>
          </div>
        </div>
      </section>
    </div>
  );
}
