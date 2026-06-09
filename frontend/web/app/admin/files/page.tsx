"use client";

import { useEffect, useState } from "react";
import type { AdminFileItem, AdminFileListResponse } from "@ai-study-notes/contracts";
import { EmptyState, InlineAlert, LoadingPanel } from "../../../components/ui-states";
import { deleteAdminFile, getAdminFiles } from "../../../lib/api";
import { formatBytes, formatDateTime, STATUS_LABELS, statusTone } from "../admin-utils";

export default function AdminFilesPage() {
  const [data, setData] = useState<AdminFileListResponse | null>(null);
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    getAdminFiles(1, 50, query)
      .then(setData)
      .catch((caught) => setError(caught instanceof Error ? caught.message : "加载失败"))
      .finally(() => setLoading(false));
  }, [query]);

  async function handleDelete(file: AdminFileItem) {
    if (deletingId) return;
    setDeletingId(file.id);
    setError("");
    try {
      await deleteAdminFile(file.id);
      setData((prev) =>
        prev
          ? {
              ...prev,
              total: Math.max(0, prev.total - 1),
              items: prev.items.filter((item) => item.id !== file.id),
            }
          : prev
      );
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "删除失败");
    } finally {
      setDeletingId(null);
    }
  }

  if (loading && !data) return <LoadingPanel label="加载文件列表..." />;

  return (
    <div className="grid gap-6">
      <section className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-outline">Files</p>
          <h3 className="mt-2 text-2xl font-bold text-ink">文件管理</h3>
          <p className="mt-1 text-sm text-on-surface-variant">查看上传文件、解析状态、大小和归属用户。</p>
        </div>
        <form
          className="flex w-full gap-2 lg:max-w-md"
          onSubmit={(event) => {
            event.preventDefault();
            setQuery(search.trim());
          }}
        >
          <input
            className="ui-input"
            onChange={(event) => setSearch(event.target.value)}
            placeholder="搜索文件名、标题或用户邮箱"
            value={search}
          />
          <button className="ui-button-primary shrink-0" type="submit">
            搜索
          </button>
        </form>
      </section>

      {error ? <InlineAlert message={error} /> : null}

      <section className="ui-card overflow-hidden p-0">
        {data && data.items.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[920px] text-left text-sm">
              <thead className="border-b border-outline-variant/30 bg-surface-container-lowest text-xs uppercase tracking-[0.12em] text-outline">
                <tr>
                  <th className="px-5 py-4">文件</th>
                  <th className="px-5 py-4">用户</th>
                  <th className="px-5 py-4">大小</th>
                  <th className="px-5 py-4">解析状态</th>
                  <th className="px-5 py-4">上传时间</th>
                  <th className="px-5 py-4 text-right">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/20">
                {data.items.map((file) => (
                  <tr key={file.id} className="bg-surface-container-low/20">
                    <td className="px-5 py-4">
                      <p className="font-semibold text-ink">{file.fileName}</p>
                      <p className="mt-1 text-xs text-on-surface-variant">{file.title}</p>
                    </td>
                    <td className="px-5 py-4 text-on-surface-variant">{file.ownerEmail}</td>
                    <td className="px-5 py-4 font-semibold text-ink">{formatBytes(file.fileSize)}</td>
                    <td className="px-5 py-4">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusTone(file.parseStatus)}`}>
                        {STATUS_LABELS[file.parseStatus] ?? file.parseStatus}
                      </span>
                      {file.errorMessage ? (
                        <p className="mt-2 max-w-xs text-xs text-error">{file.errorMessage}</p>
                      ) : null}
                    </td>
                    <td className="px-5 py-4 text-on-surface-variant">{formatDateTime(file.uploadedAt)}</td>
                    <td className="px-5 py-4 text-right">
                      <button
                        className="rounded-lg bg-error/10 px-3 py-1.5 text-xs font-semibold text-error transition hover:bg-error/20 disabled:opacity-50"
                        disabled={deletingId === file.id}
                        onClick={() => handleDelete(file)}
                        type="button"
                      >
                        {deletingId === file.id ? "删除中" : "删除"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState description="当前没有匹配的上传文件。" icon="folder_shared" title="暂无文件" />
        )}
      </section>

      <p className="text-xs text-on-surface-variant">共 {data?.total ?? 0} 条记录</p>
    </div>
  );
}
