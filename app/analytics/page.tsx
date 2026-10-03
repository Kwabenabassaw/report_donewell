import React from "react"
import Link from "next/link"
import { redirect } from "next/navigation"
import { getSession } from "@/lib/auth/session"
import { prisma } from "@/lib/prisma"
import { AnalyticsService } from "@/server/services/AnalyticsService"
import { GradeDistributionChart } from "@/components/analytics/grade-distribution-chart"
import { SubjectPerformanceChart } from "@/components/analytics/subject-performance-chart"
import { GenderComparisonCard } from "@/components/analytics/gender-comparison-card"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Award,
  Filter,
  Users,
  TrendingUp,
  Percent,
  CheckCircle2,
  FileSpreadsheet,
  ArrowRight,
  Calendar,
} from "lucide-react"

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ termId?: string; classId?: string }>
}) {
  const session = await getSession()
  if (!session) {
    redirect("/login")
  }

  const params = await searchParams

  // Fetch all academic terms and active classes for filtering
  const [allTerms, classes] = await Promise.all([
    prisma.term.findMany({
      orderBy: [{ academicYear: { startDate: "desc" } }, { termSequence: "asc" }],
      include: { academicYear: true },
    }),
    prisma.class.findMany({
      where: { status: "ACTIVE" },
      orderBy: { name: "asc" },
    }),
  ])

  // Current active term default
  const defaultTerm =
    allTerms.find((t) => t.status === "MARK_ENTRY") ||
    allTerms.find((t) => t.status !== "CLOSED") ||
    allTerms[0]

  const selectedTermId = params.termId || defaultTerm?.id || ""
  const selectedClassId = params.classId || ""

  const selectedTerm = allTerms.find((t) => t.id === selectedTermId)
  const selectedClass = classes.find((c) => c.id === selectedClassId)

  let analytics = null
  if (selectedTermId) {
    analytics = await AnalyticsService.getPerformanceAnalytics(
      selectedTermId,
      selectedClassId || undefined
    )
  }

  return (
    <div className="p-6 md:p-8 flex flex-col gap-8 max-w-7xl mx-auto w-full">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary uppercase tracking-wider">
            <Award className="size-3.5" /> Performance & BroadSheet Intelligence
          </div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
            Academic Analytics & Grade Distribution
          </h1>
          <p className="text-muted-foreground text-sm">
            Comprehensive statistical cohorts, median and mean scores, pass/distinction rates, subject rankings, and gender performance disparities.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/moderation"
            className="inline-flex items-center gap-1.5 rounded-lg border bg-card px-4 py-2 text-xs font-semibold shadow-xs hover:bg-muted transition-colors"
          >
            <FileSpreadsheet className="size-3.5" /> Review BroadSheet
          </Link>
          <Link
            href="/reports"
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground shadow-xs hover:bg-primary/90 transition-colors"
          >
            Terminal Reports <ArrowRight className="size-3.5" />
          </Link>
        </div>
      </div>

      {/* Filter Selector */}
      <Card>
        <CardContent className="p-5">
          <form method="GET" className="flex flex-wrap items-end gap-4">
            <div className="flex flex-col gap-1.5 min-w-[240px]">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                <Calendar className="size-3" /> Academic Term
              </label>
              <select
                name="termId"
                defaultValue={selectedTermId}
                className="h-10 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs focus:ring-2 focus:ring-primary outline-none"
              >
                {allTerms.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.academicYear.name} — {t.name} ({t.status})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1.5 min-w-[200px]">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                <Users className="size-3" /> Target Class / Cohort
              </label>
              <select
                name="classId"
                defaultValue={selectedClassId}
                className="h-10 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs focus:ring-2 focus:ring-primary outline-none"
              >
                <option value="">All Cohorts (Entire School)</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <Button type="submit" className="gap-2 h-10 px-5">
              <Filter className="size-4" /> Apply Filter
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Active Filter Scope Notice */}
      <div className="flex items-center justify-between text-xs text-muted-foreground border-b pb-2">
        <div>
          Showing metrics for:{" "}
          <span className="font-semibold text-foreground">
            {selectedTerm ? `${selectedTerm.academicYear.name} - ${selectedTerm.name}` : "N/A"}
          </span>{" "}
          • Class Scope:{" "}
          <span className="font-semibold text-foreground">
            {selectedClass ? selectedClass.name : "All Cohorts"}
          </span>
        </div>
        {analytics && (
          <div>
            Total Assessed Candidates:{" "}
            <span className="font-semibold text-foreground">{analytics.cohortSize}</span>
          </div>
        )}
      </div>

      {analytics ? (
        <div className="flex flex-col gap-8">
          {/* Executive KPI Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
            <Card>
              <CardHeader className="p-4 pb-1">
                <CardDescription className="text-xs font-medium uppercase">Cohort Candidates</CardDescription>
                <CardTitle className="text-2xl font-black mt-1">{analytics.cohortSize}</CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-1 text-[11px] text-muted-foreground">
                Finalized results
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="p-4 pb-1">
                <CardDescription className="text-xs font-medium uppercase">Mean Average</CardDescription>
                <CardTitle className="text-2xl font-black text-primary mt-1">
                  {analytics.meanScore}%
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-1 text-[11px] text-muted-foreground">
                Cohort arithmetic average
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="p-4 pb-1">
                <CardDescription className="text-xs font-medium uppercase">Median Score</CardDescription>
                <CardTitle className="text-2xl font-black text-blue-600 dark:text-blue-400 mt-1">
                  {analytics.medianScore}%
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-1 text-[11px] text-muted-foreground">
                50th percentile mark
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="p-4 pb-1">
                <CardDescription className="text-xs font-medium uppercase">Pass Rate</CardDescription>
                <CardTitle className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
                  {analytics.passRate}%
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-1 text-[11px] text-muted-foreground">
                Scores ≥ 50.0%
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="p-4 pb-1">
                <CardDescription className="text-xs font-medium uppercase">Distinction Rate</CardDescription>
                <CardTitle className="text-2xl font-black text-purple-600 dark:text-purple-400 mt-1">
                  {analytics.distinctionRate}%
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-1 text-[11px] text-muted-foreground">
                Scores ≥ 80.0%
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="p-4 pb-1">
                <CardDescription className="text-xs font-medium uppercase">Mark Range</CardDescription>
                <CardTitle className="text-xl font-black font-mono mt-1 truncate">
                  {analytics.lowestScore} - {analytics.highestScore}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-1 text-[11px] text-muted-foreground">
                Min and Max scores
              </CardContent>
            </Card>
          </div>

          {/* Section: Grade Distribution Histogram */}
          <Card>
            <CardHeader className="p-6 pb-2">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg font-bold flex items-center gap-2">
                    <TrendingUp className="size-5 text-primary" /> Grade Distribution Histogram
                  </CardTitle>
                  <CardDescription className="text-xs mt-1">
                    Frequency distribution of students across standard terminal academic grade boundaries (A+ to F).
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6 pt-2">
              <GradeDistributionChart
                distribution={analytics.gradeDistribution}
                cohortSize={analytics.cohortSize}
              />
            </CardContent>
          </Card>

          {/* Section: Gender Disparity */}
          <GenderComparisonCard
            genderAnalytics={analytics.genderAnalytics}
            cohortSize={analytics.cohortSize}
          />

          {/* Section: Subject Performance Breakdown */}
          <Card>
            <CardHeader className="p-6 pb-2">
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <FileSpreadsheet className="size-5 text-primary" /> Curriculum Subject Performance Rankings
              </CardTitle>
              <CardDescription className="text-xs mt-1">
                Comparative analysis of subject performance ranked by cohort mean average and pass rates.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6 pt-2">
              <SubjectPerformanceChart subjects={analytics.subjectAnalytics} />
            </CardContent>
          </Card>

          {/* Section: Top 10 Honor Roll */}
          <Card>
            <CardHeader className="p-6 pb-2">
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <Award className="size-5 text-amber-500" /> Cohort Honor Roll — Top 10 Performers
              </CardTitle>
              <CardDescription className="text-xs mt-1">
                Leading student academic achievements based on total aggregate score and average percentage.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6 pt-2">
              {analytics.topPerformers.length === 0 ? (
                <div className="py-8 text-center text-sm text-muted-foreground">
                  No finalized student results available.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b bg-muted/40 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        <th className="py-3 px-4 w-16 text-center">Rank</th>
                        <th className="py-3 px-4">Student ID</th>
                        <th className="py-3 px-4">Student Name</th>
                        <th className="py-3 px-4">Class</th>
                        <th className="py-3 px-4 text-center">Gender</th>
                        <th className="py-3 px-4 text-right">Total Aggregate</th>
                        <th className="py-3 px-4 text-right">Average %</th>
                        <th className="py-3 px-4 text-right">GPA</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border font-medium">
                      {analytics.topPerformers.map((student, idx) => {
                        const rank = idx + 1
                        const badgeColor =
                          rank === 1
                            ? "bg-amber-500/20 text-amber-700 dark:text-amber-400 border-amber-500/30"
                            : rank === 2
                            ? "bg-slate-300/30 text-slate-800 dark:text-slate-200 border-slate-400/30"
                            : rank === 3
                            ? "bg-orange-500/20 text-orange-700 dark:text-orange-400 border-orange-500/30"
                            : "bg-muted text-muted-foreground border-transparent"

                        return (
                          <tr key={student.studentIdNumber} className="hover:bg-muted/30 transition-colors">
                            <td className="py-3 px-4 text-center">
                              <span
                                className={`inline-flex items-center justify-center size-6 rounded-full text-xs font-black border ${badgeColor}`}
                              >
                                {rank}
                              </span>
                            </td>
                            <td className="py-3 px-4 font-mono text-xs">{student.studentIdNumber}</td>
                            <td className="py-3 px-4 font-semibold text-foreground">
                              {student.studentName}
                            </td>
                            <td className="py-3 px-4 text-muted-foreground text-xs">{student.className}</td>
                            <td className="py-3 px-4 text-center text-xs text-muted-foreground">
                              {student.gender}
                            </td>
                            <td className="py-3 px-4 text-right font-mono font-bold">
                              {student.totalScore.toFixed(1)}
                            </td>
                            <td className="py-3 px-4 text-right font-mono font-bold text-primary">
                              {student.averageScore.toFixed(1)}%
                            </td>
                            <td className="py-3 px-4 text-right font-mono text-xs font-semibold">
                              {student.gpa !== null ? student.gpa.toFixed(2) : "—"}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      ) : (
        <Card className="p-12 text-center text-muted-foreground">
          Select an academic term to view performance analytics.
        </Card>
      )}
    </div>
  )
}
