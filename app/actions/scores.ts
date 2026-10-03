"use server"

import { getSession } from "@/lib/auth/session"
import { ScopeGuard } from "@/lib/auth/scope-guard"
import { ScoreService, BatchSaveScoresInput } from "@/server/services/ScoreService"
import { revalidatePath } from "next/cache"

export async function saveScoresAction(input: BatchSaveScoresInput): Promise<{ success: boolean; savedCount: number }> {
  const session = await getSession()
  if (!session) {
    throw new Error("Unauthorized. Please log in.")
  }

  const ctx = { userId: session.userId, roles: session.roles }

  // Verify authorization
  await ScopeGuard.assertTeacherSubjectScope({
    ctx,
    termId: input.termId,
    classId: input.classId,
    subjectId: input.subjectId,
  })

  const result = await ScoreService.batchSaveScores(input, session.userId)

  revalidatePath("/mark-entry")
  return { success: true, savedCount: result.savedCount }
}
