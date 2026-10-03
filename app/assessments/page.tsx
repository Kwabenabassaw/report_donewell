import React from "react"
import Link from "next/link"
import { redirect } from "next/navigation"
import { getSession } from "@/lib/auth/session"
import { ScopeGuard } from "@/lib/auth/scope-guard"
import { AssessmentService } from "@/server/services/AssessmentService"
import { AcademicYearService } from "@/server/services/AcademicYearService"
import { ClassService } from "@/server/services/ClassService"
import { SubjectService } from "@/server/services/SubjectService"
import { prisma } from "@/lib/prisma"
import {
  FileSpreadsheet,
  Plus,
  Filter,
  Calendar,
  Layers,
  BookOpen,
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
import {
  CreateAssessmentActivityDialog,
  EditAssessmentActivityDialog,
  ToggleAssessmentLockDialog,
  DeleteAssessmentActivityDialog,
} from "@/components/assessments/assessment-dialogs"

export default async function AssessmentsPage({
  searchParams,
}: {
  searchParams: Promise<{ termId?: string; classId?: string; subjectId?: string }>
}) {
  const session = await getSession()
  if (!session) {
    redirect("/login")
  }

  const isAdmin = ScopeGuard.isAdministrative({
    userId: session.userId,
    roles: session.roles,
  })

  const params = await searchParams
  const currentYear = await AcademicYearService.getCurrentAcademicYear()
  const activeTerm = currentYear?.terms[0]

  const selectedTermId = params.termId || activeTerm?.id || ""
  const selectedClassId = params.classId || ""
  const selectedSubjectId = params.subjectId || ""

  const [assessments, classes, subjects, categories, allTerms] = await Promise.all([
    AssessmentService.listAssessments({
      termId: selectedTermId || undefined,
      classId: selectedClassId || undefined,
      subjectId: selectedSubjectId || undefined,
    }),
    ClassService.listClasses(),
    SubjectService.listSubjects(),
    prisma.assessmentCategory.findMany({
      include: { component: true },
      orderBy: [{ component: { sortOrder: "asc" } }, { name: "asc" }],
    }),
    prisma.term.findMany({
      orderBy: [{ academicYear: { startDate: "desc" } }, { termSequence: "asc" }],
      include: { academicYear: true },
    }),
  ])

  return (
    <div className="p-6 md:p-8 flex flex-col gap-6 max-w-7xl mx-auto w-full">
      {/* Header with Title and Create Activity Button */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex flex-col gap-1">
          <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary uppercase tracking-wider">
            <FileSpreadsheet className="size-3.5" /> Operational Mark Entry Setup
          </div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
            Assessment Activities Management
          </h1>
          <p className="text-muted-foreground text-sm">
            Define discrete class tests, homework tasks, projects, and terminal examinations with individual maximum scores and locking controls.
          </p>
        </div>

        <div className="shrink-0">
          <CreateAssessmentActivityDialog
            terms={allTerms}
            classes={classes}
            subjects={subjects}
            categories={categories}
            defaultTermId={selectedTermId}
            defaultClassId={selectedClassId}
            defaultSubjectId={selectedSubjectId}
          />
        </div>
      </div>

      {/* Filter Bar */}
      <Card>
        <CardContent className="p-4">
          <form method="GET" className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div>
              <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground block mb-1">
                Term
              </label>
              <select
                name="termId"
                defaultValue={selectedTermId}
                className="w-full h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
              >
                <option value="">All Terms</option>
                {allTerms.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.academicYear.name} — {t.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground block mb-1">
                Class
              </label>
              <select
                name="classId"
                defaultValue={selectedClassId}
                className="w-full h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
              >
                <option value="">All Classes</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground block mb-1">
                Subject
              </label>
              <select
                name="subjectId"
                defaultValue={selectedSubjectId}
                className="w-full h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
              >
                <option value="">All Subjects</option>
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.code} - {s.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-end gap-2">
              <Button type="submit" variant="secondary" className="w-full h-9">
                <Filter className="size-3.5 mr-1.5" /> Filter
              </Button>
              {(selectedTermId || selectedClassId || selectedSubjectId) && (
                <Button variant="ghost" className="h-9" render={<Link href="/assessments" />}>
                  Reset
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Full-Width Assessment Activities Table */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <FileSpreadsheet className="size-4 text-primary" /> Configured Assessments ({assessments.length})
              </CardTitle>
              <CardDescription>
                Assessment columns available in the live mark entry spreadsheet.
              </CardDescription>
            </div>
            {assessments.length > 0 && (
              <CreateAssessmentActivityDialog
                terms={allTerms}
                classes={classes}
                subjects={subjects}
                categories={categories}
                defaultTermId={selectedTermId}
                defaultClassId={selectedClassId}
                defaultSubjectId={selectedSubjectId}
                trigger={
                  <Button variant="outline" size="sm">
                    <Plus className="size-3.5 mr-1.5" /> Add Column
                  </Button>
                }
              />
            )}
          </div>
        </CardHeader>
        <CardContent>
          {assessments.length === 0 ? (
            <div className="p-12 text-center flex flex-col items-center justify-center gap-3 border rounded-lg border-dashed">
              <div className="size-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                <FileSpreadsheet className="size-5" />
              </div>
              <div className="space-y-1">
                <p className="font-semibold text-sm">No assessment activities found</p>
                <p className="text-xs text-muted-foreground max-w-sm">
                  Create an assessment activity column (e.g. test, assignment, exam) to start capturing marks.
                </p>
              </div>
              <CreateAssessmentActivityDialog
                terms={allTerms}
                classes={classes}
                subjects={subjects}
                categories={categories}
                defaultTermId={selectedTermId}
                defaultClassId={selectedClassId}
                defaultSubjectId={selectedSubjectId}
              />
            </div>
          ) : (
            <div className="border rounded-md overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Class & Subject</TableHead>
                    <TableHead>Category Component</TableHead>
                    <TableHead>Max Score</TableHead>
                    <TableHead>Marks Entered</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {assessments.map((a) => (
                    <TableRow key={a.id}>
                      <TableCell className="font-semibold text-xs">
                        <div className="flex flex-col">
                          <span>{a.title}</span>
                          {a.dateAdministered && (
                            <span className="text-[11px] text-muted-foreground font-normal">
                              {new Date(a.dateAdministered).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-xs">
                        <span className="font-medium">{a.class.name}</span>
                        <span className="text-muted-foreground block text-[11px] font-mono">
                          {a.subject.code} • {a.subject.name}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[10px]">
                          {a.category.component.code} • {a.category.name}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-xs font-semibold">
                        {a.maxScore} pts
                      </TableCell>
                      <TableCell className="text-xs font-mono">
                        {a._count.scores} scores
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={a.status === "LOCKED" ? "destructive" : "default"}
                          className="text-[10px] uppercase font-bold"
                        >
                          {a.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          {a.status === "OPEN" && (
                            <EditAssessmentActivityDialog
                              assessment={a}
                              categories={categories}
                            />
                          )}
                          {isAdmin && (
                            <ToggleAssessmentLockDialog assessment={a} />
                          )}
                          <DeleteAssessmentActivityDialog assessment={a} />
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
