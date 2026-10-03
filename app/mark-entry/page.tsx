
import Link from "next/link"
import { redirect } from "next/navigation"
import { getSession } from "@/lib/auth/session"
import { ScopeGuard } from "@/lib/auth/scope-guard"
import { ScoreService } from "@/server/services/ScoreService"
import { AcademicYearService } from "@/server/services/AcademicYearService"
import { TeacherAssignmentService } from "@/server/services/TeacherAssignmentService"
import { ClassService } from "@/server/services/ClassService"
import { SubjectService } from "@/server/services/SubjectService"
import { prisma } from "@/lib/prisma"
import { MarkEntryGrid } from "@/components/mark-entry/mark-entry-grid"
import {
  TableProperties,
  Filter,
  CheckCircle2,
  AlertCircle,
  BookOpen,
  Calendar,
  Layers,
  ArrowRight,
} from "lucide-react"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

export default async function MarkEntryPage({
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

  // Fetch available terms
  const allTerms = await prisma.term.findMany({
    orderBy: [{ academicYear: { startDate: "desc" } }, { termSequence: "asc" }],
    include: { academicYear: true },
  })

  // Scoped class and subject options based on user role
  let availableClasses: Array<{ id: string; name: string; gradeLevel: string }> = []
  let availableSubjects: Array<{ id: string; name: string; code: string }> = []

  if (isAdmin) {
    const [allCls, allSubj] = await Promise.all([
      ClassService.listClasses(),
      SubjectService.listSubjects(),
    ])
    availableClasses = allCls.map((c) => ({ id: c.id, name: c.name, gradeLevel: c.gradeLevel }))
    availableSubjects = allSubj.map((s) => ({ id: s.id, name: s.name, code: s.code }))
  } else {
    // Teacher: strictly load allocations
    const allocations = await TeacherAssignmentService.getTeacherAllocations(
      session.userId,
      selectedTermId || undefined
    )
    const classMap = new Map<string, { id: string; name: string; gradeLevel: string }>()
    const subjMap = new Map<string, { id: string; name: string; code: string }>()

    allocations.forEach((a) => {
      classMap.set(a.class.id, { id: a.class.id, name: a.class.name, gradeLevel: a.class.gradeLevel })
      if (!selectedClassId || a.classId === selectedClassId) {
        subjMap.set(a.subject.id, { id: a.subject.id, name: a.subject.name, code: a.subject.code })
      }
    })

    availableClasses = Array.from(classMap.values())
    availableSubjects = Array.from(subjMap.values())
  }

  // If term, class, and subject are all selected, load the mark sheet
  let markSheetData = null
  if (selectedTermId && selectedClassId && selectedSubjectId) {
    try {
      markSheetData = await ScoreService.getMarkSheet({
        termId: selectedTermId,
        classId: selectedClassId,
        subjectId: selectedSubjectId,
      })
    } catch (err: any) {
      console.error("Failed to load mark sheet:", err)
    }
  }

  return (
    <div className="p-6 md:p-8 flex flex-col gap-6 max-w-7xl mx-auto w-full">
      {/* Header */}
      <div className="flex flex-col gap-1">
        <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary uppercase tracking-wider">
          <TableProperties className="size-3.5" /> High-Interaction Score Recording
        </div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
          Spreadsheet Mark Entry
        </h1>
        <p className="text-muted-foreground text-sm">
          Enter operational assessment marks with full keyboard navigation, spreadsheet copy-paste, real-time dirty cell tracking, and batch saving.
        </p>
      </div>

      {/* Scope Selector Bar */}
      <Card>
        <CardContent className="p-4">
          <form method="GET" className="grid grid-cols-1 sm:grid-cols-4 gap-3">
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
                {availableClasses.map((cls) => (
                  <option key={cls.id} value={cls.id}>
                    {cls.name} ({cls.gradeLevel})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground block mb-1">
                Subject *
              </label>
              <select
                name="subjectId"
                defaultValue={selectedSubjectId}
                className="w-full h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
              >
                <option value="">Select Subject...</option>
                {availableSubjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.code} - {s.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-end gap-2">
              <Button type="submit" variant="secondary" className="w-full h-9">
                <Filter className="size-3.5 mr-1.5" /> Load Sheet
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Spreadsheet Grid or Selection Prompt */}
      {markSheetData ? (
        <MarkEntryGrid
          termId={selectedTermId}
          classId={selectedClassId}
          subjectId={selectedSubjectId}
          termName={markSheetData.term.name}
          className={markSheetData.class.name}
          subjectName={markSheetData.subject.name}
          subjectCode={markSheetData.subject.code}
          canEnterMarks={markSheetData.canEnterMarks}
          assessments={markSheetData.assessments.map((a) => ({
            id: a.id,
            title: a.title,
            maxScore: a.maxScore,
            status: a.status,
            category: {
              name: a.category.name,
              component: {
                name: a.category.component.name,
                code: a.category.component.code,
                weight: a.category.component.weight,
              },
            },
          }))}
          enrollments={markSheetData.enrollments.map((e) => ({
            id: e.id,
            rollNumber: e.rollNumber,
            student: {
              id: e.student.id,
              studentIdNumber: e.student.studentIdNumber,
              firstName: e.student.firstName,
              lastName: e.student.lastName,
              gender: e.student.gender,
            },
          }))}
          initialScores={markSheetData.scores.map((s) => ({
            id: s.id,
            assessmentId: s.assessmentId,
            studentEnrollmentId: s.studentEnrollmentId,
            rawScore: s.rawScore,
            status: s.status,
          }))}
        />
      ) : (
        <Card className="border-dashed">
          <CardContent className="p-12 flex flex-col items-center justify-center text-center gap-3">
            <div className="size-12 rounded-full bg-primary/10 text-primary flex items-center justify-center">
              <TableProperties className="size-6" />
            </div>
            <div>
              <h3 className="font-semibold text-base">Select Session, Class & Subject</h3>
              <p className="text-muted-foreground text-xs max-w-sm mt-1">
                Choose an active academic term, class, and subject above to open the live spreadsheet mark sheet.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
