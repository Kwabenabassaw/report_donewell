import React, { Suspense } from "react"
import Link from "next/link"
import { SchoolProfileService } from "@/server/services/SchoolProfileService"
import { LoginForm } from "@/components/login-form"
import { GraduationCap, Loader2 } from "lucide-react"

export const dynamic = "force-dynamic"

export default async function LoginPage() {
  let profile = null
  try {
    profile = await SchoolProfileService.getProfile()
  } catch {
    profile = {
      schoolName: "Donewell Academy",
      schoolCode: "DWA-001",
      motto: "Knowledge, Integrity, and Excellence",
      crestUrl: null,
    } as any
  }

  return (
    <div className="bg-muted/40 min-h-svh flex flex-col items-center justify-center gap-6 p-6 md:p-10 relative">
      {/* Subtle Ambient Background Gradient */}
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/10 via-transparent to-transparent" />

      <div className="flex w-full max-w-sm flex-col gap-6 z-10">
        {/* Brand Link with School Logo */}
        <Link
          href="/"
          className="flex flex-col items-center gap-2.5 self-center text-center group"
        >
          <div className="size-16 rounded-2xl bg-white border border-border/70 shadow-sm flex items-center justify-center overflow-hidden p-1.5 transition-transform group-hover:scale-105">
            {profile?.crestUrl ? (
              <img
                src={profile.crestUrl}
                alt={profile.schoolName}
                className="h-full w-full object-contain"
              />
            ) : (
              <div className="size-full bg-primary text-primary-foreground flex items-center justify-center rounded-xl">
                <GraduationCap className="size-8" />
              </div>
            )}
          </div>
          <div className="flex flex-col items-center">
            <span className="font-bold text-base tracking-tight text-foreground">
              {profile?.schoolName || "Donewell Academy"}
            </span>
            <span className="text-xs text-muted-foreground font-mono mt-0.5">
              {profile?.motto || "Knowledge, Integrity, and Excellence"}
            </span>
          </div>
        </Link>

        {/* login-03 UI Form */}
        <Suspense
          fallback={
            <div className="h-80 flex items-center justify-center bg-card rounded-xl border">
              <Loader2 className="animate-spin size-6 text-muted-foreground" />
            </div>
          }
        >
          <LoginForm schoolProfile={profile} />
        </Suspense>
      </div>
    </div>
  )
}
