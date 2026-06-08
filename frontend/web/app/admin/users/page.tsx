"use client";

import { useCallback, useEffect, useState } from "react";
import { LuminaIcon } from "../../../components/lumina-icon";
import { InlineAlert, LoadingPanel } from "../../../components/ui-states";
import { useToast } from "../../../components/toast-provider";
import {
  getAdminUsers,
  updateAdminUser,
  deleteAdminUser,
  createAdminUser,
  updateAdminUserProfile,
} from "../../../lib/api";
import type {
  AdminUserListResponse,
  AdminUserCreate,
  AdminUserUpdateProfile,
  UserProfile,
} from "@ai-study-notes/contracts";

function StatusBadge({ active }: { active: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
        active
          ? "bg-teal/10 text-teal"
          : "bg-error/10 text-error"
      }`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${active ? "bg-teal" : "bg-error"}`} />
      {active ? "激活" : "停用"}
    </span>
  );
}

function RoleBadge({ isAdmin }: { isAdmin: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
        isAdmin
          ? "bg-ink/10 text-ink"
          : "bg-surface-container text-on-surface-variant"
      }`}
    >
      {isAdmin ? "管理员" : "普通用户"}
    </span>
  );
}

/* ─── Create User Modal ─── */
function CreateUserModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (user: UserProfile) => void;
}) {
  const toast = useToast();
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) {
      setEmail("");
      setFullName("");
      setPassword("");
      setIsAdmin(false);
      setError("");
    }
  }, [open]);

  if (!open) return null;

  const canSubmit = email.trim() && fullName.trim() && password.length >= 6 && !submitting;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    setError("");
    try {
      const payload: AdminUserCreate = {
        email: email.trim(),
        fullName: fullName.trim(),
        password,
        isAdmin,
        isActive: true,
      };
      const result = await createAdminUser(payload);
      onCreated({
        id: result.id,
        email: result.email,
        fullName: result.fullName,
        isAdmin: result.isAdmin,
        isActive: result.isActive,
      });
      toast.showToast("用户创建成功", "success");
      onClose();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "创建失败";
      setError(msg.includes("already exists") ? "该邮箱已存在" : msg);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-ink/30 backdrop-blur-sm">
      <div className="panel mx-4 w-full max-w-lg rounded-3xl p-6 shadow-panel sm:p-8">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-ink">新建用户</h3>
          <button
            className="flex h-9 w-9 items-center justify-center rounded-full text-on-surface-variant transition hover:bg-surface-container"
            onClick={onClose}
            type="button"
          >
            <LuminaIcon name="close" />
          </button>
        </div>

        <form className="mt-6 grid gap-4" onSubmit={handleSubmit}>
          <div className="grid gap-1.5">
            <label className="text-sm font-medium text-on-surface-variant" htmlFor="c-email">
              邮箱
            </label>
            <input
              className="ui-input"
              id="c-email"
              onChange={(e) => setEmail(e.target.value)}
              placeholder="user@example.com"
              type="email"
              value={email}
            />
          </div>
          <div className="grid gap-1.5">
            <label className="text-sm font-medium text-on-surface-variant" htmlFor="c-name">
              姓名
            </label>
            <input
              className="ui-input"
              id="c-name"
              onChange={(e) => setFullName(e.target.value)}
              placeholder="输入用户姓名"
              type="text"
              value={fullName}
            />
          </div>
          <div className="grid gap-1.5">
            <label className="text-sm font-medium text-on-surface-variant" htmlFor="c-pwd">
              密码
            </label>
            <input
              className="ui-input"
              id="c-pwd"
              minLength={6}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="至少 6 位"
              type="password"
              value={password}
            />
          </div>
          <label className="flex items-center gap-3 text-sm text-on-surface-variant">
            <input
              checked={isAdmin}
              className="h-4 w-4"
              onChange={(e) => setIsAdmin(e.target.checked)}
              type="checkbox"
            />
            设为管理员
          </label>
          {error && <InlineAlert message={error} />}
          <div className="flex justify-end gap-3 pt-2">
            <button className="ui-button-ghost" onClick={onClose} type="button">
              取消
            </button>
            <button className="ui-button-primary" disabled={!canSubmit} type="submit">
              {submitting ? "创建中..." : "创建用户"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ─── Edit User Modal ─── */
function EditUserModal({
  open,
  user,
  onClose,
  onUpdated,
}: {
  open: boolean;
  user: UserProfile | null;
  onClose: () => void;
  onUpdated: (user: UserProfile) => void;
}) {
  const toast = useToast();
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (user && open) {
      setEmail(user.email);
      setFullName(user.fullName);
      setPassword("");
      setError("");
    }
  }, [user, open]);

  if (!open || !user) return null;

  const editingUser = user;
  const canSubmit = email.trim() && fullName.trim() && !submitting;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    setError("");
    try {
      const payload: AdminUserUpdateProfile = {
        email: email.trim(),
        fullName: fullName.trim(),
      };
      if (password.length > 0) {
        payload.password = password;
      }
      const result = await updateAdminUserProfile(editingUser.id, payload);
      onUpdated({
        id: result.id,
        email: result.email,
        fullName: result.fullName,
        isAdmin: result.isAdmin,
        isActive: result.isActive,
      });
      toast.showToast("用户信息已更新", "success");
      onClose();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "更新失败";
      setError(msg.includes("already exists") ? "该邮箱已存在" : msg);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-ink/30 backdrop-blur-sm">
      <div className="panel mx-4 w-full max-w-lg rounded-3xl p-6 shadow-panel sm:p-8">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-ink">编辑用户</h3>
          <button
            className="flex h-9 w-9 items-center justify-center rounded-full text-on-surface-variant transition hover:bg-surface-container"
            onClick={onClose}
            type="button"
          >
            <LuminaIcon name="close" />
          </button>
        </div>

        <form className="mt-6 grid gap-4" onSubmit={handleSubmit}>
          <div className="grid gap-1.5">
            <label className="text-sm font-medium text-on-surface-variant" htmlFor="e-email">
              邮箱
            </label>
            <input
              className="ui-input"
              id="e-email"
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              value={email}
            />
          </div>
          <div className="grid gap-1.5">
            <label className="text-sm font-medium text-on-surface-variant" htmlFor="e-name">
              姓名
            </label>
            <input
              className="ui-input"
              id="e-name"
              onChange={(e) => setFullName(e.target.value)}
              type="text"
              value={fullName}
            />
          </div>
          <div className="grid gap-1.5">
            <label className="text-sm font-medium text-on-surface-variant" htmlFor="e-pwd">
              新密码 <span className="text-on-surface-variant/50">（留空则不修改）</span>
            </label>
            <input
              className="ui-input"
              id="e-pwd"
              minLength={6}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="输入新密码"
              type="password"
              value={password}
            />
          </div>
          {error && <InlineAlert message={error} />}
          <div className="flex justify-end gap-3 pt-2">
            <button className="ui-button-ghost" onClick={onClose} type="button">
              取消
            </button>
            <button className="ui-button-primary" disabled={!canSubmit} type="submit">
              {submitting ? "保存中..." : "保存修改"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ─── Main Page ─── */
export default function AdminUsersPage() {
  const toast = useToast();
  const [data, setData] = useState<AdminUserListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [page, setPage] = useState(1);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  // Filters
  const [filterActive, setFilterActive] = useState<"all" | "active" | "inactive">("all");
  const [filterRole, setFilterRole] = useState<"all" | "admin" | "user">("all");

  // Modals
  const [showCreate, setShowCreate] = useState(false);
  const [editUser, setEditUser] = useState<UserProfile | null>(null);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const isActiveParam = filterActive === "active" ? true : filterActive === "inactive" ? false : undefined;
      const isAdminParam = filterRole === "admin" ? true : filterRole === "user" ? false : undefined;
      const result = await getAdminUsers(page, 20, search, isActiveParam, isAdminParam);
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "加载失败");
    } finally {
      setLoading(false);
    }
  }, [page, search, filterActive, filterRole]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setPage(1);
    setSearch(searchInput);
  }

  function handleFilterChange(type: "active" | "role", value: string) {
    setPage(1);
    if (type === "active") setFilterActive(value as typeof filterActive);
    if (type === "role") setFilterRole(value as typeof filterRole);
  }

  async function handleToggleActive(user: UserProfile) {
    const actionId = `active-${user.id}`;
    setActionLoading(actionId);
    try {
      const updated = await updateAdminUser(user.id, { isActive: !user.isActive });
      setData((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          users: prev.users.map((u) => (u.id === user.id ? { ...u, isActive: updated.isActive } : u)),
        };
      });
      toast.showToast(
        updated.isActive ? `已激活用户 ${user.fullName}` : `已停用用户 ${user.fullName}`,
        "success"
      );
    } catch (err) {
      toast.showToast(err instanceof Error ? err.message : "操作失败", "warning");
    } finally {
      setActionLoading(null);
    }
  }

  async function handleToggleAdmin(user: UserProfile) {
    const actionId = `admin-${user.id}`;
    setActionLoading(actionId);
    try {
      const updated = await updateAdminUser(user.id, { isAdmin: !user.isAdmin });
      setData((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          users: prev.users.map((u) => (u.id === user.id ? { ...u, isAdmin: updated.isAdmin } : u)),
        };
      });
      toast.showToast(
        updated.isAdmin ? `已授予 ${user.fullName} 管理员权限` : `已撤销 ${user.fullName} 管理员权限`,
        "success"
      );
    } catch (err) {
      toast.showToast(err instanceof Error ? err.message : "操作失败", "warning");
    } finally {
      setActionLoading(null);
    }
  }

  async function handleDelete(user: UserProfile) {
    const actionId = `delete-${user.id}`;
    setActionLoading(actionId);
    try {
      await deleteAdminUser(user.id);
      setData((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          users: prev.users.filter((u) => u.id !== user.id),
          total: prev.total - 1,
        };
      });
      setDeleteConfirm(null);
      toast.showToast(`已删除用户 ${user.fullName}`, "success");
    } catch (err) {
      toast.showToast(err instanceof Error ? err.message : "删除失败", "warning");
    } finally {
      setActionLoading(null);
    }
  }

  function handleUserCreated(user: UserProfile) {
    setData((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        users: [user, ...prev.users],
        total: prev.total + 1,
      };
    });
  }

  function handleUserUpdated(user: UserProfile) {
    setData((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        users: prev.users.map((u) => (u.id === user.id ? user : u)),
      };
    });
  }

  const totalPages = data ? Math.ceil(data.total / data.pageSize) : 1;

  return (
    <div className="grid gap-6">
      {/* Header Row: Search + Create */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <form className="flex gap-3 flex-1" onSubmit={handleSearch}>
          <div className="relative flex-1">
            <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant/50">
              <LuminaIcon className="text-[18px]" name="person_search" />
            </span>
            <input
              className="ui-input pl-10"
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="搜索邮箱或姓名..."
              type="text"
              value={searchInput}
            />
          </div>
          <button className="ui-button-primary" type="submit">
            <LuminaIcon className="text-[18px]" name="search" />
            搜索
          </button>
          {search && (
            <button
              className="ui-button-ghost"
              onClick={() => {
                setSearchInput("");
                setSearch("");
                setPage(1);
              }}
              type="button"
            >
              清除
            </button>
          )}
        </form>
        <button
          className="ui-button-primary shrink-0"
          onClick={() => setShowCreate(true)}
          type="button"
        >
          <LuminaIcon className="text-[18px]" name="person_add" />
          新建用户
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-sm font-semibold text-on-surface-variant">筛选：</span>
        <select
          className="ui-input w-auto"
          onChange={(e) => handleFilterChange("active", e.target.value)}
          value={filterActive}
        >
          <option value="all">全部状态</option>
          <option value="active">已激活</option>
          <option value="inactive">已停用</option>
        </select>
        <select
          className="ui-input w-auto"
          onChange={(e) => handleFilterChange("role", e.target.value)}
          value={filterRole}
        >
          <option value="all">全部角色</option>
          <option value="admin">管理员</option>
          <option value="user">普通用户</option>
        </select>
        {(filterActive !== "all" || filterRole !== "all") && (
          <button
            className="ui-button-ghost text-xs"
            onClick={() => {
              setFilterActive("all");
              setFilterRole("all");
              setPage(1);
            }}
            type="button"
          >
            清除筛选
          </button>
        )}
      </div>

      {/* Stats */}
      {data && (
        <div className="flex items-center gap-4 text-sm text-on-surface-variant">
          <span>共 {data.total} 位用户</span>
          {search && <span>搜索: &ldquo;{search}&rdquo;</span>}
          <span>
            第 {data.page} / {totalPages} 页
          </span>
        </div>
      )}

      {/* Error */}
      {error && <InlineAlert message={error} />}

      {/* Loading */}
      {loading && <LoadingPanel label="加载用户列表..." />}

      {/* User Table */}
      {!loading && data && (
        <div className="overflow-hidden rounded-2xl border border-outline-variant/35 bg-surface-container-lowest/80">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-outline-variant/30 bg-surface-container/50">
                  <th className="px-5 py-3.5 font-semibold text-on-surface-variant">用户</th>
                  <th className="px-5 py-3.5 font-semibold text-on-surface-variant">邮箱</th>
                  <th className="px-5 py-3.5 font-semibold text-on-surface-variant">角色</th>
                  <th className="px-5 py-3.5 font-semibold text-on-surface-variant">状态</th>
                  <th className="px-5 py-3.5 text-right font-semibold text-on-surface-variant">操作</th>
                </tr>
              </thead>
              <tbody>
                {data.users.map((user) => (
                  <tr
                    key={user.id}
                    className="border-b border-outline-variant/20 transition hover:bg-surface-container/30"
                  >
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                          {user.fullName.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-semibold text-on-surface">{user.fullName}</p>
                          <p className="text-xs text-on-surface-variant">{user.id}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-on-surface-variant">{user.email}</td>
                    <td className="px-5 py-4">
                      <RoleBadge isAdmin={user.isAdmin} />
                    </td>
                    <td className="px-5 py-4">
                      <StatusBadge active={user.isActive} />
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center justify-end gap-2">
                        {/* Edit */}
                        <button
                          className="rounded-lg bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary transition hover:bg-primary/20 disabled:opacity-50"
                          onClick={() => setEditUser(user)}
                          title="编辑用户"
                          type="button"
                        >
                          编辑
                        </button>

                        {/* Toggle Active */}
                        <button
                          className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition disabled:opacity-50 ${
                            user.isActive
                              ? "bg-warning/10 text-warning hover:bg-warning/20"
                              : "bg-teal/10 text-teal hover:bg-teal/20"
                          }`}
                          disabled={actionLoading === `active-${user.id}`}
                          onClick={() => handleToggleActive(user)}
                          title={user.isActive ? "停用" : "激活"}
                          type="button"
                        >
                          {actionLoading === `active-${user.id}` ? "..." : user.isActive ? "停用" : "激活"}
                        </button>

                        {/* Toggle Admin */}
                        <button
                          className="rounded-lg bg-ink/10 px-3 py-1.5 text-xs font-semibold text-ink transition hover:bg-ink/20 disabled:opacity-50"
                          disabled={actionLoading === `admin-${user.id}`}
                          onClick={() => handleToggleAdmin(user)}
                          title={user.isAdmin ? "撤销管理员" : "设为管理员"}
                          type="button"
                        >
                          {actionLoading === `admin-${user.id}`
                            ? "..."
                            : user.isAdmin
                              ? "撤销管理"
                              : "设为管理"}
                        </button>

                        {/* Delete */}
                        {deleteConfirm === user.id ? (
                          <div className="flex items-center gap-1">
                            <button
                              className="rounded-lg bg-error px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-error/80 disabled:opacity-50"
                              disabled={actionLoading === `delete-${user.id}`}
                              onClick={() => handleDelete(user)}
                              type="button"
                            >
                              确认删除
                            </button>
                            <button
                              className="rounded-lg bg-surface-container px-3 py-1.5 text-xs font-semibold text-on-surface-variant transition hover:bg-surface-container-high"
                              onClick={() => setDeleteConfirm(null)}
                              type="button"
                            >
                              取消
                            </button>
                          </div>
                        ) : (
                          <button
                            className="rounded-lg bg-error/10 px-3 py-1.5 text-xs font-semibold text-error transition hover:bg-error/20 disabled:opacity-50"
                            disabled={actionLoading === `delete-${user.id}`}
                            onClick={() => setDeleteConfirm(user.id)}
                            title="删除用户"
                            type="button"
                          >
                            删除
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {data.users.length === 0 && (
                  <tr>
                    <td className="px-5 py-12 text-center text-on-surface-variant" colSpan={5}>
                      {search || filterActive !== "all" || filterRole !== "all"
                        ? "未找到匹配的用户"
                        : "暂无用户"}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pagination */}
      {!loading && data && totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            className="ui-button-ghost"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            type="button"
          >
            上一页
          </button>
          {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => i + 1).map((p) => (
            <button
              key={p}
              className={`flex h-10 w-10 items-center justify-center rounded-xl text-sm font-semibold transition ${
                p === page
                  ? "bg-primary text-on-primary"
                  : "text-on-surface-variant hover:bg-surface-container"
              }`}
              onClick={() => setPage(p)}
              type="button"
            >
              {p}
            </button>
          ))}
          <button
            className="ui-button-ghost"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            type="button"
          >
            下一页
          </button>
        </div>
      )}

      {/* Create User Modal */}
      <CreateUserModal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onCreated={handleUserCreated}
      />

      {/* Edit User Modal */}
      <EditUserModal
        open={!!editUser}
        user={editUser}
        onClose={() => setEditUser(null)}
        onUpdated={handleUserUpdated}
      />
    </div>
  );
}
