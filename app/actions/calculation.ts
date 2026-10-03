"use server"

import { getSession } from "@/lib/auth/session"
import { ScopeGuard } from "@/lib/auth/scope-guard"
import { CalculationEngineService, ClassCalculationResult, CompletenessReport } from "@/server/services/CalculationEngineService"

async function assertCanCalculate(classId: string) {
  const session = await getSession()
  if (!session) {
    throw new Error("Unauthorized. Please log in.")
  }

  const ctx = { userId: session.userId, roles: session.roles }
  if (ScopeGuard.isAdministrative(ctx)) {
    return session
  }

  await ScopeGuard.assertClassTeacherScope({ ctx, classId })
  return session
}

export async function runClassCalculationAction(
  termId: string,
  classId: string
): Promise<ClassCalculationResult> {
  await assertCanCalculate(classId)
  return await CalculationEngineService.calculateClassTermResults(termId, classId)
}

export async function validateClassCompletenessAction(
  termId: string,
  classId: string
): Promise<CompletenessReport> {
  await assertCanCalculate(classId)
  return await CalculationEngineService.validateClassCompleteness(termId, classId)
}
