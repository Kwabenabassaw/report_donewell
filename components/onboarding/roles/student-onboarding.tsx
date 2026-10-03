"use client"

import React from "react"
import { GraduationCap, Award, FileCheck2, QrCode, CheckCircle2 } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

interface StudentOnboardingProps {
  context: {
    studentProfile?: {
      studentIdNumber: string
      fullName: string
      className: string
      subjectCount: number
    }
  }
}

export function StudentOnboardingView({ context }: StudentOnboardingProps) {
  const profile = context.studentProfile || {
    studentIdNumber: "STU-2026-001",
    fullName: "Student Learner",
    className: "Form 1A",
    subjectCount: 8,
  }

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="rounded-xl border bg-gradient-to-r from-cyan-500/10 via-cyan-500/5 to-transparent p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <GraduationCap className="size-5 text-cyan-600" />
              <h3 className="text-lg font-bold tracking-tight text-foreground">Welcome, {profile.fullName}</h3>
            </div>
            <p className="text-sm text-muted-foreground">
              Student Academic Portal & Official Terminal Reports
            </p>
          </div>
          <Badge className="bg-cyan-500/20 text-cyan-700 dark:text-cyan-300 hover:bg-cyan-500/30 border-cyan-500/30">
            Student
          </Badge>
        </div>
      </div>

      {/* Verified Profile Card */}
      <Card className="border bg-card/60">
        <CardContent className="p-4 grid grid-cols-3 gap-3">
          <div className="space-y-1">
            <span className="text-xs text-muted-foreground font-medium">Student ID Number</span>
            <p className="font-mono font-bold text-foreground">{profile.studentIdNumber}</p>
          </div>
          <div className="space-y-1">
            <span className="text-xs text-muted-foreground font-medium">Assigned Class</span>
            <p className="font-bold text-foreground">{profile.className}</p>
          </div>
          <div className="space-y-1">
            <span className="text-xs text-muted-foreground font-medium">Enrolled Subjects</span>
            <p className="font-bold text-foreground">{profile.subjectCount} Subjects</p>
          </div>
        </CardContent>
      </Card>

      {/* Terminal Report Guide */}
      <div className="space-y-3">
        <h4 className="text-sm font-semibold tracking-tight text-foreground flex items-center gap-2">
          <FileCheck2 className="size-4 text-cyan-600" /> How Your Academic Reports Work
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
          <div className="p-3.5 rounded-lg border bg-muted/30 flex items-start gap-3">
            <CheckCircle2 className="size-4 text-cyan-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-foreground">Official Published Results</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Once the Headmaster approves and publishes a term, you can view your grades, class positions, and teacher remarks.
              </p>
            </div>
          </div>

          <div className="p-3.5 rounded-lg border bg-muted/30 flex items-start gap-3">
            <QrCode className="size-4 text-cyan-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-foreground">QR Verification Stamp</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Every generated PDF report card contains an encrypted QR verification code allowing employers and institutions to verify authenticity.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
