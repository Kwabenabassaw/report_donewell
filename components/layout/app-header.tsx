"use client"

import * as React from "react"
import { usePathname } from "next/navigation"
import {
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import {
  BadgeCheck,
  Calendar,
  Layers,
  Sparkles,
  Shield,
  TableProperties,
  LogOut,
  Loader2,
  User,
} from "lucide-react"
import Link from "next/link"
import { useAuth } from "@/lib/auth/auth-context"

const ROUTE_TITLES: Record<string, { title: string; category: string }> = {
  "/": { title: "Overview Dashboard", category: "System" },
  "/mark-entry": { title: "Spreadsheet Mark Entry", category: "Teaching & Assessment" },
  "/assessments": { title: "Assessment Activities", category: "Teaching & Assessment" },
  "/evaluations": { title: "Form Teacher Evaluations", category: "Teaching & Assessment" },
  "/academic-years": { title: "Academic Sessions & Terms", category: "Academic Setup" },
  "/classes": { title: "Classes & Subjects", category: "Academic Setup" },
  "/teacher-assignments": { title: "Teacher Allocations", category: "Academic Setup" },
  "/grading-policies": { title: "Grading Policies & Bands", category: "Academic Setup" },
  "/students": { title: "Student Directory", category: "Student Records" },
  "/students/import": { title: "CSV Student Import", category: "Student Records" },
  "/moderation": { title: "Result Moderation & Review", category: "Official Results" },
  "/finalization": { title: "Finalization & Snapshot Engine", category: "Official Results" },
  "/reports": { title: "Terminal Report Cards", category: "Official Results" },
  "/reports/verify": { title: "Report QR Verification", category: "Verification" },
  "/notifications": { title: "SMS Notification Queue", category: "Communication" },
  "/audit-logs": { title: "Append-Only Audit Trail", category: "Security" },
  "/settings": { title: "School Profile & Settings", category: "Configuration" },
}

export function AppHeader({
  termInfo = "2026/2027 • First Term (MARK_ENTRY)",
  activeRole = "SUPER_ADMIN",
  onRoleChange,
}: {
  termInfo?: string
  activeRole?: string
  onRoleChange?: (role: string) => void
}) {
  const pathname = usePathname()
  const { user, logout } = useAuth()
  const [isLoggingOut, setIsLoggingOut] = React.useState(false)
  const route = ROUTE_TITLES[pathname] || { title: "Academic Portal", category: "Portal" }

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true)
      await logout()
    } catch {
      setIsLoggingOut(false)
    }
  }

  return (
    <header className="sticky top-0 z-20 flex h-16 shrink-0 items-center justify-between gap-4 border-b bg-background/95 px-6 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex items-center gap-3 min-w-0">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="mr-2 h-4 shrink-0" />

        {/* Dynamic Breadcrumbs */}
        <div className="flex items-center gap-2 text-sm min-w-0 truncate">
          <span className="text-muted-foreground font-medium shrink-0">{route.category}</span>
          <span className="text-muted-foreground/60 shrink-0">/</span>
          <span className="font-semibold text-foreground tracking-tight truncate">{route.title}</span>
        </div>
      </div>

      {/* Right controls: Active Session Indicator & User / Logout Actions */}
      <div className="flex items-center gap-3 shrink-0">
        {/* Active Term Pill */}
        <div className="hidden lg:flex items-center gap-2 rounded-full border bg-muted/40 px-3 py-1 text-xs font-medium text-muted-foreground">
          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          <Calendar className="h-3 w-3 text-primary" />
          <span>{termInfo}</span>
        </div>

        {/* Quick Mark Entry Shortcut */}
        {pathname !== "/mark-entry" && (
          <Link
            href="/mark-entry"
            className="hidden md:inline-flex items-center gap-1.5 rounded-lg border bg-card px-2.5 py-1 text-xs font-semibold text-foreground shadow-sm hover:bg-muted transition-colors"
          >
            <TableProperties className="h-3.5 w-3.5 text-primary" />
            Mark Entry
          </Link>
        )}

        {/* Authentication State & Quick Logout */}
        {user ? (
          <div className="flex items-center gap-2">
            <div className="hidden sm:flex items-center gap-2 rounded-lg border bg-card/60 px-2.5 py-1 text-xs">
              <span className="font-semibold text-foreground truncate max-w-[120px]">
                {user.displayName}
              </span>
              <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
                {user.activeRole}
              </span>
            </div>
            <button
              onClick={handleLogout}
              disabled={isLoggingOut}
              title="Sign Out of Session"
              aria-label="Sign Out"
              className="inline-flex items-center gap-1.5 rounded-lg border border-destructive/20 bg-destructive/5 hover:bg-destructive/15 text-destructive px-2.5 py-1 text-xs font-semibold shadow-xs transition-colors disabled:opacity-50 cursor-pointer"
            >
              {isLoggingOut ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span className="hidden sm:inline">Signing out...</span>
                </>
              ) : (
                <>
                  <LogOut className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Sign Out</span>
                </>
              )}
            </button>
          </div>
        ) : (
          <Link
            href="/login"
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground shadow hover:bg-primary/90 transition-colors"
          >
            <User className="h-3.5 w-3.5" />
            Sign In
          </Link>
        )}
      </div>
    </header>
  )
}
