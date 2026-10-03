import React from "react"
import { redirect } from "next/navigation"
import { getSession } from "@/lib/auth/session"
import { ScopeGuard } from "@/lib/auth/scope-guard"
import { SchoolProfileService } from "@/server/services/SchoolProfileService"
import {
  Sliders,
  GraduationCap,
  Award,
  FileCheck2,
  Save,
} from "lucide-react"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { SchoolProfileForm } from "@/components/settings/school-profile-form"

export default async function SettingsPage() {
  const session = await getSession()
  if (!session) {
    redirect("/login")
  }

  const isAdmin = ScopeGuard.isAdministrative({
    userId: session.userId,
    roles: session.roles,
  })

  if (!isAdmin) {
    redirect("/")
  }

  const profile = await SchoolProfileService.getProfile()

  return (
    <div className="p-6 md:p-8 flex flex-col gap-8 max-w-5xl mx-auto w-full">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-6">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-primary/10 text-primary rounded-xl">
              <Sliders className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">School Profile & System Settings</h1>
              <p className="text-sm text-muted-foreground mt-0.5">
                Configure official school branding, contact details, letterhead data, logo uploads, and report signatures.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Settings Form with Image Uploads */}
      <SchoolProfileForm initialProfile={profile} />
    </div>
  )
}
