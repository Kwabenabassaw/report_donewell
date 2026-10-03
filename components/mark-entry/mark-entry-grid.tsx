"use client"

import React, { useState, useEffect, useRef, useTransition } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import {
  TableProperties,
  Save,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  Lock,
  Search,
  Sparkles,
  Download,
} from "lucide-react"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { saveScoresAction } from "@/app/actions/scores"
import { MarkCompletionStatus } from "@prisma/client"

interface AssessmentInfo {
  id: string
  title: string
  maxScore: number
  status: string
  category: {
    name: string
    component: {
      name: string
      code: string
      weight: number
    }
  }
}

interface StudentEnrollmentInfo {
  id: string
  rollNumber: string | null
  student: {
    id: string
    studentIdNumber: string
    firstName: string
    lastName: string
    gender: string
  }
}

interface ScoreInfo {
  id: string
  assessmentId: string
  studentEnrollmentId: string
  rawScore: number | null
  status: MarkCompletionStatus
}

interface MarkEntryGridProps {
  termId: string
  classId: string
  subjectId: string
  termName: string
  className: string
  subjectName: string
  subjectCode: string
  canEnterMarks: boolean
  assessments: AssessmentInfo[]
  enrollments: StudentEnrollmentInfo[]
  initialScores: ScoreInfo[]
}

