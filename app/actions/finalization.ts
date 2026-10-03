"use server"

import { getSession } from "@/lib/auth/session"
import { ScopeGuard } from "@/lib/auth/scope-guard"
import { FinalizationService } from "@/server/services/FinalizationService"
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

export async function finalizeTermAction(formData: FormData): Promise<void> {
  const session = await assertAdministrative()
  const termId = formData.get("termId") as string

  if (!termId) throw new Error("Term ID required.")

  await FinalizationService.finalizeTerm(termId, session.userId)
  revalidatePath("/finalization")
  revalidatePath("/moderation")
  revalidatePath("/academic-years")
  revalidatePath("/reports")
}

export async function reopenFinalizedTermAction(formData: FormData): Promise<void> {
  const session = await assertAdministrative()
  const termId = formData.get("termId") as string
  const reason = formData.get("reason") as string

  if (!termId || !reason) throw new Error("Term ID and reopening reason are required.")

  await FinalizationService.reopenFinalizedTerm(termId, reason, session.userId)
  revalidatePath("/finalization")
  revalidatePath("/moderation")
  revalidatePath("/academic-years")
  revalidatePath("/reports")
}

export async function adminChangeTermStatusAction(formData: FormData): Promise<void> {
  const session = await assertAdministrative()
  const termId = formData.get("termId") as string
  const targetStatus = formData.get("targetStatus") as any
  const reason = (formData.get("reason") as string) || undefined

  if (!termId || !targetStatus) {
    throw new Error("Term ID and target status are required.")
  }

  await FinalizationService.adminUpdateTermStatus(termId, targetStatus, session.userId, reason)
  revalidatePath("/finalization")
  revalidatePath("/moderation")
  revalidatePath("/academic-years")
  revalidatePath("/reports")
}

export async function updateStudentResultStatusAction(formData: FormData): Promise<void> {
  const session = await assertAdministrative()
  const termResultId = formData.get("termResultId") as string
  const targetStatus = formData.get("targetStatus") as any

  if (!termResultId || !targetStatus) {
    throw new Error("Term result ID and target status are required.")
  }

  await FinalizationService.updateStudentResultStatus(termResultId, targetStatus, session.userId)
  revalidatePath("/finalization")
  revalidatePath("/reports")
}

export async function publishTermReportsAction(formData: FormData): Promise<void> {
  const session = await assertAdministrative()
  const termId = formData.get("termId") as string

  if (!termId) throw new Error("Term ID required.")

  await FinalizationService.adminUpdateTermStatus(termId, "PUBLISHED" as any, session.userId)
  revalidatePath("/finalization")
  revalidatePath("/reports")
  revalidatePath("/academic-years")
}

