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
  Award,
  Plus,
  Pencil,
  Trash2,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react"
import {
  createGradingPolicyAction,
  updateGradingPolicyAction,
  activateGradingPolicyAction,
  deleteGradingPolicyAction,
} from "@/app/actions/grading"

interface AcademicYearOption {
  id: string
  name: string
  isCurrent: boolean
}

// 1. Create Grading Policy Dialog
export function CreateGradingPolicyDialog({
  academicYears,
}: {
  academicYears: AcademicYearOption[]
}) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button>
            <Plus className="size-4 mr-2" /> Create Grading Policy
          </Button>
        }
      />
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Award className="size-5 text-primary" /> Create Grading Policy
          </DialogTitle>
          <DialogDescription>
            Configure assessment component weight ratio (must sum to exactly 100%).
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
              await createGradingPolicyAction(formData)
              setOpen(false)
            } catch (err: unknown) {
              setError(err instanceof Error ? err.message : "Failed to create policy.")
            } finally {
              setLoading(false)
            }
          }}
          className="flex flex-col gap-4 mt-2"
        >
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Policy Name *
            </label>
            <Input
              name="name"
              placeholder="e.g. Junior High 30/70 Assessment Policy"
              defaultValue="Standard 30/70 Policy"
              required
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Target Academic Year (Optional)
            </label>
            <select
              name="academicYearId"
              className="w-full h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
            >
              <option value="">Apply Institution-Wide (Default)</option>
              {academicYears.map((yr) => (
                <option key={yr.id} value={yr.id}>
                  {yr.name} {yr.isCurrent ? "(Current)" : ""}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3 p-3 bg-muted/40 rounded-lg border">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-muted-foreground">
                CA Weight (%) *
              </label>
              <Input
                name="caWeight"
                type="number"
                min="1"
                max="99"
                defaultValue="30"
                required
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-muted-foreground">
                Exam Weight (%) *
              </label>
              <Input
                name="examWeight"
                type="number"
                min="1"
                max="99"
                defaultValue="70"
                required
              />
            </div>
          </div>

          <div className="p-3 bg-primary/5 rounded-md border border-primary/20 text-xs text-muted-foreground">
            💡 Standard WAEC 9-point scale (A1 to F9) will be automatically provisioned with non-overlapping boundaries.
          </div>

          <DialogFooter className="mt-2">
            <DialogClose render={<Button variant="outline" type="button">Cancel</Button>} />
            <Button type="submit" disabled={loading}>
              {loading ? "Creating..." : "Save & Activate Policy"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// 2. Activate Grading Policy Dialog
export function ActivateGradingPolicyDialog({
  policyId,
  policyName,
}: {
  policyId: string
  policyName: string
}) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant="outline" size="sm" className="h-7 text-xs">
            <CheckCircle2 className="size-3.5 mr-1 text-emerald-600" /> Activate
          </Button>
        }
      />
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle2 className="size-5 text-emerald-600" /> Activate Grading Policy
          </DialogTitle>
          <DialogDescription>
            Are you sure you want to set <span className="font-semibold text-foreground">{policyName}</span> as the active grading standard? Current assessments and finalization will evaluate against this policy.
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
            disabled={loading}
            onClick={async () => {
              try {
                setLoading(true)
                setError(null)
                await activateGradingPolicyAction(policyId)
                setOpen(false)
              } catch (err: unknown) {
                setError(err instanceof Error ? err.message : "Failed to activate policy.")
              } finally {
                setLoading(false)
              }
            }}
          >
            {loading ? "Activating..." : "Set as Active"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// 3. Delete Grading Policy Dialog
export function DeleteGradingPolicyDialog({
  policyId,
  policyName,
}: {
  policyId: string
  policyName: string
}) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-destructive hover:bg-destructive/10">
            <Trash2 className="size-3 mr-1" /> Delete
          </Button>
        }
      />
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="size-5" /> Delete Grading Policy
          </DialogTitle>
          <DialogDescription>
            Are you sure you want to permanently delete{" "}
            <span className="font-semibold text-foreground">{policyName}</span>?
            Policies linked to active assessments cannot be deleted.
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
                await deleteGradingPolicyAction(policyId)
                setOpen(false)
              } catch (err: unknown) {
                setError(err instanceof Error ? err.message : "Failed to delete policy.")
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

// 4. Edit Grading Policy Dialog
export function EditGradingPolicyDialog({
  policy,
  academicYears,
}: {
  policy: {
    id: string
    name: string
    academicYearId?: string | null
    rankingMethod: string
    version: number
    components: Array<{
      id: string
      code: string
      name: string
      weight: number
    }>
  }
  academicYears: AcademicYearOption[]
}) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const initialCa = policy.components.find((c) => c.code === "CA")?.weight ?? 30
  const initialExam = policy.components.find((c) => c.code === "EXAM")?.weight ?? 70

  const [caWeight, setCaWeight] = useState(initialCa)
  const [examWeight, setExamWeight] = useState(initialExam)

  const totalWeight = Math.round((caWeight + examWeight) * 10) / 10
  const isValidTotal = Math.abs(totalWeight - 100) < 0.001

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant="outline" size="sm" className="h-8 px-2 text-xs gap-1">
            <Pencil className="size-3.5 text-muted-foreground" /> Edit
          </Button>
        }
      />
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Award className="size-5 text-primary" /> Edit Grading Policy
          </DialogTitle>
          <DialogDescription>
            Update policy details, academic year scope, ranking method, and assessment weights. Version will increment to v{policy.version + 1}.
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
              if (!isValidTotal) {
                setError(`Component weights must sum strictly to 100%. Current sum: ${totalWeight}%.`)
                return
              }
              setLoading(true)
              setError(null)
              await updateGradingPolicyAction(formData)
              setOpen(false)
            } catch (err: unknown) {
              setError(err instanceof Error ? err.message : "Failed to update policy.")
            } finally {
              setLoading(false)
            }
          }}
          className="flex flex-col gap-4 mt-2"
        >
          <input type="hidden" name="policyId" value={policy.id} />

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Policy Name *
            </label>
            <Input
              name="name"
              placeholder="e.g. Standard 30/70 Policy"
              defaultValue={policy.name}
              required
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Target Academic Year (Scope)
            </label>
            <select
              name="academicYearId"
              defaultValue={policy.academicYearId || ""}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <option value="">Institution-Wide (All Academic Years)</option>
              {academicYears.map((ay) => (
                <option key={ay.id} value={ay.id}>
                  {ay.name} {ay.isCurrent ? "(Current Active Session)" : ""}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Cohort Ranking Method
            </label>
            <select
              name="rankingMethod"
              defaultValue={policy.rankingMethod}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <option value="DENSE_RANK">Dense Rank (Equal scores share rank; next distinct is +1)</option>
              <option value="STANDARD_RANK">Standard Rank (Ties skip next positions, e.g. 1st, 2nd, 2nd, 4th)</option>
              <option value="ORDINAL_RANK">Ordinal Rank (Strict sequential numbering without ties)</option>
            </select>
          </div>

          {/* Component Weights */}
          <div className="p-3 bg-muted/40 rounded-lg border flex flex-col gap-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Assessment Component Weights
            </span>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium">CA Weight (%)</label>
                <Input
                  type="number"
                  name="caWeight"
                  step="0.5"
                  min="1"
                  max="99"
                  value={caWeight}
                  onChange={(e) => setCaWeight(parseFloat(e.target.value) || 0)}
                  required
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium">Exam Weight (%)</label>
                <Input
                  type="number"
                  name="examWeight"
                  step="0.5"
                  min="1"
                  max="99"
                  value={examWeight}
                  onChange={(e) => setExamWeight(parseFloat(e.target.value) || 0)}
                  required
                />
              </div>
            </div>

            {/* Live Weight Balance Indicator */}
            <div
              className={`p-2.5 rounded-md text-xs font-mono flex items-center justify-between border ${
                isValidTotal
                  ? "bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-300 dark:border-emerald-800"
                  : "bg-destructive/10 text-destructive border-destructive/20"
              }`}
            >
              <span className="font-semibold">
                Balance: {caWeight}% CA + {examWeight}% Exam = {totalWeight}%
              </span>
              {isValidTotal ? (
                <span className="flex items-center gap-1 font-bold text-emerald-700 dark:text-emerald-400">
                  <CheckCircle2 className="size-3.5" /> 100% Valid
                </span>
              ) : (
                <span className="flex items-center gap-1 font-bold text-destructive">
                  <AlertTriangle className="size-3.5" /> Must equal 100%
                </span>
              )}
            </div>
          </div>

          <DialogFooter className="mt-2">
            <DialogClose render={<Button variant="outline" type="button">Cancel</Button>} />
            <Button type="submit" disabled={loading || !isValidTotal}>
              {loading ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

