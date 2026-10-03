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
import { Input } from "@/components/ui/input"
import {
  FileSpreadsheet,
  Plus,
  Lock,
  Unlock,
  Pencil,
  Trash2,
  AlertTriangle,
  Calendar,
  Layers,
  BookOpen,
} from "lucide-react"
import {
  createAssessmentActivityAction,
  updateAssessmentAction,
  deleteAssessmentAction,
  lockAssessmentAction,
  unlockAssessmentAction,
} from "@/app/actions/grading"

export interface TermOption {
  id: string
  name: string
  academicYear: {
    name: string
  }
}

export interface ClassOption {
  id: string
  name: string
}

export interface SubjectOption {
  id: string
  name: string
  code: string
}

export interface CategoryOption {
  id: string
  name: string
  component: {
    code: string
    weight: number
  }
}

import type { AssessmentStatus } from "@prisma/client"

export interface AssessmentRecord {
  id: string
  title: string
  maxScore: number
  dateAdministered?: Date | string | null
  status: AssessmentStatus | string
  termId: string
  classId: string
  subjectId: string
  categoryId: string
  _count?: {
    scores: number
  }
  category: {
    name: string
    component: {
      code: string
      weight: number
    }
  }
}

// 1. Create Assessment Activity Dialog
export function CreateAssessmentActivityDialog({
  terms,
  classes,
  subjects,
  categories,
  defaultTermId,
  defaultClassId,
  defaultSubjectId,
  trigger,
}: {
  terms: TermOption[]
  classes: ClassOption[]
  subjects: SubjectOption[]
  categories: CategoryOption[]
  defaultTermId?: string
  defaultClassId?: string
  defaultSubjectId?: string
  trigger?: React.ReactNode
}) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const defaultDate = new Date().toISOString().split("T")[0]

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          trigger ? (
            (trigger as React.ReactElement)
          ) : (
            <Button>
              <Plus className="size-4 mr-2" /> Create Activity Column
            </Button>
          )
        }
      />
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="size-5 text-primary" /> Create Assessment Activity
          </DialogTitle>
          <DialogDescription>
            Add an operational mark entry column (test, quiz, project, or exam) for student scoring.
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
              await createAssessmentActivityAction(formData)
              setOpen(false)
            } catch (err: unknown) {
              setError(err instanceof Error ? err.message : "Failed to create assessment activity.")
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
              defaultValue={defaultTermId || ""}
              className="w-full h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
            >
              <option value="">Select Term...</option>
              {terms.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.academicYear.name} — {t.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Class Level *
              </label>
              <select
                name="classId"
                required
                defaultValue={defaultClassId || ""}
                className="w-full h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
              >
                <option value="">Select Class...</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
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
                defaultValue={defaultSubjectId || ""}
                className="w-full h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
              >
                <option value="">Select Subject...</option>
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.code} - {s.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Category Component *
            </label>
            <select
              name="categoryId"
              required
              className="w-full h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
            >
              <option value="">Select Category...</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  [{cat.component.code} • {cat.component.weight}%] {cat.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Activity Title *
            </label>
            <Input
              name="title"
              placeholder="e.g. Mid-Term Test 1, End-of-Term Examination"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Max Score *
              </label>
              <Input
                name="maxScore"
                type="number"
                step="0.5"
                min="1"
                max="100"
                defaultValue="20"
                required
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Date Administered
              </label>
              <Input
                name="dateAdministered"
                type="date"
                defaultValue={defaultDate}
              />
            </div>
          </div>

          <DialogFooter className="mt-4 gap-2">
            <DialogClose render={<Button variant="outline" type="button" />}>
              Cancel
            </DialogClose>
            <Button type="submit" disabled={loading}>
              {loading ? "Creating..." : "Create Activity Column"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// 2. Edit Assessment Activity Dialog
export function EditAssessmentActivityDialog({
  assessment,
  categories,
}: {
  assessment: AssessmentRecord
  categories: CategoryOption[]
}) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const dateStr = assessment.dateAdministered
    ? new Date(assessment.dateAdministered).toISOString().split("T")[0]
    : ""

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant="ghost" size="sm" className="h-7 px-2 text-xs">
            <Pencil className="size-3 mr-1" /> Edit
          </Button>
        }
      />
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pencil className="size-5 text-primary" /> Edit Assessment Activity
          </DialogTitle>
          <DialogDescription>
            Update activity title, maximum score, or category mapping.
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
              await updateAssessmentAction(formData)
              setOpen(false)
            } catch (err: unknown) {
              setError(err instanceof Error ? err.message : "Failed to update assessment.")
            } finally {
              setLoading(false)
            }
          }}
          className="flex flex-col gap-4 mt-2"
        >
          <input type="hidden" name="assessmentId" value={assessment.id} />

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Activity Title *
            </label>
            <Input
              name="title"
              defaultValue={assessment.title}
              required
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Category Component *
            </label>
            <select
              name="categoryId"
              defaultValue={assessment.categoryId}
              required
              className="w-full h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
            >
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  [{cat.component.code} • {cat.component.weight}%] {cat.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Max Score *
              </label>
              <Input
                name="maxScore"
                type="number"
                step="0.5"
                min="1"
                max="100"
                defaultValue={assessment.maxScore}
                required
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Date Administered
              </label>
              <Input
                name="dateAdministered"
                type="date"
                defaultValue={dateStr}
              />
            </div>
          </div>

          <DialogFooter className="mt-4 gap-2">
            <DialogClose render={<Button variant="outline" type="button" />}>
              Cancel
            </DialogClose>
            <Button type="submit" disabled={loading}>
              {loading ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// 3. Lock / Unlock Assessment Dialog
export function ToggleAssessmentLockDialog({
  assessment,
}: {
  assessment: AssessmentRecord
}) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isLocked = assessment.status === "LOCKED"

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          isLocked ? (
            <Button variant="secondary" size="sm" className="h-7 px-2 text-xs">
              <Unlock className="size-3 mr-1" /> Unlock
            </Button>
          ) : (
            <Button variant="outline" size="sm" className="h-7 px-2 text-xs">
              <Lock className="size-3 mr-1" /> Lock
            </Button>
          )
        }
      />
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isLocked ? (
              <>
                <Unlock className="size-5 text-emerald-600" /> Unlock Assessment Activity
              </>
            ) : (
              <>
                <Lock className="size-5 text-amber-600" /> Lock Assessment Activity
              </>
            )}
          </DialogTitle>
          <DialogDescription>
            {isLocked
              ? "Unlocking this activity re-opens mark entry for assigned teachers and administrators."
              : "Locking prevents teachers from modifying or submitting new marks for this assessment activity."}
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="p-3 text-xs bg-destructive/10 text-destructive border border-destructive/20 rounded-md">
            {error}
          </div>
        )}

        <div className="bg-muted/40 p-3 rounded-md text-xs space-y-1">
          <div>
            <span className="font-semibold text-foreground">Activity:</span> {assessment.title}
          </div>
          <div>
            <span className="font-semibold text-foreground">Max Score:</span> {assessment.maxScore} pts
          </div>
          <div>
            <span className="font-semibold text-foreground">Recorded Scores:</span>{" "}
            {assessment._count?.scores ?? 0} scores
          </div>
        </div>

        <form
          action={async (formData) => {
            try {
              setLoading(true)
              setError(null)
              if (isLocked) {
                await unlockAssessmentAction(formData)
              } else {
                await lockAssessmentAction(formData)
              }
              setOpen(false)
            } catch (err: unknown) {
              setError(err instanceof Error ? err.message : "Failed to toggle lock status.")
            } finally {
              setLoading(false)
            }
          }}
        >
          <input type="hidden" name="assessmentId" value={assessment.id} />
          <DialogFooter className="mt-4 gap-2">
            <DialogClose render={<Button variant="outline" type="button" />}>
              Cancel
            </DialogClose>
            <Button
              type="submit"
              variant={isLocked ? "default" : "destructive"}
              disabled={loading}
            >
              {loading
                ? "Processing..."
                : isLocked
                ? "Confirm Unlock"
                : "Confirm Lock"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// 4. Delete Assessment Activity Dialog
export function DeleteAssessmentActivityDialog({
  assessment,
}: {
  assessment: AssessmentRecord
}) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const scoresCount = assessment._count?.scores ?? 0

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs text-destructive hover:bg-destructive/10"
            disabled={scoresCount > 0}
            title={scoresCount > 0 ? "Cannot delete activity with recorded marks" : "Delete activity"}
          >
            <Trash2 className="size-3 mr-1" /> Delete
          </Button>
        }
      />
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="size-5" /> Delete Assessment Activity
          </DialogTitle>
          <DialogDescription>
            Permanently remove this assessment activity column. This operation cannot be undone.
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="p-3 text-xs bg-destructive/10 text-destructive border border-destructive/20 rounded-md">
            {error}
          </div>
        )}

        <div className="bg-destructive/5 p-3 rounded-md border border-destructive/20 text-xs space-y-1">
          <p className="font-semibold text-foreground">
            Activity: <span className="font-mono">{assessment.title}</span>
          </p>
          <p className="text-muted-foreground">
            {scoresCount > 0
              ? `Warning: This activity contains ${scoresCount} student scores. You must clear the scores before deleting.`
              : "This activity has 0 recorded scores and can be safely deleted."}
          </p>
        </div>

        <form
          action={async (formData) => {
            try {
              setLoading(true)
              setError(null)
              await deleteAssessmentAction(formData)
              setOpen(false)
            } catch (err: unknown) {
              setError(err instanceof Error ? err.message : "Failed to delete assessment.")
            } finally {
              setLoading(false)
            }
          }}
        >
          <input type="hidden" name="assessmentId" value={assessment.id} />
          <DialogFooter className="mt-4 gap-2">
            <DialogClose render={<Button variant="outline" type="button" />}>
              Cancel
            </DialogClose>
            <Button
              type="submit"
              variant="destructive"
              disabled={loading || scoresCount > 0}
            >
              {loading ? "Deleting..." : "Delete Activity"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
