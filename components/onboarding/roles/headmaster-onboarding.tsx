"use client"

import React from "react"
import { GraduationCap, Award, ShieldAlert, FileCheck2, ArrowRight, CheckCircle2, TrendingUp, Lock } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

interface HeadmasterOnboardingProps {
  context: {
    schoolProfile?: { schoolName: string; schoolCode: string }
    activeTerm?: { name: string; status: string; academicYearName: string }
    executiveStats?: { studentCount: number; classCount: number; pendingApprovalsCount: number }
  }
}

export function HeadmasterOnboardingView({ context }: HeadmasterOnboardingProps) {
  const school = context.schoolProfile || { schoolName: "Demonstration Academy", schoolCode: "DEMO-001" }
  const term = context.activeTerm || { name: "First Term", status: "MARK_ENTRY", academicYearName: "2026/2027" }
  const stats = context.executiveStats || { studentCount: 320, classCount: 8, pendingApprovalsCount: 0 }

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="rounded-xl border bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <GraduationCap className="size-5 text-amber-600" />
              <h3 className="text-lg font-bold tracking-tight text-foreground">{school.schoolName}</h3>
            </div>
            <p className="text-sm text-muted-foreground">
              Principal Executive Dashboard & Formal Terminal Approvals
            </p>
          </div>
          <Badge className="bg-amber-500/20 text-amber-700 dark:text-amber-300 hover:bg-amber-500/30 border-amber-500/30">
            Headmaster
          </Badge>
        </div>
      </div>

      {/* Institutional Vital Signs */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="border bg-card/60">
          <CardContent className="p-4 flex flex-col gap-1">
            <span className="text-xs text-muted-foreground flex items-center gap-1.5 font-medium">
              <TrendingUp className="size-3.5 text-blue-500" /> Total Enrollment
            </span>
            <span className="text-2xl font-bold font-mono text-foreground">{stats.studentCount}</span>
            <span className="text-[11px] text-muted-foreground">Across {stats.classCount} Classes</span>
          </CardContent>
        </Card>

        <Card className="border bg-card/60">
          <CardContent className="p-4 flex flex-col gap-1">
            <span className="text-xs text-muted-foreground flex items-center gap-1.5 font-medium">
              <Award className="size-3.5 text-emerald-500" /> Academic Session
            </span>
            <span className="text-sm font-bold truncate text-foreground">{term.name}</span>
            <span className="text-[11px] text-muted-foreground font-mono">{term.academicYearName}</span>
          </CardContent>
        </Card>

        <Card className="border bg-card/60">
          <CardContent className="p-4 flex flex-col gap-1">
            <span className="text-xs text-muted-foreground flex items-center gap-1.5 font-medium">
              <ShieldAlert className="size-3.5 text-purple-500" /> Pending Sign-offs
            </span>
            <span className="text-2xl font-bold font-mono text-foreground">{stats.pendingApprovalsCount}</span>
            <span className="text-[11px] text-muted-foreground">Terms Awaiting Release</span>
          </CardContent>
        </Card>
      </div>

      {/* Terminal Approval Pipeline Walkthrough */}
      <div className="space-y-3">
        <h4 className="text-sm font-semibold tracking-tight text-foreground flex items-center gap-2">
          <Lock className="size-4 text-amber-600" /> Terminal Result Certification Pipeline
        </h4>
        <div className="p-4 rounded-xl border bg-muted/20 space-y-3 text-xs md:text-sm">
          <div className="flex items-center gap-3">
            <div className="size-7 rounded-full bg-blue-500/10 text-blue-600 font-bold flex items-center justify-center shrink-0">1</div>
            <div>
              <p className="font-semibold text-foreground">Teacher Score Entry & Submission</p>
              <p className="text-muted-foreground text-xs">Subject teachers enter continuous assessment and exam marks via the live spreadsheet grid.</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="size-7 rounded-full bg-purple-500/10 text-purple-600 font-bold flex items-center justify-center shrink-0">2</div>
            <div>
              <p className="font-semibold text-foreground">Exam Officer Moderation & Calculation</p>
              <p className="text-muted-foreground text-xs">Scores are audited for statistical anomalies, standard deviations, and class rankings are calculated.</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="size-7 rounded-full bg-amber-500/10 text-amber-600 font-bold flex items-center justify-center shrink-0">3</div>
            <div>
              <p className="font-semibold text-foreground">Headmaster Executive Approval & Publication</p>
              <p className="text-muted-foreground text-xs">You review terminal analytics, affix institutional certification, and release tamper-proof QR report cards to parents.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
