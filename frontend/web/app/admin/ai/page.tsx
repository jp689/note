"use client";

import { useEffect, useState } from "react";
import type { AdminAiUsageResponse } from "@ai-study-notes/contracts";
import { EmptyState, InlineAlert, LoadingPanel } from "../../../components/ui-states";
import { getAdminAiUsage } from "../../../lib/api";
import { formatDateTime, statusTone } from "../admin-utils";

export default function AdminAiPage() {
  const [data, setData] = useState<AdminAiUsageResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    getAdminAiUsage(1, 50)
      .then(setData)
      .catch((caught) => setError(caught instanceof Error ? caught.message : "加载失败"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingPanel label="加载 AI 调用记录..." />;

  const successCount = Math.max(0, (data?.total ?? 0) - (data?.failedCount ?? 0));

  return (
    <div className="grid gap-6">
      <section>
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-outline">AI Usage</p>
        <h3 className="mt-2 text-2xl font-bold text-ink">AI 管理</h3>
        <p className="mt-1 text-sm text-on-surface-variant">追踪模型调用、Token 消耗和失败原因。</p>
      </section>

      {error ? <InlineAlert message={error} /> : null}

      <section className="grid gap-5 md:grid-cols-3">
        <div className="ui-card">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-outline">调用次数</p>
          <p className="mt-3 display-face text-4xl font-bold text-ink">{data?.total ?? 0}</p>
          <p className="mt-2 text-xs text-on-surface-variant">成功 {successCount} 次</p>
        </div>
        <div className="ui-card">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-outline">Token 消耗</p>
          <p className="mt-3 display-face text-4xl font-bold text-ink">{data?.totalTokens ?? 0}</p>
          <p className="mt-2 text-xs text-on-surface-variant">Prompt 与 Completion 合计</p>
        </div>
        <div className="ui-card">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-outline">失败次数</p>
          <p className="mt-3 display-face text-4xl font-bold text-error">{data?.failedCount ?? 0}</p>
          <p className="mt-2 text-xs text-on-surface-variant">按状态 failed 统计</p>
        </div>
      </section>

      <section className="ui-card overflow-hidden p-0">
        {data && data.items.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] text-left text-sm">
              <thead className="border-b border-outline-variant/30 bg-surface-container-lowest text-xs uppercase tracking-[0.12em] text-outline">
                <tr>
                  <th className="px-5 py-4">操作</th>
                  <th className="px-5 py-4">模型</th>
                  <th className="px-5 py-4">用户/文档</th>
                  <th className="px-5 py-4">Token</th>
                  <th className="px-5 py-4">状态</th>
                  <th className="px-5 py-4">时间</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/20">
                {data.items.map((item) => (
                  <tr key={item.id} className="bg-surface-container-low/20">
                    <td className="px-5 py-4 font-semibold text-ink">{item.operation}</td>
                    <td className="px-5 py-4 text-on-surface-variant">
                      {item.provider} / {item.model || "默认模型"}
                    </td>
                    <td className="px-5 py-4">
                      <p className="text-sm text-ink">{item.userEmail ?? "系统"}</p>
                      <p className="mt-1 text-xs text-on-surface-variant">{item.documentTitle ?? "无关联文档"}</p>
                    </td>
                    <td className="px-5 py-4">
                      <p className="font-semibold text-ink">{item.totalTokens}</p>
                      <p className="mt-1 text-xs text-on-surface-variant">
                        {item.promptTokens} + {item.completionTokens}
                      </p>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusTone(item.status)}`}>
                        {item.status === "success" ? "成功" : "失败"}
                      </span>
                      {item.failureReason ? (
                        <p className="mt-2 max-w-xs text-xs text-error">{item.failureReason}</p>
                      ) : null}
                    </td>
                    <td className="px-5 py-4 text-on-surface-variant">{formatDateTime(item.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState description="当前还没有记录到 AI 调用。" icon="auto_awesome" title="暂无 AI 调用记录" />
        )}
      </section>
    </div>
  );
}
