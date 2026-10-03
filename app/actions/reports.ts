"use server"

import { getSession } from "@/lib/auth/session"
import { ScopeGuard } from "@/lib/auth/scope-guard"
import { ReportService } from "@/server/services/ReportService"
import { revalidatePath } from "next/cache"

async function assertAdministrative() {
  const session = await getSession()
  if (!session) {
    throw new Error("Unauthorized. Please log in.")
  }

  const isAdmin = ScopeGuard.isAdministrative({
    userId: session.userId,
    roles: session.roles,
  })

  if (!isAdmin) {
    throw new Error("Unauthorized: Administrative privileges required.")
  }

  return session
}

export async function publishReportsAction(formData: FormData): Promise<void> {
  const session = await assertAdministrative()
  const termId = formData.get("termId") as string

  if (!termId) throw new Error("Term ID required.")

  await ReportService.publishTermReports(termId, session.userId)
  revalidatePath("/reports")
  revalidatePath("/finalization")
  revalidatePath("/moderation")
  revalidatePath("/academic-years")
}

export async function regenerateVerificationTokenAction(formData: FormData): Promise<void> {
  const session = await assertAdministrative()
  const termResultId = formData.get("termResultId") as string

  if (!termResultId) throw new Error("Term Result ID required.")

  await ReportService.createVerificationToken(termResultId, session.userId)
  revalidatePath("/reports")
  revalidatePath(`/reports/${termResultId}`)
}

export async function revokeReportTokenAction(formData: FormData): Promise<void> {
  const session = await assertAdministrative()
  const tokenHash = formData.get("tokenHash") as string

  if (!tokenHash) throw new Error("Token Hash required.")

  await ReportService.revokeReportToken(tokenHash, session.userId)
  revalidatePath("/reports")
  revalidatePath("/reports/verify")
}
