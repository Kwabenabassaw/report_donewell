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
import { Badge } from "@/components/ui/badge"
import {
  SlidersHorizontal,
  Lock,
  Unlock,
  Send,
  AlertTriangle,
  ShieldCheck,
  CheckCircle2,
  FileCheck2,
} from "lucide-react"
import {
  adminChangeTermStatusAction,
  updateStudentResultStatusAction,
  publishTermReportsAction,
  reopenFinalizedTermAction,
} from "@/app/actions/finalization"

export interface TermData {
  id: string
  name: string
  status: string
  academicYear: {
    name: string
  }
}

// 1. Change Term Lifecycle Status Dialog
export function ChangeTermStatusDialog({
  term,
  trigger,
}: {
  term: TermData
  trigger?: React.ReactNode
}) {
  const [open, setOpen] = useState(false)
  const [selectedStatus, setSelectedStatus] = useState<string>(term.status)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isReopen = selectedStatus === "REOPENED"
  const isFinalize = selectedStatus === "FINALIZED"
  const isPublish = selectedStatus === "PUBLISHED"

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          trigger ? (
            (trigger as React.ReactElement)
          ) : (
            <Button variant="outline" size="sm" className="gap-1.5 text-xs font-medium">
              <SlidersHorizontal className="size-3.5" /> Change Status
            </Button>
          )
        }
      />
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <SlidersHorizontal className="size-4 text-primary" /> Change Term Status
          </DialogTitle>
          <DialogDescription>
            Update or override the lifecycle state for{" "}
            <span className="font-semibold text-foreground">
              {term.academicYear.name} — {term.name}
            </span>
            .
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
              await adminChangeTermStatusAction(formData)
              setOpen(false)
            } catch (err: unknown) {
              setError(err instanceof Error ? err.message : "Failed to update term status.")
            } finally {
              setLoading(false)
            }
          }}
          className="flex flex-col gap-4 mt-2"
        >
          <input type="hidden" name="termId" value={term.id} />

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Current Status
              </label>
              <div>
                <Badge variant="outline" className="font-mono text-xs uppercase px-2.5 py-1">
                  {term.status}
                </Badge>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                New Target Status *
              </label>
              <select
                name="targetStatus"
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                required
                className="w-full h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
              >
                <option value="MARK_ENTRY">MARK_ENTRY (Open for Mark Entry)</option>
                <option value="SUBMITTED">SUBMITTED (Submitted by Teachers)</option>
                <option value="UNDER_REVIEW">UNDER_REVIEW (Moderation Review)</option>
                <option value="APPROVED">APPROVED (Headmaster Approved)</option>
                <option value="FINALIZED">FINALIZED (Compile & Lock Snapshots)</option>
                <option value="PUBLISHED">PUBLISHED (Official Reports Active)</option>
                <option value="REOPENED">REOPENED (Reopen for Corrections)</option>
                <option value="CLOSED">CLOSED (Archived Term)</option>
              </select>
            </div>
          </div>

          {/* Contextual guidance */}
          {isFinalize && (
            <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-800 dark:text-emerald-300 flex items-start gap-2">
              <Lock className="size-4 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Snapshot Finalization</p>
                <p className="mt-0.5 text-[11px] opacity-90">
                  Transitioning to FINALIZED compiles broadsheets, computes class positions and GPAs, generates cryptographic hashes, and locks all assessment activities.
                </p>
              </div>
            </div>
          )}

          {isPublish && (
            <div className="p-3 rounded-lg bg-primary/10 border border-primary/20 text-xs text-primary flex items-start gap-2">
              <Send className="size-4 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Official Publication</p>
                <p className="mt-0.5 text-[11px] opacity-90">
                  Transitioning to PUBLISHED marks all compiled student report cards as published, making them accessible for printing and QR verification.
                </p>
              </div>
            </div>
          )}

          {isReopen && (
            <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-xs text-amber-800 dark:text-amber-300 flex items-start gap-2">
              <Unlock className="size-4 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Reopening Warning</p>
                <p className="mt-0.5 text-[11px] opacity-90">
                  Reopening sets current snapshots to SUPERSEDED and unlocks mark entry sheets so teachers can make required adjustments.
                </p>
              </div>
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {isReopen ? "Reason for Reopening *" : "Administrative Notes / Reason (Optional)"}
            </label>
            <Input
              name="reason"
              placeholder={
                isReopen
                  ? "e.g. Correcting science exam scores as instructed by board"
                  : "e.g. Direct administrative status override"
              }
              required={isReopen}
              minLength={isReopen ? 5 : undefined}
            />
          </div>

          <DialogFooter className="mt-2">
            <DialogClose render={<Button type="button" variant="outline" />}>
              Cancel
            </DialogClose>
            <Button
              type="submit"
              disabled={loading || selectedStatus === term.status}
              className={
                isPublish
                  ? "bg-primary text-primary-foreground"
                  : isFinalize
                  ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                  : isReopen
                  ? "bg-amber-600 hover:bg-amber-700 text-white"
                  : ""
              }
            >
              {loading ? "Updating..." : "Update Status"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// 2. Publish Reports Confirmation Dialog
export function PublishReportsDialog({
  term,
  trigger,
}: {
  term: TermData
  trigger?: React.ReactNode
}) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          trigger ? (
            (trigger as React.ReactElement)
          ) : (
            <Button className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium gap-1.5">
              <Send className="size-4" /> Publish Official Reports
            </Button>
          )
        }
      />
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="size-5 text-emerald-600" /> Publish Terminal Reports
          </DialogTitle>
          <DialogDescription>
            Publish official terminal report cards for{" "}
            <span className="font-semibold text-foreground">
              {term.academicYear.name} — {term.name}
            </span>
            .
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="p-3 text-xs bg-destructive/10 text-destructive border border-destructive/20 rounded-md">
            {error}
          </div>
        )}

        <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-800 dark:text-emerald-300 space-y-1">
          <p className="font-semibold">Release Official Results</p>
          <p className="text-[11px] opacity-90">
            All compiled student report cards in this term will transition to <strong>PUBLISHED</strong>. Guardians and students will be able to view reports and verify cryptographic QR codes.
          </p>
        </div>

        <form
          action={async (formData) => {
            try {
              setLoading(true)
              setError(null)
              await publishTermReportsAction(formData)
              setOpen(false)
            } catch (err: unknown) {
              setError(err instanceof Error ? err.message : "Failed to publish reports.")
            } finally {
              setLoading(false)
            }
          }}
        >
          <input type="hidden" name="termId" value={term.id} />
          <DialogFooter className="mt-4">
            <DialogClose render={<Button type="button" variant="outline" />}>
              Cancel
            </DialogClose>
            <Button
              type="submit"
              disabled={loading}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium"
            >
              {loading ? "Publishing..." : "Confirm Publication"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// 3. Update Individual Student Result Status Dialog
export function UpdateResultStatusDialog({
  termResultId,
  studentName,
  currentStatus,
}: {
  termResultId: string
  studentName: string
  currentStatus: string
}) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <button
            type="button"
            className="cursor-pointer hover:opacity-80 transition-opacity"
            title="Click to change student report status"
          >
            <Badge
              variant={
                currentStatus === "PUBLISHED"
                  ? "default"
                  : currentStatus === "FINALIZED"
                  ? "secondary"
                  : "outline"
              }
              className="text-[10px] uppercase font-mono"
            >
              {currentStatus}
            </Badge>
          </button>
        }
      />
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileCheck2 className="size-5 text-primary" /> Update Student Report Status
          </DialogTitle>
          <DialogDescription>
            Change the terminal result status for{" "}
            <span className="font-semibold text-foreground">{studentName}</span>.
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
              await updateStudentResultStatusAction(formData)
              setOpen(false)
            } catch (err: unknown) {
              setError(err instanceof Error ? err.message : "Failed to update result status.")
            } finally {
              setLoading(false)
            }
          }}
          className="flex flex-col gap-4 mt-2"
        >
          <input type="hidden" name="termResultId" value={termResultId} />

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Report Status *
            </label>
            <select
              name="targetStatus"
              defaultValue={currentStatus}
              required
              className="w-full h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
            >
              <option value="FINALIZED">FINALIZED (Official Snapshot Active)</option>
              <option value="PUBLISHED">PUBLISHED (Released to Student/Guardian)</option>
              <option value="UNDER_REVIEW">UNDER_REVIEW (Held for Investigation)</option>
              <option value="SUPERSEDED">SUPERSEDED (Archived Previous Version)</option>
              <option value="DRAFT">DRAFT (Draft State)</option>
            </select>
          </div>

          <DialogFooter className="mt-2">
            <DialogClose render={<Button type="button" variant="outline" />}>
              Cancel
            </DialogClose>
            <Button type="submit" disabled={loading}>
              {loading ? "Saving..." : "Update Status"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
