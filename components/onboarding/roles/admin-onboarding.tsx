"use client"

import React from "react"
import { Building2, ShieldCheck, Users, Calendar, Award, CheckCircle2, FileText, Database } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

interface AdminOnboardingProps {
  context: {
    schoolProfile?: {
      schoolName: string
      schoolCode: string
      motto: string
      email?: string
      phone?: string
    }
    activeTerm?: {
      name: string
      status: string
      academicYearName: string
    }
    systemStats?: {
      userCount: number
      classCount: number
      studentCount: number
      subjectCount: number
    }
  }
}

export function AdminOnboardingView({ context }: AdminOnboardingProps) {
  const school = context.schoolProfile || {
    schoolName: "Demonstration Academy",
    schoolCode: "DEMO-001",
    motto: "Excellence and Integrity",
  }
  const term = context.activeTerm || {
    name: "First Term",
    status: "MARK_ENTRY",
    academicYearName: "2026/2027",
  }
  const stats = context.systemStats || {
    userCount: 12,
    classCount: 8,
    studentCount: 320,
    subjectCount: 14,
  }

  return (
    <div className="space-y-6">
      {/* School Identity Header */}
      <div className="rounded-xl border bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Building2 className="size-5 text-primary" />
              <h3 className="text-lg font-bold tracking-tight text-foreground">{school.schoolName}</h3>
              <Badge variant="outline" className="font-mono text-xs">{school.schoolCode}</Badge>
            </div>
            <p className="text-sm italic text-muted-foreground">"{school.motto}"</p>
          </div>
          <Badge className="bg-primary/20 text-primary hover:bg-primary/30 border-primary/30">
            Super Administrator
          </Badge>
        </div>
      </div>

      {/* System Pulse Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="border bg-card/60">
          <CardContent className="p-4 flex flex-col gap-1">
            <span className="text-xs text-muted-foreground flex items-center gap-1.5 font-medium">
              <Users className="size-3.5 text-blue-500" /> Staff & Users
            </span>
            <span className="text-2xl font-bold font-mono text-foreground">{stats.userCount}</span>
            <span className="text-[11px] text-muted-foreground">Configured Accounts</span>
          </CardContent>
        </Card>

        <Card className="border bg-card/60">
          <CardContent className="p-4 flex flex-col gap-1">
            <span className="text-xs text-muted-foreground flex items-center gap-1.5 font-medium">
              <Database className="size-3.5 text-emerald-500" /> Active Classes
            </span>
            <span className="text-2xl font-bold font-mono text-foreground">{stats.classCount}</span>
            <span className="text-[11px] text-muted-foreground">Streams & Levels</span>
          </CardContent>
        </Card>

        <Card className="border bg-card/60">
          <CardContent className="p-4 flex flex-col gap-1">
            <span className="text-xs text-muted-foreground flex items-center gap-1.5 font-medium">
              <Award className="size-3.5 text-purple-500" /> Enrolled Students
            </span>
            <span className="text-2xl font-bold font-mono text-foreground">{stats.studentCount}</span>
            <span className="text-[11px] text-muted-foreground">Active Learners</span>
          </CardContent>
        </Card>

        <Card className="border bg-card/60">
          <CardContent className="p-4 flex flex-col gap-1">
            <span className="text-xs text-muted-foreground flex items-center gap-1.5 font-medium">
              <Calendar className="size-3.5 text-amber-500" /> Active Session
            </span>
            <span className="text-sm font-bold truncate text-foreground">{term.name}</span>
            <span className="text-[11px] text-muted-foreground font-mono">{term.academicYearName}</span>
          </CardContent>
        </Card>
      </div>

      {/* Key Administrative Modules */}
      <div className="space-y-3">
        <h4 className="text-sm font-semibold tracking-tight text-foreground flex items-center gap-2">
          <ShieldCheck className="size-4 text-primary" /> Key Administrative Responsibilities
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
          <div className="p-3.5 rounded-lg border bg-muted/30 flex items-start gap-3">
            <CheckCircle2 className="size-4 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-foreground">User & Access Management</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Assign roles (Headmaster, Exam Officer, Teachers), reset credentials, and monitor staff status.
              </p>
            </div>
          </div>

          <div className="p-3.5 rounded-lg border bg-muted/30 flex items-start gap-3">
            <CheckCircle2 className="size-4 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-foreground">Academic Cycle Transitions</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Initiate terms, transition lifecycle states from Mark Entry to Under Review and Published.
              </p>
            </div>
          </div>

          <div className="p-3.5 rounded-lg border bg-muted/30 flex items-start gap-3">
            <CheckCircle2 className="size-4 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-foreground">Grading Policies & Standards</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Maintain standard grade boundaries (A1-F9), credit weights, and remark templates.
              </p>
            </div>
          </div>

          <div className="p-3.5 rounded-lg border bg-muted/30 flex items-start gap-3">
            <CheckCircle2 className="size-4 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-foreground">Tamper-Proof Audit Logging</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Review automated cryptographic logs of all score modifications, approvals, and logins.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
