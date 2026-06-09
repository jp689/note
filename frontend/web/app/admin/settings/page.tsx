"use client";

import { FormEvent, useEffect, useState } from "react";
import type { AdminSettings } from "@ai-study-notes/contracts";
import { InlineAlert, LoadingPanel } from "../../../components/ui-states";
import { getAdminSettings, updateAdminSettings } from "../../../lib/api";
import { formatBytes, formatDateTime } from "../admin-utils";

const MB = 1024 * 1024;

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<AdminSettings | null>(null);
  const [aiEnabled, setAiEnabled] = useState(true);
  const [maxUploadMb, setMaxUploadMb] = useState(30);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    getAdminSettings()
      .then((payload) => {
        setSettings(payload);
        setAiEnabled(payload.aiEnabled);
        setMaxUploadMb(Math.max(1, Math.round(payload.maxUploadBytes / MB)));
      })
      .catch((caught) => setError(caught instanceof Error ? caught.message : "加载失败"))
      .finally(() => setLoading(false));
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const payload = await updateAdminSettings({
        aiEnabled,
        maxUploadBytes: Math.max(1, maxUploadMb) * MB,
      });
      setSettings(payload);
      setMessage("系统设置已保存");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "保存失败");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <LoadingPanel label="加载系统设置..." />;

  return (
    <div className="grid max-w-4xl gap-6">
      <section>
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-outline">System</p>
        <h3 className="mt-2 text-2xl font-bold text-ink">系统设置</h3>
        <p className="mt-1 text-sm text-on-surface-variant">配置 AI 开关和文件上传限制。</p>
      </section>

      {error ? <InlineAlert message={error} /> : null}
      {message ? <InlineAlert message={message} tone="info" /> : null}

      <form className="ui-card grid gap-6" onSubmit={handleSubmit}>
        <div className="flex flex-col gap-4 border-b border-outline-variant/25 pb-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-semibold text-ink">AI 开关</p>
            <p className="mt-1 text-sm text-on-surface-variant">关闭后可用于阻止后续 AI 处理流程接入。</p>
          </div>
          <label className="inline-flex cursor-pointer items-center gap-3">
            <span className="text-sm font-semibold text-on-surface-variant">
              {aiEnabled ? "开启" : "关闭"}
            </span>
            <input
              checked={aiEnabled}
              className="h-5 w-5 accent-primary"
              onChange={(event) => setAiEnabled(event.target.checked)}
              type="checkbox"
            />
          </label>
        </div>

        <div className="grid gap-3 border-b border-outline-variant/25 pb-6">
          <label className="font-semibold text-ink" htmlFor="maxUploadMb">
            文件大小限制
          </label>
          <div className="flex max-w-sm items-center gap-3">
            <input
              className="ui-input"
              id="maxUploadMb"
              min={1}
              onChange={(event) => setMaxUploadMb(Number(event.target.value))}
              type="number"
              value={maxUploadMb}
            />
            <span className="text-sm font-semibold text-on-surface-variant">MB</span>
          </div>
          <p className="text-sm text-on-surface-variant">
            当前限制：{formatBytes(Math.max(1, maxUploadMb) * MB)}
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-on-surface-variant">
            {settings?.updatedAt ? `上次更新：${formatDateTime(settings.updatedAt)}` : "尚未更新"}
          </p>
          <button className="ui-button-primary" disabled={saving} type="submit">
            {saving ? "保存中..." : "保存设置"}
          </button>
        </div>
      </form>
    </div>
  );
}