export function MarkEntryGrid({
  termId,
  classId,
  subjectId,
  termName,
  className,
  subjectName,
  subjectCode,
  canEnterMarks,
  assessments,
  enrollments,
  initialScores,
}: MarkEntryGridProps) {
  // Key format: `${enrollmentId}:${assessmentId}`
  const [scoresMap, setScoresMap] = useState<Map<string, { rawScore: number | null; status: MarkCompletionStatus }>>(() => {
    const map = new Map<string, { rawScore: number | null; status: MarkCompletionStatus }>()
    initialScores.forEach((s) => {
      map.set(`${s.studentEnrollmentId}:${s.assessmentId}`, {
        rawScore: s.rawScore,
        status: s.status,
      })
    })
    return map
  })

  // Track modified keys
  const [dirtyKeys, setDirtyKeys] = useState<Set<string>>(new Set())
  const [focusedCell, setFocusedCell] = useState<{ rowIdx: number; colIdx: number } | null>(null)
  const [feedback, setFeedback] = useState<{ success?: boolean; message?: string } | null>(null)
  const inputRefs = useRef<Map<string, HTMLInputElement>>(new Map())

  // Save Mutation via TanStack React Query
  const saveMutation = useMutation({
    mutationFn: async () => {
      const dirtyEntries = Array.from(dirtyKeys).map((key) => {
        const [studentEnrollmentId, assessmentId] = key.split(":")
        const entry = scoresMap.get(key)
        return {
          studentEnrollmentId,
          assessmentId,
          rawScore: entry?.rawScore ?? null,
          status: entry?.status || MarkCompletionStatus.COMPLETE,
        }
      })

      return await saveScoresAction({
        termId,
        classId,
        subjectId,
        scores: dirtyEntries,
      })
    },
    onSuccess: (data) => {
      setDirtyKeys(new Set())
      setFeedback({
        success: true,
        message: `Successfully saved ${data.savedCount} student score(s).`,
      })
    },
    onError: (err: any) => {
      setFeedback({
        success: false,
        message: err.message || "Failed to save marks.",
      })
    },
  })

  // Handle Score Input
  const handleScoreChange = (
    enrollmentId: string,
    assessmentId: string,
    valStr: string
  ) => {
    const key = `${enrollmentId}:${assessmentId}`
    const rawVal = valStr.trim() === "" ? null : parseFloat(valStr)

    setScoresMap((prev) => {
      const next = new Map(prev)
      const current = next.get(key)
      next.set(key, {
        rawScore: rawVal,
        status: current?.status || MarkCompletionStatus.COMPLETE,
      })
      return next
    })

    setDirtyKeys((prev) => {
      const next = new Set(prev)
      next.add(key)
      return next
    })
    setFeedback(null)
  }

  // Handle Status Toggle (e.g. Absent, Exempt)
  const handleStatusChange = (
    enrollmentId: string,
    assessmentId: string,
    status: MarkCompletionStatus
  ) => {
    const key = `${enrollmentId}:${assessmentId}`
    setScoresMap((prev) => {
      const next = new Map(prev)
      const current = next.get(key)
      next.set(key, {
        rawScore: status === "ABSENT" || status === "EXEMPT" ? null : current?.rawScore ?? null,
        status,
      })
      return next
    })

    setDirtyKeys((prev) => {
      const next = new Set(prev)
      next.add(key)
      return next
    })
    setFeedback(null)
  }

  // Keyboard Navigation
  const handleKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    rowIdx: number,
    colIdx: number
  ) => {
    let nextRow = rowIdx
    let nextCol = colIdx

    if (e.key === "Enter" || e.key === "ArrowDown") {
      e.preventDefault()
      nextRow = Math.min(rowIdx + 1, enrollments.length - 1)
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      nextRow = Math.max(rowIdx - 1, 0)
    } else if (e.key === "ArrowRight") {
      const input = e.currentTarget
      if (input.selectionStart === input.value.length) {
        nextCol = Math.min(colIdx + 1, assessments.length - 1)
      }
    } else if (e.key === "ArrowLeft") {
      const input = e.currentTarget
      if (input.selectionStart === 0) {
        nextCol = Math.max(colIdx - 1, 0)
      }
    }

    if (nextRow !== rowIdx || nextCol !== colIdx) {
      const targetRef = inputRefs.current.get(`${nextRow}:${nextCol}`)
      if (targetRef) {
        targetRef.focus()
        targetRef.select()
        setFocusedCell({ rowIdx: nextRow, colIdx: nextCol })
      }
    }
  }

  // Clipboard Paste Support (Excel / Sheets Multi-cell Paste)
  const handlePaste = (
    e: React.ClipboardEvent<HTMLInputElement>,
    startRow: number,
    startCol: number
  ) => {
    e.preventDefault()
    const text = e.clipboardData.getData("text/plain")
    if (!text) return

    const rows = text.split(/\r?\n/).map((r) => r.split("\t"))
    const newScores = new Map(scoresMap)
    const newDirty = new Set(dirtyKeys)

    rows.forEach((rowValues, rOffset) => {
      const targetRow = startRow + rOffset
      if (targetRow >= enrollments.length) return
      const enrollment = enrollments[targetRow]

      rowValues.forEach((valStr, cOffset) => {
        const targetCol = startCol + cOffset
        if (targetCol >= assessments.length) return
        const assessment = assessments[targetCol]

        if (assessment.status === "LOCKED") return // skip locked

        const trimmed = valStr.trim()
        const parsed = trimmed === "" ? null : parseFloat(trimmed)
        if (parsed !== null && isNaN(parsed)) return // skip non-numbers

        const key = `${enrollment.id}:${assessment.id}`
        newScores.set(key, {
          rawScore: parsed,
          status: MarkCompletionStatus.COMPLETE,
        })
        newDirty.add(key)
      })
    })

    setScoresMap(newScores)
    setDirtyKeys(newDirty)
    setFeedback({
      success: true,
      message: `Pasted tabular marks across cells starting at row ${startRow + 1}.`,
    })
  }

  // Discard changes
  const handleDiscard = () => {
    const map = new Map<string, { rawScore: number | null; status: MarkCompletionStatus }>()
    initialScores.forEach((s) => {
      map.set(`${s.studentEnrollmentId}:${s.assessmentId}`, {
        rawScore: s.rawScore,
        status: s.status,
      })
    })
    setScoresMap(map)
    setDirtyKeys(new Set())
    setFeedback(null)
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Action Bar / Dirty Tracker */}
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-sm border rounded-lg p-4 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="font-mono text-xs px-2.5 py-1">
            {className} • {subjectCode} ({subjectName})
          </Badge>
          <Badge
            variant={canEnterMarks ? "secondary" : "destructive"}
            className="text-xs"
          >
            {canEnterMarks ? "Mark Entry Active" : "Term Locked"}
          </Badge>
          {dirtyKeys.size > 0 && (
            <span className="flex items-center gap-1.5 text-xs font-semibold text-amber-600 dark:text-amber-400">
              <span className="size-2 rounded-full bg-amber-500 animate-pulse" />
              {dirtyKeys.size} unsaved changes
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {dirtyKeys.size > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleDiscard}
              disabled={saveMutation.isPending}
            >
              <RotateCcw className="size-3.5 mr-1" /> Discard
            </Button>
          )}

          <Button
            size="sm"
            onClick={() => saveMutation.mutate()}
            disabled={!canEnterMarks || dirtyKeys.size === 0 || saveMutation.isPending}
            className="font-semibold"
          >
            <Save className="size-3.5 mr-1.5" />
            {saveMutation.isPending ? "Saving..." : `Save Changes (${dirtyKeys.size})`}
          </Button>
        </div>
      </div>

      {feedback && (
        <div
          className={`p-3 rounded-md border text-xs flex items-center gap-2 ${
            feedback.success
              ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-800 dark:text-emerald-300"
              : "bg-destructive/10 border-destructive/20 text-destructive"
          }`}
        >
          {feedback.success ? (
            <CheckCircle2 className="size-4 shrink-0 text-emerald-600" />
          ) : (
            <AlertCircle className="size-4 shrink-0" />
          )}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* Spreadsheet Grid */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto max-h-[70vh]">
            <Table className="border-collapse select-none">
              <TableHeader className="sticky top-0 bg-muted/80 backdrop-blur z-10">
                <TableRow>
                  <TableHead className="w-12 text-center text-xs font-mono">#</TableHead>
                  <TableHead className="w-28 text-xs">Student ID</TableHead>
                  <TableHead className="min-w-44 text-xs">Student Name</TableHead>
                  <TableHead className="w-16 text-center text-xs">Roll</TableHead>

                  {/* Assessment Columns */}
                  {assessments.map((a, colIdx) => (
                    <TableHead key={a.id} className="min-w-28 text-center text-xs p-2">
                      <div className="flex flex-col items-center gap-0.5">
                        <span className="font-semibold text-foreground text-xs line-clamp-1">
                          {a.title}
                        </span>
                        <div className="flex items-center gap-1">
                          <span className="text-[10px] text-muted-foreground font-mono">
                            Max: {a.maxScore}
                          </span>
                          {a.status === "LOCKED" && (
                            <Lock className="size-3 text-destructive" />
                          )}
                        </div>
                      </div>
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {enrollments.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={4 + assessments.length}
                      className="text-center p-8 text-muted-foreground"
                    >
                      No enrolled students found registered for {subjectName} in {className}.
                    </TableCell>
                  </TableRow>
                ) : (
                  enrollments.map((enrollment, rowIdx) => (
                    <TableRow key={enrollment.id} className="hover:bg-muted/30">
                      <TableCell className="text-center font-mono text-xs text-muted-foreground p-2">
                        {rowIdx + 1}
                      </TableCell>
                      <TableCell className="font-mono text-xs font-semibold text-primary p-2">
                        {enrollment.student.studentIdNumber}
                      </TableCell>
                      <TableCell className="font-medium text-xs p-2 whitespace-nowrap">
                        {enrollment.student.lastName}, {enrollment.student.firstName}
                      </TableCell>
                      <TableCell className="text-center font-mono text-xs text-muted-foreground p-2">
                        {enrollment.rollNumber || "—"}
                      </TableCell>

                      {/* Score Input Cells */}
                      {assessments.map((assessment, colIdx) => {
                        const cellKey = `${enrollment.id}:${assessment.id}`
                        const current = scoresMap.get(cellKey)
                        const isDirty = dirtyKeys.has(cellKey)
                        const isLocked = assessment.status === "LOCKED" || !canEnterMarks
                        const scoreVal = current?.rawScore
                        const isExceeding =
                          scoreVal !== null &&
                          scoreVal !== undefined &&
                          (scoreVal > assessment.maxScore || scoreVal < 0)

                        return (
                          <TableCell
                            key={assessment.id}
                            className={`p-1 text-center transition-colors ${
                              isDirty ? "bg-amber-500/10 dark:bg-amber-500/20" : ""
                            }`}
                          >
                            <div className="relative flex items-center justify-center">
                              <input
                                ref={(el) => {
                                  if (el) inputRefs.current.set(`${rowIdx}:${colIdx}`, el)
                                  else inputRefs.current.delete(`${rowIdx}:${colIdx}`)
                                }}
                                type="number"
                                step="0.5"
                                min="0"
                                max={assessment.maxScore}
                                disabled={isLocked}
                                value={current?.rawScore ?? ""}
                                onChange={(e) =>
                                  handleScoreChange(enrollment.id, assessment.id, e.target.value)
                                }
                                onKeyDown={(e) => handleKeyDown(e, rowIdx, colIdx)}
                                onPaste={(e) => handlePaste(e, rowIdx, colIdx)}
                                onFocus={() => setFocusedCell({ rowIdx, colIdx })}
                                className={`w-20 h-8 text-center text-xs font-mono font-semibold rounded border transition-all ${
                                  isExceeding
                                    ? "border-destructive bg-destructive/10 text-destructive focus:ring-destructive"
                                    : isDirty
                                    ? "border-amber-500 font-bold focus:ring-amber-500"
                                    : "border-input bg-background focus:ring-primary"
                                } ${isLocked ? "bg-muted text-muted-foreground cursor-not-allowed opacity-80" : ""}`}
                              />
                              {isDirty && (
                                <span className="absolute -top-1 -right-1 size-2 rounded-full bg-amber-500" />
                              )}
                            </div>
                          </TableCell>
                        )
                      })}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
