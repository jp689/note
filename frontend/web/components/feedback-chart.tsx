"use client";

import { AttemptReport } from "@ai-study-notes/contracts";
import ReactECharts from "echarts-for-react";

export function FeedbackChart({ report }: { report: AttemptReport }) {
  const option = {
    backgroundColor: "transparent",
    tooltip: { trigger: "axis" },
    xAxis: {
      type: "category",
      data: ["掌握度", "错因定位", "复习紧迫度"],
      axisLine: { lineStyle: { color: "#10213455" } },
      axisLabel: { color: "#102134" }
    },
    yAxis: {
      type: "value",
      max: 100,
      axisLine: { show: false },
      splitLine: { lineStyle: { color: "#10213418" } },
      axisLabel: { color: "#102134" }
    },
    series: [
      {
        type: "bar",
        data: [
          report.score,
          Math.max(55, report.weakPoints.length * 18),
          Math.max(40, report.nextReview.length * 16)
        ],
        itemStyle: {
          borderRadius: [12, 12, 0, 0],
          color: (params: { dataIndex: number }) =>
            ["#9c3e21", "#1f6b6c", "#855229"][params.dataIndex] ?? "#9c3e21"
        }
      }
    ]
  };

  return <ReactECharts option={option} style={{ height: 280 }} />;
}
