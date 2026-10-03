import React from "react"
import Link from "next/link"
import { redirect } from "next/navigation"
import { getSession } from "@/lib/auth/session"
import { ScopeGuard } from "@/lib/auth/scope-guard"
import { AcademicYearService } from "@/server/services/AcademicYearService"
import { ClassService } from "@/server/services/ClassService"
import { prisma } from "@/lib/prisma"
import {
  FileCheck2,
  Calendar,
  Layers,
  Send,
  Eye,
  CheckCircle2,
  Users,
  Search,
  ShieldCheck,
  ArrowRight,
  Info,
  Sliders,
} from "lucide-react"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { publishReportsAction } from "@/app/actions/reports"
import { BulkPrintButton } from "@/components/reports/bulk-print-button"

export default async function TerminalReportsPage({
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

  const params = await searchParams
  const currentYear = await AcademicYearService.getCurrentAcademicYear()
  const activeTerm = currentYear?.terms[0]

  const selectedTermId = params.termId || activeTerm?.id || ""
  const selectedClassId = params.classId || ""

  const [allTerms, classes] = await Promise.all([
    prisma.term.findMany({
      orderBy: [{ academicYear: { startDate: "desc" } }, { termSequence: "asc" }],
      include: { academicYear: true, publishedBy: true },
    }),
    ClassService.listClasses(),
  ])

  const selectedTerm = allTerms.find((t) => t.id === selectedTermId)
  const selectedClass = classes.find((c) => c.id === selectedClassId)

  let termResults: any[] = []
  if (selectedTermId && selectedClassId) {
    termResults = await prisma.termResult.findMany({
      where: {
        termId: selectedTermId,
        enrollment: { classId: selectedClassId },
        status: { in: ["FINALIZED", "PUBLISHED"] },
      },
      include: {
        enrollment: {
          include: {
            student: true,
            class: true,
          },
        },
        generatedReports: {
          where: { isCurrent: true, revokedAt: null },
          take: 1,
        },
      },
      orderBy: { classPosition: "asc" },
    })
  }

  return (
    <div className="p-6 md:p-8 flex flex-col gap-8 max-w-7xl mx-auto w-full">
      {/* Header */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 border-b pb-6">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-primary/10 text-primary rounded-xl">
              <FileCheck2 className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Official Terminal Report Cards</h1>
              <p className="text-sm text-muted-foreground mt-0.5">
                Generate, publish, and print official terminal report cards with cryptographic QR verification
              </p>
            </div>
          </div>
        </div>

        {/* Filter Controls */}
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
            Load Reports
          </Button>

          {isAdmin && (
            <Link href="/reports/template-editor">
              <Button variant="outline" size="sm" className="h-9 gap-1.5 border-primary/30 hover:bg-primary/5">
                <Sliders className="h-4 w-4 text-primary" />
                Template Designer
              </Button>
            </Link>
          )}
        </form>
      </div>

      {selectedTerm && (
        <>
          {/* Publication Control Banner */}
          <Card className="shadow-xs border-primary/20 bg-muted/20">
            <CardHeader className="pb-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-lg">
                      {selectedTerm.academicYear.name} — {selectedTerm.name}
                    </CardTitle>
                    <Badge
                      variant={selectedTerm.status === "PUBLISHED" ? "default" : "secondary"}
                      className="font-mono text-xs uppercase"
                    >
                      {selectedTerm.status}
                    </Badge>
                  </div>
                  <CardDescription className="mt-1">
                    {selectedTerm.status === "PUBLISHED" ? (
                      <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5 font-medium">
                        <CheckCircle2 className="h-4 w-4" />
                        Terminal reports are published and accessible to students and guardians.
                        {selectedTerm.publishedBy && ` Signed off by ${selectedTerm.publishedBy.displayName}`}.
                      </span>
                    ) : selectedTerm.status === "FINALIZED" ? (
                      "Official immutable snapshots are committed. Publish the term to grant report access to students and parents."
                    ) : (
                      "Term must be approved and finalized before terminal reports can be published."
                    )}
                  </CardDescription>
                </div>

                {/* Publish Action */}
                {isAdmin && selectedTerm.status === "FINALIZED" && (
                  <form action={publishReportsAction}>
                    <input type="hidden" name="termId" value={selectedTerm.id} />
                    <Button type="submit" className="bg-primary hover:bg-primary/90">
                      <Send className="mr-2 h-4 w-4" />
                      Publish Term Reports
                    </Button>
                  </form>
                )}

                {selectedTerm.status !== "FINALIZED" && selectedTerm.status !== "PUBLISHED" && (
                  <Link href={`/finalization?termId=${selectedTerm.id}`}>
                    <Button variant="outline" size="sm">
                      Go to Finalization
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </Link>
                )}
              </div>
            </CardHeader>
          </Card>

          {/* Reports Table */}
          {selectedClassId ? (
            termResults.length > 0 ? (
              <Card className="shadow-xs overflow-hidden">
                <CardHeader className="border-b bg-muted/10 pb-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-base flex items-center gap-2">
                          <FileCheck2 className="h-5 w-5 text-primary" />
                          Class Terminal Reports Roster
                        </CardTitle>
                        <Badge variant="outline" className="font-mono text-xs">
                          {termResults.length} Reports
                        </Badge>
                      </div>
                      <CardDescription className="text-xs mt-0.5">
                        Official terminal reports generated from immutable snapshots for {selectedClass?.name || "Class"}
                      </CardDescription>
                    </div>

                    <BulkPrintButton
                      termId={selectedTermId}
                      classId={selectedClassId}
                      targetClassName={selectedClass?.name}
                      studentCount={termResults.length}
                    />
                  </div>
                </CardHeader>

                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-muted/30">
                      <TableRow>
                        <TableHead className="w-16 font-bold text-center">Rank</TableHead>
                        <TableHead className="w-32">ID Number</TableHead>
                        <TableHead className="min-w-48">Student Name</TableHead>
                        <TableHead className="text-right">Total Score</TableHead>
                        <TableHead className="text-right">Average</TableHead>
                        <TableHead className="text-right">GPA</TableHead>
                        <TableHead className="text-center">Status</TableHead>
                        <TableHead className="text-center">Verification</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {termResults.map((result) => {
                        const hasToken = result.generatedReports.length > 0
                        return (
                          <TableRow key={result.id}>
                            <TableCell className="text-center font-bold font-mono">
                              #{result.classPosition}
                            </TableCell>
                            <TableCell className="font-mono text-xs text-muted-foreground">
                              {result.enrollment.student.studentIdNumber}
                            </TableCell>
                            <TableCell className="font-medium">
                              {result.enrollment.student.lastName}, {result.enrollment.student.firstName}
                            </TableCell>
                            <TableCell className="text-right font-mono font-medium">
                              {result.totalScore.toFixed(1)}
                            </TableCell>
                            <TableCell className="text-right font-mono font-bold text-primary">
                              {result.averageScore.toFixed(1)}%
                            </TableCell>
                            <TableCell className="text-right font-mono text-xs">
                              {result.gpa !== null ? result.gpa.toFixed(2) : "—"}
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge
                                variant={result.status === "PUBLISHED" ? "default" : "secondary"}
                                className="text-[10px] font-mono uppercase"
                              >
                                {result.status}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-center">
                              {hasToken ? (
                                <Badge variant="outline" className="text-[10px] text-emerald-600 border-emerald-300 font-mono">
                                  <ShieldCheck className="mr-1 h-3 w-3" />
                                  v{result.generatedReports[0].reportVersion}
                                </Badge>
                              ) : (
                                <span className="text-[10px] text-muted-foreground font-mono">Pending</span>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              <Link href={`/reports/${result.id}`}>
                                <Button variant="outline" size="sm" className="h-8">
                                  <Eye className="mr-1.5 h-3.5 w-3.5" />
                                  View Report Card
                                </Button>
                              </Link>
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </div>
              </Card>
            ) : (
              <Card className="p-8 text-center border-dashed">
                <div className="flex flex-col items-center justify-center gap-3">
                  <Info className="h-8 w-8 text-muted-foreground" />
                  <h3 className="font-semibold text-base">No Finalized Reports Found</h3>
                  <p className="text-xs text-muted-foreground max-w-md">
                    Terminal reports are only generated after the term has been finalized. Finalize the term to commit official immutable snapshots.
                  </p>
                  <Link href={`/finalization?termId=${selectedTerm.id}`}>
                    <Button variant="outline" size="sm" className="mt-2">
                      Go to Finalization & Broadsheets
                    </Button>
                  </Link>
                </div>
              </Card>
            )
          ) : (
            <Card className="p-8 text-center border-dashed">
              <div className="flex flex-col items-center justify-center gap-3">
                <Layers className="h-8 w-8 text-muted-foreground" />
                <h3 className="font-semibold text-base">Select a Class</h3>
                <p className="text-xs text-muted-foreground max-w-md">
                  Choose a class from the selector above to display student report cards.
                </p>
              </div>
            </Card>
          )}
        </>
      )}
    </div>
  )
}
