"use client"

import React from "react"
import { BookOpen, FileSpreadsheet, Award, Calculator, Sliders, CheckCircle2, ShieldAlert } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

interface ExamOfficerOnboardingProps {
  context: {
    activeTerm?: { name: string; status: string; academicYearName: string }
    examOfficerStats?: { policyCount: number; allocationCount: number; assessmentCount: number }
  }
}

export function ExamOfficerOnboardingView({ context }: ExamOfficerOnboardingProps) {
  const term = context.activeTerm || { name: "First Term", status: "MARK_ENTRY", academicYearName: "2026/2027" }
  const stats = context.examOfficerStats || { policyCount: 3, allocationCount: 24, assessmentCount: 48 }

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="rounded-xl border bg-gradient-to-r from-blue-500/10 via-blue-500/5 to-transparent p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <FileSpreadsheet className="size-5 text-blue-600" />
              <h3 className="text-lg font-bold tracking-tight text-foreground">Academic Assessment & Examination Engine</h3>
            </div>
            <p className="text-sm text-muted-foreground">
              Managing Grading Scales, Subject Allocations, Statistical Moderation & Report Generation
            </p>
          </div>
          <Badge className="bg-blue-500/20 text-blue-700 dark:text-blue-300 hover:bg-blue-500/30 border-blue-500/30">
            Exam Officer
          </Badge>
        </div>
      </div>

      {/* Operational Highlights */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="border bg-card/60">
          <CardContent className="p-4 flex flex-col gap-1">
            <span className="text-xs text-muted-foreground flex items-center gap-1.5 font-medium">
              <Award className="size-3.5 text-purple-500" /> Grading Policies
            </span>
            <span className="text-2xl font-bold font-mono text-foreground">{stats.policyCount}</span>
            <span className="text-[11px] text-muted-foreground">Active Scale Frameworks</span>
          </CardContent>
        </Card>

        <Card className="border bg-card/60">
          <CardContent className="p-4 flex flex-col gap-1">
            <span className="text-xs text-muted-foreground flex items-center gap-1.5 font-medium">
              <BookOpen className="size-3.5 text-blue-500" /> Subject Allocations
            </span>
            <span className="text-2xl font-bold font-mono text-foreground">{stats.allocationCount}</span>
            <span className="text-[11px] text-muted-foreground">Assigned Teacher Slots</span>
          </CardContent>
        </Card>

        <Card className="border bg-card/60">
          <CardContent className="p-4 flex flex-col gap-1">
            <span className="text-xs text-muted-foreground flex items-center gap-1.5 font-medium">
              <Calculator className="size-3.5 text-emerald-500" /> Current Term
            </span>
            <span className="text-sm font-bold truncate text-foreground">{term.name}</span>
            <span className="text-[11px] text-muted-foreground font-mono">{term.status}</span>
          </CardContent>
        </Card>
      </div>

      {/* Primary Operations Guide */}
      <div className="space-y-3">
        <h4 className="text-sm font-semibold tracking-tight text-foreground flex items-center gap-2">
          <Sliders className="size-4 text-blue-600" /> Examination Operations Blueprint
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
          <div className="p-3.5 rounded-lg border bg-muted/30 flex items-start gap-3">
            <CheckCircle2 className="size-4 text-blue-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-foreground">Teacher Allocations & Deadlines</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Ensure every subject stream has an authorized teacher before mark entry window opens.
              </p>
            </div>
          </div>

          <div className="p-3.5 rounded-lg border bg-muted/30 flex items-start gap-3">
            <CheckCircle2 className="size-4 text-blue-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-foreground">Moderation & Anomaly Auditing</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Inspect raw mark distributions, flag grade clustering, and authorize mark re-openings.
              </p>
            </div>
          </div>

          <div className="p-3.5 rounded-lg border bg-muted/30 flex items-start gap-3">
            <CheckCircle2 className="size-4 text-blue-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-foreground">Standardized Term Calculations</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Execute automated calculation jobs: dense ranking, student GPA/aggregates, and class statistics.
              </p>
            </div>
          </div>

          <div className="p-3.5 rounded-lg border bg-muted/30 flex items-start gap-3">
            <CheckCircle2 className="size-4 text-blue-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-foreground">Report Template & QR Publishing</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Customize report card visual styling and verify secure digital QR authentication stamps.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
