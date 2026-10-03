"use server"

import { getSession } from "@/lib/auth/session"
import { ScopeGuard } from "@/lib/auth/scope-guard"
import { NotificationService } from "@/server/services/NotificationService"
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

export async function processQueueAction(formData?: FormData): Promise<void> {
  await assertAdministrative()
  const rawBatch = formData?.get("batchSize") as string | null
  const batchSize = rawBatch ? parseInt(rawBatch, 10) : 25

  await NotificationService.processNotificationQueue({ batchSize })
  revalidatePath("/notifications")
}

export async function retryFailedJobsAction(): Promise<void> {
  const session = await assertAdministrative()
  await NotificationService.retryFailedJobs(session.userId)
  revalidatePath("/notifications")
}

export async function queueTermSmsAction(formData: FormData): Promise<void> {
  const session = await assertAdministrative()
  const termId = formData.get("termId") as string

  if (!termId) throw new Error("Term ID required.")

  await NotificationService.queueReportPublishedNotifications(termId, session.userId)
  revalidatePath("/notifications")
}

export async function sendAdHocSmsAction(formData: FormData): Promise<void> {
  const session = await assertAdministrative()
  const recipientPhone = formData.get("recipientPhone") as string
  const messageBody = formData.get("messageBody") as string

  if (!recipientPhone) throw new Error("Recipient phone number is required.")
  if (!messageBody) throw new Error("Message body is required.")

  await NotificationService.enqueueSms(
    {
      recipientPhone,
      messageBody,
    },
    session.userId
  )
  revalidatePath("/notifications")
}
