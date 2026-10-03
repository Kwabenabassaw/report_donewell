import React from "react"
import Link from "next/link"
import { redirect } from "next/navigation"
import { getSession } from "@/lib/auth/session"
import { ScopeGuard } from "@/lib/auth/scope-guard"
import { FinalizationService } from "@/server/services/FinalizationService"
import { AcademicYearService } from "@/server/services/AcademicYearService"
import { ClassService } from "@/server/services/ClassService"
import { prisma } from "@/lib/prisma"
import {
  Lock,
  Unlock,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  FileCheck2,
  ArrowRight,
  TrendingUp,
  Award,
  Users,
  Info,
  Calendar,
  Layers,
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
import { finalizeTermAction, reopenFinalizedTermAction } from "@/app/actions/finalization"
import {
  ChangeTermStatusDialog,
  PublishReportsDialog,
  UpdateResultStatusDialog,
} from "@/components/finalization/finalization-dialogs"

export default async function FinalizationPage({
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

  if (!isAdmin) {
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
      include: { academicYear: true, finalizedBy: true },
    }),
    ClassService.listClasses(),
  ])

  const selectedTerm = allTerms.find((t) => t.id === selectedTermId)

  let broadsheetData = null
  let loadError: string | null = null

  if (selectedTermId && selectedClassId) {
    try {
      broadsheetData = await FinalizationService.getFinalizedBroadsheet(
        selectedTermId,
        selectedClassId
      )
    } catch (err: any) {
      loadError = err.message || "Failed to load finalized broadsheet."
    }
  }

  return (
    <div className="p-6 md:p-8 flex flex-col gap-8 max-w-7xl mx-auto w-full">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-6">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-primary/10 text-primary rounded-xl">
              <Lock className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Finalization & Official Snapshots</h1>
              <p className="text-sm text-muted-foreground mt-0.5">
                Commit immutable snapshots of terminal results and lock operational marks
              </p>
            </div>
          </div>
        </div>

        {/* Term and Class Filters */}
        <form className="flex flex-wrap items-center gap-3" method="GET">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <select
              name="termId"
              defaultValue={selectedTermId}
              className="h-9 text-xs rounded-md border border-input bg-background px-3 py-1 font-medium shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              {allTerms.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.academicYear.name} - {t.name} ({t.status})
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <Layers className="h-4 w-4 text-muted-foreground" />
            <select
              name="classId"
              defaultValue={selectedClassId}
              className="h-9 text-xs rounded-md border border-input bg-background px-3 py-1 font-medium shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <option value="">-- Select Class --</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.gradeLevel})
                </option>
              ))}
            </select>
          </div>

          <Button type="submit" variant="secondary" size="sm" className="h-9">
            Load Results
          </Button>
        </form>
      </div>

      {selectedTerm && (
        <>
          {/* Term Lifecycle Control Card */}
          <Card className="shadow-xs border-primary/20 bg-muted/20">
            <CardHeader className="pb-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-lg">
                      {selectedTerm.academicYear.name} — {selectedTerm.name}
                    </CardTitle>
                    <Badge
                      variant={
                        selectedTerm.status === "FINALIZED"
                          ? "default"
                          : selectedTerm.status === "APPROVED"
                          ? "secondary"
                          : "outline"
                      }
                      className="font-mono text-xs uppercase"
                    >
                      {selectedTerm.status}
                    </Badge>
                  </div>
                  <CardDescription className="mt-1">
                    {selectedTerm.status === "FINALIZED" ? (
                      <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5 font-medium">
                        <ShieldCheck className="h-4 w-4" />
                        Official immutable snapshot active. Finalized on{" "}
                        {selectedTerm.finalizedAt?.toLocaleDateString() || "Unknown"}
                        {selectedTerm.finalizedBy && ` by ${selectedTerm.finalizedBy.displayName}`}.
                      </span>
                    ) : selectedTerm.status === "APPROVED" ? (
                      "Term has been approved by the Headmaster and is ready for immutable snapshot finalization."
                    ) : (
                      `Term is currently in "${selectedTerm.status}". It must be approved through Moderation before finalization.`
                    )}
                  </CardDescription>
                </div>

                {/* Finalize, Publish, Reopen, and Change Status Actions */}
                <div className="flex flex-wrap items-center gap-2">
                  <ChangeTermStatusDialog
                    term={{
                      id: selectedTerm.id,
                      name: selectedTerm.name,
                      status: selectedTerm.status,
                      academicYear: { name: selectedTerm.academicYear.name },
                    }}
                  />

                  {selectedTerm.status === "APPROVED" && (
                    <form action={finalizeTermAction}>
                      <input type="hidden" name="termId" value={selectedTerm.id} />
                      <Button
                        type="submit"
                        size="sm"
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium gap-1.5"
                      >
                        <Lock className="h-3.5 w-3.5" />
                        Finalize & Lock Results
                      </Button>
                    </form>
                  )}

                  {selectedTerm.status === "FINALIZED" && (
                    <PublishReportsDialog
                      term={{
                        id: selectedTerm.id,
                        name: selectedTerm.name,
                        status: selectedTerm.status,
                        academicYear: { name: selectedTerm.academicYear.name },
                      }}
                    />
                  )}

                  {(selectedTerm.status === "FINALIZED" || selectedTerm.status === "PUBLISHED") && (
                    <ChangeTermStatusDialog
                      term={{
                        id: selectedTerm.id,
                        name: selectedTerm.name,
                        status: selectedTerm.status,
                        academicYear: { name: selectedTerm.academicYear.name },
                      }}
                      trigger={
                        <Button variant="outline" size="sm" className="text-destructive hover:bg-destructive/10 gap-1.5">
                          <Unlock className="h-3.5 w-3.5" />
                          Reopen Term
                        </Button>
                      }
                    />
                  )}

                  {selectedTerm.status !== "APPROVED" &&
                    selectedTerm.status !== "FINALIZED" &&
                    selectedTerm.status !== "PUBLISHED" && (
                      <Link href={`/moderation?termId=${selectedTerm.id}`}>
                        <Button variant="outline" size="sm" className="gap-1.5">
                          Moderation & Approval
                          <ArrowRight className="h-3.5 w-3.5" />
                        </Button>
                      </Link>
                    )}
                </div>
              </div>
            </CardHeader>
          </Card>

          {/* Broadsheet Section */}
          {selectedClassId ? (
            broadsheetData && broadsheetData.students.length > 0 ? (
              <div className="flex flex-col gap-6">
                {/* Stats Row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <Card className="shadow-xs">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                      <CardTitle className="text-xs font-medium text-muted-foreground">
                        Enrolled Cohort Size
                      </CardTitle>
                      <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{broadsheetData.cohortSize}</div>
                      <p className="text-xs text-muted-foreground mt-0.5">Students evaluated</p>
                    </CardContent>
                  </Card>

                  <Card className="shadow-xs">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                      <CardTitle className="text-xs font-medium text-muted-foreground">
                        Class Average Score
                      </CardTitle>
                      <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{broadsheetData.classAverage.toFixed(1)}%</div>
                      <p className="text-xs text-muted-foreground mt-0.5">Overall cohort mean</p>
                    </CardContent>
                  </Card>

                  <Card className="shadow-xs">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                      <CardTitle className="text-xs font-medium text-muted-foreground">
                        Highest Average
                      </CardTitle>
                      <Award className="h-4 w-4 text-emerald-600" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-emerald-600">
                        {broadsheetData.highestAverage.toFixed(1)}%
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">Top rank composite score</p>
                    </CardContent>
                  </Card>

                  <Card className="shadow-xs">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                      <CardTitle className="text-xs font-medium text-muted-foreground">
                        Lowest Average
                      </CardTitle>
                      <TrendingUp className="h-4 w-4 text-amber-600" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-amber-600">
                        {broadsheetData.lowestAverage.toFixed(1)}%
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">Bottom rank composite score</p>
                    </CardContent>
                  </Card>
                </div>

                {/* Official Broadsheet Table */}
                <Card className="shadow-xs overflow-hidden">
                  <CardHeader className="border-b bg-muted/10 pb-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <CardTitle className="text-base flex items-center gap-2">
                          <FileCheck2 className="h-5 w-5 text-emerald-600" />
                          Official Broadsheet Snapshot — {broadsheetData.className}
                        </CardTitle>
                        <CardDescription className="text-xs">
                          Immutable terminal ranking compiled directly from official snapshot tables
                        </CardDescription>
                      </div>
                      <Badge variant="outline" className="font-mono text-xs w-fit">
                        IMMUTABLE SNAPSHOT
                      </Badge>
                    </div>
                  </CardHeader>

                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader className="bg-muted/30">
                        <TableRow>
                          <TableHead className="w-16 font-bold text-center">Rank</TableHead>
                          <TableHead className="w-28">ID Number</TableHead>
                          <TableHead className="min-w-44">Student Name</TableHead>
                          {broadsheetData.students[0]?.subjects.map((s) => (
                            <TableHead key={s.subjectId} className="text-center min-w-28 font-semibold">
                              {s.subjectCode}
                            </TableHead>
                          ))}
                          <TableHead className="text-right font-bold">Total</TableHead>
                          <TableHead className="text-right font-bold">Average</TableHead>
                          <TableHead className="text-right font-bold">GPA</TableHead>
                          <TableHead className="text-center">Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {broadsheetData.students.map((student) => (
                          <TableRow key={student.studentEnrollmentId}>
                            <TableCell className="text-center font-bold font-mono">
                              #{student.classPosition}
                            </TableCell>
                            <TableCell className="font-mono text-xs text-muted-foreground">
                              {student.studentIdNumber}
                            </TableCell>
                            <TableCell className="font-medium">
                              {student.studentName}
                            </TableCell>
                            {student.subjects.map((sub) => (
                              <TableCell key={sub.subjectId} className="text-center">
                                <div className="text-xs font-semibold">{sub.totalScore.toFixed(0)}</div>
                                <div className="text-[10px] text-muted-foreground">
                                  {sub.grade} ({sub.interpretation || "Pass"})
                                </div>
                              </TableCell>
                            ))}
                            <TableCell className="text-right font-bold font-mono text-sm">
                              {student.totalScore.toFixed(1)}
                            </TableCell>
                            <TableCell className="text-right font-bold font-mono text-sm text-primary">
                              {student.averageScore.toFixed(1)}%
                            </TableCell>
                            <TableCell className="text-right font-mono text-xs font-medium">
                              {student.gpa !== null ? student.gpa.toFixed(2) : "—"}
                            </TableCell>
                            <TableCell className="text-center">
                              <UpdateResultStatusDialog
                                termResultId={student.termResultId}
                                studentName={student.studentName}
                                currentStatus={student.status}
                              />
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </Card>

                {/* Subject Statistics Card */}
                {Object.keys(broadsheetData.subjectStatistics).length > 0 && (
                  <Card className="shadow-xs">
                    <CardHeader className="pb-3 border-b">
                      <CardTitle className="text-sm font-semibold">
                        Subject Statistics & Class Distribution
                      </CardTitle>
                    </CardHeader>
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Subject Code</TableHead>
                            <TableHead>Subject Name</TableHead>
                            <TableHead className="text-right">Class Average</TableHead>
                            <TableHead className="text-right">Highest Score</TableHead>
                            <TableHead className="text-right">Lowest Score</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {Object.values(broadsheetData.subjectStatistics).map((stat) => (
                            <TableRow key={stat.subjectId}>
                              <TableCell className="font-mono font-medium">{stat.subjectCode}</TableCell>
                              <TableCell>{stat.subjectName}</TableCell>
                              <TableCell className="text-right font-mono font-semibold">
                                {stat.averageScore.toFixed(1)}%
                              </TableCell>
                              <TableCell className="text-right font-mono text-emerald-600 font-medium">
                                {stat.highestScore.toFixed(1)}%
                              </TableCell>
                              <TableCell className="text-right font-mono text-amber-600 font-medium">
                                {stat.lowestScore.toFixed(1)}%
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </Card>
                )}
              </div>
            ) : (
              <Card className="p-8 text-center border-dashed">
                <div className="flex flex-col items-center justify-center gap-3">
                  <Info className="h-8 w-8 text-muted-foreground" />
                  <h3 className="font-semibold text-base">No Finalized Results Found</h3>
                  <p className="text-xs text-muted-foreground max-w-md">
                    {selectedTerm.status === "FINALIZED"
                      ? "This class has no enrolled students or recorded results for this term."
                      : "This term has not been finalized yet. Once the Headmaster approves the term, finalize it above to generate immutable official snapshots."}
                  </p>
                  {selectedTerm.status !== "FINALIZED" && selectedTerm.status !== "APPROVED" && (
                    <Link href={`/moderation?termId=${selectedTerm.id}&classId=${selectedClassId}`}>
                      <Button variant="outline" size="sm" className="mt-2">
                        Preview Pre-Finalization Broadsheet
                      </Button>
                    </Link>
                  )}
                </div>
              </Card>
            )
          ) : (
            <Card className="p-8 text-center border-dashed">
              <div className="flex flex-col items-center justify-center gap-3">
                <Layers className="h-8 w-8 text-muted-foreground" />
                <h3 className="font-semibold text-base">Select a Class</h3>
                <p className="text-xs text-muted-foreground max-w-md">
                  Choose a class from the dropdown above to view the official immutable broadsheet and rankings.
                </p>
              </div>
            </Card>
          )}
        </>
      )}
    </div>
  )
}
