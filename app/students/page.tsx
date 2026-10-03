import React from "react"
import Link from "next/link"
import { redirect } from "next/navigation"
import { getSession } from "@/lib/auth/session"
import { ScopeGuard } from "@/lib/auth/scope-guard"
import { StudentService } from "@/server/services/StudentService"
import { AcademicYearService } from "@/server/services/AcademicYearService"
import { ClassService } from "@/server/services/ClassService"
import { SubjectService } from "@/server/services/SubjectService"
import { StudentStatus } from "@prisma/client"
import {
  Users,
  Upload,
  Search,
  Filter,
  GraduationCap,
  Eye,
  Phone,
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
  RegisterStudentDialog,
  EditStudentDialog,
  DeleteStudentDialog,
  BulkSubjectEnrollmentDialog,
} from "@/components/students/student-dialogs"


export default async function StudentsDirectoryPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; classId?: string; status?: string }>
}) {
  const session = await getSession()
  if (!session) {
    redirect("/login")
  }

  const params = await searchParams
  const search = params.search || ""
  const classId = params.classId || ""
  const statusParam = params.status as StudentStatus | undefined

  const [students, classes, currentYear, subjects, academicYears] = await Promise.all([
    StudentService.listStudents({
      search: search || undefined,
      classId: classId || undefined,
      status: statusParam || undefined,
      limit: 100,
    }),
    ClassService.listClasses(),
    AcademicYearService.getCurrentAcademicYear(),
    SubjectService.listSubjects(),
    AcademicYearService.listAcademicYears(),
  ])

  const isAdmin = ScopeGuard.isAdministrative({
    userId: session.userId,
    roles: session.roles,
  })

  const canEdit = isAdmin || session.roles.includes("CLASS_TEACHER")


  return (
    <div className="p-6 md:p-8 flex flex-col gap-8 max-w-7xl mx-auto w-full">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex flex-col gap-1">
          <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary uppercase tracking-wider">
            <Users className="size-3.5" /> Student Records
          </div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
            Student Directory
          </h1>
          <p className="text-muted-foreground text-sm">
            Manage student biodata, annual academic enrollments, subject selections, and guardian contacts.
          </p>
        </div>

        {canEdit && (
          <div className="flex items-center gap-3">
            <RegisterStudentDialog classes={classes} currentYear={currentYear} />
            {isAdmin && (
              <BulkSubjectEnrollmentDialog
                academicYears={academicYears}
                classes={classes}
                subjects={subjects}
              />
            )}
            <Button variant="outline" render={<Link href="/students/import" />}>
              <Upload className="size-4 mr-2" /> Import CSV
            </Button>
          </div>
        )}
      </div>


      {/* Filter and Search Bar */}
      <Card>
        <CardContent className="p-4">
          <form method="GET" className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
              <Input
                name="search"
                defaultValue={search}
                placeholder="Search by ID, name..."
                className="pl-9"
              />
            </div>

            <div>
              <select
                name="classId"
                defaultValue={classId}
                className="w-full h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="">All Classes</option>
                {classes.map((cls) => (
                  <option key={cls.id} value={cls.id}>
                    {cls.name} ({cls.gradeLevel})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <select
                name="status"
                defaultValue={statusParam || ""}
                className="w-full h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="">All Statuses</option>
                <option value="ACTIVE">ACTIVE</option>
                <option value="SUSPENDED">SUSPENDED</option>
                <option value="TRANSFERRED">TRANSFERRED</option>
                <option value="WITHDRAWN">WITHDRAWN</option>
                <option value="GRADUATED">GRADUATED</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <Button type="submit" variant="secondary" className="w-full">
                <Filter className="size-3.5 mr-1.5" /> Filter Records
              </Button>
              {(search || classId || statusParam) && (
                <Button variant="ghost" render={<Link href="/students" />}>
                  Reset
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Full Width Student Directory Table */}
      <div className="w-full">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg flex items-center gap-2">
                  <GraduationCap className="size-4 text-primary" /> Enrolled Students ({students.length})
                </CardTitle>
                <CardDescription>
                  Official student roster for current academic sessions.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {students.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground border rounded-lg border-dashed">
                No students found matching your search or filters.
              </div>
            ) : (
              <div className="border rounded-md overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Student ID</TableHead>
                      <TableHead>Full Name</TableHead>
                      <TableHead>Current Class</TableHead>
                      <TableHead>Gender</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Primary Guardian</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {students.map((student) => {
                      const currentEnrollment = student.enrollments[0]
                      const guardian = student.studentGuardians[0]?.guardian

                      return (
                        <TableRow key={student.id} className="hover:bg-muted/20 transition-colors">
                          <TableCell className="font-mono text-xs font-semibold text-primary">
                            {student.studentIdNumber}
                          </TableCell>
                          <TableCell className="font-medium">
                            {student.lastName}, {student.firstName} {student.middleName || ""}
                          </TableCell>
                          <TableCell>
                            {currentEnrollment ? (
                              <Badge variant="secondary" className="font-semibold text-xs">
                                {currentEnrollment.class.name}
                              </Badge>
                            ) : (
                              <span className="text-xs text-muted-foreground italic">Not Enrolled</span>
                            )}
                          </TableCell>
                          <TableCell className="text-xs">{student.gender}</TableCell>
                          <TableCell>
                            <Badge
                              variant={student.status === "ACTIVE" ? "default" : "destructive"}
                              className="text-[10px] uppercase font-bold"
                            >
                              {student.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs">
                            {guardian ? (
                              <div className="flex flex-col">
                                <span className="font-medium">{guardian.name}</span>
                                <span className="text-muted-foreground text-[11px] flex items-center gap-1">
                                  <Phone className="size-3" /> {guardian.phone}
                                </span>
                              </div>
                            ) : (
                              <span className="text-muted-foreground italic text-[11px]">None linked</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <Button
                                variant="outline"
                                size="sm"
                                render={<Link href={`/students/${student.id}`} />}
                              >
                                <Eye className="size-3.5 mr-1" /> View
                              </Button>

                              {canEdit && (
                                <>
                                  <EditStudentDialog student={student} />
                                  <DeleteStudentDialog
                                    studentId={student.id}
                                    studentName={`${student.firstName} ${student.lastName}`}
                                    studentIdNumber={student.studentIdNumber}
                                  />
                                </>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      )
                    })}
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
