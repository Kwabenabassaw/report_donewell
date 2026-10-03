import { prisma } from "@/lib/prisma"
import { JobStatus, SMSDeliveryStatus } from "@prisma/client"
import { AuditService } from "./AuditService"
import { AppError } from "@/lib/errors"
import { getSmsProvider, ISmsProvider } from "@/lib/sms"
import crypto from "crypto"

export interface QueueNotificationsResult {
  success: boolean
  termId: string
  queuedCount: number
  skippedCount: number
  totalResults: number
}

export interface ProcessQueueResult {
  processed: number
  succeeded: number
  failed: number
}

export class NotificationService {
  /**
   * Enqueues SMS notification jobs for primary guardians of all students
   * who have published reports for the specified term.
   *
   * Asynchronous: Operates after official result snapshot/publication is committed.
   */
  static async queueReportPublishedNotifications(
    termId: string,
    actorUserId?: string
  ): Promise<QueueNotificationsResult> {
    const term = await prisma.term.findUnique({
      where: { id: termId },
      include: { academicYear: true },
    })

    if (!term) {
      throw new AppError("NOT_FOUND", "Term not found.", 404)
    }

    const school = await prisma.schoolProfile.findFirst()
    const schoolName = school?.schoolName || "School Administration"

    // Retrieve all published term results for this term
    const termResults = await prisma.termResult.findMany({
      where: {
        termId,
      },
      include: {
        enrollment: {
          include: {
            student: {
              include: {
                studentGuardians: {
                  include: { guardian: true },
                  orderBy: { isPrimary: "desc" },
                },
              },
            },
            class: true,
          },
        },
        generatedReports: {
          where: { isCurrent: true, revokedAt: null },
          orderBy: { reportVersion: "desc" },
        },
      },
    })

    let queuedCount = 0
    let skippedCount = 0

    // Fetch existing pending/completed notification jobs for this term to enforce idempotency
    const existingJobs = await prisma.notificationJob.findMany({
      where: {
        type: "SMS",
      },
      select: {
        recipient: true,
        payload: true,
      },
    })

    const existingKeys = new Set(
      existingJobs
        .map((j) => {
          try {
            const parsed = JSON.parse(j.payload)
            return `${j.recipient}:${parsed.termResultId}`
          } catch {
            return null
          }
        })
        .filter(Boolean) as string[]
    )

    for (const result of termResults) {
      const student = result.enrollment.student
      const guardians = student.studentGuardians

      if (!guardians || guardians.length === 0) {
        skippedCount++
        continue
      }

      // Prioritize primary guardian, otherwise fallback to first guardian with phone
      const primaryLink = guardians.find((g) => g.isPrimary && g.guardian.phone?.trim())
      const targetGuardian = primaryLink ? primaryLink.guardian : guardians.find((g) => g.guardian.phone?.trim())?.guardian

      if (!targetGuardian || !targetGuardian.phone?.trim()) {
        skippedCount++
        continue
      }

      const phone = targetGuardian.phone.trim()
      const dedupKey = `${phone}:${result.id}`

      if (existingKeys.has(dedupKey)) {
        skippedCount++
        continue
      }

      // Lookup or establish verification token
      let token = ""
      const activeReport = result.generatedReports[0]
      if (activeReport) {
        token = activeReport.tokenHash
      } else {
        // Create verification token if missing
        const rawToken = crypto.randomBytes(24).toString("hex")
        const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex")
        await prisma.generatedReport.create({
          data: {
            termResultId: result.id,
            tokenHash,
            reportVersion: 1,
            isCurrent: true,
          },
        })
        token = rawToken
      }

      const verifyUrl = `http://localhost:3000/reports/verify?token=${token}`
      const studentFullName = `${student.firstName} ${student.lastName}`.trim()
      const className = result.enrollment.class.name

      const messageBody = `Dear Guardian, terminal report for ${studentFullName} (${className}) is ready. Position: ${result.classPosition}/${result.cohortSize}, Avg: ${result.averageScore.toFixed(1)}%. Verify: ${verifyUrl} - ${schoolName}`

      const payload = {
        termResultId: result.id,
        termId: result.termId,
        studentId: student.id,
        studentName: studentFullName,
        className,
        termName: term.name,
        classPosition: result.classPosition,
        cohortSize: result.cohortSize,
        averageScore: result.averageScore,
        verifyUrl,
        messageBody,
        guardianName: targetGuardian.name,
      }

      await prisma.notificationJob.create({
        data: {
          type: "SMS",
          recipient: phone,
          payload: JSON.stringify(payload),
          status: JobStatus.PENDING,
          attempts: 0,
          availableAt: new Date(),
        },
      })

      existingKeys.add(dedupKey)
      queuedCount++
    }

    await AuditService.logAction({
      userId: actorUserId,
      action: "QUEUE_TERM_SMS_NOTIFICATIONS",
      entityType: "Term",
      entityId: termId,
      newValues: {
        queuedCount,
        skippedCount,
        totalResults: termResults.length,
      },
    })

    return {
      success: true,
      termId,
      queuedCount,
      skippedCount,
      totalResults: termResults.length,
    }
  }

