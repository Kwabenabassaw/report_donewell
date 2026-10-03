import React from "react"
import Link from "next/link"
import { redirect } from "next/navigation"
import { getSession } from "@/lib/auth/session"
import { AnalyticsService } from "@/server/services/AnalyticsService"
import {
  Calendar,
  Users,
  BookOpen,
  Award,
  ArrowRight,
  ShieldCheck,
  TableProperties,
  FileCheck2,
  FileSpreadsheet,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Send,
  Sliders,
  History,
  TrendingUp,
} from "lucide-react"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

export default async function DashboardPage() {
  const session = await getSession()
  if (!session) {
    redirect("/login")
  }
  if (!session.hasCompletedOnboarding) {
    redirect("/onboarding")
  }

  // Fetch SRS Section 48 Executive Dashboard Indicators
  const overview = await AnalyticsService.getExecutiveOverview()

  return (
    <div className="p-6 md:p-8 flex flex-col gap-8 max-w-7xl mx-auto w-full">
      {/* Welcome Banner */}
      <div className="rounded-2xl border bg-gradient-to-br from-card via-card to-primary/5 p-8 shadow-sm">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex flex-col gap-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 text-xs font-semibold text-primary uppercase tracking-wider bg-primary/10 px-3 py-1 rounded-md w-fit">
              <Calendar className="size-3.5" /> Indicator 1 & 2: Active Academic Session
            </div>
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight">
              {overview.academicYear?.name || "No Active Year"} —{" "}
              {overview.currentTerm?.name || "Term N/A"}
            </h2>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs text-muted-foreground">Term Lifecycle Status:</span>
              <Badge variant="default" className="font-mono text-xs">
                {overview.currentTerm?.status || "INACTIVE"}
              </Badge>
              <span className="text-xs text-muted-foreground">• Terminal Assessment & Processing Engine</span>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/analytics"
              className="inline-flex items-center gap-2 rounded-xl bg-card border px-4 py-2.5 text-sm font-semibold shadow-xs hover:bg-muted transition-colors"
            >
              <TrendingUp className="size-4 text-primary" /> Academic Analytics
            </Link>
            <Link
              href="/mark-entry"
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-md shadow-primary/20 hover:bg-primary/90 transition-all hover:scale-[1.02]"
            >
              <TableProperties className="size-4" /> Open Mark Entry
              <ArrowRight className="size-4" />
            </Link>
          </div>
        </div>
      </div>

      {/* SRS Section 48: 11 Executive Metrics Grid */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold tracking-tight text-foreground flex items-center gap-2">
            <ShieldCheck className="size-4 text-primary" /> SRS Section 48 Executive Indicators
          </h3>
          <span className="text-xs text-muted-foreground">Real-time terminal status</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {/* 3. Total Students */}
          <Card>
            <CardHeader className="p-4 pb-1">
              <div className="flex items-center justify-between text-muted-foreground text-xs uppercase font-medium">
                <span>Active Students</span>
                <Users className="size-4 text-primary" />
              </div>
              <CardTitle className="text-2xl font-black mt-1">{overview.studentCount}</CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-1 text-[11px] text-muted-foreground">
              Indicator 3 • Enrolled cohort
            </CardContent>
          </Card>

          {/* 4. Total Classes */}
          <Card>
            <CardHeader className="p-4 pb-1">
              <div className="flex items-center justify-between text-muted-foreground text-xs uppercase font-medium">
                <span>Active Classes</span>
                <Award className="size-4 text-amber-500" />
              </div>
              <CardTitle className="text-2xl font-black mt-1">{overview.classCount}</CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-1 text-[11px] text-muted-foreground">
              Indicator 4 • Class streams
            </CardContent>
          </Card>

          {/* 5. Total Subjects */}
          <Card>
            <CardHeader className="p-4 pb-1">
              <div className="flex items-center justify-between text-muted-foreground text-xs uppercase font-medium">
                <span>Subjects</span>
                <BookOpen className="size-4 text-emerald-500" />
              </div>
              <CardTitle className="text-2xl font-black mt-1">{overview.subjectCount}</CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-1 text-[11px] text-muted-foreground">
              Indicator 5 • Active curriculum
            </CardContent>
          </Card>

          {/* 6. Mark Completion % */}
          <Card className="border-primary/20 bg-primary/5">
            <CardHeader className="p-4 pb-1">
              <div className="flex items-center justify-between text-primary text-xs uppercase font-semibold">
                <span>Mark Completion</span>
                <TrendingUp className="size-4 text-primary" />
              </div>
              <CardTitle className="text-2xl font-black text-primary mt-1">
                {overview.markCompletionPercentage}%
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-1 text-[11px] text-muted-foreground">
              Indicator 6 • {overview.enteredScoresCount} / {overview.expectedScoresCount} marks
            </CardContent>
          </Card>

          {/* 7. Incomplete Marks */}
          <Card>
            <CardHeader className="p-4 pb-1">
              <div className="flex items-center justify-between text-muted-foreground text-xs uppercase font-medium">
                <span>Incomplete Marks</span>
                <AlertTriangle className="size-4 text-amber-500" />
              </div>
              <CardTitle className="text-2xl font-black mt-1">{overview.incompleteMarksCount}</CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-1 text-[11px] text-muted-foreground">
              Indicator 7 • Pending score cells
            </CardContent>
          </Card>

          {/* 8. Pending Teacher Submissions */}
          <Card>
            <CardHeader className="p-4 pb-1">
              <div className="flex items-center justify-between text-muted-foreground text-xs uppercase font-medium">
                <span>Pending Submissions</span>
                <Clock className="size-4 text-blue-500" />
              </div>
              <CardTitle className="text-2xl font-black mt-1">
                {overview.pendingTeacherSubmissionsCount}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-1 text-[11px] text-muted-foreground">
              Indicator 8 • Unsubmitted assessments
            </CardContent>
          </Card>

          {/* 9. Pending Approvals */}
          <Card>
            <CardHeader className="p-4 pb-1">
              <div className="flex items-center justify-between text-muted-foreground text-xs uppercase font-medium">
                <span>Pending Approvals</span>
                <FileCheck2 className="size-4 text-indigo-500" />
              </div>
              <CardTitle className="text-2xl font-black mt-1">{overview.pendingApprovalsCount}</CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-1 text-[11px] text-muted-foreground">
              Indicator 9 • Submitted terms
            </CardContent>
          </Card>

          {/* 10. Finalized Classes */}
          <Card>
            <CardHeader className="p-4 pb-1">
              <div className="flex items-center justify-between text-muted-foreground text-xs uppercase font-medium">
                <span>Finalized Classes</span>
                <CheckCircle2 className="size-4 text-emerald-500" />
              </div>
              <CardTitle className="text-2xl font-black mt-1">{overview.finalizedClassesCount}</CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-1 text-[11px] text-muted-foreground">
              Indicator 10 • Immutable cohorts
            </CardContent>
          </Card>

          {/* 11. Published Reports */}
          <Card>
            <CardHeader className="p-4 pb-1">
              <div className="flex items-center justify-between text-muted-foreground text-xs uppercase font-medium">
                <span>Published Reports</span>
                <FileSpreadsheet className="size-4 text-purple-500" />
              </div>
              <CardTitle className="text-2xl font-black mt-1">{overview.publishedReportsCount}</CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-1 text-[11px] text-muted-foreground">
              Indicator 11 • Issued terminal cards
            </CardContent>
          </Card>

          {/* SMS Notification Delivery Summary Card */}
          <Card className="col-span-2 sm:col-span-3 lg:col-span-3">
            <CardHeader className="p-4 pb-2">
              <div className="flex items-center justify-between text-muted-foreground text-xs uppercase font-medium">
                <span className="flex items-center gap-1.5">
                  <Send className="size-3.5 text-primary" /> SMS Notification Gateway (Phase 11)
                </span>
                <Link href="/notifications" className="text-primary hover:underline text-[11px]">
                  View Queue →
                </Link>
              </div>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="grid grid-cols-3 gap-2 pt-1 text-center">
                <div className="p-2 rounded-lg bg-muted/30">
                  <div className="text-xs text-muted-foreground">Queued</div>
                  <div className="text-lg font-black">{overview.smsDelivery.queued}</div>
                </div>
                <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-700 dark:text-emerald-400">
                  <div className="text-xs">Delivered</div>
                  <div className="text-lg font-black">{overview.smsDelivery.delivered}</div>
                </div>
                <div className="p-2 rounded-lg bg-rose-500/10 text-rose-700 dark:text-rose-400">
                  <div className="text-xs">Failed</div>
                  <div className="text-lg font-black">{overview.smsDelivery.failed}</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Quick Action Workflows */}
      <div className="flex flex-col gap-4">
        <h3 className="text-lg font-bold tracking-tight">Academic Workflow Modules</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Link
            href="/analytics"
            className="group rounded-2xl border bg-card p-6 shadow-sm hover:border-primary hover:shadow-md transition-all flex flex-col gap-3"
          >
            <div className="flex size-12 items-center justify-center rounded-xl bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
              <TrendingUp className="size-6" />
            </div>
            <h4 className="text-base font-semibold group-hover:text-primary transition-colors">
              Academic Analytics & Charts
            </h4>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Grade distribution histogram, subject ranking comparisons, gender disparity analysis, and top performers.
            </p>
          </Link>

          <Link
            href="/mark-entry"
            className="group rounded-2xl border bg-card p-6 shadow-sm hover:border-primary hover:shadow-md transition-all flex flex-col gap-3"
          >
            <div className="flex size-12 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
              <TableProperties className="size-6" />
            </div>
            <h4 className="text-base font-semibold group-hover:text-primary transition-colors">
              Spreadsheet Mark Entry
            </h4>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Keyboard-driven score entry grid with dirty tracking, batch commit, and auto-validation against component maximums.
            </p>
          </Link>

          <Link
            href="/moderation"
            className="group rounded-2xl border bg-card p-6 shadow-sm hover:border-primary hover:shadow-md transition-all flex flex-col gap-3"
          >
            <div className="flex size-12 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 group-hover:bg-amber-600 group-hover:text-white transition-colors">
              <FileCheck2 className="size-6" />
            </div>
            <h4 className="text-base font-semibold group-hover:text-primary transition-colors">
              Moderation & Review
            </h4>
            <p className="text-xs text-muted-foreground leading-relaxed">
              CA & Exam scaling verification, dense ranking calculation, and state machine approval workflow.
            </p>
          </Link>

          <Link
            href="/reports"
            className="group rounded-2xl border bg-card p-6 shadow-sm hover:border-primary hover:shadow-md transition-all flex flex-col gap-3"
          >
            <div className="flex size-12 items-center justify-center rounded-xl bg-purple-500/10 text-purple-600 group-hover:bg-purple-600 group-hover:text-white transition-colors">
              <FileSpreadsheet className="size-6" />
            </div>
            <h4 className="text-base font-semibold group-hover:text-primary transition-colors">
              Terminal Report Cards
            </h4>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Single and bulk PDF report card generation with cryptographic verification tokens and QR code verification.
            </p>
          </Link>

          <Link
            href="/audit-logs"
            className="group rounded-2xl border bg-card p-6 shadow-sm hover:border-primary hover:shadow-md transition-all flex flex-col gap-3"
          >
            <div className="flex size-12 items-center justify-center rounded-xl bg-teal-500/10 text-teal-600 group-hover:bg-teal-600 group-hover:text-white transition-colors">
              <History className="size-6" />
            </div>
            <h4 className="text-base font-semibold group-hover:text-primary transition-colors">
              Immutable Audit Trail
            </h4>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Inspect historical security and administrative events with diff view of score changes and timestamp logging.
            </p>
          </Link>

          <Link
            href="/settings"
            className="group rounded-2xl border bg-card p-6 shadow-sm hover:border-primary hover:shadow-md transition-all flex flex-col gap-3"
          >
            <div className="flex size-12 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
              <Sliders className="size-6" />
            </div>
            <h4 className="text-base font-semibold group-hover:text-primary transition-colors">
              Institution Settings
            </h4>
            <p className="text-xs text-muted-foreground leading-relaxed">
              School profile, official crest, contact info, and system configuration.
            </p>
          </Link>
        </div>
      </div>
    </div>
  )
}
