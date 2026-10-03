import React from "react"
import { SubjectAnalyticsItem } from "@/server/services/AnalyticsService"
import { Badge } from "@/components/ui/badge"

interface SubjectPerformanceChartProps {
  subjects: SubjectAnalyticsItem[]
}

export function SubjectPerformanceChart({ subjects }: SubjectPerformanceChartProps) {
  if (subjects.length === 0) {
    return (
      <div className="flex h-48 flex-col items-center justify-center rounded-xl border border-dashed text-sm text-muted-foreground">
        No subject performance data available for this cohort.
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b bg-muted/40 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <th className="py-3 px-4">Subject</th>
              <th className="py-3 px-4 text-center">Candidates</th>
              <th className="py-3 px-4 min-w-[200px]">Average Score</th>
              <th className="py-3 px-4 text-center">Pass Rate (≥50%)</th>
              <th className="py-3 px-4 text-center">Distinction (≥80%)</th>
              <th className="py-3 px-4 text-right">Range (Min - Max)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {subjects.map((item) => {
              const scorePct = Math.min(100, Math.max(0, item.averageScore))
              const barColor =
                scorePct >= 75
                  ? "bg-emerald-500"
                  : scorePct >= 60
                  ? "bg-blue-500"
                  : scorePct >= 50
                  ? "bg-amber-500"
                  : "bg-rose-500"

              return (
                <tr key={item.subjectId} className="hover:bg-muted/30 transition-colors">
                  <td className="py-3 px-4">
                    <div className="font-semibold text-foreground">{item.subjectName}</div>
                    <div className="text-xs text-muted-foreground">{item.subjectCode}</div>
                  </td>
                  <td className="py-3 px-4 text-center font-medium">
                    {item.candidateCount}
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-3">
                      <div className="w-full bg-muted rounded-full h-2.5 overflow-hidden">
                        <div
                          className={`h-2.5 rounded-full ${barColor}`}
                          style={{ width: `${scorePct}%` }}
                        />
                      </div>
                      <span className="text-xs font-bold w-12 text-right">{item.averageScore}%</span>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <Badge
                      variant={
                        item.passRate >= 80 ? "success" : item.passRate >= 50 ? "warning" : "destructive"
                      }
                      className="font-mono text-xs"
                    >
                      {item.passRate}%
                    </Badge>
                  </td>
                  <td className="py-3 px-4 text-center font-mono text-xs">
                    <span className={item.distinctionRate >= 30 ? "text-emerald-600 font-bold" : "text-muted-foreground"}>
                      {item.distinctionRate}%
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right font-mono text-xs text-muted-foreground">
                    {item.lowestScore} - {item.highestScore}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
