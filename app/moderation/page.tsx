import React from "react"
import Link from "next/link"
import { redirect } from "next/navigation"
import { getSession } from "@/lib/auth/session"
import { ScopeGuard } from "@/lib/auth/scope-guard"
import { CalculationEngineService } from "@/server/services/CalculationEngineService"
import { ModerationService } from "@/server/services/ModerationService"
import { AcademicYearService } from "@/server/services/AcademicYearService"
import { ClassService } from "@/server/services/ClassService"
import { prisma } from "@/lib/prisma"
import {
  ShieldAlert,
  Calculator,
  Award,
  Filter,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  TrendingUp,
  Users,
  Send,
  Eye,
  FileCheck2,
  RotateCcw,
  UserCheck,
} from "lucide-react"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  submitTermAction,
  startReviewAction,
  approveTermAction,
  rejectTermAction,
} from "@/app/actions/moderation"

export default async function ModerationAndCalculationPage({
  searchParams,
}: {
  searchParams: Promise<{ termId?: string; classId?: string }>
}) {
  const session = await getSession()
  if (!session) {
    redirect("/login")
  }

  const isAdmin = ScopeGuard.isAdministrative({
    userId: session.userId,
    roles: session.roles,
  })

  const isClassTeacher = session.roles.includes("CLASS_TEACHER")
  if (!isAdmin && !isClassTeacher) {
    redirect("/")
  }

  const params = await searchParams
  const currentYear = await AcademicYearService.getCurrentAcademicYear()
  const activeTerm = currentYear?.terms[0]

  const selectedTermId = params.termId || activeTerm?.id || ""
  const selectedClassId = params.classId || ""

  const [allTerms, classes] = await Promise.all([
    prisma.term.findMany({
      orderBy: [{ academicYear: { startDate: "desc" } }, { termSequence: "asc" }],
      include: { academicYear: true },
    }),
    ClassService.listClasses(),
  ])

  const selectedTerm = allTerms.find((t) => t.id === selectedTermId)

  let calculationData = null
  let moderationAudit = null

  if (selectedTermId && selectedClassId) {
    try {
      const [calc, audit] = await Promise.all([
        CalculationEngineService.calculateClassTermResults(selectedTermId, selectedClassId),
        ModerationService.runModerationAudit(selectedTermId, selectedClassId),
      ])
      calculationData = calc
      moderationAudit = audit
    } catch (err: any) {
      console.error("Calculation failed:", err)
    }
  }

  return (
    <div className="p-6 md:p-8 flex flex-col gap-8 max-w-7xl mx-auto w-full">
      {/* Header */}
      <div className="flex flex-col gap-1">
        <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary uppercase tracking-wider">
          <Calculator className="size-3.5" /> Calculation & Moderation Engine
        </div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
          Terminal BroadSheet & Result Moderation
        </h1>
        <p className="text-muted-foreground text-sm">
          Deterministic scaling (CA + Exam), dense ranking, GPA computation, and mark completeness audit prior to official snapshot generation.
        </p>
      </div>

      {/* Selector Bar */}
      <Card>
        <CardContent className="p-4">
          <form method="GET" className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground block mb-1">
                Academic Term *
              </label>
              <select
                name="termId"
                defaultValue={selectedTermId}
                className="w-full h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
              >
                {allTerms.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.academicYear.name} — {t.name} ({t.status})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground block mb-1">
                Class Level *
              </label>
              <select
                name="classId"
                defaultValue={selectedClassId}
                className="w-full h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
              >
                <option value="">Select Class...</option>
                {classes.map((cls) => (
                  <option key={cls.id} value={cls.id}>
                    {cls.name} ({cls.gradeLevel})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-end gap-2">
              <Button type="submit" variant="secondary" className="w-full h-9">
                <Filter className="size-3.5 mr-1.5" /> Run Calculation
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Calculation Data Display */}
      {calculationData && moderationAudit ? (
        <div className="flex flex-col gap-6">
          {/* Moderation Workflow & Approval Action Bar */}
          {selectedTerm && (
            <Card className="border-primary/20 bg-primary/5">
              <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="size-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold">
                    <FileCheck2 className="size-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm">
                        Term Status: <strong className="text-foreground">{selectedTerm.name}</strong>
                      </span>
                      <Badge variant="outline" className="font-bold text-xs uppercase">
                        {selectedTerm.status}
                      </Badge>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {selectedTerm.status === "MARK_ENTRY" && "Teachers are currently recording assessment scores."}
                      {selectedTerm.status === "SUBMITTED" && "Marks submitted. Awaiting Exam Officer moderation review."}
                      {selectedTerm.status === "UNDER_REVIEW" && "Results are actively under administrative moderation."}
                      {selectedTerm.status === "APPROVED" && "Results formally approved! Ready for Phase 9 snapshot finalization."}
                      {selectedTerm.status === "REOPENED" && "Term was reopened for amendments."}
                    </span>
                  </div>
                </div>

                {/* Workflow Buttons */}
                <div className="flex items-center gap-2 shrink-0">
                  {selectedTerm.status === "MARK_ENTRY" && (
                    <form action={submitTermAction}>
                      <input type="hidden" name="termId" value={selectedTerm.id} />
                      <Button size="sm" type="submit" disabled={!moderationAudit.isReadyForApproval}>
                        <Send className="size-3.5 mr-1.5" /> Submit for Moderation
                      </Button>
                    </form>
                  )}

                  {isAdmin && selectedTerm.status === "SUBMITTED" && (
                    <form action={startReviewAction}>
                      <input type="hidden" name="termId" value={selectedTerm.id} />
                      <Button size="sm" type="submit" variant="secondary">
                        <Eye className="size-3.5 mr-1.5" /> Begin Review
                      </Button>
                    </form>
                  )}

                  {isAdmin && selectedTerm.status === "UNDER_REVIEW" && (
                    <div className="flex items-center gap-2">
                      <form action={approveTermAction}>
                        <input type="hidden" name="termId" value={selectedTerm.id} />
                        <Button size="sm" type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white">
                          <CheckCircle2 className="size-3.5 mr-1.5" /> Approve & Sign-off
                        </Button>
                      </form>

                      {/* Rejection Form */}
                      <form action={rejectTermAction} className="flex items-center gap-1">
                        <input type="hidden" name="termId" value={selectedTerm.id} />
                        <input
                          name="reason"
                          placeholder="Rejection reason..."
                          required
                          className="h-8 w-44 rounded-md border border-input bg-background px-2 text-xs"
                        />
                        <Button size="sm" variant="destructive" type="submit" className="h-8 text-xs">
                          <RotateCcw className="size-3 mr-1" /> Send Back
                        </Button>
                      </form>
                    </div>
                  )}

                  {selectedTerm.status === "APPROVED" && (
                    <Badge variant="default" className="bg-emerald-600 text-xs py-1 px-3">
                      ✓ Term Approved
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Completeness & Audit Status Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Mark Completeness */}
            <Card className={moderationAudit.blockers.length === 0 ? "border-emerald-500/30" : "border-destructive/30"}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  {moderationAudit.blockers.length === 0 ? (
                    <CheckCircle2 className="size-4 text-emerald-500" />
                  ) : (
                    <AlertTriangle className="size-4 text-destructive" />
                  )}
                  Mark Entry Completeness ({moderationAudit.completenessPercentage}%)
                </CardTitle>
              </CardHeader>
              <CardContent className="text-xs flex flex-col gap-1.5">
                {moderationAudit.blockers.length === 0 ? (
                  <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                    All expected student assessment scores have been recorded.
                  </span>
                ) : (
                  moderationAudit.blockers.map((b, idx) => (
                    <span key={idx} className="text-destructive font-medium">
                      • {b}
                    </span>
                  ))
                )}
              </CardContent>
            </Card>

            {/* Form Teacher Evaluations Status */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <UserCheck className="size-4 text-primary" /> Form Teacher Evaluations ({moderationAudit.evaluatedStudents}/{moderationAudit.totalStudents})
                </CardTitle>
              </CardHeader>
              <CardContent className="text-xs flex flex-col gap-2">
                <span className="text-muted-foreground">
                  {moderationAudit.evaluatedStudents === moderationAudit.totalStudents ? (
                    <strong className="text-emerald-600">All students evaluated with conduct and remarks.</strong>
                  ) : (
                    <strong className="text-amber-600">
                      {moderationAudit.totalStudents - moderationAudit.evaluatedStudents} student(s) pending form teacher remarks.
                    </strong>
                  )}
                </span>
                <Link
                  href={`/evaluations?termId=${selectedTermId}&classId=${selectedClassId}`}
                  className="text-primary hover:underline font-semibold flex items-center gap-1 w-fit"
                >
                  Manage Class Evaluations <ArrowRight className="size-3" />
                </Link>
              </CardContent>
            </Card>
          </div>

          {/* Anomaly Alerts Table (if any) */}
          {moderationAudit.anomalies.length > 0 && (
            <Card className="border-amber-500/30 bg-amber-500/5">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold flex items-center gap-2 text-amber-700 dark:text-amber-400">
                  <AlertTriangle className="size-4" /> Moderation Anomalies & Outliers ({moderationAudit.anomalies.length})
                </CardTitle>
                <CardDescription className="text-xs">
                  Review these score discrepancies prior to final sign-off.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="border rounded-md bg-background overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-28 text-xs">Student ID</TableHead>
                        <TableHead className="w-40 text-xs">Student</TableHead>
                        <TableHead className="w-28 text-xs">Subject</TableHead>
                        <TableHead className="text-xs">Identified Issue</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {moderationAudit.anomalies.map((anom, idx) => (
                        <TableRow key={idx}>
                          <TableCell className="font-mono text-xs">{anom.studentIdNumber}</TableCell>
                          <TableCell className="font-medium text-xs">{anom.studentName}</TableCell>
                          <TableCell className="text-xs font-semibold">{anom.subjectName}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">{anom.issue}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Statistical Overview Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4 flex flex-col gap-1">
                <span className="text-xs text-muted-foreground font-medium">Cohort Size</span>
                <span className="text-2xl font-bold font-mono">{calculationData.cohortSize}</span>
                <span className="text-[11px] text-muted-foreground">Active enrolled students</span>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4 flex flex-col gap-1">
                <span className="text-xs text-muted-foreground font-medium">Class Average</span>
                <span className="text-2xl font-bold font-mono text-primary">
                  {calculationData.classAverage.toFixed(1)}%
                </span>
                <span className="text-[11px] text-muted-foreground">Composite class mean</span>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4 flex flex-col gap-1">
                <span className="text-xs text-muted-foreground font-medium">Highest Average</span>
                <span className="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
                  {calculationData.highestAverage.toFixed(1)}%
                </span>
                <span className="text-[11px] text-muted-foreground">Top student mark</span>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4 flex flex-col gap-1">
                <span className="text-xs text-muted-foreground font-medium">Lowest Average</span>
                <span className="text-2xl font-bold font-mono text-amber-600 dark:text-amber-400">
                  {calculationData.lowestAverage.toFixed(1)}%
                </span>
                <span className="text-[11px] text-muted-foreground">Bottom student mark</span>
              </CardContent>
            </Card>
          </div>

          {/* Ranked Class Broadsheet */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Award className="size-4 text-primary" /> Ranked Broadsheet ({calculationData.students.length} Students)
                  </CardTitle>
                  <CardDescription>
                    Results computed using Dense Ranking (ties receive equal rank, no gaps).
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto max-h-[70vh]">
                <Table className="border-collapse">
                  <TableHeader className="sticky top-0 bg-muted/80 backdrop-blur z-10">
                    <TableRow>
                      <TableHead className="w-14 text-center font-bold text-primary">Rank</TableHead>
                      <TableHead className="w-28 text-xs">Student ID</TableHead>
                      <TableHead className="min-w-40 text-xs">Student Name</TableHead>
                      {/* Dynamic Subject Columns */}
                      {Object.values(calculationData.subjectStatistics).map((stat) => (
                        <TableHead key={stat.subjectId} className="text-center min-w-24 text-xs p-2">
                          <div className="flex flex-col items-center">
                            <span className="font-semibold text-foreground">{stat.subjectCode}</span>
                            <span className="text-[10px] text-muted-foreground font-mono">
                              Avg: {stat.averageScore.toFixed(0)}%
                            </span>
                          </div>
                        </TableHead>
                      ))}
                      <TableHead className="text-center text-xs font-semibold">Total</TableHead>
                      <TableHead className="text-center text-xs font-semibold">Average</TableHead>
                      <TableHead className="text-center text-xs font-semibold">GPA</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {calculationData.students.map((student) => {
                      const subjMap = new Map(student.subjectScores.map((s) => [s.subjectId, s]))

                      return (
                        <TableRow key={student.studentEnrollmentId} className="hover:bg-muted/30">
                          <TableCell className="text-center font-mono text-xs font-bold text-primary">
                            #{student.classPosition}
                          </TableCell>
                          <TableCell className="font-mono text-xs font-semibold">
                            {student.studentIdNumber}
                          </TableCell>
                          <TableCell className="font-medium text-xs whitespace-nowrap">
                            {student.studentName}
                          </TableCell>

                          {/* Subject Marks */}
                          {Object.values(calculationData.subjectStatistics).map((stat) => {
                            const subj = subjMap.get(stat.subjectId)

                            return (
                              <TableCell key={stat.subjectId} className="text-center p-2">
                                {subj ? (
                                  <div className="flex flex-col items-center">
                                    <span className="font-mono text-xs font-semibold">
                                      {subj.totalScore.toFixed(0)}
                                    </span>
                                    <span className="text-[10px] text-muted-foreground">
                                      {subj.grade} (#{subj.subjectPosition})
                                    </span>
                                  </div>
                                ) : (
                                  <span className="text-muted-foreground text-xs italic">—</span>
                                )}
                              </TableCell>
                            )
                          })}

                          <TableCell className="text-center font-mono text-xs font-semibold">
                            {student.totalScore.toFixed(0)}
                          </TableCell>
                          <TableCell className="text-center font-mono text-xs font-bold text-primary">
                            {student.averageScore.toFixed(1)}%
                          </TableCell>
                          <TableCell className="text-center font-mono text-xs font-semibold">
                            {student.gpa.toFixed(2)}
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : (
        <Card className="border-dashed">
          <CardContent className="p-12 flex flex-col items-center justify-center text-center gap-3">
            <div className="size-12 rounded-full bg-primary/10 text-primary flex items-center justify-center">
              <Calculator className="size-6" />
            </div>
            <div>
              <h3 className="font-semibold text-base">Select Session and Class</h3>
              <p className="text-muted-foreground text-xs max-w-sm mt-1">
                Choose an academic term and class level above to run the deterministic calculation engine and inspect the ranked broadsheet.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
