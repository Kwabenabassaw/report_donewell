"use client"

import React, { useState, useTransition } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  UserPlus,
  Pencil,
  Trash2,
  GraduationCap,
  UserCheck,
  Plus,
  AlertTriangle,
  Phone,
  BookOpen,
  Users,
  CheckSquare,
  Square,
  CheckCircle2,
} from "lucide-react"
import {
  createStudentAction,
  updateStudentBiodataAction,
  deleteStudentAction,
  enrollStudentAction,
  addGuardianAction,
  registerSubjectAction,
  bulkRegisterSubjectsForStudentAction,
  bulkRegisterClassSubjectsAction,
  getEligibleCohortCountAction,
} from "@/app/actions/students"


interface ClassOption {
  id: string
  name: string
  gradeLevel: string
}

interface CurrentYearOption {
  id: string
  name: string
}

// 1. Register Student Dialog
export function RegisterStudentDialog({
  classes,
  currentYear,
}: {
  classes: ClassOption[]
  currentYear?: CurrentYearOption | null
}) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button>
            <UserPlus className="size-4 mr-2" /> Register Student
          </Button>
        }
      />
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="size-5 text-primary" /> Register New Student
          </DialogTitle>
          <DialogDescription>
            Enter student bio-data and optionally enroll in the current academic year.
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="p-3 text-xs bg-destructive/10 text-destructive border border-destructive/20 rounded-md">
            {error}
          </div>
        )}

        <form
          action={async (formData) => {
            try {
              setLoading(true)
              setError(null)
              await createStudentAction(formData)
              setOpen(false)
            } catch (err: unknown) {
              setError(err instanceof Error ? err.message : "Failed to register student.")
            } finally {
              setLoading(false)
            }
          }}
          className="flex flex-col gap-4 mt-2"
        >
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Student ID Number *
            </label>
            <Input
              name="studentIdNumber"
              placeholder="e.g. STU-2026-001"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                First Name *
              </label>
              <Input name="firstName" placeholder="First Name" required />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Last Name *
              </label>
              <Input name="lastName" placeholder="Last Name" required />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Middle Name (Optional)
            </label>
            <Input name="middleName" placeholder="Middle Name" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Gender *
              </label>
              <select
                name="gender"
                required
                className="w-full h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="MALE">Male</option>
                <option value="FEMALE">Female</option>
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Date of Birth
              </label>
              <Input name="dateOfBirth" type="date" />
            </div>
          </div>

          {currentYear && (
            <div className="p-3 bg-muted/40 rounded-lg border flex flex-col gap-2">
              <input type="hidden" name="academicYearId" value={currentYear.id} />
              <label className="text-xs font-semibold uppercase tracking-wider text-primary">
                Initial Class Enrollment ({currentYear.name})
              </label>
              <select
                name="classId"
                className="w-full h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="">Do not enroll yet</option>
                {classes.map((cls) => (
                  <option key={cls.id} value={cls.id}>
                    {cls.name} ({cls.gradeLevel})
                  </option>
                ))}
              </select>
            </div>
          )}

          <DialogFooter className="mt-2">
            <DialogClose render={<Button variant="outline" type="button">Cancel</Button>} />
            <Button type="submit" disabled={loading}>
              {loading ? "Registering..." : "Register Student"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// 2. Edit Student Biodata Dialog
export function EditStudentDialog({
  student,
}: {
  student: {
    id: string
    studentIdNumber: string
    firstName: string
    middleName?: string | null
    lastName: string
    gender: string
    dateOfBirth?: string | Date | null
  }
}) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const dobString = student.dateOfBirth
    ? new Date(student.dateOfBirth).toISOString().split("T")[0]
    : ""

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant="outline" size="sm">
            <Pencil className="size-3 mr-1" /> Edit
          </Button>
        }
      />
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pencil className="size-4 text-primary" /> Edit Student Biodata
          </DialogTitle>
          <DialogDescription>
            Update bio-data for <span className="font-semibold text-foreground font-mono">{student.studentIdNumber}</span>.
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="p-3 text-xs bg-destructive/10 text-destructive border border-destructive/20 rounded-md">
            {error}
          </div>
        )}

        <form
          action={async (formData) => {
            try {
              setLoading(true)
              setError(null)
              await updateStudentBiodataAction(student.id, formData)
              setOpen(false)
            } catch (err: unknown) {
              setError(err instanceof Error ? err.message : "Failed to update student.")
            } finally {
              setLoading(false)
            }
          }}
          className="flex flex-col gap-4 mt-2"
        >
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                First Name *
              </label>
              <Input name="firstName" defaultValue={student.firstName} required />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Last Name *
              </label>
              <Input name="lastName" defaultValue={student.lastName} required />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Middle Name (Optional)
            </label>
            <Input name="middleName" defaultValue={student.middleName || ""} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Gender *
              </label>
              <select
                name="gender"
                defaultValue={student.gender}
                required
                className="w-full h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
              >
                <option value="MALE">Male</option>
                <option value="FEMALE">Female</option>
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Date of Birth
              </label>
              <Input name="dateOfBirth" type="date" defaultValue={dobString} />
            </div>
          </div>

          <DialogFooter className="mt-2">
            <DialogClose render={<Button variant="outline" type="button">Cancel</Button>} />
            <Button type="submit" disabled={loading}>
              {loading ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// 3. Enroll Student Dialog
export function EnrollStudentDialog({
  studentId,
  studentName,
  currentYear,
  classes,
}: {
  studentId: string
  studentName: string
  currentYear: CurrentYearOption
  classes: ClassOption[]
}) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button size="sm">
            <UserCheck className="size-3.5 mr-1.5" /> Enroll in Class
          </Button>
        }
      />
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <GraduationCap className="size-5 text-primary" /> Session Placement
          </DialogTitle>
          <DialogDescription>
            Enroll <span className="font-semibold text-foreground">{studentName}</span> in{" "}
            <span className="font-semibold text-primary">{currentYear.name}</span>.
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="p-3 text-xs bg-destructive/10 text-destructive border border-destructive/20 rounded-md">
            {error}
          </div>
        )}

        <form
          action={async (formData) => {
            try {
              setLoading(true)
              setError(null)
              await enrollStudentAction(formData)
              setOpen(false)
            } catch (err: unknown) {
              setError(err instanceof Error ? err.message : "Failed to enroll student.")
            } finally {
              setLoading(false)
            }
          }}
          className="flex flex-col gap-4 mt-2"
        >
          <input type="hidden" name="studentId" value={studentId} />
          <input type="hidden" name="academicYearId" value={currentYear.id} />

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Target Class *
            </label>
            <select
              name="classId"
              required
              className="w-full h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
            >
              <option value="">Select class level...</option>
              {classes.map((cls) => (
                <option key={cls.id} value={cls.id}>
                  {cls.name} ({cls.gradeLevel})
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Roll / Index Number (Optional)
            </label>
            <Input name="rollNumber" placeholder="e.g. 14" />
          </div>

          <DialogFooter className="mt-2">
            <DialogClose render={<Button variant="outline" type="button">Cancel</Button>} />
            <Button type="submit" disabled={loading}>
              {loading ? "Enrolling..." : "Confirm Enrollment"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// 4. Add Guardian Dialog
export function AddGuardianDialog({
  studentId,
  studentName,
}: {
  studentId: string
  studentName: string
}) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant="outline" size="sm">
            <Plus className="size-3.5 mr-1" /> Add Guardian
          </Button>
        }
      />
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Phone className="size-4 text-primary" /> Link Guardian Contact
          </DialogTitle>
          <DialogDescription>
            Add parent or guardian details for <span className="font-semibold text-foreground">{studentName}</span>.
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="p-3 text-xs bg-destructive/10 text-destructive border border-destructive/20 rounded-md">
            {error}
          </div>
        )}

        <form
          action={async (formData) => {
            try {
              setLoading(true)
              setError(null)
              await addGuardianAction(formData)
              setOpen(false)
            } catch (err: unknown) {
              setError(err instanceof Error ? err.message : "Failed to add guardian.")
            } finally {
              setLoading(false)
            }
          }}
          className="flex flex-col gap-4 mt-2"
        >
          <input type="hidden" name="studentId" value={studentId} />

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Guardian Full Name *
            </label>
            <Input name="name" placeholder="e.g. John Doe" required />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Phone Number *
              </label>
              <Input name="phone" placeholder="e.g. +233241234567" required />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Relationship *
              </label>
              <select
                name="relationship"
                required
                className="w-full h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
              >
                <option value="FATHER">Father</option>
                <option value="MOTHER">Mother</option>
                <option value="GUARDIAN">Legal Guardian</option>
                <option value="OTHER">Other</option>
              </select>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Email Address (Optional)
            </label>
            <Input name="email" type="email" placeholder="e.g. parent@example.com" />
          </div>

          <div className="flex items-center gap-2 p-2 rounded bg-muted/40 border">
            <input
              type="checkbox"
              id="isPrimary"
              name="isPrimary"
              value="true"
              defaultChecked
              className="size-4 rounded border-input"
            />
            <label htmlFor="isPrimary" className="text-xs font-medium cursor-pointer">
              Set as Primary Guardian (Receives official SMS and reports)
            </label>
          </div>

          <DialogFooter className="mt-2">
            <DialogClose render={<Button variant="outline" type="button">Cancel</Button>} />
            <Button type="submit" disabled={loading}>
              {loading ? "Linking..." : "Link Guardian"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// 5. Register Elective Dialog (upgraded to multi-subject checkbox selection)
export function RegisterElectiveDialog({
  enrollmentId,
  availableSubjects,
}: {
  enrollmentId: string
  availableSubjects: Array<{ id: string; code: string; name: string; isElective: boolean }>
}) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  const allSelected = availableSubjects.length > 0 && selectedIds.size === availableSubjects.length

  function toggleAll() {
    if (allSelected) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(availableSubjects.map((s) => s.id)))
    }
  }

  function toggleOne(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  function handleClose(isOpen: boolean) {
    if (!isOpen) {
      setSelectedIds(new Set())
      setError(null)
    }
    setOpen(isOpen)
  }

  const selectedCount = selectedIds.size
  const submitLabel = loading
    ? "Adding..."
    : selectedCount === 0
    ? "Add Subjects"
    : selectedCount === 1
    ? "Add 1 Subject"
    : `Add ${selectedCount} Subjects`

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogTrigger
        render={
          <Button variant="outline" size="sm">
            <Plus className="size-3 mr-1" /> Add Subjects
          </Button>
        }
      />
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BookOpen className="size-4 text-primary" /> Add Subjects
          </DialogTitle>
          <DialogDescription>
            Select one or more subjects to add to this student&apos;s registered curriculum.
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="p-3 text-xs bg-destructive/10 text-destructive border border-destructive/20 rounded-md">
            {error}
          </div>
        )}

        {availableSubjects.length === 0 ? (
          <div className="p-4 text-center text-sm text-muted-foreground border rounded-md border-dashed">
            All available subjects are already registered for this student.
          </div>
        ) : (
          <>
            {/* Select all toggle */}
            <button
              type="button"
              onClick={toggleAll}
              className="flex items-center gap-2 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors w-fit"
            >
              {allSelected ? (
                <CheckSquare className="size-4 text-primary" />
              ) : (
                <Square className="size-4" />
              )}
              {allSelected ? "Deselect All" : "Select All"}
            </button>

            {/* Subject checkbox list */}
            <div className="flex flex-col gap-1 max-h-60 overflow-y-auto border rounded-md p-2">
              {availableSubjects.map((s) => {
                const checked = selectedIds.has(s.id)
                return (
                  <label
                    key={s.id}
                    className="flex items-center gap-3 px-2 py-2 rounded-md cursor-pointer hover:bg-muted/40 transition-colors"
                  >
                    <input
                      type="checkbox"
                      className="size-4 rounded border-input accent-primary"
                      checked={checked}
                      onChange={() => toggleOne(s.id)}
                    />
                    <span className="flex-1 text-sm font-medium">
                      <span className="font-mono text-xs text-primary mr-2">{s.code}</span>
                      {s.name}
                    </span>
                    <span
                      className={`text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded ${
                        s.isElective
                          ? "bg-secondary text-secondary-foreground"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {s.isElective ? "Elective" : "Core"}
                    </span>
                  </label>
                )
              })}
            </div>
          </>
        )}

        <DialogFooter className="mt-2">
          <DialogClose render={<Button variant="outline" type="button">Cancel</Button>} />
          <Button
            disabled={loading || selectedCount === 0}
            onClick={async () => {
              try {
                setLoading(true)
                setError(null)
                await bulkRegisterSubjectsForStudentAction(enrollmentId, Array.from(selectedIds))
                setOpen(false)
              } catch (err: unknown) {
                setError(err instanceof Error ? err.message : "Failed to register subjects.")
              } finally {
                setLoading(false)
              }
            }}
          >
            {submitLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// 5b. Bulk Subject Enrollment Dialog (class-wide, admin only)
interface SubjectOption {
  id: string
  code: string
  name: string
  isElective: boolean
}
interface AcademicYearOption {
  id: string
  name: string
  isCurrent: boolean
}

type BulkStep = 1 | 2 | 3 | 4

interface BulkResult {
  totalStudents: number
  totalCreated: number
}

export function BulkSubjectEnrollmentDialog({
  academicYears,
  classes,
  subjects,
}: {
  academicYears: AcademicYearOption[]
  classes: ClassOption[]
  subjects: SubjectOption[]
}) {
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState<BulkStep>(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<BulkResult | null>(null)

  const defaultYear = academicYears.find((y) => y.isCurrent) ?? academicYears[0]
  const [selectedYearId, setSelectedYearId] = useState(defaultYear?.id ?? "")
  const [selectedClassId, setSelectedClassId] = useState("")
  const [cohortCount, setCohortCount] = useState<number | null>(null)
  const [loadingCohort, setLoadingCohort] = useState(false)
  const [selectedSubjectIds, setSelectedSubjectIds] = useState<Set<string>>(new Set())
  const [, startTransition] = useTransition()

  const allSubjectsSelected =
    subjects.length > 0 && selectedSubjectIds.size === subjects.length
  const coreCount = subjects.filter((s) => !s.isElective).length
  const allCoreSelected =
    coreCount > 0 &&
    subjects.filter((s) => !s.isElective).every((s) => selectedSubjectIds.has(s.id))

  function reset() {
    setStep(1)
    setError(null)
    setResult(null)
    setSelectedClassId("")
    setCohortCount(null)
    setSelectedSubjectIds(new Set())
  }

  function handleClose(isOpen: boolean) {
    if (!isOpen) reset()
    setOpen(isOpen)
  }

  async function handleClassChange(classId: string) {
    setSelectedClassId(classId)
    setCohortCount(null)
    if (!classId || !selectedYearId) return
    setLoadingCohort(true)
    startTransition(async () => {
      try {
        const count = await getEligibleCohortCountAction(selectedYearId, classId)
        setCohortCount(count)
      } catch {
        setCohortCount(null)
      } finally {
        setLoadingCohort(false)
      }
    })
  }

  function toggleSubject(id: string) {
    setSelectedSubjectIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function selectAllSubjects() {
    setSelectedSubjectIds(new Set(subjects.map((s) => s.id)))
  }

  function selectCoreSubjects() {
    setSelectedSubjectIds(new Set(subjects.filter((s) => !s.isElective).map((s) => s.id)))
  }

  function deselectAllSubjects() {
    setSelectedSubjectIds(new Set())
  }

  async function handleEnroll() {
    try {
      setLoading(true)
      setError(null)
      const res = await bulkRegisterClassSubjectsAction(
        selectedYearId,
        selectedClassId,
        Array.from(selectedSubjectIds)
      )
      setResult(res)
      setStep(4)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Bulk enrollment failed.")
    } finally {
      setLoading(false)
    }
  }

  const selectedClassName = classes.find((c) => c.id === selectedClassId)?.name ?? ""
  const selectedYearName = academicYears.find((y) => y.id === selectedYearId)?.name ?? ""

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogTrigger
        render={
          <Button variant="outline">
            <Users className="size-4 mr-2" /> Bulk Subject Enroll
          </Button>
        }
      />
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="size-5 text-primary" /> Bulk Subject Enrollment
          </DialogTitle>
          <DialogDescription>
            Enroll all active students in a class into multiple subjects at once.
            Existing registrations are automatically skipped.
          </DialogDescription>
        </DialogHeader>

        {/* Step indicator */}
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          {([1, 2, 3] as const).map((n) => (
            <React.Fragment key={n}>
              <span
                className={`font-semibold ${
                  step >= n ? "text-primary" : "text-muted-foreground/50"
                }`}
              >
                {n === 1 ? "Select Class" : n === 2 ? "Select Subjects" : "Confirm"}
              </span>
              {n < 3 && <span className="mx-1">›</span>}
            </React.Fragment>
          ))}
        </div>

        {error && (
          <div className="p-3 text-xs bg-destructive/10 text-destructive border border-destructive/20 rounded-md">
            {error}
          </div>
        )}

        {/* Step 1: Academic Year + Class */}
        {step === 1 && (
          <div className="flex flex-col gap-4 mt-1">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Academic Year
              </label>
              <select
                value={selectedYearId}
                onChange={(e) => {
                  setSelectedYearId(e.target.value)
                  setCohortCount(null)
                  if (selectedClassId) handleClassChange(selectedClassId)
                }}
                className="w-full h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
              >
                {academicYears.map((y) => (
                  <option key={y.id} value={y.id}>
                    {y.name} {y.isCurrent ? "(Current)" : ""}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Target Class *
              </label>
              <select
                value={selectedClassId}
                onChange={(e) => handleClassChange(e.target.value)}
                className="w-full h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
              >
                <option value="">Select a class...</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.gradeLevel})
                  </option>
                ))}
              </select>
              {selectedClassId && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  {loadingCohort
                    ? "Checking cohort size..."
                    : cohortCount !== null
                    ? `${cohortCount} active student${cohortCount !== 1 ? "s" : ""} eligible in this class`
                    : ""}
                </p>
              )}
            </div>

            <DialogFooter>
              <DialogClose render={<Button variant="outline" type="button">Cancel</Button>} />
              <Button
                disabled={!selectedClassId || !selectedYearId || cohortCount === 0}
                onClick={() => setStep(2)}
              >
                Next →
              </Button>
            </DialogFooter>
          </div>
        )}

        {/* Step 2: Subject selection */}
        {step === 2 && (
          <div className="flex flex-col gap-4 mt-1">
            <div className="p-3 rounded-lg bg-muted/40 border text-sm">
              Enrolling subjects for{" "}
              <strong className="text-primary">{selectedClassName}</strong> in{" "}
              <strong>{selectedYearName}</strong>
              {cohortCount !== null && (
                <span className="text-muted-foreground ml-1">({cohortCount} students)</span>
              )}
            </div>

            {/* Quick select shortcuts */}
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={allSubjectsSelected ? deselectAllSubjects : selectAllSubjects}
                className="flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
              >
                {allSubjectsSelected ? (
                  <CheckSquare className="size-3.5 text-primary" />
                ) : (
                  <Square className="size-3.5" />
                )}
                All Subjects
              </button>
              <span className="text-muted-foreground/30">|</span>
              <button
                type="button"
                onClick={allCoreSelected ? deselectAllSubjects : selectCoreSubjects}
                className="flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
              >
                {allCoreSelected ? (
                  <CheckSquare className="size-3.5 text-primary" />
                ) : (
                  <Square className="size-3.5" />
                )}
                Core Only
              </button>
              {selectedSubjectIds.size > 0 && (
                <span className="ml-auto text-xs font-semibold text-primary">
                  {selectedSubjectIds.size} selected
                </span>
              )}
            </div>

            <div className="flex flex-col gap-1 max-h-64 overflow-y-auto border rounded-md p-2">
              {subjects.map((s) => {
                const checked = selectedSubjectIds.has(s.id)
                return (
                  <label
                    key={s.id}
                    className="flex items-center gap-3 px-2 py-2 rounded-md cursor-pointer hover:bg-muted/40 transition-colors"
                  >
                    <input
                      type="checkbox"
                      className="size-4 rounded border-input accent-primary"
                      checked={checked}
                      onChange={() => toggleSubject(s.id)}
                    />
                    <span className="flex-1 text-sm font-medium">
                      <span className="font-mono text-xs text-primary mr-2">{s.code}</span>
                      {s.name}
                    </span>
                    <span
                      className={`text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded ${
                        s.isElective
                          ? "bg-secondary text-secondary-foreground"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {s.isElective ? "Elective" : "Core"}
                    </span>
                  </label>
                )
              })}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => { setStep(1); setError(null) }}>
                ← Back
              </Button>
              <Button
                disabled={selectedSubjectIds.size === 0}
                onClick={() => setStep(3)}
              >
                Preview →
              </Button>
            </DialogFooter>
          </div>
        )}

        {/* Step 3: Confirm */}
        {step === 3 && (
          <div className="flex flex-col gap-4 mt-1">
            <div className="p-4 rounded-lg border bg-muted/30 flex flex-col gap-2 text-sm">
              <p className="font-semibold text-foreground">You are about to enroll:</p>
              <ul className="list-disc pl-5 text-muted-foreground flex flex-col gap-1">
                <li>
                  <strong className="text-foreground">{cohortCount ?? "?"} active students</strong>{" "}
                  in <strong className="text-primary">{selectedClassName}</strong>
                </li>
                <li>
                  into{" "}
                  <strong className="text-foreground">{selectedSubjectIds.size} selected subject{selectedSubjectIds.size !== 1 ? "s" : ""}</strong>
                </li>
                <li>
                  Up to{" "}
                  <strong className="text-foreground">
                    {(cohortCount ?? 0) * selectedSubjectIds.size} registrations
                  </strong>{" "}
                  will be processed
                </li>
              </ul>
            </div>

            <div className="p-3 rounded-md bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 text-xs text-blue-700 dark:text-blue-300">
              Existing registrations will be automatically skipped — no duplicates will be created.
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => { setStep(2); setError(null) }}
                disabled={loading}
              >
                ← Back
              </Button>
              <Button onClick={handleEnroll} disabled={loading}>
                {loading ? "Enrolling..." : "Enroll Now"}
              </Button>
            </DialogFooter>
          </div>
        )}

        {/* Step 4: Result */}
        {step === 4 && result && (
          <div className="flex flex-col gap-4 mt-1">
            <div className="p-4 rounded-lg border bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900 flex flex-col gap-3">
              <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-300 font-semibold">
                <CheckCircle2 className="size-5" /> Bulk Enrollment Complete
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="flex flex-col">
                  <span className="text-xs text-muted-foreground font-medium">Students processed</span>
                  <span className="text-xl font-bold text-foreground">{result.totalStudents}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-xs text-muted-foreground font-medium">New registrations</span>
                  <span className="text-xl font-bold text-primary">{result.totalCreated}</span>
                </div>
                <div className="flex flex-col col-span-2">
                  <span className="text-xs text-muted-foreground font-medium">Already registered (skipped)</span>
                  <span className="text-lg font-semibold text-muted-foreground">
                    {result.totalStudents * selectedSubjectIds.size - result.totalCreated}
                  </span>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button onClick={() => setOpen(false)}>Done</Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

// 6. Delete Student Dialog
export function DeleteStudentDialog({
  studentId,
  studentName,
  studentIdNumber,
}: {
  studentId: string
  studentName: string
  studentIdNumber: string
}) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant="ghost" size="sm" className="text-destructive hover:bg-destructive/10">
            <Trash2 className="size-3 mr-1" /> Delete
          </Button>
        }
      />
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="size-5" /> Delete Student Record
          </DialogTitle>
          <DialogDescription>
            Are you sure you want to permanently delete{" "}
            <span className="font-semibold text-foreground">{studentName}</span> ({studentIdNumber})?
            This will remove bio-data, guardian links, and class enrollments. Students with official published results cannot be deleted.
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="p-3 text-xs bg-destructive/10 text-destructive border border-destructive/20 rounded-md">
            {error}
          </div>
        )}

        <DialogFooter className="mt-4">
          <DialogClose render={<Button variant="outline" type="button">Cancel</Button>} />
          <Button
            variant="destructive"
            disabled={loading}
            onClick={async () => {
              try {
                setLoading(true)
                setError(null)
                await deleteStudentAction(studentId)
                setOpen(false)
              } catch (err: unknown) {
                setError(err instanceof Error ? err.message : "Failed to delete student.")
              } finally {
                setLoading(false)
              }
            }}
          >
            {loading ? "Deleting..." : "Permanently Delete"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
