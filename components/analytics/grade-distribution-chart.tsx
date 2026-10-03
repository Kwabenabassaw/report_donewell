import React from "react"
import { GradeDistributionItem } from "@/server/services/AnalyticsService"

interface GradeDistributionChartProps {
  distribution: GradeDistributionItem[]
  cohortSize: number
}

const GRADE_COLORS: Record<string, { fill: string; text: string; bg: string }> = {
  "A+": { fill: "#10b981", text: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-500/10" },
  A: { fill: "#06b6d4", text: "text-cyan-600 dark:text-cyan-400", bg: "bg-cyan-500/10" },
  B: { fill: "#3b82f6", text: "text-blue-600 dark:text-blue-400", bg: "bg-blue-500/10" },
  C: { fill: "#6366f1", text: "text-indigo-600 dark:text-indigo-400", bg: "bg-indigo-500/10" },
  D: { fill: "#f59e0b", text: "text-amber-600 dark:text-amber-400", bg: "bg-amber-500/10" },
  E: { fill: "#f97316", text: "text-orange-600 dark:text-orange-400", bg: "bg-orange-500/10" },
  F: { fill: "#ef4444", text: "text-rose-600 dark:text-rose-400", bg: "bg-rose-500/10" },
}

export function GradeDistributionChart({ distribution, cohortSize }: GradeDistributionChartProps) {
  if (cohortSize === 0) {
    return (
      <div className="flex h-64 flex-col items-center justify-center rounded-xl border border-dashed text-sm text-muted-foreground">
        No finalized grades available for this cohort.
      </div>
    )
  }

  const maxCount = Math.max(...distribution.map((d) => d.count), 1)
  const chartHeight = 200
  const chartWidth = 560
  const barWidth = 44
  const gap = (chartWidth - barWidth * distribution.length) / (distribution.length + 1)

  return (
    <div className="flex flex-col gap-6">
      {/* SVG Histogram */}
      <div className="w-full overflow-x-auto">
        <svg
          viewBox={`0 0 ${chartWidth} ${chartHeight + 40}`}
          className="w-full min-w-[500px] overflow-visible font-sans"
        >
          {/* Horizontal grid guide lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((pct, idx) => {
            const y = chartHeight - pct * (chartHeight - 30)
            return (
              <g key={idx}>
                <line
                  x1={20}
                  y1={y}
                  x2={chartWidth - 20}
                  y2={y}
                  stroke="currentColor"
                  className="text-muted/30"
                  strokeDasharray="4 4"
                  strokeWidth="1"
                />
              </g>
            )
          })}

          {/* Histogram Bars */}
          {distribution.map((item, idx) => {
            const x = gap + idx * (barWidth + gap)
            const barH = (item.count / maxCount) * (chartHeight - 40)
            const y = chartHeight - barH
            const color = GRADE_COLORS[item.grade]?.fill || "#64748b"

            return (
              <g key={item.grade} className="transition-all duration-300">
                {/* Count badge on top */}
                <text
                  x={x + barWidth / 2}
                  y={y - 8}
                  textAnchor="middle"
                  className="fill-foreground text-[11px] font-semibold"
                >
                  {item.count > 0 ? item.count : ""}
                </text>

                {/* Bar */}
                <rect
                  x={x}
                  y={y}
                  width={barWidth}
                  height={Math.max(barH, 4)}
                  rx="6"
                  fill={color}
                  className="opacity-90 hover:opacity-100 transition-opacity cursor-pointer"
                />

                {/* Grade Label */}
                <text
                  x={x + barWidth / 2}
                  y={chartHeight + 20}
                  textAnchor="middle"
                  className="fill-foreground text-xs font-bold"
                >
                  {item.grade}
                </text>

                {/* Percentage */}
                <text
                  x={x + barWidth / 2}
                  y={chartHeight + 34}
                  textAnchor="middle"
                  className="fill-muted-foreground text-[10px]"
                >
                  {item.percentage}%
                </text>
              </g>
            )
          })}
        </svg>
      </div>

      {/* Grade Details Legend Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2">
        {distribution.map((item) => {
          const styling = GRADE_COLORS[item.grade] || {
            text: "text-foreground",
            bg: "bg-muted/10",
          }
          return (
            <div
              key={item.grade}
              className={`flex flex-col items-center justify-center p-2.5 rounded-lg border text-center ${styling.bg}`}
            >
              <div className={`text-base font-extrabold ${styling.text}`}>{item.grade}</div>
              <div className="text-[10px] text-muted-foreground font-medium uppercase truncate max-w-full">
                {item.label}
              </div>
              <div className="text-xs font-bold mt-1">
                {item.count} <span className="text-[10px] font-normal text-muted-foreground">({item.percentage}%)</span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
