import React from "react"
import Link from "next/link"
import { redirect } from "next/navigation"
import { getSession } from "@/lib/auth/session"
import { ScopeGuard } from "@/lib/auth/scope-guard"
import { TeacherAssignmentService } from "@/server/services/TeacherAssignmentService"
import { AcademicYearService } from "@/server/services/AcademicYearService"
import { ClassService } from "@/server/services/ClassService"
import { SubjectService } from "@/server/services/SubjectService"
import { prisma } from "@/lib/prisma"
import {
  BookOpen,
  UserCheck,
  Filter,
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
  AssignTeacherDialog,
  EditAllocationDialog,
  DeleteAllocationDialog,
} from "@/components/allocations/allocation-dialogs"

export default async function TeacherAssignmentsPage({
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

  const params = await searchParams
  const currentYear = await AcademicYearService.getCurrentAcademicYear()
  const activeTerm = currentYear?.terms[0]

  const selectedTermId = params.termId || activeTerm?.id || ""
  const selectedClassId = params.classId || ""

  const [allocations, classes, subjects, teachers, allTerms] = await Promise.all([
    TeacherAssignmentService.listAllocations({
      termId: selectedTermId || undefined,
      classId: selectedClassId || undefined,
    }),
    ClassService.listClasses(),
    SubjectService.listSubjects(),
    prisma.user.findMany({
      where: {
        userRoles: {
          some: {
            role: { name: { in: ["SUBJECT_TEACHER", "CLASS_TEACHER"] } },
          },
        },
      },
      select: { id: true, displayName: true, username: true, email: true },
      orderBy: { displayName: "asc" },
    }),
    prisma.term.findMany({
      orderBy: [{ academicYear: { startDate: "desc" } }, { termSequence: "asc" }],
      include: { academicYear: true },
    }),
  ])

  return (
    <div className="p-6 md:p-8 flex flex-col gap-8 max-w-7xl mx-auto w-full">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex flex-col gap-1">
          <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary uppercase tracking-wider">
            <BookOpen className="size-3.5" /> Teaching Staff Allocations
          </div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
            Teacher & Subject Allocations
          </h1>
          <p className="text-muted-foreground text-sm">
            Assign qualified subject teachers to specific classes and terms. Teachers can only enter marks for subjects officially allocated to them.
          </p>
        </div>

        {isAdmin && (
          <AssignTeacherDialog
            allTerms={allTerms}
            classes={classes}
            subjects={subjects}
            teachers={teachers}
            defaultTermId={selectedTermId}
            defaultClassId={selectedClassId}
          />
        )}
      </div>

      {/* Filter Bar */}
      <Card>
        <CardContent className="p-4">
          <form method="GET" className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground block mb-1">
                Academic Term
              </label>
              <select
                name="termId"
                defaultValue={selectedTermId}
                className="w-full h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
              >
                <option value="">All Terms</option>
                {allTerms.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.academicYear.name} — {t.name} ({t.status})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground block mb-1">
                Class Level
              </label>
              <select
                name="classId"
                defaultValue={selectedClassId}
                className="w-full h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
              >
                <option value="">All Classes</option>
                {classes.map((cls) => (
                  <option key={cls.id} value={cls.id}>
                    {cls.name} ({cls.gradeLevel})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-end gap-2">
              <Button type="submit" variant="secondary" className="w-full h-9">
                <Filter className="size-3.5 mr-1.5" /> Filter Allocations
              </Button>
              {(selectedTermId || selectedClassId) && (
                <Button variant="ghost" className="h-9" render={<Link href="/teacher-assignments" />}>
                  Reset
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Full Width Allocations Table */}
      <div className="w-full">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg flex items-center gap-2">
                  <UserCheck className="size-4 text-primary" /> Active Allocations ({allocations.length})
                </CardTitle>
                <CardDescription>
                  Official term allocations for teaching and mark entry scope.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {allocations.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground border rounded-lg border-dashed">
                No teacher allocations found for the selected term and class filter.
              </div>
            ) : (
              <div className="border rounded-md overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Class</TableHead>
                      <TableHead>Subject</TableHead>
                      <TableHead>Assigned Teacher</TableHead>
                      <TableHead>Term & Session</TableHead>
                      {isAdmin && <TableHead className="text-right">Actions</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {allocations.map((alloc) => (
                      <TableRow key={alloc.id} className="hover:bg-muted/20 transition-colors">
                        <TableCell className="font-semibold text-xs">
                          <Badge variant="outline">{alloc.class.name}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-medium text-xs">{alloc.subject.name}</span>
                            <span className="text-[10px] text-muted-foreground font-mono">
                              {alloc.subject.code} • {alloc.subject.isElective ? "Elective" : "Core"}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-semibold text-xs text-primary">
                              {alloc.teacher.displayName}
                            </span>
                            <span className="text-[10px] text-muted-foreground font-mono">
                              @{alloc.teacher.username}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-xs">
                          <div className="flex flex-col">
                            <span className="font-medium">{alloc.term.name}</span>
                            <span className="text-[10px] text-muted-foreground">
                              {alloc.term.academicYear.name}
                            </span>
                          </div>
                        </TableCell>
                        {isAdmin && (
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <EditAllocationDialog
                                allocationId={alloc.id}
                                currentTeacherId={alloc.teacherId}
                                className={alloc.class.name}
                                subjectName={alloc.subject.name}
                                termName={alloc.term.name}
                                teachers={teachers}
                              />
                              <DeleteAllocationDialog
                                allocationId={alloc.id}
                                teacherName={alloc.teacher.displayName}
                                subjectName={alloc.subject.name}
                                className={alloc.class.name}
                              />
                            </div>
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
