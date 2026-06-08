"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import ReactECharts from "echarts-for-react";
import { LuminaIcon } from "../../components/lumina-icon";
import { LoadingPanel } from "../../components/ui-states";
import { getAdminDetailedStats } from "../../lib/api";
import type { AdminDetailedStats } from "@ai-study-notes/contracts";

const STATUS_LABELS: Record<string, string> = {
  uploaded: "已上传",
  parsing: "解析中",
  structured: "已结构化",
  quiz_ready: "题库就绪",
  failed: "处理失败",
};

const STATUS_COLORS: Record<string, string> = {
  uploaded: "#9c3e21",
  parsing: "#855229",
  structured: "#1f6b6c",
  quiz_ready: "#2d8a4e",
  failed: "#c0392b",
};

function formatTime(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "刚刚";
  if (diffMin < 60) return `${diffMin} 分钟前`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr} 小时前`;
  const diffDay = Math.floor(diffHr / 24);
  return `${diffDay} 天前`;
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<AdminDetailedStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    getAdminDetailedStats()
      .then(setStats)
      .catch((err) => setError(err instanceof Error ? err.message : "加载失败"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingPanel label="加载管理数据..." />;

  if (error) {
    return (
      <div className="ui-alert-error">
        <p>加载失败: {error}</p>
      </div>
    );
  }

  if (!stats) return null;

  const statCards = [
    {
      label: "总用户数",
      value: stats.totalUsers,
      icon: "people",
      color: "bg-primary text-on-primary",
      description: "所有注册用户",
    },
    {
      label: "活跃用户",
      value: stats.activeUsers,
      icon: "check_circle",
      color: "bg-teal text-white",
      description: "当前状态为激活",
    },
    {
      label: "管理员",
      value: stats.adminUsers,
      icon: "admin_panel_settings",
      color: "bg-ink text-paper",
      description: "拥有管理权限",
    },
    {
      label: "文档总数",
      value: stats.totalDocuments,
      icon: "article",
      color: "bg-saffron text-white",
      description: "所有已上传文档",
    },
  ];

  // ECharts - Document Status Distribution (Pie Chart)
  const statusEntries = Object.entries(stats.documentsByStatus);
  const pieOption = {
    backgroundColor: "transparent",
    tooltip: {
      trigger: "item",
      formatter: "{b}: {c} ({d}%)",
    },
    legend: {
      orient: "vertical",
      right: "5%",
      top: "center",
      textStyle: { color: "#102134", fontSize: 12 },
    },
    series: [
      {
        type: "pie",
        radius: ["40%", "70%"],
        center: ["40%", "50%"],
        avoidLabelOverlap: true,
        itemStyle: { borderRadius: 8, borderColor: "#fff", borderWidth: 2 },
        label: { show: false },
        emphasis: {
          label: { show: true, fontSize: 14, fontWeight: "bold" },
        },
        data: statusEntries.map(([status, count]) => ({
          name: STATUS_LABELS[status] ?? status,
          value: count,
          itemStyle: { color: STATUS_COLORS[status] ?? "#9c3e21" },
        })),
      },
    ],
  };

  // ECharts - User Distribution Bar Chart
  const barOption = {
    backgroundColor: "transparent",
    tooltip: { trigger: "axis" },
    grid: { left: "3%", right: "4%", bottom: "3%", top: "15%", containLabel: true },
    xAxis: {
      type: "category",
      data: ["全部用户", "活跃用户", "管理员", "停用用户"],
      axisLine: { lineStyle: { color: "#10213455" } },
      axisLabel: { color: "#102134", fontSize: 12 },
    },
    yAxis: {
      type: "value",
      axisLine: { show: false },
      splitLine: { lineStyle: { color: "#10213418" } },
      axisLabel: { color: "#102134" },
    },
    series: [
      {
        type: "bar",
        data: [
          stats.totalUsers,
          stats.activeUsers,
          stats.adminUsers,
          stats.totalUsers - stats.activeUsers,
        ],
        barWidth: "40%",
        itemStyle: {
          borderRadius: [12, 12, 0, 0],
          color: (params: { dataIndex: number }) =>
            ["#9c3e21", "#1f6b6c", "#102134", "#c0392b"][params.dataIndex] ?? "#9c3e21",
        },
      },
    ],
  };

  return (
    <div className="grid gap-8">
      {/* Header */}
      <section>
        <h3 className="text-2xl font-bold text-ink">系统概览</h3>
        <p className="mt-1 text-sm text-on-surface-variant">
          查看平台整体运行状态和关键指标
        </p>
      </section>

      {/* Stat Cards */}
      <section className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {statCards.map((card) => (
          <div
            key={card.label}
            className="ui-card grid gap-4 transition hover:shadow-lift"
          >
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-outline">
                {card.label}
              </p>
              <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${card.color}`}>
                <LuminaIcon className="text-[22px]" name={card.icon} />
              </div>
            </div>
            <p className="display-face text-4xl font-bold text-ink">{card.value}</p>
            <p className="text-xs text-on-surface-variant">{card.description}</p>
          </div>
        ))}
      </section>

      {/* Charts Section */}
      <section className="grid gap-8 xl:grid-cols-[1fr_1fr]">
        {/* User Distribution Bar Chart */}
        <div className="ui-card">
          <h4 className="mb-4 text-base font-bold text-ink">用户分布</h4>
          <ReactECharts option={barOption} style={{ height: 280 }} />
        </div>

        {/* Document Status Pie Chart */}
        <div className="ui-card">
          <h4 className="mb-4 text-base font-bold text-ink">文档状态分布</h4>
          {statusEntries.length > 0 ? (
            <ReactECharts option={pieOption} style={{ height: 280 }} />
          ) : (
            <div className="flex h-[280px] items-center justify-center text-sm text-on-surface-variant">
              暂无文档数据
            </div>
          )}
        </div>
      </section>

      {/* Quick Actions & Recent Activity */}
      <section className="grid gap-8 xl:grid-cols-[1fr_1fr]">
        {/* Quick Actions */}
        <div>
          <h4 className="mb-4 text-lg font-bold text-ink">快捷操作</h4>
          <div className="grid gap-4">
            <Link
              className="ui-card-interactive flex items-center gap-4"
              href="/admin/users"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <LuminaIcon className="text-[26px]" name="people" />
              </div>
              <div>
                <p className="font-semibold text-ink">管理用户</p>
                <p className="text-sm text-on-surface-variant">查看、搜索和管理所有用户</p>
              </div>
            </Link>
            <Link
              className="ui-card-interactive flex items-center gap-4"
              href="/"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-teal/10 text-teal">
                <LuminaIcon className="text-[26px]" name="dashboard" />
              </div>
              <div>
                <p className="font-semibold text-ink">前台首页</p>
                <p className="text-sm text-on-surface-variant">查看用户端学习控制台</p>
              </div>
            </Link>
            <Link
              className="ui-card-interactive flex items-center gap-4"
              href="/admin/reports"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-surface-container text-on-surface-variant">
                <LuminaIcon className="text-[26px]" name="insights" />
              </div>
              <div>
                <p className="font-semibold text-ink">数据报表</p>
                <p className="text-sm text-on-surface-variant">查看运营数据和关键指标</p>
              </div>
            </Link>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="grid gap-6">
          {/* Recent Documents */}
          <div>
            <h4 className="mb-4 text-base font-bold text-ink">最近文档</h4>
            <div className="grid gap-3">
              {stats.recentDocuments.length > 0 ? (
                stats.recentDocuments.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex items-center justify-between rounded-xl border border-outline-variant/25 bg-surface-container-lowest/60 px-4 py-3"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-on-surface">
                        {doc.title}
                      </p>
                      <p className="text-xs text-on-surface-variant">
                        {formatTime(doc.createdAt)}
                      </p>
                    </div>
                    <span
                      className={`ml-3 shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                        doc.status === "quiz_ready"
                          ? "bg-teal/10 text-teal"
                          : doc.status === "failed"
                            ? "bg-error/10 text-error"
                            : "bg-primary/10 text-primary"
                      }`}
                    >
                      {STATUS_LABELS[doc.status] ?? doc.status}
                    </span>
                  </div>
                ))
              ) : (
                <div className="rounded-xl border border-dashed border-outline-variant/50 bg-surface-container-low/50 px-4 py-8 text-center text-sm text-on-surface-variant">
                  暂无文档
                </div>
              )}
            </div>
          </div>

          {/* Recent Users */}
          <div>
            <h4 className="mb-4 text-base font-bold text-ink">最近注册用户</h4>
            <div className="grid gap-3">
              {stats.recentUsers.length > 0 ? (
                stats.recentUsers.map((user) => (
                  <div
                    key={user.id}
                    className="flex items-center gap-3 rounded-xl border border-outline-variant/25 bg-surface-container-lowest/60 px-4 py-3"
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                      {user.fullName.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-on-surface">
                        {user.fullName}
                      </p>
                      <p className="truncate text-xs text-on-surface-variant">
                        {user.email}
                      </p>
                    </div>
                    <span className="shrink-0 text-xs text-on-surface-variant">
                      {formatTime(user.createdAt)}
                    </span>
                  </div>
                ))
              ) : (
                <div className="rounded-xl border border-dashed border-outline-variant/50 bg-surface-container-low/50 px-4 py-8 text-center text-sm text-on-surface-variant">
                  暂无用户
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