  /**
   * Enqueues an ad-hoc or generic SMS notification job.
   */
  static async enqueueSms(
    input: {
      recipientPhone: string
      messageBody: string
      payload?: Record<string, any>
    },
    actorUserId?: string
  ) {
    const cleanPhone = (input.recipientPhone || "").trim()
    const cleanBody = (input.messageBody || "").trim()

    if (!cleanPhone) {
      throw new AppError("VALIDATION_FAILED", "Recipient phone number is required.", 400)
    }

    if (!cleanBody) {
      throw new AppError("VALIDATION_FAILED", "Message body cannot be empty.", 400)
    }

    const payloadObj = {
      messageBody: cleanBody,
      ...(input.payload || {}),
    }

    const job = await prisma.notificationJob.create({
      data: {
        type: "SMS",
        recipient: cleanPhone,
        payload: JSON.stringify(payloadObj),
        status: JobStatus.PENDING,
        attempts: 0,
        availableAt: new Date(),
      },
    })

    await AuditService.logAction({
      userId: actorUserId,
      action: "ENQUEUE_CUSTOM_SMS",
      entityType: "NotificationJob",
      entityId: job.id,
      newValues: { recipient: cleanPhone, bodyLength: cleanBody.length },
    })

    return job
  }

  /**
   * Background worker processor.
   * Polls pending jobs and executes SMS dispatch via the active provider.
   */
  static async processNotificationQueue(options?: {
    batchSize?: number
    provider?: ISmsProvider
  }): Promise<ProcessQueueResult> {
    const batchSize = options?.batchSize ?? 25
    const provider = options?.provider ?? getSmsProvider()
    const now = new Date()

    // 1. Fetch available pending jobs
    const pendingJobs = await prisma.notificationJob.findMany({
      where: {
        status: JobStatus.PENDING,
        availableAt: { lte: now },
        attempts: { lt: 3 },
      },
      orderBy: { createdAt: "asc" },
      take: batchSize,
    })

    if (pendingJobs.length === 0) {
      return { processed: 0, succeeded: 0, failed: 0 }
    }

    // 2. Atomically transition selected jobs to PROCESSING
    const jobIds = pendingJobs.map((j) => j.id)
    await prisma.notificationJob.updateMany({
      where: { id: { in: jobIds } },
      data: { status: JobStatus.PROCESSING },
    })

    let succeeded = 0
    let failed = 0

    // 3. Process each job through the SMS provider
    for (const job of pendingJobs) {
      let messageBody = ""
      try {
        const parsed = JSON.parse(job.payload)
        messageBody = parsed.messageBody || ""
      } catch {
        messageBody = job.payload
      }

      const nextAttempts = job.attempts + 1

      try {
        const sendResult = await provider.sendSms(job.recipient, messageBody)

        if (sendResult.success) {
          // Success: write delivered log and mark job completed
          await prisma.$transaction(async (tx) => {
            await tx.smsLog.create({
              data: {
                notificationJobId: job.id,
                recipientPhone: job.recipient,
                messageBody,
                gatewayReference: sendResult.gatewayReference || `GW-${job.id.substring(0, 8)}`,
                deliveryStatus: SMSDeliveryStatus.DELIVERED,
                dispatchedAt: new Date(),
              },
            })

            await tx.notificationJob.update({
              where: { id: job.id },
              data: {
                status: JobStatus.COMPLETED,
                attempts: nextAttempts,
                processedAt: new Date(),
                errorMessage: null,
              },
            })
          })
          succeeded++
        } else {
          // Gateway error returned from provider
          await this.handleJobFailure(job.id, job.recipient, messageBody, nextAttempts, sendResult.error || "Gateway dispatch failed.")
          failed++
        }
      } catch (err: any) {
        // Unexpected network or unhandled exception
        await this.handleJobFailure(job.id, job.recipient, messageBody, nextAttempts, err.message || "Unexpected worker exception.")
        failed++
      }
    }

    return {
      processed: pendingJobs.length,
      succeeded,
      failed,
    }
  }

