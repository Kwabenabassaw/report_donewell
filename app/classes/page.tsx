import React from "react"
import { redirect } from "next/navigation"
import { getSession } from "@/lib/auth/session"
import { ScopeGuard } from "@/lib/auth/scope-guard"
import { ClassService } from "@/server/services/ClassService"
import { SubjectService } from "@/server/services/SubjectService"
import { prisma } from "@/lib/prisma"
import {
  Layers,
  BookOpen,
  Award,
  CheckCircle2,
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
  toggleSubjectStatusAction,
  assignClassTeacherAction,
} from "@/app/actions/academic"
import {
  CreateClassDialog,
  EditClassDialog,
  DeleteClassDialog,
  CreateSubjectDialog,
  EditSubjectDialog,
  DeleteSubjectDialog,
} from "@/components/academic/class-subject-dialogs"

export default async function ClassesAndSubjectsPage() {
  const session = await getSession()
  if (!session) {
    redirect("/login")
  }

  const isAdmin = ScopeGuard.isAdministrative({
    userId: session.userId,
    roles: session.roles,
  })

  const [classes, subjects, teachers] = await Promise.all([
    ClassService.listClasses(),
    SubjectService.listSubjects(),
    prisma.user.findMany({
      where: {
        userRoles: {
          some: {
            role: { name: { in: ["CLASS_TEACHER", "SUBJECT_TEACHER"] } },
          },
        },
      },
      select: { id: true, displayName: true, username: true },
      orderBy: { displayName: "asc" },
    }),
  ])

  return (
    <div className="p-6 md:p-8 flex flex-col gap-8 max-w-7xl mx-auto w-full">
      {/* Header with Modal Action Buttons */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b pb-6">
        <div className="flex flex-col gap-1">
          <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary uppercase tracking-wider">
            <Layers className="size-3.5" /> Academic Structure & Streams
          </div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
            Classes & Curriculum Subjects
          </h1>
          <p className="text-muted-foreground text-sm">
            Maintain active class streams, assign form teacher supervisors, and manage core and elective curriculum subjects.
          </p>
        </div>

        {isAdmin && (
          <div className="flex items-center gap-3">
            <CreateClassDialog teachers={teachers} />
            <CreateSubjectDialog />
          </div>
        )}
      </div>

      {/* Classes Table */}
      <Card>
        <CardHeader className="p-6 pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <Award className="size-5 text-primary" /> School Classes & Streams
              </CardTitle>
              <CardDescription className="text-xs mt-0.5">
                Active class cohorts with assigned form teachers and student metrics.
              </CardDescription>
            </div>
            <span className="text-xs font-semibold text-muted-foreground">
              {classes.length} active classes
            </span>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead className="py-3 px-6">Class Name</TableHead>
                <TableHead className="py-3 px-4">Grade Level</TableHead>
                <TableHead className="py-3 px-4">Form Teacher / Supervisor</TableHead>
                <TableHead className="py-3 px-4 text-center">Enrolled Students</TableHead>
                <TableHead className="py-3 px-4 text-center">Allocated Subjects</TableHead>
                <TableHead className="py-3 px-4">Status</TableHead>
                {isAdmin && <TableHead className="py-3 px-6 text-right">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {classes.map((cls) => (
                <TableRow key={cls.id} className="hover:bg-muted/20 transition-colors">
                  <TableCell className="py-3.5 px-6 font-bold text-foreground">{cls.name}</TableCell>
                  <TableCell className="py-3.5 px-4 text-xs text-muted-foreground">{cls.gradeLevel}</TableCell>
                  <TableCell className="py-3.5 px-4">
                    {cls.classTeacher ? (
                      <span className="font-medium text-xs text-foreground">
                        {cls.classTeacher.displayName}
                      </span>
                    ) : (
                      <span className="text-xs text-amber-600 dark:text-amber-400 italic">
                        Unassigned
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="py-3.5 px-4 text-center text-xs font-mono">
                    {cls._count.enrollments} enrolled
                  </TableCell>
                  <TableCell className="py-3.5 px-4 text-center text-xs font-mono">
                    {cls._count.subjectAllocations} allocated
                  </TableCell>
                  <TableCell className="py-3.5 px-4">
                    <Badge variant={cls.status === "ACTIVE" ? "success" : "secondary"}>
                      {cls.status}
                    </Badge>
                  </TableCell>
                  {isAdmin && (
                    <TableCell className="py-3.5 px-6 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <EditClassDialog cls={cls} teachers={teachers} />
                        <DeleteClassDialog classId={cls.id} className={cls.name} />
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Subjects Table */}
      <Card>
        <CardHeader className="p-6 pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <BookOpen className="size-5 text-primary" /> Curriculum Subjects
              </CardTitle>
              <CardDescription className="text-xs mt-0.5">
                Official curriculum subjects with code classification and core/elective status.
              </CardDescription>
            </div>
            <span className="text-xs font-semibold text-muted-foreground">
              {subjects.length} curriculum subjects
            </span>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead className="py-3 px-6">Code</TableHead>
                <TableHead className="py-3 px-4">Subject Name</TableHead>
                <TableHead className="py-3 px-4">Type</TableHead>
                <TableHead className="py-3 px-4 text-center">Teacher Allocations</TableHead>
                <TableHead className="py-3 px-4 text-center">Student Registrations</TableHead>
                <TableHead className="py-3 px-4">Status</TableHead>
                {isAdmin && <TableHead className="py-3 px-6 text-right">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {subjects.map((subj) => (
                <TableRow key={subj.id} className="hover:bg-muted/20 transition-colors">
                  <TableCell className="py-3.5 px-6 font-mono font-bold text-xs text-foreground">
                    {subj.code}
                  </TableCell>
                  <TableCell className="py-3.5 px-4 font-semibold text-foreground">{subj.name}</TableCell>
                  <TableCell className="py-3.5 px-4">
                    <Badge variant={subj.isElective ? "warning" : "default"}>
                      {subj.isElective ? "Elective" : "Core"}
                    </Badge>
                  </TableCell>
                  <TableCell className="py-3.5 px-4 text-center text-xs font-mono">
                    {subj._count.subjectAllocations} active
                  </TableCell>
                  <TableCell className="py-3.5 px-4 text-center text-xs font-mono">
                    {subj._count.studentSubjectEnrollments} students
                  </TableCell>
                  <TableCell className="py-3.5 px-4">
                    <Badge variant={subj.status === "ACTIVE" ? "success" : "secondary"}>
                      {subj.status}
                    </Badge>
                  </TableCell>
                  {isAdmin && (
                    <TableCell className="py-3.5 px-6 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <form action={toggleSubjectStatusAction.bind(null, subj.id)}>
                          <Button type="submit" size="xs" variant="outline">
                            {subj.status === "ACTIVE" ? "Deactivate" : "Activate"}
                          </Button>
                        </form>
                        <EditSubjectDialog subject={subj} />
                        <DeleteSubjectDialog subjectId={subj.id} subjectName={subj.name} />
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
