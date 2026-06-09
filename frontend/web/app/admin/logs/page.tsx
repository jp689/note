"use client";

import { useEffect, useState } from "react";
import type { AdminLogsResponse } from "@ai-study-notes/contracts";
import { EmptyState, InlineAlert, LoadingPanel } from "../../../components/ui-states";
import { getAdminLogs } from "../../../lib/api";
import { formatDateTime } from "../admin-utils";

export default function AdminLogsPage() {
  const [data, setData] = useState<AdminLogsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    getAdminLogs()
      .then(setData)
      .catch((caught) => setError(caught instanceof Error ? caught.message : "加载失败"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingPanel label="加载日志..." />;

  return (
    <div className="grid gap-6">
      <section>
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-outline">Logs</p>
        <h3 className="mt-2 text-2xl font-bold text-ink">日志管理</h3>
        <p className="mt-1 text-sm text-on-surface-variant">查看登录日志和后台操作日志。</p>
      </section>

      {error ? <InlineAlert message={error} /> : null}

      <section className="grid gap-6 xl:grid-cols-2">
        <div className="ui-card overflow-hidden p-0">
          <div className="border-b border-outline-variant/25 px-5 py-4">
            <h4 className="font-bold text-ink">登录日志</h4>
          </div>
          {data && data.loginLogs.length > 0 ? (
            <div className="divide-y divide-outline-variant/20">
              {data.loginLogs.map((log) => (
                <div className="grid gap-2 px-5 py-4" key={log.id}>
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-semibold text-ink">{log.email}</p>
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                        log.success ? "bg-teal/10 text-teal" : "bg-error/10 text-error"
                      }`}
                    >
                      {log.success ? "成功" : "失败"}
                    </span>
                  </div>
                  <p className="text-xs text-on-surface-variant">
                    {log.ipAddress} · {formatDateTime(log.createdAt)}
                  </p>
                  {log.failureReason ? <p className="text-xs text-error">{log.failureReason}</p> : null}
                </div>
              ))}
            </div>
          ) : (
            <div className="p-5">
              <EmptyState description="暂无登录日志。" icon="login" title="暂无记录" />
            </div>
          )}
        </div>

        <div className="ui-card overflow-hidden p-0">
          <div className="border-b border-outline-variant/25 px-5 py-4">
            <h4 className="font-bold text-ink">操作日志</h4>
          </div>
          {data && data.operationLogs.length > 0 ? (
            <div className="divide-y divide-outline-variant/20">
              {data.operationLogs.map((log) => (
                <div className="grid gap-2 px-5 py-4" key={log.id}>
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-semibold text-ink">{log.action}</p>
                    <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
                      {log.targetType || "system"}
                    </span>
                  </div>
                  <p className="text-sm text-on-surface-variant">{log.actorEmail || "系统"}</p>
                  <p className="text-xs text-on-surface-variant">
                    {log.targetId ? `${log.targetId} · ` : ""}
                    {formatDateTime(log.createdAt)}
                  </p>
                  {log.detail ? <p className="text-xs text-on-surface-variant">{log.detail}</p> : null}
                </div>
              ))}
            </div>
          ) : (
            <div className="p-5">
              <EmptyState description="暂无操作日志。" icon="fact_check" title="暂无记录" />
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