  /**
   * Internal helper to record SMS failure log and update job backoff / final failure status.
   */
  private static async handleJobFailure(
    jobId: string,
    recipient: string,
    messageBody: string,
    attempts: number,
    errorMessage: string
  ) {
    const isExhausted = attempts >= 3

    await prisma.$transaction(async (tx) => {
      await tx.smsLog.create({
        data: {
          notificationJobId: jobId,
          recipientPhone: recipient,
          messageBody,
          gatewayReference: null,
          deliveryStatus: SMSDeliveryStatus.FAILED,
          dispatchedAt: new Date(),
        },
      })

      if (isExhausted) {
        await tx.notificationJob.update({
          where: { id: jobId },
          data: {
            status: JobStatus.FAILED,
            attempts,
            errorMessage,
            processedAt: new Date(),
          },
        })
      } else {
        // Linear/Exponential backoff: 5s * attempts
        const backoffMs = 5000 * attempts
        const nextAvailable = new Date(Date.now() + backoffMs)

        await tx.notificationJob.update({
          where: { id: jobId },
          data: {
            status: JobStatus.PENDING,
            attempts,
            errorMessage,
            availableAt: nextAvailable,
          },
        })
      }
    })
  }

  /**
   * Resets all FAILED notification jobs back to PENDING with attempts = 0.
   */
  static async retryFailedJobs(actorUserId?: string) {
    const failedJobs = await prisma.notificationJob.findMany({
      where: { status: JobStatus.FAILED },
    })

    if (failedJobs.length === 0) {
      return { retriedCount: 0 }
    }

    const result = await prisma.notificationJob.updateMany({
      where: { status: JobStatus.FAILED },
      data: {
        status: JobStatus.PENDING,
        attempts: 0,
        errorMessage: null,
        availableAt: new Date(),
      },
    })

    await AuditService.logAction({
      userId: actorUserId,
      action: "RETRY_FAILED_NOTIFICATIONS",
      entityType: "NotificationJob",
      entityId: "BATCH",
      newValues: { retriedCount: result.count },
    })

    return { retriedCount: result.count }
  }

  /**
   * Returns aggregate queue and delivery status statistics.
   */
  static async getQueueStats() {
    const [
      totalJobs,
      pendingJobs,
      processingJobs,
      completedJobs,
      failedJobs,
      totalSmsLogs,
      deliveredLogs,
      failedLogs,
    ] = await Promise.all([
      prisma.notificationJob.count(),
      prisma.notificationJob.count({ where: { status: JobStatus.PENDING } }),
      prisma.notificationJob.count({ where: { status: JobStatus.PROCESSING } }),
      prisma.notificationJob.count({ where: { status: JobStatus.COMPLETED } }),
      prisma.notificationJob.count({ where: { status: JobStatus.FAILED } }),
      prisma.smsLog.count(),
      prisma.smsLog.count({ where: { deliveryStatus: SMSDeliveryStatus.DELIVERED } }),
      prisma.smsLog.count({ where: { deliveryStatus: SMSDeliveryStatus.FAILED } }),
    ])

    return {
      jobs: {
        total: totalJobs,
        pending: pendingJobs,
        processing: processingJobs,
        completed: completedJobs,
        failed: failedJobs,
      },
      smsLogs: {
        total: totalSmsLogs,
        delivered: deliveredLogs,
        failed: failedLogs,
      },
    }
  }

  /**
   * Lists notification jobs with optional filtering and pagination.
   */
  static async listJobs(options?: {
    status?: JobStatus
    limit?: number
    offset?: number
  }) {
    const limit = options?.limit ?? 50
    const offset = options?.offset ?? 0
    const where = options?.status ? { status: options.status } : {}

    const [items, total] = await Promise.all([
      prisma.notificationJob.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: offset,
      }),
      prisma.notificationJob.count({ where }),
    ])

    return { items, total, limit, offset }
  }

  /**
   * Lists SMS delivery logs with optional filtering and pagination.
   */
  static async listSmsLogs(options?: {
    status?: SMSDeliveryStatus
    limit?: number
    offset?: number
  }) {
    const limit = options?.limit ?? 50
    const offset = options?.offset ?? 0
    const where = options?.status ? { deliveryStatus: options.status } : {}

    const [items, total] = await Promise.all([
      prisma.smsLog.findMany({
        where,
        include: { job: true },
        orderBy: { dispatchedAt: "desc" },
        take: limit,
        skip: offset,
      }),
      prisma.smsLog.count({ where }),
    ])

    return { items, total, limit, offset }
  }
}
