"use client"

import React, { useState } from "react"
import { useSearchParams } from "next/navigation"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldSeparator,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Lock,
  User,
  ShieldCheck,
  Sparkles,
} from "lucide-react"

interface LoginFormProps extends React.ComponentProps<"div"> {
  schoolProfile?: {
    schoolName: string
    schoolCode: string
    motto?: string | null
    crestUrl?: string | null
  } | null
}

export function LoginForm({
  className,
  schoolProfile,
  ...props
}: LoginFormProps) {
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const searchParams = useSearchParams()
  const redirect = searchParams.get("redirect") || "/dashboard"
  const isLoggedOut = searchParams.get("logged_out") === "true"

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!username || !password) {
      setError("Please provide both your username and password.")
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
      setError(err.message || "An unexpected error occurred.")
      setLoading(false)
    }
  }

  const fillAdmin = () => {
    setUsername("admin")
    setPassword("KwabenaBassaw1974")
    setError(null)
  }

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card className="border shadow-md">
        <CardHeader className="text-center pb-4">
          <CardTitle className="text-xl font-bold tracking-tight">
            Academic Portal Sign In
          </CardTitle>
          <CardDescription>
            Enter your credentials to access examination, reports, and administrative tools
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin}>
            <FieldGroup>
              {/* Notifications */}
              {isLoggedOut && !error && (
                <Alert variant="default" className="border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
                  <CheckCircle2 className="size-4 text-emerald-600" />
                  <AlertDescription className="text-xs">
                    You have been securely signed out of the academic portal.
                  </AlertDescription>
                </Alert>
              )}

              {error && (
                <Alert variant="destructive">
                  <AlertTriangle className="size-4" />
                  <AlertDescription className="text-xs">{error}</AlertDescription>
                </Alert>
              )}

              {/* Username Field */}
              <Field>
                <FieldLabel htmlFor="username">Username or Staff ID</FieldLabel>
                <div className="relative">
                  <Input
                    id="username"
                    name="username"
                    type="text"
                    placeholder="e.g. admin or staff ID"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                    autoComplete="username"
                    className="h-10"
                    disabled={loading}
                  />
                </div>
              </Field>

              {/* Password Field */}
              <Field>
                <div className="flex items-center justify-between">
                  <FieldLabel htmlFor="password">Password</FieldLabel>
                  <span className="text-xs text-muted-foreground hover:text-primary transition-colors cursor-pointer">
                    Forgot password?
                  </span>
                </div>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  className="h-10"
                  disabled={loading}
                />
              </Field>

              {/* Submit Button */}
              <Field>
                <Button type="submit" className="w-full h-10 font-medium" disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 size-4 animate-spin" />
                      Authenticating...
                    </>
                  ) : (
                    "Sign In to Portal"
                  )}
                </Button>
              </Field>

              {/* Quick Fill Helper */}
              <FieldSeparator className="*:data-[slot=field-separator-content]:bg-card">
                Institutional Testing
              </FieldSeparator>

              <Field>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={fillAdmin}
                  disabled={loading}
                  className="w-full text-xs gap-1.5 border-dashed"
                >
                  <Sparkles className="size-3.5 text-primary" />
                  Quick Fill Admin Credentials (<span className="font-mono">admin</span>)
                </Button>
              </Field>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>

      {/* Security & Regulatory Notice */}
      <FieldDescription className="px-6 text-center text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1 font-medium text-foreground">
          <ShieldCheck className="size-3.5 text-primary" /> Secure Examination Platform
        </span>
        <br />
        Authorized school staff and students only. All transactions and grade submissions are audited.
      </FieldDescription>
    </div>
  )
}
