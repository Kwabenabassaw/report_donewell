import React from "react"
import Link from "next/link"
import { redirect } from "next/navigation"
import { getSession } from "@/lib/auth/session"
import { ScopeGuard } from "@/lib/auth/scope-guard"
import { EvaluationService } from "@/server/services/EvaluationService"
import { AcademicYearService } from "@/server/services/AcademicYearService"
import { ClassService } from "@/server/services/ClassService"
import { prisma } from "@/lib/prisma"
import {
  UserCheck,
  Save,
  Filter,
  CheckCircle2,
  Calendar,
  Layers,
  Award,
  MessageSquare,
} from "lucide-react"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { saveEvaluationAction } from "@/app/actions/moderation"

export default async function EvaluationsPage({
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

  let evaluations = null
  if (selectedTermId && selectedClassId) {
    try {
      evaluations = await EvaluationService.listClassEvaluations(selectedTermId, selectedClassId)
    } catch (err: any) {
      console.error("Failed to load evaluations:", err)
    }
  }

  return (
    <div className="p-6 md:p-8 flex flex-col gap-8 max-w-7xl mx-auto w-full">
      {/* Header */}
      <div className="flex flex-col gap-1">
        <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary uppercase tracking-wider">
          <UserCheck className="size-3.5" /> Class Teacher Supervision
        </div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
          Form Teacher Evaluations & Remarks
        </h1>
        <p className="text-muted-foreground text-sm">
          Record student conduct ratings, attitude, interest, attendance statistics, and personalized terminal remarks for report card printing.
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
                    {t.academicYear.name} — {t.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground block mb-1">
                Class Cohort *
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
                <Filter className="size-3.5 mr-1.5" /> Load Students
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Evaluations Roster */}
      {evaluations ? (
        <div className="flex flex-col gap-6">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-lg flex items-center gap-2">
              <UsersIcon className="size-4 text-primary" /> Enrolled Students ({evaluations.length})
            </h3>
            <span className="text-xs text-muted-foreground">
              Save each student's evaluation individually or update as needed.
            </span>
          </div>

          <div className="grid grid-cols-1 gap-6">
            {evaluations.map((item, idx) => (
              <Card key={item.enrollmentId} className="border shadow-sm">
                <CardHeader className="bg-muted/20 pb-3 border-b">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-xs font-bold text-muted-foreground">
                        #{idx + 1}
                      </span>
                      <div>
                        <CardTitle className="text-base font-semibold">
                          {item.studentName}
                        </CardTitle>
                        <CardDescription className="font-mono text-xs mt-0.5">
                          ID: {item.studentIdNumber} {item.rollNumber ? `• Roll No: ${item.rollNumber}` : ""}
                        </CardDescription>
                      </div>
                    </div>

                    {item.evaluation?.classTeacherRemarks ? (
                      <Badge variant="default" className="text-xs bg-emerald-600 dark:bg-emerald-700">
                        <CheckCircle2 className="size-3 mr-1" /> Evaluated
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-xs text-amber-600 border-amber-500/30">
                        Pending Remarks
                      </Badge>
                    )}
                  </div>
                </CardHeader>

                <CardContent className="p-4">
                  <form action={saveEvaluationAction} className="flex flex-col gap-4">
                    <input type="hidden" name="studentEnrollmentId" value={item.enrollmentId} />
                    <input type="hidden" name="termId" value={selectedTermId} />

                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                      <div>
                        <label className="text-[11px] font-semibold text-muted-foreground uppercase block mb-1">
                          Conduct Rating
                        </label>
                        <select
                          name="conductRating"
                          defaultValue={item.evaluation?.conductRating || "Good"}
                          className="w-full h-8 rounded-md border border-input bg-transparent px-2 text-xs shadow-sm"
                        >
                          <option value="Excellent">Excellent</option>
                          <option value="Very Good">Very Good</option>
                          <option value="Good">Good</option>
                          <option value="Satisfactory">Satisfactory</option>
                          <option value="Needs Improvement">Needs Improvement</option>
                        </select>
                      </div>

                      <div>
                        <label className="text-[11px] font-semibold text-muted-foreground uppercase block mb-1">
                          Attitude Rating
                        </label>
                        <select
                          name="attitudeRating"
                          defaultValue={item.evaluation?.attitudeRating || "Hardworking"}
                          className="w-full h-8 rounded-md border border-input bg-transparent px-2 text-xs shadow-sm"
                        >
                          <option value="Outstanding">Outstanding</option>
                          <option value="Hardworking">Hardworking</option>
                          <option value="Attentive">Attentive</option>
                          <option value="Average">Average</option>
                          <option value="Inconsistent">Inconsistent</option>
                        </select>
                      </div>

                      <div>
                        <label className="text-[11px] font-semibold text-muted-foreground uppercase block mb-1">
                          Interest / Co-curricular
                        </label>
                        <select
                          name="interestRating"
                          defaultValue={item.evaluation?.interestRating || "Sports"}
                          className="w-full h-8 rounded-md border border-input bg-transparent px-2 text-xs shadow-sm"
                        >
                          <option value="Sports">Sports & Athletics</option>
                          <option value="Arts">Creative Arts</option>
                          <option value="Music">Music & Drama</option>
                          <option value="Reading">Reading & Literature</option>
                          <option value="ICT">Science & ICT</option>
                        </select>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[11px] font-semibold text-muted-foreground uppercase block mb-1">
                            Days Present
                          </label>
                          <Input
                            name="daysPresent"
                            type="number"
                            defaultValue={item.evaluation?.daysPresent ?? 58}
                            className="h-8 text-xs"
                          />
                        </div>
                        <div>
                          <label className="text-[11px] font-semibold text-muted-foreground uppercase block mb-1">
                            Days Absent
                          </label>
                          <Input
                            name="daysAbsent"
                            type="number"
                            defaultValue={item.evaluation?.daysAbsent ?? 2}
                            className="h-8 text-xs"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-[11px] font-semibold text-muted-foreground uppercase block">
                        Class Teacher's General Remarks *
                      </label>
                      <Input
                        name="classTeacherRemarks"
                        placeholder="e.g. A very disciplined and focused student who shows great promise in Mathematics and Science."
                        defaultValue={item.evaluation?.classTeacherRemarks || ""}
                        required
                        className="h-9 text-xs"
                      />
                    </div>

                    <div className="flex justify-end">
                      <Button type="submit" size="sm" className="h-8 text-xs font-semibold">
                        <Save className="size-3 mr-1" /> Save Evaluation
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      ) : (
        <Card className="border-dashed">
          <CardContent className="p-12 flex flex-col items-center justify-center text-center gap-3">
            <div className="size-12 rounded-full bg-primary/10 text-primary flex items-center justify-center">
              <UserCheck className="size-6" />
            </div>
            <div>
              <h3 className="font-semibold text-base">Select Session & Class</h3>
              <p className="text-muted-foreground text-xs max-w-sm mt-1">
                Choose an academic term and class cohort above to record Form Teacher conduct, attitude, and remarks evaluations.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function UsersIcon(props: React.ComponentProps<"svg">) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  )
}
