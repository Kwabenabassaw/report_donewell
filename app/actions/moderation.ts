"use server"

import { getSession } from "@/lib/auth/session"
import { ScopeGuard } from "@/lib/auth/scope-guard"
import { ModerationService } from "@/server/services/ModerationService"
import { EvaluationService, SaveEvaluationInput } from "@/server/services/EvaluationService"
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

export async function submitTermAction(formData: FormData): Promise<void> {
  const session = await getSession()
  if (!session) throw new Error("Unauthorized.")

  const termId = formData.get("termId") as string
  if (!termId) throw new Error("Term ID required.")

  await ModerationService.submitTermForReview(termId, session.userId)
  revalidatePath("/moderation")
  revalidatePath("/academic-years")
}

export async function startReviewAction(formData: FormData): Promise<void> {
  const session = await assertAdministrative()
  const termId = formData.get("termId") as string
  if (!termId) throw new Error("Term ID required.")

  await ModerationService.startTermReview(termId, session.userId)
  revalidatePath("/moderation")
  revalidatePath("/academic-years")
}

export async function approveTermAction(formData: FormData): Promise<void> {
  const session = await assertAdministrative()
  const termId = formData.get("termId") as string
  if (!termId) throw new Error("Term ID required.")

  await ModerationService.approveTerm(termId, session.userId)
  revalidatePath("/moderation")
  revalidatePath("/academic-years")
}

export async function rejectTermAction(formData: FormData): Promise<void> {
  const session = await assertAdministrative()
  const termId = formData.get("termId") as string
  const reason = formData.get("reason") as string

  if (!termId || !reason) throw new Error("Term ID and rejection reason are required.")

  await ModerationService.rejectAndReopenTerm(termId, reason, session.userId)
  revalidatePath("/moderation")
  revalidatePath("/academic-years")
}

export async function saveEvaluationAction(formData: FormData): Promise<void> {
  const session = await getSession()
  if (!session) throw new Error("Unauthorized.")

  const studentEnrollmentId = formData.get("studentEnrollmentId") as string
  const termId = formData.get("termId") as string
  const daysPresent = parseInt(formData.get("daysPresent") as string || "0", 10)
  const daysAbsent = parseInt(formData.get("daysAbsent") as string || "0", 10)
  const conductRating = (formData.get("conductRating") as string) || undefined
  const attitudeRating = (formData.get("attitudeRating") as string) || undefined
  const interestRating = (formData.get("interestRating") as string) || undefined
  const classTeacherRemarks = (formData.get("classTeacherRemarks") as string) || undefined
  const headmasterRemarks = (formData.get("headmasterRemarks") as string) || undefined

  await EvaluationService.saveEvaluation(
    {
      studentEnrollmentId,
      termId,
      daysPresent,
      daysAbsent,
      conductRating,
      attitudeRating,
      interestRating,
      classTeacherRemarks,
      headmasterRemarks,
    },
    session.userId
  )

  revalidatePath("/evaluations")
  revalidatePath("/moderation")
}
