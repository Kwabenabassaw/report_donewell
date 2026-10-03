"use client"

import React from "react"
import { BookOpen, TableProperties, Keyboard, Sparkles, CheckCircle2, AlertCircle } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

interface SubjectTeacherOnboardingProps {
  context: {
    allocations?: Array<{
      id: string
      className: string
      gradeLevel: string
      subjectName: string
      subjectCode: string
    }>
    activeTerm?: { name: string; status: string }
  }
}

export function SubjectTeacherOnboardingView({ context }: SubjectTeacherOnboardingProps) {
  const allocations = context.allocations || []
  const hasAllocations = allocations.length > 0

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="rounded-xl border bg-gradient-to-r from-indigo-500/10 via-indigo-500/5 to-transparent p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <TableProperties className="size-5 text-indigo-600" />
              <h3 className="text-lg font-bold tracking-tight text-foreground">Course Instruction & Mark Entry</h3>
            </div>
            <p className="text-sm text-muted-foreground">
              Direct Spreadsheet Entry for Continuous Assessments and Terminal Examinations
            </p>
          </div>
          <Badge className="bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-500/30 border-indigo-500/30">
            Subject Teacher
          </Badge>
        </div>
      </div>

      {/* Allocated Classes & Subjects */}
      <div className="space-y-3">
        <h4 className="text-sm font-semibold tracking-tight text-foreground flex items-center gap-2">
          <BookOpen className="size-4 text-indigo-600" /> Assigned Teaching Slots ({allocations.length})
        </h4>

        {hasAllocations ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {allocations.map((alloc) => (
              <Card key={alloc.id} className="border bg-card/60">
                <CardContent className="p-3.5 flex items-center justify-between">
                  <div className="space-y-0.5">
                    <p className="font-bold text-sm text-foreground">{alloc.subjectName}</p>
                    <p className="text-xs text-muted-foreground">
                      Class: <span className="font-medium text-foreground">{alloc.className}</span> ({alloc.gradeLevel})
                    </p>
                  </div>
                  <Badge variant="outline" className="font-mono text-xs">
                    {alloc.subjectCode}
                  </Badge>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="p-4 rounded-xl border border-dashed bg-muted/20 flex items-center gap-3">
            <AlertCircle className="size-5 text-amber-500 shrink-0" />
            <div className="text-xs">
              <p className="font-medium text-foreground">No Subject Allocations Found For Current Term</p>
              <p className="text-muted-foreground mt-0.5">
                Contact the Academic Officer or Exam Officer if you believe your assignments are missing.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Spreadsheet Mark Entry Tips */}
      <div className="space-y-3">
        <h4 className="text-sm font-semibold tracking-tight text-foreground flex items-center gap-2">
          <Keyboard className="size-4 text-indigo-600" /> Spreadsheet Live-Grid Power Tips
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
          <div className="p-3.5 rounded-lg border bg-muted/30 flex items-start gap-3">
            <CheckCircle2 className="size-4 text-indigo-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-foreground">Keyboard Driven Navigation</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Use <kbd className="px-1.5 py-0.5 text-[10px] font-mono bg-muted border rounded">Enter</kbd> or arrow keys to move between student cells effortlessly.
              </p>
            </div>
          </div>

          <div className="p-3.5 rounded-lg border bg-muted/30 flex items-start gap-3">
            <CheckCircle2 className="size-4 text-indigo-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-foreground">Instant Cloud Autosave</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Every keystroke is validated against assessment bounds and debounced saved to PostgreSQL securely.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
