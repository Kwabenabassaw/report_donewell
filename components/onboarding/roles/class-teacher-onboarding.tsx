"use client"

import React from "react"
import { Users, UserCheck, CalendarCheck, MessageSquareQuote, CheckCircle2, AlertCircle } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

interface ClassTeacherOnboardingProps {
  context: {
    classesSupervised?: Array<{
      id: string
      name: string
      gradeLevel: string
      stream?: string | null
      studentCount: number
    }>
    activeTerm?: { name: string; status: string }
  }
}

export function ClassTeacherOnboardingView({ context }: ClassTeacherOnboardingProps) {
  const supervised = context.classesSupervised || []
  const hasClasses = supervised.length > 0

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="rounded-xl border bg-gradient-to-r from-emerald-500/10 via-emerald-500/5 to-transparent p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <UserCheck className="size-5 text-emerald-600" />
              <h3 className="text-lg font-bold tracking-tight text-foreground">Form Master & Class Supervision</h3>
            </div>
            <p className="text-sm text-muted-foreground">
              Overseeing Student Attendance, Conduct Ratings, and Terminal Report Remarks
            </p>
          </div>
          <Badge className="bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/30 border-emerald-500/30">
            Class Teacher
          </Badge>
        </div>
      </div>

      {/* Supervised Class Verification */}
      <div className="space-y-3">
        <h4 className="text-sm font-semibold tracking-tight text-foreground flex items-center gap-2">
          <Users className="size-4 text-emerald-600" /> Supervised Class Assignment Verification
        </h4>

        {hasClasses ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {supervised.map((cls) => (
              <Card key={cls.id} className="border bg-card/60">
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="space-y-0.5">
                    <p className="font-bold text-base text-foreground">{cls.name}</p>
                    <p className="text-xs text-muted-foreground">Grade Level: {cls.gradeLevel}</p>
                  </div>
                  <div className="text-right">
                    <Badge variant="secondary" className="font-mono text-xs">
                      {cls.studentCount} Students
                    </Badge>
                    <p className="text-[10px] text-emerald-600 font-medium mt-1 flex items-center gap-1 justify-end">
                      <CheckCircle2 className="size-3" /> Active Supervision
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="p-4 rounded-xl border border-dashed bg-muted/20 flex items-center gap-3">
            <AlertCircle className="size-5 text-amber-500 shrink-0" />
            <div className="text-xs">
              <p className="font-medium text-foreground">No Supervised Class Currently Assigned</p>
              <p className="text-muted-foreground mt-0.5">
                The Academic Officer or Administrator will assign your designated class stream shortly.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Core Responsibilities */}
      <div className="space-y-3">
        <h4 className="text-sm font-semibold tracking-tight text-foreground flex items-center gap-2">
          <CalendarCheck className="size-4 text-emerald-600" /> End-of-Term Evaluation Requirements
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
          <div className="p-3.5 rounded-lg border bg-muted/30 flex items-start gap-3">
            <CheckCircle2 className="size-4 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-foreground">Attendance Records</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Record total Days Present and Days Absent for each student on their terminal card.
              </p>
            </div>
          </div>

          <div className="p-3.5 rounded-lg border bg-muted/30 flex items-start gap-3">
            <CheckCircle2 className="size-4 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-foreground">Form Master Remarks</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Provide qualitative behavioral remarks and academic recommendations in the Form Evaluations module.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
