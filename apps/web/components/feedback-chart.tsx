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
          color: {
            type: "linear",
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: "#d87233" },
              { offset: 1, color: "#1f6b6c" }
            ]
          }
        }
      }
    ]
  };

  return <ReactECharts option={option} style={{ height: 280 }} />;
}

