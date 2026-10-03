import React from "react"
import { GenderAnalyticsItem } from "@/server/services/AnalyticsService"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Users } from "lucide-react"

interface GenderComparisonCardProps {
  genderAnalytics: GenderAnalyticsItem[]
  cohortSize: number
}

export function GenderComparisonCard({ genderAnalytics, cohortSize }: GenderComparisonCardProps) {
  if (genderAnalytics.length === 0 || cohortSize === 0) {
    return (
      <Card>
        <CardHeader className="p-5 pb-3">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Users className="size-4 text-primary" /> Gender Performance Breakdown
          </CardTitle>
        </CardHeader>
        <CardContent className="p-5 pt-0 text-sm text-muted-foreground">
          No gender data recorded for this cohort.
        </CardContent>
      </Card>
    )
  }

  const male = genderAnalytics.find((g) => g.gender === "MALE" || g.gender === "M")
  const female = genderAnalytics.find((g) => g.gender === "FEMALE" || g.gender === "F")

  let disparityText = "Equal cohort performance."
  if (male && female) {
    const diff = Math.round(Math.abs(female.averageScore - male.averageScore) * 10) / 10
    if (diff === 0) {
      disparityText = "Identical average performance across genders."
    } else if (female.averageScore > male.averageScore) {
      disparityText = `Female students outperform male students by +${diff}% on average.`
    } else {
      disparityText = `Male students outperform female students by +${diff}% on average.`
    }
  }

  return (
    <Card>
      <CardHeader className="p-5 pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Users className="size-4 text-primary" /> Gender Disparity Analysis
          </CardTitle>
          <span className="text-xs text-muted-foreground">{disparityText}</span>
        </div>
      </CardHeader>
      <CardContent className="p-5 pt-0 flex flex-col gap-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {genderAnalytics.map((g) => {
            const isFemale = g.gender === "FEMALE" || g.gender === "F"
            const genderLabel = isFemale ? "Female Students" : g.gender === "MALE" || g.gender === "M" ? "Male Students" : g.gender
            const pctCohort = cohortSize > 0 ? Math.round((g.count / cohortSize) * 100) : 0
            const accentBg = isFemale ? "bg-pink-500/10 border-pink-500/20 text-pink-600 dark:text-pink-400" : "bg-blue-500/10 border-blue-500/20 text-blue-600 dark:text-blue-400"
            const barFill = isFemale ? "bg-pink-500" : "bg-blue-500"

            return (
              <div
                key={g.gender}
                className="flex flex-col gap-3 p-4 rounded-xl border bg-card/60 shadow-xs"
              >
                <div className="flex items-center justify-between">
                  <span className={`px-2.5 py-1 rounded-md text-xs font-bold border ${accentBg}`}>
                    {genderLabel}
                  </span>
                  <span className="text-xs text-muted-foreground font-medium">
                    {g.count} candidates ({pctCohort}%)
                  </span>
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Average Score</span>
                    <span className="font-bold text-foreground">{g.averageScore}%</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                    <div
                      className={`h-2 rounded-full ${barFill}`}
                      style={{ width: `${Math.min(100, Math.max(0, g.averageScore))}%` }}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2 border-t text-xs">
                  <div>
                    <div className="text-muted-foreground text-[11px]">Pass Rate</div>
                    <div className="font-bold text-foreground mt-0.5">{g.passRate}%</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground text-[11px]">Highest Score</div>
                    <div className="font-bold text-foreground mt-0.5">{g.highestScore}%</div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
