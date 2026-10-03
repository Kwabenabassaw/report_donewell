"use client"

import React, { useState } from "react"
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
import {
  UserCheck,
  Plus,
  Pencil,
  Trash2,
  AlertTriangle,
} from "lucide-react"
import {
  assignTeacherAction,
  unassignTeacherAction,
  reassignTeacherAction,
} from "@/app/actions/allocations"

interface TermOption {
  id: string
  name: string
  status: string
  academicYear: { name: string }
}

interface ClassOption {
  id: string
  name: string
  gradeLevel: string
}

interface SubjectOption {
  id: string
  code: string
  name: string
  isElective: boolean
}

interface TeacherOption {
  id: string
  displayName: string
  username: string
}

// 1. Assign Teacher Dialog
export function AssignTeacherDialog({
  allTerms,
  classes,
  subjects,
  teachers,
  defaultTermId,
  defaultClassId,
}: {
  allTerms: TermOption[]
  classes: ClassOption[]
  subjects: SubjectOption[]
  teachers: TeacherOption[]
  defaultTermId?: string
  defaultClassId?: string
}) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button>
            <Plus className="size-4 mr-2" /> Assign Teacher
          </Button>
        }
      />
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserCheck className="size-5 text-primary" /> Assign Subject Teacher
          </DialogTitle>
          <DialogDescription>
            Allocate a teacher to teach a subject for a class in a specific term.
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
              await assignTeacherAction(formData)
              setOpen(false)
            } catch (err: unknown) {
              setError(err instanceof Error ? err.message : "Failed to assign teacher.")
            } finally {
              setLoading(false)
            }
          }}
          className="flex flex-col gap-4 mt-2"
        >
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Academic Term *
            </label>
            <select
              name="termId"
              required
              defaultValue={defaultTermId}
              className="w-full h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
            >
              <option value="">Select Term...</option>
              {allTerms.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.academicYear.name} — {t.name} ({t.status})
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Class Level *
            </label>
            <select
              name="classId"
              required
              defaultValue={defaultClassId}
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

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Subject *
            </label>
            <select
              name="subjectId"
              required
              className="w-full h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
            >
              <option value="">Select Subject...</option>
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.code} - {s.name} ({s.isElective ? "Elective" : "Core"})
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Assigned Teacher *
            </label>
            <select
              name="teacherId"
              required
              className="w-full h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
            >
              <option value="">Select Teacher...</option>
              {teachers.map((tch) => (
                <option key={tch.id} value={tch.id}>
                  {tch.displayName} (@{tch.username})
                </option>
              ))}
            </select>
          </div>

          <DialogFooter className="mt-2">
            <DialogClose render={<Button variant="outline" type="button">Cancel</Button>} />
            <Button type="submit" disabled={loading}>
              {loading ? "Assigning..." : "Save Allocation"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// 2. Edit Allocation Dialog (Reassign Teacher)
export function EditAllocationDialog({
  allocationId,
  currentTeacherId,
  className,
  subjectName,
  termName,
  teachers,
}: {
  allocationId: string
  currentTeacherId: string
  className: string
  subjectName: string
  termName: string
  teachers: TeacherOption[]
}) {
  const [open, setOpen] = useState(false)
  const [selectedTeacherId, setSelectedTeacherId] = useState(currentTeacherId)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant="outline" size="sm" className="h-7 px-2 text-xs">
            <Pencil className="size-3 mr-1" /> Reassign
          </Button>
        }
      />
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pencil className="size-4 text-primary" /> Reassign Subject Teacher
          </DialogTitle>
          <DialogDescription>
            Change the assigned teacher for <span className="font-semibold text-foreground">{subjectName}</span> in <span className="font-semibold text-foreground">{className}</span> ({termName}).
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="p-3 text-xs bg-destructive/10 text-destructive border border-destructive/20 rounded-md">
            {error}
          </div>
        )}

        <div className="flex flex-col gap-4 mt-2">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Select New Teacher *
            </label>
            <select
              value={selectedTeacherId}
              onChange={(e) => setSelectedTeacherId(e.target.value)}
              className="w-full h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
            >
              {teachers.map((tch) => (
                <option key={tch.id} value={tch.id}>
                  {tch.displayName} (@{tch.username})
                </option>
              ))}
            </select>
          </div>

          <DialogFooter className="mt-2">
            <DialogClose render={<Button variant="outline" type="button">Cancel</Button>} />
            <Button
              disabled={loading}
              onClick={async () => {
                try {
                  setLoading(true)
                  setError(null)
                  await reassignTeacherAction(allocationId, selectedTeacherId)
                  setOpen(false)
                } catch (err: unknown) {
                  setError(err instanceof Error ? err.message : "Failed to reassign teacher.")
                } finally {
                  setLoading(false)
                }
              }}
            >
              {loading ? "Reassigning..." : "Confirm Reassignment"}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// 3. Delete / Unassign Teacher Dialog
export function DeleteAllocationDialog({
  allocationId,
  teacherName,
  subjectName,
  className,
}: {
  allocationId: string
  teacherName: string
  subjectName: string
  className: string
}) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-destructive hover:bg-destructive/10">
            <Trash2 className="size-3 mr-1" /> Unassign
          </Button>
        }
      />
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="size-5" /> Unassign Teacher
          </DialogTitle>
          <DialogDescription>
            Are you sure you want to remove <span className="font-semibold text-foreground">{teacherName}</span> from teaching <span className="font-semibold text-foreground">{subjectName}</span> in <span className="font-semibold text-foreground">{className}</span>? Allocations with already entered marks cannot be removed.
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
                await unassignTeacherAction(allocationId)
                setOpen(false)
              } catch (err: unknown) {
                setError(err instanceof Error ? err.message : "Failed to unassign teacher.")
              } finally {
                setLoading(false)
              }
            }}
          >
            {loading ? "Unassigning..." : "Confirm Unassign"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
