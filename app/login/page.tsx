"use client"

import React, { useState } from "react"
import { useSearchParams } from "next/navigation"
import {
  GraduationCap,
  Lock,
  User,
  ArrowRight,
  Loader2,
  AlertTriangle,
  Shield,
  KeyRound,
  CheckCircle2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Alert, AlertDescription } from "@/components/ui/alert"

const DEMO_ACCOUNTS = [
  {
    role: "Super Admin",
    username: "admin",
    password: "KwabenaBassaw1974",
    badge: "Full Control",
    icon: "👑",
  },
  {
    role: "Headmaster",
    username: "headmaster",
    password: "Password123!",
    badge: "Approval & Finalization",
    icon: "🎓",
  },
  {
    role: "Exam Officer",
    username: "exam_officer",
    password: "Password123!",
    badge: "Moderation & Review",
    icon: "📋",
  },
  {
    role: "Mr. Mensah (Teacher)",
    username: "teacher_mensah",
    password: "Password123!",
    badge: "Math & Form Teacher",
    icon: "📐",
  },
  {
    role: "Ms. Asante (Teacher)",
    username: "teacher_asante",
    password: "Password123!",
    badge: "Science Teacher",
    icon: "🔬",
  },
]

export default function LoginPage() {
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const searchParams = useSearchParams()
  const redirect = searchParams.get("redirect") || "/dashboard"

  const handleLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (!username || !password) {
      setError("Please enter both username and password.")
      return
    }

    try {
      setLoading(true)
      setError(null)

      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || "Authentication failed.")
      }

      if (data.user && data.user.hasCompletedOnboarding === false) {
        window.location.href = "/onboarding"
      } else {
        window.location.href = redirect
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const fillDemoAccount = (u: string, p: string) => {
    setUsername(u)
    setPassword(p)
    setError(null)
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4 md:p-8 bg-gradient-to-br from-background via-muted/30 to-background">
      <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 rounded-2xl border bg-card shadow-2xl overflow-hidden">
        {/* Left Side: School Branding & Portal Identity */}
        <div className="relative hidden md:flex flex-col justify-between bg-primary p-10 text-primary-foreground">
          <div className="flex flex-col gap-4">
            <div className="flex size-12 items-center justify-center rounded-2xl bg-white/15 backdrop-blur-sm text-white shadow-inner">
              <GraduationCap className="size-7" />
            </div>
            <div>
              <h2 className="text-2xl font-bold tracking-tight">St. Augustine Academy</h2>
              <p className="text-sm text-primary-foreground/80 mt-1 font-mono">
                Knowledge, Character, and Excellence
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-3 text-xs text-primary-foreground/90 leading-relaxed bg-black/10 p-5 rounded-xl border border-white/10">
            <div className="font-semibold flex items-center gap-1.5 text-white">
              <Shield className="size-4" /> Official Examination Engine
            </div>
            <p>
              Authorized personnel only. All score entries, mark modifications, and result approvals are cryptographically recorded in an immutable audit trail.
            </p>
          </div>

          <div className="text-[11px] text-primary-foreground/60 font-mono">
            School Code: SAA-GH • v2.0 Production System
          </div>
        </div>

        {/* Right Side: Login Form */}
        <div className="p-8 md:p-10 flex flex-col justify-between gap-6">
          <div className="flex flex-col gap-2">
            <div className="md:hidden flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground mb-1">
              <GraduationCap className="size-6" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight">Staff & Academic Portal</h1>
            <p className="text-sm text-muted-foreground">
              Sign in with your academic credentials to manage student assessments and reports.
            </p>
          </div>

          {searchParams.get("logged_out") === "true" && !error && (
            <Alert variant="success">
              <CheckCircle2 className="size-4" />
              <AlertDescription>
                You have been successfully logged out of the examination portal.
              </AlertDescription>
            </Alert>
          )}

          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="size-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleLogin} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Username or Email
              </label>
              <div className="relative">
                <User className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="e.g. admin or teacher_mensah"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="pl-9 h-10"
                  autoComplete="username"
                  required
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
                <Input
                  type="password"
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-9 h-10"
                  autoComplete="current-password"
                  required
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-10 font-semibold gap-2 shadow-sm"
            >
              {loading ? (
                <>
                  <Loader2 className="size-4 animate-spin" /> Authenticating...
                </>
              ) : (
                <>
                  Sign In <ArrowRight className="size-4" />
                </>
              )}
            </Button>
          </form>

          {/* Quick-Fill Demo Credentials */}
          <div className="border-t pt-5 flex flex-col gap-3">
            <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <KeyRound className="size-3.5 text-primary" /> Quick Demo Role Switcher
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              {DEMO_ACCOUNTS.map((acc) => (
                <button
                  key={acc.username}
                  type="button"
                  onClick={() => fillDemoAccount(acc.username, acc.password)}
                  className="flex items-center justify-between rounded-lg border bg-muted/40 p-2 text-left hover:bg-muted hover:border-primary transition-colors cursor-pointer"
                >
                  <div className="truncate">
                    <div className="font-semibold flex items-center gap-1">
                      <span>{acc.icon}</span> <span className="truncate">{acc.role}</span>
                    </div>
                    <div className="font-mono text-[10px] text-muted-foreground">{acc.username}</div>
                  </div>
                  <span className="text-[10px] bg-background px-1.5 py-0.5 rounded border text-muted-foreground font-medium shrink-0 ml-1">
                    {acc.badge}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
