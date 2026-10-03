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
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Plus, Pencil, Trash2, Layers, BookOpen, AlertTriangle } from "lucide-react"
import {
  createClassAction,
  updateClassAction,
  deleteClassAction,
  createSubjectAction,
  updateSubjectAction,
  deleteSubjectAction,
} from "@/app/actions/academic"

interface TeacherOption {
  id: string
  displayName: string
  username: string
}

interface ClassData {
  id: string
  name: string
  gradeLevel: string
  classTeacherId?: string | null
  classTeacher?: {
    id: string
    displayName: string
  } | null
}

interface SubjectData {
  id: string
  name: string
  code: string
  isElective: boolean
  status: string
}

export function CreateClassDialog({ teachers }: { teachers: TeacherOption[] }) {
  const [open, setOpen] = useState(false)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button className="gap-2 shadow-xs">
            <Plus className="size-4" /> Add Class
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Layers className="size-4 text-primary" /> Create New Class
          </DialogTitle>
          <DialogDescription>
            Register a new class cohort with grade level and optional form teacher.
          </DialogDescription>
        </DialogHeader>

        <form
          action={async (formData) => {
            await createClassAction(formData)
            setOpen(false)
          }}
          className="flex flex-col gap-4"
        >
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Class Name
              </label>
              <Input name="name" placeholder="e.g. Basic 7A" required />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Grade Level
              </label>
              <select
                name="gradeLevel"
                className="h-9 w-full rounded-md border border-input bg-card px-3 py-1 text-sm shadow-xs focus:ring-2 focus:ring-primary outline-none"
                required
              >
                <option value="Basic 7">Basic 7 (JHS 1)</option>
                <option value="Basic 8">Basic 8 (JHS 2)</option>
                <option value="Basic 9">Basic 9 (JHS 3)</option>
                <option value="Primary 1">Primary 1</option>
                <option value="Primary 2">Primary 2</option>
                <option value="Primary 3">Primary 3</option>
                <option value="Primary 4">Primary 4</option>
                <option value="Primary 5">Primary 5</option>
                <option value="Primary 6">Primary 6</option>
              </select>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Form / Class Teacher Supervisor (Optional)
            </label>
            <select
              name="classTeacherId"
              className="h-9 w-full rounded-md border border-input bg-card px-3 py-1 text-sm shadow-xs focus:ring-2 focus:ring-primary outline-none"
            >
              <option value="">No Teacher Assigned</option>
              {teachers.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.displayName} (@{t.username})
                </option>
              ))}
            </select>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit">Create Class</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export function EditClassDialog({
  cls,
  teachers,
}: {
  cls: ClassData
  teachers: TeacherOption[]
}) {
  const [open, setOpen] = useState(false)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant="outline" size="xs" className="gap-1 text-xs">
            <Pencil className="size-3" /> Edit
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pencil className="size-4 text-primary" /> Edit Class Details
          </DialogTitle>
          <DialogDescription>
            Update class cohort name, grade level, or supervisor for {cls.name}.
          </DialogDescription>
        </DialogHeader>

        <form
          action={async (formData) => {
            await updateClassAction(formData)
            setOpen(false)
          }}
          className="flex flex-col gap-4"
        >
          <input type="hidden" name="classId" value={cls.id} />

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Class Name
              </label>
              <Input name="name" defaultValue={cls.name} required />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Grade Level
              </label>
              <Input name="gradeLevel" defaultValue={cls.gradeLevel} required />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Form / Class Teacher Supervisor
            </label>
            <select
              name="classTeacherId"
              defaultValue={cls.classTeacherId || ""}
              className="h-9 w-full rounded-md border border-input bg-card px-3 py-1 text-sm shadow-xs focus:ring-2 focus:ring-primary outline-none"
            >
              <option value="">No Teacher Assigned</option>
              {teachers.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.displayName} (@{t.username})
                </option>
              ))}
            </select>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit">Save Changes</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export function DeleteClassDialog({
  classId,
  className,
}: {
  classId: string
  className: string
}) {
  const [open, setOpen] = useState(false)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button
            variant="ghost"
            size="xs"
            className="text-destructive hover:bg-destructive/10 hover:text-destructive"
          >
            <Trash2 className="size-3.5" />
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="size-4" /> Delete Class
          </DialogTitle>
          <DialogDescription>
            Are you sure you want to delete{" "}
            <span className="font-semibold text-foreground">{className}</span>?
            Classes with enrolled students or assessments cannot be deleted.
          </DialogDescription>
        </DialogHeader>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => setOpen(false)}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={async () => {
              await deleteClassAction(classId)
              setOpen(false)
            }}
          >
            Confirm Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function CreateSubjectDialog() {
  const [open, setOpen] = useState(false)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant="outline" className="gap-2 shadow-xs">
            <Plus className="size-4" /> Add Subject
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BookOpen className="size-4 text-primary" /> Create New Subject
          </DialogTitle>
          <DialogDescription>
            Register an academic subject in the official school curriculum.
          </DialogDescription>
        </DialogHeader>

        <form
          action={async (formData) => {
            await createSubjectAction(formData)
            setOpen(false)
          }}
          className="flex flex-col gap-4"
        >
          <div className="grid grid-cols-3 gap-3">
            <div className="flex flex-col gap-1.5 col-span-1">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Code
              </label>
              <Input
                name="code"
                placeholder="e.g. MTH"
                className="uppercase font-mono"
                maxLength={8}
                required
              />
            </div>
            <div className="flex flex-col gap-1.5 col-span-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Subject Name
              </label>
              <Input name="name" placeholder="e.g. Mathematics" required />
            </div>
          </div>

          <div className="flex items-center gap-2.5 p-3 rounded-lg border bg-muted/20">
            <input
              type="checkbox"
              id="isElective"
              name="isElective"
              value="true"
              className="size-4 rounded border-border text-primary focus:ring-primary cursor-pointer"
            />
            <label
              htmlFor="isElective"
              className="text-xs font-medium text-foreground cursor-pointer select-none"
            >
              Designate as Elective Subject (unchecked = Core curriculum)
            </label>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit">Create Subject</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export function EditSubjectDialog({ subject }: { subject: SubjectData }) {
  const [open, setOpen] = useState(false)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant="outline" size="xs" className="gap-1 text-xs">
            <Pencil className="size-3" /> Edit
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pencil className="size-4 text-primary" /> Edit Subject
          </DialogTitle>
          <DialogDescription>
            Update code and name for {subject.name}.
          </DialogDescription>
        </DialogHeader>

        <form
          action={async (formData) => {
            await updateSubjectAction(formData)
            setOpen(false)
          }}
          className="flex flex-col gap-4"
        >
          <input type="hidden" name="subjectId" value={subject.id} />

          <div className="grid grid-cols-3 gap-3">
            <div className="flex flex-col gap-1.5 col-span-1">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Code
              </label>
              <Input
                name="code"
                defaultValue={subject.code}
                className="uppercase font-mono"
                maxLength={8}
                required
              />
            </div>
            <div className="flex flex-col gap-1.5 col-span-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Subject Name
              </label>
              <Input name="name" defaultValue={subject.name} required />
            </div>
          </div>

          <div className="flex items-center gap-2.5 p-3 rounded-lg border bg-muted/20">
            <input
              type="checkbox"
              id={`isElective-${subject.id}`}
              name="isElective"
              value="true"
              defaultChecked={subject.isElective}
              className="size-4 rounded border-border text-primary focus:ring-primary cursor-pointer"
            />
            <label
              htmlFor={`isElective-${subject.id}`}
              className="text-xs font-medium text-foreground cursor-pointer select-none"
            >
              Designate as Elective Subject (unchecked = Core curriculum)
            </label>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit">Save Changes</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export function DeleteSubjectDialog({
  subjectId,
  subjectName,
}: {
  subjectId: string
  subjectName: string
}) {
  const [open, setOpen] = useState(false)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button
            variant="ghost"
            size="xs"
            className="text-destructive hover:bg-destructive/10 hover:text-destructive"
          >
            <Trash2 className="size-3.5" />
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="size-4" /> Delete Subject
          </DialogTitle>
          <DialogDescription>
            Are you sure you want to delete{" "}
            <span className="font-semibold text-foreground">{subjectName}</span>?
            Subjects with enrolled students, teacher allocations, or recorded marks cannot be deleted.
          </DialogDescription>
        </DialogHeader>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => setOpen(false)}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={async () => {
              await deleteSubjectAction(subjectId)
              setOpen(false)
            }}
          >
            Confirm Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
