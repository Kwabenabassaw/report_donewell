import type { Metadata } from "next"
import { Geist, Geist_Mono, Public_Sans } from "next/font/google"
import "./globals.css"
import { cn } from "@/lib/utils"
import { getSession } from "@/lib/auth/session"
import { AuthProvider } from "@/lib/auth/auth-context"
import { QueryProvider } from "@/components/providers/query-provider"
import { TooltipProvider } from "@/components/ui/tooltip"
import { AppShell } from "@/components/layout/app-shell"
import { prisma } from "@/lib/prisma"

const publicSans = Public_Sans({ subsets: ["latin"], variable: "--font-sans" })

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
})

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
})

export const metadata: Metadata = {
  title: "School Examination & Terminal Report Management System",
  description: "Enterprise Academic Assessment and Terminal Reporting Platform",
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [session, schoolProfile, currentAcademicYear] = await Promise.all([
    getSession(),
    prisma.schoolProfile.findFirst(),
    prisma.academicYear.findFirst({
      where: { isCurrent: true },
      include: {
        terms: {
          orderBy: { termSequence: "asc" },
        },
      },
    }),
  ])

  const activeTerm =
    currentAcademicYear?.terms.find((t) => t.status === "MARK_ENTRY") ||
    currentAcademicYear?.terms[0]

  const schoolData = {
    name: schoolProfile?.schoolName || "Mountains High College and International School",
    code: schoolProfile?.schoolCode || "MHCIS-001",
    motto: schoolProfile?.motto || "Knowledge, Integrity, and Excellence",
    crestUrl: schoolProfile?.crestUrl || null,
    term: currentAcademicYear && activeTerm
      ? `${activeTerm.name} (${currentAcademicYear.name})`
      : "No Active Term Configured",
    termStatus: activeTerm?.status || "DRAFT",
  }

  return (
    <html
      lang="en"
      className={cn(
        "h-full",
        "antialiased",
        geistSans.variable,
        geistMono.variable,
        publicSans.variable,
        "font-sans"
      )}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <QueryProvider>
          <TooltipProvider>
            <AuthProvider
              initialUser={
                session
                  ? {
                      id: session.userId,
                      username: session.username,
                      displayName: session.displayName,
                      email: null,
                      roles: session.roles,
                      activeRole: session.activeRole,
                      hasCompletedOnboarding: session.hasCompletedOnboarding,
                      mustChangePassword: session.mustChangePassword,
                    }
                  : null
              }
            >
              <AppShell school={schoolData} initialSession={session}>
                {children}
              </AppShell>
            </AuthProvider>
          </TooltipProvider>
        </QueryProvider>
      </body>
    </html>
  )
}
