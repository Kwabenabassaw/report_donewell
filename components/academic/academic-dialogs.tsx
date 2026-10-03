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
import { Plus, Pencil, Trash2, Calendar, AlertTriangle } from "lucide-react"
import {
  createAcademicYearAction,
  updateAcademicYearAction,
  deleteAcademicYearAction,
  createTermAction,
  updateTermAction,
  deleteTermAction,
} from "@/app/actions/academic"

interface YearData {
  id: string
  name: string
  startDate: string | Date
  endDate: string | Date
  status: string
  isCurrent: boolean
}

interface TermData {
  id: string
  name: string
  termSequence: number
  startDate: string | Date
  endDate: string | Date
  nextTermResumption?: string | Date | null
  totalSchoolDays: number
  status: string
  academicYearId: string
}

export function CreateAcademicYearDialog() {
  const [open, setOpen] = useState(false)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button className="gap-2 shadow-xs">
            <Plus className="size-4" /> Add Academic Year
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="size-4 text-primary" /> Create Academic Year
          </DialogTitle>
          <DialogDescription>
            Register a new academic year session with official date boundaries.
          </DialogDescription>
        </DialogHeader>

        <form
          action={async (formData) => {
            await createAcademicYearAction(formData)
            setOpen(false)
          }}
          className="flex flex-col gap-4"
        >
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Academic Year Name
            </label>
            <Input name="name" placeholder="e.g. 2026/2027" required />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Start Date
              </label>
              <Input name="startDate" type="date" required />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                End Date
              </label>
              <Input name="endDate" type="date" required />
            </div>
          </div>

          <div className="flex items-center gap-2.5 p-3 rounded-lg border bg-muted/20">
            <input
              type="checkbox"
              id="isCurrent"
              name="isCurrent"
              value="true"
              className="size-4 rounded border-border text-primary focus:ring-primary cursor-pointer"
            />
            <label
              htmlFor="isCurrent"
              className="text-xs font-medium text-foreground cursor-pointer select-none"
            >
              Set as active Current Academic Year immediately
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
            <Button type="submit">Create Academic Year</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export function EditAcademicYearDialog({ year }: { year: YearData }) {
  const [open, setOpen] = useState(false)

  const formatForInput = (d: string | Date) => {
    return new Date(d).toISOString().split("T")[0]
  }

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
            <Pencil className="size-4 text-primary" /> Edit Academic Year
          </DialogTitle>
          <DialogDescription>
            Update session name and date boundaries for {year.name}.
          </DialogDescription>
        </DialogHeader>

        <form
          action={async (formData) => {
            await updateAcademicYearAction(formData)
            setOpen(false)
          }}
          className="flex flex-col gap-4"
        >
          <input type="hidden" name="yearId" value={year.id} />

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Academic Year Name
            </label>
            <Input name="name" defaultValue={year.name} required />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Start Date
              </label>
              <Input
                name="startDate"
                type="date"
                defaultValue={formatForInput(year.startDate)}
                required
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                End Date
              </label>
              <Input
                name="endDate"
                type="date"
                defaultValue={formatForInput(year.endDate)}
                required
              />
            </div>
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

export function DeleteAcademicYearDialog({
  yearId,
  yearName,
}: {
  yearId: string
  yearName: string
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
            <AlertTriangle className="size-4" /> Delete Academic Year
          </DialogTitle>
          <DialogDescription>
            Are you sure you want to permanently delete{" "}
            <span className="font-semibold text-foreground">{yearName}</span>?
            This operation cannot be undone. Years with terms or enrolled students cannot be deleted.
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
              await deleteAcademicYearAction(yearId)
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

export function CreateTermDialog({
  years,
  defaultYearId,
}: {
  years: { id: string; name: string; isCurrent: boolean }[]
  defaultYearId?: string
}) {
  const [open, setOpen] = useState(false)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant="outline" className="gap-2 shadow-xs">
            <Plus className="size-4" /> Add Term
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="size-4 text-primary" /> Create Academic Term
          </DialogTitle>
          <DialogDescription>
            Add a term belonging to an academic year session. Dates must fall within the year boundaries.
          </DialogDescription>
        </DialogHeader>

        <form
          action={async (formData) => {
            await createTermAction(formData)
            setOpen(false)
          }}
          className="flex flex-col gap-4"
        >
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Academic Year
              </label>
              <select
                name="academicYearId"
                defaultValue={defaultYearId}
                className="h-9 w-full rounded-md border border-input bg-card px-3 py-1 text-sm shadow-xs focus:ring-2 focus:ring-primary outline-none"
                required
              >
                {years.map((y) => (
                  <option key={y.id} value={y.id}>
                    {y.name} {y.isCurrent ? "(Current)" : ""}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Sequence (1, 2, 3)
              </label>
              <Input
                name="termSequence"
                type="number"
                min={1}
                max={3}
                defaultValue={1}
                required
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Term Name
            </label>
            <Input name="name" placeholder="e.g. First Term" required />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Start Date
              </label>
              <Input name="startDate" type="date" required />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                End Date
              </label>
              <Input name="endDate" type="date" required />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Next Term Resumption
              </label>
              <Input name="nextTermResumption" type="date" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Total School Days
              </label>
              <Input
                name="totalSchoolDays"
                type="number"
                defaultValue={60}
                min={1}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit">Create Term</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export function EditTermDialog({ term }: { term: TermData }) {
  const [open, setOpen] = useState(false)

  const formatForInput = (d: string | Date | null | undefined) => {
    if (!d) return ""
    return new Date(d).toISOString().split("T")[0]
  }

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
            <Pencil className="size-4 text-primary" /> Edit Term
          </DialogTitle>
          <DialogDescription>
            Update term details, dates, and school days for {term.name}.
          </DialogDescription>
        </DialogHeader>

        <form
          action={async (formData) => {
            await updateTermAction(formData)
            setOpen(false)
          }}
          className="flex flex-col gap-4"
        >
          <input type="hidden" name="termId" value={term.id} />

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Term Name
            </label>
            <Input name="name" defaultValue={term.name} required />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Start Date
              </label>
              <Input
                name="startDate"
                type="date"
                defaultValue={formatForInput(term.startDate)}
                required
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                End Date
              </label>
              <Input
                name="endDate"
                type="date"
                defaultValue={formatForInput(term.endDate)}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Next Term Resumption
              </label>
              <Input
                name="nextTermResumption"
                type="date"
                defaultValue={formatForInput(term.nextTermResumption)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Total School Days
              </label>
              <Input
                name="totalSchoolDays"
                type="number"
                defaultValue={term.totalSchoolDays}
                min={1}
              />
            </div>
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

export function DeleteTermDialog({
  termId,
  termName,
}: {
  termId: string
  termName: string
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
            <AlertTriangle className="size-4" /> Delete Term
          </DialogTitle>
          <DialogDescription>
            Are you sure you want to delete{" "}
            <span className="font-semibold text-foreground">{termName}</span>?
            Only draft terms without recorded marks can be deleted.
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
              await deleteTermAction(termId)
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
