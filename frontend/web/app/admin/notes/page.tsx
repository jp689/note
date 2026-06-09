"use client";

import { useEffect, useState } from "react";
import type { AdminNoteItem, AdminNoteListResponse } from "@ai-study-notes/contracts";
import { LuminaIcon } from "../../../components/lumina-icon";
import { EmptyState, InlineAlert, LoadingPanel } from "../../../components/ui-states";
import { deleteAdminNote, getAdminNotes } from "../../../lib/api";
import { formatDateTime, STATUS_LABELS, statusTone } from "../admin-utils";

export default function AdminNotesPage() {
  const [data, setData] = useState<AdminNoteListResponse | null>(null);
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    getAdminNotes(1, 50, query)
      .then(setData)
      .catch((caught) => setError(caught instanceof Error ? caught.message : "加载失败"))
      .finally(() => setLoading(false));
  }, [query]);

  async function handleDelete(note: AdminNoteItem) {
    if (deletingId) return;
    setDeletingId(note.id);
    setError("");
    try {
      await deleteAdminNote(note.id);
      setData((prev) =>
        prev
          ? {
              ...prev,
              total: Math.max(0, prev.total - 1),
              items: prev.items.filter((item) => item.id !== note.id),
            }
          : prev
      );
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "删除失败");
    } finally {
      setDeletingId(null);
    }
  }

  if (loading && !data) return <LoadingPanel label="加载笔记列表..." />;

  return (
    <div className="grid gap-6">
      <section className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-outline">Notes</p>
          <h3 className="mt-2 text-2xl font-bold text-ink">笔记管理</h3>
          <p className="mt-1 text-sm text-on-surface-variant">查看学习笔记、知识点数量和题库产出，支持删除。</p>
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
            placeholder="搜索标题、文件名或用户邮箱"
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
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead className="border-b border-outline-variant/30 bg-surface-container-lowest text-xs uppercase tracking-[0.12em] text-outline">
                <tr>
                  <th className="px-5 py-4">笔记</th>
                  <th className="px-5 py-4">用户</th>
                  <th className="px-5 py-4">状态</th>
                  <th className="px-5 py-4">知识点</th>
                  <th className="px-5 py-4">题库</th>
                  <th className="px-5 py-4">更新时间</th>
                  <th className="px-5 py-4 text-right">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/20">
                {data.items.map((note) => (
                  <tr key={note.id} className="bg-surface-container-low/20">
                    <td className="px-5 py-4">
                      <p className="font-semibold text-ink">{note.title}</p>
                      <p className="mt-1 text-xs text-on-surface-variant">{note.pageCount} 页</p>
                    </td>
                    <td className="px-5 py-4 text-on-surface-variant">{note.ownerEmail}</td>
                    <td className="px-5 py-4">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusTone(note.status)}`}>
                        {STATUS_LABELS[note.status] ?? note.status}
                      </span>
                    </td>
                    <td className="px-5 py-4 font-semibold text-ink">{note.knowledgeCount}</td>
                    <td className="px-5 py-4 font-semibold text-ink">{note.quizCount}</td>
                    <td className="px-5 py-4 text-on-surface-variant">{formatDateTime(note.updatedAt)}</td>
                    <td className="px-5 py-4 text-right">
                      <button
                        className="rounded-lg bg-error/10 px-3 py-1.5 text-xs font-semibold text-error transition hover:bg-error/20 disabled:opacity-50"
                        disabled={deletingId === note.id}
                        onClick={() => handleDelete(note)}
                        type="button"
                      >
                        {deletingId === note.id ? "删除中" : "删除"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            description="当前没有匹配的笔记。"
            icon="article"
            title="暂无笔记"
          />
        )}
      </section>

      <p className="text-xs text-on-surface-variant">
        共 {data?.total ?? 0} 条记录
      </p>
    </div>
  );
}
