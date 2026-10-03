"use client"

import * as React from "react"
import { usePathname } from "next/navigation"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/layout/app-sidebar"
import { AppHeader } from "@/components/layout/app-header"
import { useAuth } from "@/lib/auth/auth-context"
import { SessionPayload } from "@/lib/auth/session"

interface AppShellProps {
  children: React.ReactNode
  school: {
    name: string
    code: string
    motto?: string
    crestUrl?: string | null
    term: string
    termStatus: string
  }
  initialSession?: SessionPayload | null
}

export function AppShell({ children, school, initialSession }: AppShellProps) {
  const pathname = usePathname()
  const { user, activeRole, switchRole } = useAuth()

  // If on login or onboarding page, render full page without the dashboard sidebar
  const isStandalonePage = pathname === "/login" || pathname === "/onboarding"
  if (isStandalonePage) {
    return <main className="min-h-screen bg-muted/20">{children}</main>
  }

  // Bind strictly to live database session (client auth context or initial server session)
  const resolvedUser = user
    ? {
        name: user.displayName,
        email: user.email || `${user.username}@ada-academy.edu`,
        role: activeRole,
        roles: user.roles,
      }
    : initialSession
    ? {
        name: initialSession.displayName,
        email: `${initialSession.username}@ada-academy.edu`,
        role: initialSession.activeRole,
        roles: initialSession.roles,
      }
    : {
        name: "Guest Visitor",
        email: "guest@system.local",
        role: "GUEST",
        roles: ["GUEST"],
      }

  return (
    <SidebarProvider defaultOpen={true}>
      <AppSidebar
        user={resolvedUser}
        school={{
          name: school.name,
          code: school.code,
          term: school.term,
          crestUrl: school.crestUrl,
        }}
      />
      <SidebarInset className="flex flex-col min-h-screen min-w-0">
        <AppHeader
          termInfo={`${school.term} • ${school.termStatus}`}
          activeRole={resolvedUser.role}
          onRoleChange={switchRole}
        />
        <main className="flex-1 bg-muted/20 min-w-0 overflow-x-hidden">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  )
}
