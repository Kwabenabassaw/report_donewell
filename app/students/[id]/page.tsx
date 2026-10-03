import React from "react"
import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import { getSession } from "@/lib/auth/session"
import { ScopeGuard } from "@/lib/auth/scope-guard"
import { StudentService } from "@/server/services/StudentService"
import { AcademicYearService } from "@/server/services/AcademicYearService"
import { ClassService } from "@/server/services/ClassService"
import { SubjectService } from "@/server/services/SubjectService"
import { StudentStatus } from "@prisma/client"
import {
  ArrowLeft,
  Calendar,
  Layers,
  BookOpen,
  Phone,
  Mail,
  UserCheck,
  Trash2,
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
  unregisterSubjectAction,
  updateStudentStatusAction,
} from "@/app/actions/students"
import {
  EditStudentDialog,
  EnrollStudentDialog,
  AddGuardianDialog,
  RegisterElectiveDialog,
} from "@/components/students/student-dialogs"

export default async function StudentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await getSession()
  if (!session) {
    redirect("/login")
  }

  const { id } = await params
  const student = await StudentService.getStudentById(id)
  if (!student) {
    notFound()
  }

  const [classes, subjects, currentYear] = await Promise.all([
    ClassService.listClasses(),
    SubjectService.listSubjects(),
    AcademicYearService.getCurrentAcademicYear(),
  ])

  const canEdit =
    ScopeGuard.isAdministrative({
      userId: session.userId,
      roles: session.roles,
    }) || session.roles.includes("CLASS_TEACHER")

  const currentEnrollment = student.enrollments.find((e) => e.academicYear.isCurrent)

  return (
    <div className="p-6 md:p-8 flex flex-col gap-8 max-w-7xl mx-auto w-full">
      {/* Back button & Title */}
      <div className="flex flex-col gap-2">
        <Link
          href="/students"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors w-fit"
        >
          <ArrowLeft className="size-3.5" /> Back to Student Directory
        </Link>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="size-16 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-2xl border border-primary/20">
              {student.firstName[0]}
              {student.lastName[0]}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
                  {student.firstName} {student.middleName || ""} {student.lastName}
                </h1>
                <Badge
                  variant={student.status === "ACTIVE" ? "default" : "destructive"}
                  className="text-xs uppercase font-bold"
                >
                  {student.status}
                </Badge>
              </div>
              <p className="text-muted-foreground text-sm font-mono mt-0.5">
                ID: {student.studentIdNumber} • Gender: {student.gender} • DOB:{" "}
                {student.dateOfBirth ? new Date(student.dateOfBirth).toLocaleDateString() : "Not specified"}
              </p>
            </div>
          </div>

          {canEdit && (
            <div className="flex items-center gap-3">
              <EditStudentDialog student={student} />

              <form
                action={async (formData) => {
                  "use server"
                  const newStatus = formData.get("status") as StudentStatus
                  if (newStatus) {
                    await updateStudentStatusAction(student.id, newStatus)
                  }
                }}
                className="flex items-center gap-2"
              >
                <select
                  name="status"
                  defaultValue={student.status}
                  className="h-9 rounded-md border border-input bg-transparent px-3 py-1 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="SUSPENDED">SUSPENDED</option>
                  <option value="TRANSFERRED">TRANSFERRED</option>
                  <option value="WITHDRAWN">WITHDRAWN</option>
                  <option value="GRADUATED">GRADUATED</option>
                </select>
                <Button size="sm" variant="outline" type="submit">
                  Update Status
                </Button>
              </form>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Academic Enrollments & Enrolled Subjects */}
        <div className="lg:col-span-2 flex flex-col gap-8">
          {/* Current Academic Session Status */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Layers className="size-4 text-primary" /> Active Session Placement
                  </CardTitle>
                  <CardDescription>
                    Current academic year placement and class allocation.
                  </CardDescription>
                </div>
                {canEdit && !currentEnrollment && currentYear && (
                  <EnrollStudentDialog
                    studentId={student.id}
                    studentName={`${student.firstName} ${student.lastName}`}
                    currentYear={currentYear}
                    classes={classes}
                  />
                )}
              </div>
            </CardHeader>
            <CardContent>
              {currentEnrollment ? (
                <div className="flex flex-col gap-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 rounded-lg bg-muted/40 border">
                    <div>
                      <span className="text-xs text-muted-foreground block font-medium">Academic Year</span>
                      <span className="font-semibold text-sm">{currentEnrollment.academicYear.name}</span>
                    </div>
                    <div>
                      <span className="text-xs text-muted-foreground block font-medium">Class Level</span>
                      <span className="font-semibold text-sm text-primary">
                        {currentEnrollment.class.name} ({currentEnrollment.class.gradeLevel})
                      </span>
                    </div>
                    <div>
                      <span className="text-xs text-muted-foreground block font-medium">Roll Number</span>
                      <span className="font-mono text-sm">{currentEnrollment.rollNumber || "Not Assigned"}</span>
                    </div>
                  </div>

                  {/* Registered Subjects Table */}
                  <div className="flex flex-col gap-3 mt-2">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-semibold flex items-center gap-1.5">
                        <BookOpen className="size-3.5 text-primary" /> Registered Subjects (
                        {currentEnrollment.subjectRegistrations.length})
                      </h4>
                      {canEdit && (
                        <RegisterElectiveDialog
                          enrollmentId={currentEnrollment.id}
                          availableSubjects={subjects.filter(
                            (s) =>
                              !currentEnrollment.subjectRegistrations.some(
                                (r) => r.subjectId === s.id
                              )
                          )}
                        />
                      )}
                    </div>

                    <div className="border rounded-md overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Code</TableHead>
                            <TableHead>Subject Name</TableHead>
                            <TableHead>Classification</TableHead>
                            {canEdit && <TableHead className="text-right">Actions</TableHead>}
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {currentEnrollment.subjectRegistrations.map((reg) => (
                            <TableRow key={reg.id}>
                              <TableCell className="font-mono text-xs font-semibold">
                                {reg.subject.code}
                              </TableCell>
                              <TableCell className="font-medium text-xs">
                                {reg.subject.name}
                              </TableCell>
                              <TableCell>
                                <Badge
                                  variant={reg.subject.isElective ? "secondary" : "outline"}
                                  className="text-[10px]"
                                >
                                  {reg.subject.isElective ? "Elective" : "Core"}
                                </Badge>
                              </TableCell>
                              {canEdit && (
                                <TableCell className="text-right">
                                  {reg.subject.isElective && (
                                    <form
                                      action={async () => {
                                        "use server"
                                        await unregisterSubjectAction(currentEnrollment.id, reg.subjectId)
                                      }}
                                    >
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        type="submit"
                                        className="text-destructive hover:bg-destructive/10 h-7 px-2 text-xs"
                                      >
                                        <Trash2 className="size-3 mr-1" /> Drop
                                      </Button>
                                    </form>
                                  )}
                                </TableCell>
                              )}
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-6 text-center text-muted-foreground border rounded-lg border-dashed flex flex-col items-center gap-3">
                  <p className="text-sm">
                    Student is not currently enrolled in the active academic year ({currentYear?.name || "None active"}).
                  </p>
                  {canEdit && currentYear && (
                    <EnrollStudentDialog
                      studentId={student.id}
                      studentName={`${student.firstName} ${student.lastName}`}
                      currentYear={currentYear}
                      classes={classes}
                    />
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Academic History Timeline */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Calendar className="size-4 text-primary" /> Enrollment History ({student.enrollments.length})
              </CardTitle>
              <CardDescription>
                Chronological record of grade levels, classes, and official terminal reports.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="border rounded-md overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Academic Year</TableHead>
                      <TableHead>Class</TableHead>
                      <TableHead>Roll No.</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Official Reports</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {student.enrollments.map((enrollment) => (
                      <TableRow key={enrollment.id}>
                        <TableCell className="font-semibold text-xs">
                          {enrollment.academicYear.name}
                          {enrollment.academicYear.isCurrent && (
                            <Badge variant="secondary" className="ml-2 text-[10px]">
                              Current
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-xs font-medium">
                          {enrollment.class.name} ({enrollment.class.gradeLevel})
                        </TableCell>
                        <TableCell className="font-mono text-xs">
                          {enrollment.rollNumber || "—"}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-[10px]">
                            {enrollment.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs">
                          {enrollment.termResults.length > 0 ? (
                            <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                              {enrollment.termResults.length} Reports Archived
                            </span>
                          ) : (
                            <span className="text-muted-foreground italic">None generated</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Guardians & Contacts */}
        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <UserCheck className="size-4 text-primary" /> Guardians
                  </CardTitle>
                  <CardDescription>
                    Contacts for SMS & reports.
                  </CardDescription>
                </div>
                {canEdit && (
                  <AddGuardianDialog
                    studentId={student.id}
                    studentName={`${student.firstName} ${student.lastName}`}
                  />
                )}
              </div>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              {student.studentGuardians.length === 0 ? (
                <div className="p-4 text-center text-xs text-muted-foreground border rounded-md border-dashed">
                  No guardian linked yet. Click above to add a contact.
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {student.studentGuardians.map((link) => (
                    <div
                      key={`${link.studentId}-${link.guardianId}`}
                      className="p-3 border rounded-lg bg-card flex flex-col gap-1.5 shadow-sm"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-sm">{link.guardian.name}</span>
                        {link.isPrimary ? (
                          <Badge variant="default" className="text-[10px]">
                            Primary Contact
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-[10px]">
                            Secondary
                          </Badge>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground">
                        Relationship: <strong className="text-foreground">{link.guardian.relationship}</strong>
                      </span>
                      <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground mt-1">
                        <Phone className="size-3 text-primary" /> {link.guardian.phone}
                      </div>
                      {link.guardian.email && (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Mail className="size-3 text-primary" /> {link.guardian.email}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
