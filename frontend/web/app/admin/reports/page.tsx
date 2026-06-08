"use client";

import { useEffect, useState } from "react";
import ReactECharts from "echarts-for-react";
import { LuminaIcon } from "../../../components/lumina-icon";
import { LoadingPanel } from "../../../components/ui-states";
import { getAdminDetailedStats } from "../../../lib/api";
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

export default function AdminReportsPage() {
  const [stats, setStats] = useState<AdminDetailedStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    getAdminDetailedStats()
      .then(setStats)
      .catch((err) => setError(err instanceof Error ? err.message : "加载失败"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingPanel label="加载报表数据..." />;

  if (error) {
    return (
      <div className="ui-alert-error">
        <p>加载失败: {error}</p>
      </div>
    );
  }

  if (!stats) return null;

  // User Activity Rate
  const activeRate = stats.totalUsers > 0
    ? Math.round((stats.activeUsers / stats.totalUsers) * 100)
    : 0;

  // Document Processing Success Rate
  const successDocs = stats.documentsByStatus.quiz_ready ?? 0;
  const failedDocs = stats.documentsByStatus.failed ?? 0;
  const processedDocs = successDocs + failedDocs;
  const successRate = processedDocs > 0
    ? Math.round((successDocs / processedDocs) * 100)
    : 0;

  // KPI Cards
  const kpiCards = [
    {
      label: "用户活跃率",
      value: `${activeRate}%`,
      icon: "trending_up",
      color: "bg-teal text-white",
      description: `${stats.activeUsers} / ${stats.totalUsers} 用户处于活跃状态`,
    },
    {
      label: "文档处理成功率",
      value: `${successRate}%`,
      icon: "verified",
      color: "bg-primary text-on-primary",
      description: `${successDocs} 篇文档成功处理`,
    },
    {
      label: "管理员占比",
      value: stats.totalUsers > 0
        ? `${Math.round((stats.adminUsers / stats.totalUsers) * 100)}%`
        : "0%",
      icon: "admin_panel_settings",
      color: "bg-ink text-paper",
      description: `${stats.adminUsers} 名管理员`,
    },
    {
      label: "文档总量",
      value: String(stats.totalDocuments),
      icon: "description",
      color: "bg-saffron text-white",
      description: "所有已上传的文档数",
    },
  ];

  // User Distribution Pie Chart
  const userPieOption = {
    backgroundColor: "transparent",
    tooltip: { trigger: "item", formatter: "{b}: {c} ({d}%)" },
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
        emphasis: { label: { show: true, fontSize: 14, fontWeight: "bold" } },
        data: [
          { name: "活跃用户", value: stats.activeUsers, itemStyle: { color: "#1f6b6c" } },
          { name: "停用用户", value: stats.totalUsers - stats.activeUsers, itemStyle: { color: "#c0392b" } },
          { name: "管理员", value: stats.adminUsers, itemStyle: { color: "#102134" } },
        ],
      },
    ],
  };

  // Document Status Bar Chart
  const statusEntries = Object.entries(stats.documentsByStatus);
  const statusBarOption = {
    backgroundColor: "transparent",
    tooltip: { trigger: "axis" },
    grid: { left: "3%", right: "4%", bottom: "3%", top: "15%", containLabel: true },
    xAxis: {
      type: "category",
      data: statusEntries.map(([s]) => STATUS_LABELS[s] ?? s),
      axisLine: { lineStyle: { color: "#10213455" } },
      axisLabel: { color: "#102134", fontSize: 11 },
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
        data: statusEntries.map(([s, count]) => ({
          value: count,
          itemStyle: { color: STATUS_COLORS[s] ?? "#9c3e21" },
        })),
        barWidth: "50%",
        itemStyle: { borderRadius: [8, 8, 0, 0] },
      },
    ],
  };

  // User vs Document comparison
  const comparisonOption = {
    backgroundColor: "transparent",
    tooltip: { trigger: "axis" },
    legend: {
      data: ["用户数", "文档数"],
      textStyle: { color: "#102134" },
    },
    grid: { left: "3%", right: "4%", bottom: "3%", top: "15%", containLabel: true },
    xAxis: {
      type: "category",
      data: ["总计", "活跃", "管理员"],
      axisLine: { lineStyle: { color: "#10213455" } },
      axisLabel: { color: "#102134" },
    },
    yAxis: {
      type: "value",
      axisLine: { show: false },
      splitLine: { lineStyle: { color: "#10213418" } },
      axisLabel: { color: "#102134" },
    },
    series: [
      {
        name: "用户数",
        type: "bar",
        data: [stats.totalUsers, stats.activeUsers, stats.adminUsers],
        itemStyle: { color: "#1f6b6c", borderRadius: [8, 8, 0, 0] },
        barWidth: "30%",
      },
      {
        name: "文档数",
        type: "bar",
        data: [stats.totalDocuments, successDocs, failedDocs],
        itemStyle: { color: "#d87233", borderRadius: [8, 8, 0, 0] },
        barWidth: "30%",
      },
    ],
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <section>
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <LuminaIcon className="text-[28px]" name="insights" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-ink">数据报表</h2>
            <p className="text-sm text-on-surface-variant">
              查看平台运营数据和关键指标分析
            </p>
          </div>
        </div>
      </section>

      {/* KPI Cards */}
      <section className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {kpiCards.map((card) => (
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

      {/* Charts */}
      <section className="grid gap-8 xl:grid-cols-2">
        {/* User Distribution */}
        <div className="ui-card">
          <h4 className="mb-4 text-base font-bold text-ink">用户分布</h4>
          <ReactECharts option={userPieOption} style={{ height: 300 }} />
        </div>

        {/* Document Status */}
        <div className="ui-card">
          <h4 className="mb-4 text-base font-bold text-ink">文档状态分布</h4>
          {statusEntries.length > 0 ? (
            <ReactECharts option={statusBarOption} style={{ height: 300 }} />
          ) : (
            <div className="flex h-[300px] items-center justify-center text-sm text-on-surface-variant">
              暂无文档数据
            </div>
          )}
        </div>
      </section>

      {/* Comparison Chart */}
      <section className="ui-card">
        <h4 className="mb-4 text-base font-bold text-ink">用户与文档对比</h4>
        <ReactECharts option={comparisonOption} style={{ height: 350 }} />
      </section>

      {/* Recent Activity Summary */}
      <section className="grid gap-8 xl:grid-cols-2">
        {/* Recent Documents */}
        <div className="ui-card">
          <h4 className="mb-4 text-base font-bold text-ink">最近文档</h4>
          <div className="space-y-3">
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
        <div className="ui-card">
          <h4 className="mb-4 text-base font-bold text-ink">最近注册用户</h4>
          <div className="space-y-3">
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
                </div>
              ))
            ) : (
              <div className="rounded-xl border border-dashed border-outline-variant/50 bg-surface-container-low/50 px-4 py-8 text-center text-sm text-on-surface-variant">
                暂无用户
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
