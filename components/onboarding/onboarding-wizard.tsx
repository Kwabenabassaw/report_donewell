"use client"

import React, { useState } from "react"
import { useRouter } from "next/navigation"
import {
  Shield,
  KeyRound,
  User,
  Phone,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Lock,
  Sparkles,
  Loader2,
  GraduationCap,
  Award,
  AlertTriangle,
  Building2,
  Check,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { completeOnboardingAction, OnboardingContextData } from "@/app/actions/onboarding"

import { AdminOnboardingView } from "./roles/admin-onboarding"
import { HeadmasterOnboardingView } from "./roles/headmaster-onboarding"
import { ExamOfficerOnboardingView } from "./roles/exam-officer-onboarding"
import { ClassTeacherOnboardingView } from "./roles/class-teacher-onboarding"
import { SubjectTeacherOnboardingView } from "./roles/subject-teacher-onboarding"
import { StudentOnboardingView } from "./roles/student-onboarding"
import { GuardianOnboardingView } from "./roles/guardian-onboarding"

interface OnboardingWizardProps {
  initialData: OnboardingContextData
}

const STEPS = [
  { id: 1, title: "Security & Credentials", desc: "Password & Contact" },
  { id: 2, title: "Role Briefing", desc: "Scope & Assigned Data" },
  { id: 3, title: "Workflow Guide", desc: "Quick Checklist" },
  { id: 4, title: "Complete", desc: "Enter Dashboard" },
]

export function OnboardingWizard({ initialData }: OnboardingWizardProps) {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { user, roleContext } = initialData

  // Form states
  const [displayName, setDisplayName] = useState(user.displayName || "")
  const [phone, setPhone] = useState(user.phone || "")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")

  // Quick Checklist completed states
  const [checklist, setChecklist] = useState<Record<string, boolean>>({
    task1: false,
    task2: false,
    task3: false,
  })

  const toggleChecklist = (key: string) => {
    setChecklist((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  // Validation for Step 1
  const validateStep1 = () => {
    setError(null)
    if (!displayName.trim()) {
      setError("Please provide a valid display name.")
      return false
    }

    if (user.mustChangePassword || newPassword.length > 0) {
      if (newPassword.length < 8) {
        setError("Your password must be at least 8 characters long.")
        return false
      }
      if (newPassword !== confirmPassword) {
        setError("New password and confirmation do not match.")
        return false
      }
    }
    return true
  }

  const handleNext = () => {
    if (currentStep === 1) {
      if (!validateStep1()) return
    }
    setError(null)
    setCurrentStep((prev) => Math.min(prev + 1, STEPS.length))
  }

  const handleBack = () => {
    setError(null)
    setCurrentStep((prev) => Math.max(prev - 1, 1))
  }

  const handleComplete = async () => {
    try {
      setLoading(true)
      setError(null)

      const res = await completeOnboardingAction({
        displayName: displayName.trim(),
        phone: phone.trim() || undefined,
        newPassword: newPassword.trim() || undefined,
      })

      if (!res.success) {
        throw new Error(res.error || "Failed to complete onboarding.")
      }

      window.location.href = "/dashboard"
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.")
      setLoading(false)
    }
  }

  // Render role-specific component for Step 2
  const renderRoleStep = () => {
    switch (user.activeRole) {
      case "SUPER_ADMIN":
        return <AdminOnboardingView context={roleContext} />
      case "HEADMASTER":
        return <HeadmasterOnboardingView context={roleContext} />
      case "EXAM_OFFICER":
        return <ExamOfficerOnboardingView context={roleContext} />
      case "CLASS_TEACHER":
        return <ClassTeacherOnboardingView context={roleContext} />
      case "SUBJECT_TEACHER":
        return <SubjectTeacherOnboardingView context={roleContext} />
      case "STUDENT":
        return <StudentOnboardingView context={roleContext} />
      case "GUARDIAN":
        return <GuardianOnboardingView context={roleContext} />
      default:
        return <SubjectTeacherOnboardingView context={roleContext} />
    }
  }

  // Render role-specific checklist for Step 3
  const renderChecklistStep = () => {
    const tasks: { id: string; label: string; detail: string }[] = []

    if (user.activeRole === "SUPER_ADMIN") {
      tasks.push(
        { id: "task1", label: "Verify School Profile & Brand Assets", detail: "Ensure school logo, motto, and contact info are up to date." },
        { id: "task2", label: "Confirm Active Academic Session", detail: "Verify the current academic year and active term are configured." },
        { id: "task3", label: "Inspect Staff User Accounts", detail: "Ensure form teachers and exam officers have active accounts." }
      )
    } else if (user.activeRole === "HEADMASTER") {
      tasks.push(
        { id: "task1", label: "Review Executive Enrollment Indicators", detail: "Inspect total student counts and gender distributions on the dashboard." },
        { id: "task2", label: "Understand 3-Tier Approval Workflow", detail: "Familiarize yourself with mark submission, moderation, and release gates." },
        { id: "task3", label: "Check SMS Notification Sender ID", detail: "Verify official school SMS alerts for parent report card dispatches." }
      )
    } else if (user.activeRole === "EXAM_OFFICER") {
      tasks.push(
        { id: "task1", label: "Review Grading Scales & Cut-offs", detail: "Check active grading boundaries (A1-F9) and credit weights." },
        { id: "task2", label: "Audit Teacher Subject Allocations", detail: "Ensure all subjects have an assigned teacher for mark submission." },
        { id: "task3", label: "Test Statistical Moderation Tools", detail: "Verify anomaly detection and ordinal ranking rules." }
      )
    } else if (user.activeRole === "CLASS_TEACHER") {
      tasks.push(
        { id: "task1", label: "Confirm Supervised Class Roster", detail: "Check all active students enrolled in your designated class." },
        { id: "task2", label: "Understand Attendance Entry Requirements", detail: "Ensure days present and absent are tracked for terminal cards." },
        { id: "task3", label: "Locate Form Master Remarks Panel", detail: "Know where to enter qualitative conduct and attitude ratings." }
      )
    } else if (user.activeRole === "SUBJECT_TEACHER") {
      tasks.push(
        { id: "task1", label: "Confirm Allocated Classes & Subjects", detail: "Verify the subjects and classes you are assigned to teach." },
        { id: "task2", label: "Test Spreadsheet Live-Grid Keyboard Controls", detail: "Learn arrow key and Enter navigation for lightning-fast mark entry." },
        { id: "task3", label: "Note Assessment Score Boundaries", detail: "Observe maximum score limits and autosave status indicators." }
      )
    } else if (user.activeRole === "STUDENT") {
      tasks.push(
        { id: "task1", label: "Check Student Identification Number", detail: "Confirm your registered ID and roll number match official records." },
        { id: "task2", label: "Learn Where to Download Terminal Reports", detail: "Know how to access your terminal report cards when published." },
        { id: "task3", label: "Understand QR Code Verification", detail: "Know how institutions can scan the QR code to verify your marks." }
      )
    } else {
      // Guardian
      tasks.push(
        { id: "task1", label: "Verify Linked Children / Wards", detail: "Confirm that all of your children attending the school appear in your portal." },
        { id: "task2", label: "Confirm SMS Alert Mobile Number", detail: "Ensure your mobile number is correct to receive automated report alerts." },
        { id: "task3", label: "Explore Terminal Report Card Downloads", detail: "Familiarize yourself with viewing and downloading official PDF report cards." }
      )
    }

    return (
      <div className="space-y-4">
        <div className="rounded-xl border bg-muted/20 p-4">
          <p className="text-sm font-semibold text-foreground">Interactive Readiness Checklist</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Click to confirm understanding of your primary operational milestones.
          </p>
        </div>

        <div className="space-y-3">
          {tasks.map((task) => {
            const isChecked = !!checklist[task.id]
            return (
              <div
                key={task.id}
                onClick={() => toggleChecklist(task.id)}
                className={`p-4 rounded-xl border cursor-pointer transition-all flex items-start gap-3.5 select-none ${
                  isChecked
                    ? "bg-primary/5 border-primary/40 shadow-xs"
                    : "bg-card/70 border-border hover:border-primary/20"
                }`}
              >
                <div
                  className={`size-5 rounded-md border flex items-center justify-center shrink-0 mt-0.5 transition-colors ${
                    isChecked
                      ? "bg-primary border-primary text-primary-foreground"
                      : "border-muted-foreground/40 bg-background"
                  }`}
                >
                  {isChecked && <Check className="size-3.5 stroke-[3]" />}
                </div>
                <div className="space-y-0.5">
                  <p className={`text-sm font-semibold ${isChecked ? "text-primary" : "text-foreground"}`}>
                    {task.label}
                  </p>
                  <p className="text-xs text-muted-foreground">{task.detail}</p>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  // Render Step 4 Completion
  const renderCompletionStep = () => {
    return (
      <div className="text-center py-6 space-y-5">
        <div className="size-16 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 text-white flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/20">
          <Sparkles className="size-8" />
        </div>

        <div className="space-y-2 max-w-md mx-auto">
          <h3 className="text-2xl font-bold tracking-tight text-foreground">You're All Set!</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Your credentials have been secured and your role profile has been initialized for{" "}
            <span className="font-semibold text-foreground">{initialData.roleContext?.schoolProfile?.schoolName || "the Academy"}</span>.
          </p>
        </div>

        <div className="p-4 rounded-xl border bg-muted/20 max-w-md mx-auto text-left space-y-2 text-xs">
          <div className="flex justify-between py-1 border-b">
            <span className="text-muted-foreground">Account User:</span>
            <span className="font-mono font-medium text-foreground">{user.username}</span>
          </div>
          <div className="flex justify-between py-1 border-b">
            <span className="text-muted-foreground">Display Name:</span>
            <span className="font-medium text-foreground">{displayName}</span>
          </div>
          <div className="flex justify-between py-1 border-b">
            <span className="text-muted-foreground">Designated Role:</span>
            <Badge variant="outline" className="font-mono text-[10px]">{user.activeRole}</Badge>
          </div>
          <div className="flex justify-between py-1">
            <span className="text-muted-foreground">Onboarding Status:</span>
            <span className="font-semibold text-emerald-600 flex items-center gap-1">
              <CheckCircle2 className="size-3" /> Certified Ready
            </span>
          </div>
        </div>
      </div>
    )
  }

  const progressPercent = Math.round((currentStep / STEPS.length) * 100)

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 md:p-8 bg-muted/20">
      {/* Background Glow */}
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/10 via-transparent to-transparent" />

      <div className="w-full max-w-3xl z-10 space-y-6">
        {/* Brand Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-xl bg-white border border-border/60 flex items-center justify-center shadow-xs overflow-hidden">
              {roleContext.schoolProfile?.crestUrl ? (
                <img
                  src={roleContext.schoolProfile.crestUrl}
                  alt={roleContext.schoolProfile.schoolName || "School Logo"}
                  className="h-full w-full object-contain p-0.5"
                />
              ) : (
                <div className="size-full bg-primary text-primary-foreground flex items-center justify-center">
                  <GraduationCap className="size-6" />
                </div>
              )}
            </div>
            <div>
              <h2 className="text-base font-bold tracking-tight text-foreground">
                {roleContext.schoolProfile?.schoolName || "Donewell Academy"}
              </h2>
              <p className="text-xs text-muted-foreground">First-Time Setup & Orientation</p>
            </div>
          </div>
          <Badge variant="outline" className="font-mono text-xs px-2.5 py-1">
            {user.activeRole}
          </Badge>
        </div>

        {/* Stepper Navigation Indicator */}
        <div className="rounded-xl border bg-card/60 p-4 space-y-3">
          <div className="grid grid-cols-4 gap-2">
            {STEPS.map((s) => {
              const isCompleted = s.id < currentStep
              const isCurrent = s.id === currentStep
              return (
                <div
                  key={s.id}
                  className={`flex flex-col gap-1 transition-all ${
                    isCurrent ? "opacity-100" : isCompleted ? "opacity-90" : "opacity-40"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <div
                      className={`size-6 rounded-full text-xs font-bold flex items-center justify-center shrink-0 ${
                        isCompleted
                          ? "bg-emerald-600 text-white"
                          : isCurrent
                          ? "bg-primary text-primary-foreground shadow-xs"
                          : "bg-muted text-muted-foreground border"
                      }`}
                    >
                      {isCompleted ? <Check className="size-3.5" /> : s.id}
                    </div>
                    <span className="text-xs font-semibold truncate hidden sm:inline">{s.title}</span>
                  </div>
                  <div
                    className={`h-1 rounded-full ${
                      isCompleted ? "bg-emerald-600" : isCurrent ? "bg-primary" : "bg-muted"
                    }`}
                  />
                </div>
              )
            })}
          </div>
        </div>

        {/* Main Card */}
        <Card className="border shadow-md bg-card">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-xl">
                  {currentStep === 1 && "Security & Personal Credentials"}
                  {currentStep === 2 && "Operational Scope & Live Context"}
                  {currentStep === 3 && "Core Workflow & Checklist"}
                  {currentStep === 4 && "Orientation Completed"}
                </CardTitle>
                <CardDescription className="text-xs mt-1">
                  {currentStep === 1 && "Set your secure password and verify your profile contact information."}
                  {currentStep === 2 && "Review your active permissions, allocations, and institutional assignments."}
                  {currentStep === 3 && "Complete your readiness milestones before entering the system."}
                  {currentStep === 4 && "Your account is fully primed and ready for operation."}
                </CardDescription>
              </div>
              <span className="text-xs font-mono text-muted-foreground">Step {currentStep} of {STEPS.length}</span>
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            {error && (
              <Alert variant="destructive" className="py-2.5">
                <AlertTriangle className="size-4" />
                <AlertDescription className="text-xs">{error}</AlertDescription>
              </Alert>
            )}

            {/* STEP 1: Security & Credentials */}
            {currentStep === 1 && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                      <User className="size-3.5 text-muted-foreground" /> Full Display Name
                    </label>
                    <Input
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="e.g. Dr. John Doe"
                      className="text-sm"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                      <Phone className="size-3.5 text-muted-foreground" /> Mobile Phone (For SMS Notifications)
                    </label>
                    <Input
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+233 20 123 4567"
                      className="text-sm"
                    />
                  </div>
                </div>

                <div className="pt-3 border-t space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                        <Lock className="size-3.5 text-primary" /> Initialize New Password
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        {user.mustChangePassword
                          ? "You are currently using temporary default credentials. A new password is required."
                          : "Optionally update your password for this account."}
                      </p>
                    </div>
                    {user.mustChangePassword && (
                      <Badge variant="destructive" className="text-[10px]">
                        Required
                      </Badge>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-muted-foreground">New Password</label>
                      <Input
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="At least 8 characters"
                        className="text-sm"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-muted-foreground">Confirm New Password</label>
                      <Input
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Re-enter password"
                        className="text-sm"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 2: Role Briefing */}
            {currentStep === 2 && renderRoleStep()}

            {/* STEP 3: Workflow Checklist */}
            {currentStep === 3 && renderChecklistStep()}

            {/* STEP 4: Completion */}
            {currentStep === 4 && renderCompletionStep()}
          </CardContent>

          <CardFooter className="flex items-center justify-between pt-4 border-t">
            {currentStep > 1 && currentStep < 4 ? (
              <Button variant="outline" size="sm" onClick={handleBack} disabled={loading}>
                <ArrowLeft className="size-4 mr-1.5" /> Back
              </Button>
            ) : (
              <div />
            )}

            {currentStep < 4 ? (
              <Button size="sm" onClick={handleNext} className="gap-1.5">
                Continue <ArrowRight className="size-4" />
              </Button>
            ) : (
              <Button
                size="sm"
                onClick={handleComplete}
                disabled={loading}
                className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
              >
                {loading ? (
                  <>
                    <Loader2 className="size-4 animate-spin" /> Finalizing Setup...
                  </>
                ) : (
                  <>
                    Launch My Dashboard <ArrowRight className="size-4" />
                  </>
                )}
              </Button>
            )}
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}
