"use server"

import { getSession } from "@/lib/auth/session"
import { ScopeGuard } from "@/lib/auth/scope-guard"
import {
  ReportTemplateService,
  ReportTemplateConfig,
} from "@/server/services/ReportTemplateService"
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
    throw new Error("Unauthorized: Administrative privileges required to manage report templates.")
  }

  return session
}

export async function saveReportTemplateAction(
  config: Partial<ReportTemplateConfig>
): Promise<{ success: boolean; config: ReportTemplateConfig }> {
  const session = await assertAdministrative()
  const updated = await ReportTemplateService.updateTemplateConfig(config, session.userId)

  revalidatePath("/reports")
  revalidatePath("/reports/template-editor")
  revalidatePath("/settings")

  return { success: true, config: updated }
}

export async function resetReportTemplateAction(): Promise<{
  success: boolean
  config: ReportTemplateConfig
}> {
  const session = await assertAdministrative()
  const resetConfig = await ReportTemplateService.resetTemplateConfig(session.userId)

  revalidatePath("/reports")
  revalidatePath("/reports/template-editor")
  revalidatePath("/settings")

  return { success: true, config: resetConfig }
}
