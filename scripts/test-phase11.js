const { PrismaClient, TermStatus, ResultStatus, JobStatus, SMSDeliveryStatus } = require("@prisma/client")
const prisma = new PrismaClient()

async function runPhase11Tests() {
  console.log("=== STARTING PHASE 11 AUTOMATED TESTS: SMS & NOTIFICATIONS ===")
  let passed = 0
  let failed = 0

  function assert(condition, message) {
    if (condition) {
      console.log(`  [PASS] ${message}`)
      passed++
    } else {
      console.error(`  [FAIL] ${message}`)
      failed++
    }
  }

  try {
    // 0. Setup: Admin user, academic year, class, subject
    const adminUser = await prisma.user.findFirst({ where: { username: "admin" } })
    if (!adminUser) throw new Error("Admin user not found.")

    const academicYear = await prisma.academicYear.findFirst({ where: { isCurrent: true } })
    if (!academicYear) throw new Error("Current academic year not found.")

    let testClass = await prisma.class.findFirst({ where: { name: "Basic 8A" } })
    if (!testClass) {
      testClass = await prisma.class.create({
        data: { name: "Basic 8A", gradeLevel: "JHS 2" },
      })
    }

    let mathSubject = await prisma.subject.findFirst({ where: { code: "MTH" } })
    if (!mathSubject) {
      mathSubject = await prisma.subject.create({
        data: { code: "MTH", name: "Mathematics", isElective: false },
      })
    }

    // Ensure SchoolProfile
    let schoolProfile = await prisma.schoolProfile.findFirst()
    if (!schoolProfile) {
      schoolProfile = await prisma.schoolProfile.create({
        data: {
          schoolName: "St. Augustine Academy",
          schoolCode: "SAA-GH",
          motto: "Excellence in Truth",
        },
      })
    }

    // Dynamic imports
    const { MockSmsProvider } = await import("../lib/sms/MockSmsProvider.ts")
    const { getSmsProvider, setSmsProvider, resetSmsProvider } = await import("../lib/sms/index.ts")
    const { NotificationService } = await import("../server/services/NotificationService.ts")
    const { ReportService } = await import("../server/services/ReportService.ts")

    // Cleanup prior test artifacts
    await prisma.smsLog.deleteMany({
      where: {
        recipientPhone: { in: ["0244111222", "0244999888", "0244FAIL999", "0555333444", "0244777888"] },
      },
    })
    await prisma.notificationJob.deleteMany({
      where: {
        recipient: { in: ["0244111222", "0244999888", "0244FAIL999", "0555333444", "0244777888"] },
      },
    })

    // Setup Test Students
    // Student 1: Normal with primary guardian
    const student1 = await prisma.student.upsert({
      where: { studentIdNumber: "TEST-P11-STU1" },
      update: {},
      create: {
        studentIdNumber: "TEST-P11-STU1",
        firstName: "Kofi",
        lastName: "Mensah",
        gender: "MALE",
      },
    })

    const enrollment1 = await prisma.studentEnrollment.upsert({
      where: { studentId_academicYearId: { studentId: student1.id, academicYearId: academicYear.id } },
      update: { classId: testClass.id },
      create: { studentId: student1.id, academicYearId: academicYear.id, classId: testClass.id },
    })

    // Guardian 1 (Primary)
    const guardian1 = await prisma.guardian.upsert({
      where: { id: "p11-guardian-1" },
      update: {},
      create: {
        id: "p11-guardian-1",
        name: "Mr. Kwesi Mensah",
        phone: "0244111222",
        relationship: "Father",
      },
    })

    await prisma.studentGuardian.upsert({
      where: { studentId_guardianId: { studentId: student1.id, guardianId: guardian1.id } },
      update: { isPrimary: true },
      create: { studentId: student1.id, guardianId: guardian1.id, isPrimary: true },
    })

    // Student 2: With failing phone to test worker error handling
    const student2 = await prisma.student.upsert({
      where: { studentIdNumber: "TEST-P11-STU2" },
      update: {},
      create: {
        studentIdNumber: "TEST-P11-STU2",
        firstName: "Ama",
        lastName: "Osei",
        gender: "FEMALE",
      },
    })

    const enrollment2 = await prisma.studentEnrollment.upsert({
      where: { studentId_academicYearId: { studentId: student2.id, academicYearId: academicYear.id } },
      update: { classId: testClass.id },
      create: { studentId: student2.id, academicYearId: academicYear.id, classId: testClass.id },
    })

    const guardian2 = await prisma.guardian.upsert({
      where: { id: "p11-guardian-2" },
      update: {},
      create: {
        id: "p11-guardian-2",
        name: "Mrs. Akosua Osei",
        phone: "0244FAIL999", // Triggers MockSmsProvider error
        relationship: "Mother",
      },
    })

    await prisma.studentGuardian.upsert({
      where: { studentId_guardianId: { studentId: student2.id, guardianId: guardian2.id } },
      update: { isPrimary: true },
      create: { studentId: student2.id, guardianId: guardian2.id, isPrimary: true },
    })

    // Create a dedicated Term for Phase 11
    let testTerm = await prisma.term.findFirst({
      where: { academicYearId: academicYear.id, name: "P11 Notification Term" },
    })

    if (!testTerm) {
      const existingTerms = await prisma.term.findMany({ where: { academicYearId: academicYear.id } })
      const maxSeq = existingTerms.reduce((max, t) => Math.max(max, t.termSequence), 0)
      testTerm = await prisma.term.create({
        data: {
          academicYearId: academicYear.id,
          name: "P11 Notification Term",
          termSequence: maxSeq + 1,
          startDate: new Date("2026-11-15"),
          endDate: new Date("2026-12-30"),
          totalSchoolDays: 60,
          status: TermStatus.PUBLISHED,
          finalizedAt: new Date(),
          finalizedById: adminUser.id,
          publishedAt: new Date(),
          publishedById: adminUser.id,
        },
      })
    } else {
      testTerm = await prisma.term.update({
        where: { id: testTerm.id },
        data: { status: TermStatus.PUBLISHED },
      })
    }

    // Clean prior term results for clean testing
    await prisma.generatedReport.deleteMany({
      where: { termResult: { termId: testTerm.id } },
    })
    await prisma.termResultSubject.deleteMany({
      where: { termResult: { termId: testTerm.id } },
    })
    await prisma.termResult.deleteMany({
      where: { termId: testTerm.id },
    })

    // Create term results for student1 and student2
    const termResult1 = await prisma.termResult.create({
      data: {
        studentEnrollmentId: enrollment1.id,
        termId: testTerm.id,
        totalScore: 88.5,
        averageScore: 88.5,
        classPosition: 1,
        cohortSize: 25,
        gpa: 3.8,
        status: ResultStatus.PUBLISHED,
        finalizedAt: new Date(),
        publishedAt: new Date(),
      },
    })

    const termResult2 = await prisma.termResult.create({
      data: {
        studentEnrollmentId: enrollment2.id,
        termId: testTerm.id,
        totalScore: 76.0,
        averageScore: 76.0,
        classPosition: 4,
        cohortSize: 25,
        gpa: 3.2,
        status: ResultStatus.PUBLISHED,
        finalizedAt: new Date(),
        publishedAt: new Date(),
      },
    })

    // Issue report verification token for termResult1
    const tokenResult1 = await ReportService.createVerificationToken(termResult1.id, adminUser.id)

    // ==========================================
    // GROUP 1: SMS PROVIDER ABSTRACTION
    // ==========================================
    console.log("\n--- GROUP 1: SMS Provider Abstraction ---")
    const mockProvider = new MockSmsProvider()

    const validSend = await mockProvider.sendSms("0244111222", "Test valid SMS message.")
    assert(validSend.success === true, "MockSmsProvider successfully dispatches valid SMS")
    assert(
      typeof validSend.gatewayReference === "string" && validSend.gatewayReference.startsWith("MOCK-GW-"),
      "MockSmsProvider returns valid gateway reference"
    )

    const invalidSend = await mockProvider.sendSms("0244FAIL999", "Test failure SMS.")
    assert(invalidSend.success === false, "MockSmsProvider rejects simulated failure phone numbers")
    assert(typeof invalidSend.error === "string", "MockSmsProvider returns error message on failure")

    const emptyBodySend = await mockProvider.sendSms("0244111222", "")
    assert(emptyBodySend.success === false, "MockSmsProvider rejects empty message body")

    const currentProvider = getSmsProvider()
    assert(currentProvider.name === "MockSmsProvider", "Default registered SMS provider is MockSmsProvider")

    // ==========================================
    // GROUP 2: QUEUEING NOTIFICATIONS (queueReportPublishedNotifications)
    // ==========================================
    console.log("\n--- GROUP 2: Queueing Notification Jobs ---")
    const queueResult = await NotificationService.queueReportPublishedNotifications(testTerm.id, adminUser.id)
    assert(queueResult.success === true, "queueReportPublishedNotifications executes successfully")
    assert(queueResult.queuedCount === 2, `Expected 2 queued jobs, got ${queueResult.queuedCount}`)

    // Inspect created job for student1
    const job1 = await prisma.notificationJob.findFirst({
      where: { recipient: "0244111222" },
      orderBy: { createdAt: "desc" },
    })
    assert(!!job1, "NotificationJob created in database for primary guardian")
    assert(job1.status === JobStatus.PENDING, "Job initial status is PENDING")
    assert(job1.attempts === 0, "Job initial attempts count is 0")
    assert(job1.type === "SMS", "Job type is SMS")

    const payload1 = JSON.parse(job1.payload)
    assert(payload1.studentName === "Kofi Mensah", `Payload contains student name: ${payload1.studentName}`)
    assert(payload1.classPosition === 1, "Payload contains student class position")
    assert(payload1.cohortSize === 25, "Payload contains cohort size")
    assert(payload1.averageScore === 88.5, "Payload contains average score")
    assert(payload1.verifyUrl.includes("/reports/verify?token="), "Payload contains report verify URL")
    assert(
      payload1.messageBody.includes("Kofi Mensah") &&
      payload1.messageBody.includes("Position: 1/25") &&
      payload1.messageBody.includes("88.5%"),
      "Formatted SMS text contains student name, position, and average"
    )

    // Test Idempotency (calling queueReportPublishedNotifications again should not re-queue)
    const idempotentResult = await NotificationService.queueReportPublishedNotifications(testTerm.id, adminUser.id)
    assert(idempotentResult.queuedCount === 0, "Idempotency: Re-running queue skipped duplicate notifications")
    assert(idempotentResult.skippedCount === 2, `Skipped count matches 2 existing jobs: ${idempotentResult.skippedCount}`)

    // ==========================================
    // GROUP 3: AD-HOC CUSTOM SMS ENQUEUEING
    // ==========================================
    console.log("\n--- GROUP 3: Ad-Hoc SMS Enqueueing ---")
    const adHocJob = await NotificationService.enqueueSms(
      {
        recipientPhone: "0555333444",
        messageBody: "PTA Meeting scheduled for Friday at 3:00 PM.",
      },
      adminUser.id
    )
    assert(!!adHocJob && adHocJob.id.length > 0, "enqueueSms successfully enqueues ad-hoc job")
    assert(adHocJob.recipient === "0555333444", "Ad-hoc job recipient recorded correctly")

    let missingPhoneError = false
    try {
      await NotificationService.enqueueSms({ recipientPhone: "", messageBody: "Hello" })
    } catch (e) {
      missingPhoneError = true
    }
    assert(missingPhoneError, "enqueueSms rejects empty recipient phone")

    let missingBodyError = false
    try {
      await NotificationService.enqueueSms({ recipientPhone: "0244111222", messageBody: "" })
    } catch (e) {
      missingBodyError = true
    }
    assert(missingBodyError, "enqueueSms rejects empty message body")

    // ==========================================
    // GROUP 4: BACKGROUND WORKER PROCESSING
    // ==========================================
    console.log("\n--- GROUP 4: Background Worker Processing ---")
    // There should currently be 3 pending jobs: student1, student2, and adHocJob
    const initialPendingCount = await prisma.notificationJob.count({ where: { status: JobStatus.PENDING } })
    assert(initialPendingCount >= 3, `Found ${initialPendingCount} pending jobs before worker run`)

    // Process the queue with worker
    const workerResult = await NotificationService.processNotificationQueue({ batchSize: 10 })
    assert(workerResult.processed >= 3, `Worker processed ${workerResult.processed} jobs`)
    assert(workerResult.succeeded >= 2, `Worker succeeded on valid numbers (${workerResult.succeeded})`)
    assert(workerResult.failed >= 1, `Worker failed on simulated invalid number (${workerResult.failed})`)

    // Verify successful job status transition
    const completedJob1 = await prisma.notificationJob.findUnique({ where: { id: job1.id } })
    assert(completedJob1.status === JobStatus.COMPLETED, "Successful job transitioned to COMPLETED")
    assert(completedJob1.attempts === 1, "Successful job attempts incremented to 1")
    assert(completedJob1.processedAt !== null, "Successful job has processedAt timestamp")

    // Verify SmsLog created for completedJob1
    const smsLog1 = await prisma.smsLog.findFirst({
      where: { notificationJobId: job1.id },
    })
    assert(!!smsLog1, "SmsLog created for completed job")
    assert(smsLog1.deliveryStatus === SMSDeliveryStatus.DELIVERED, "SmsLog deliveryStatus is DELIVERED")
    assert(smsLog1.gatewayReference.startsWith("MOCK-GW-"), "SmsLog gatewayReference recorded from provider")

    // Verify failed job status for student2 (first attempt)
    const job2 = await prisma.notificationJob.findFirst({
      where: { recipient: "0244FAIL999" },
    })
    assert(!!job2, "Found failed job in database")
    assert(job2.status === JobStatus.PENDING, "Job with remaining attempts stays in PENDING status for retry")
    assert(job2.attempts === 1, "Job attempts incremented to 1 on first failure")
    assert(job2.errorMessage !== null, "Job recorded provider error message")

    // Verify SmsLog recorded for failed attempt
    const failedSmsLog = await prisma.smsLog.findFirst({
      where: { notificationJobId: job2.id },
    })
    assert(!!failedSmsLog, "SmsLog created for failed dispatch attempt")
    assert(failedSmsLog.deliveryStatus === SMSDeliveryStatus.FAILED, "SmsLog deliveryStatus is FAILED")

    // Simulate exhausting retries (trigger failure until attempts == 3)
    // Manually adjust availableAt to past so worker picks it up
    await prisma.notificationJob.update({
      where: { id: job2.id },
      data: { availableAt: new Date(Date.now() - 1000) },
    })
    await NotificationService.processNotificationQueue({ batchSize: 5 }) // Attempt 2

    await prisma.notificationJob.update({
      where: { id: job2.id },
      data: { availableAt: new Date(Date.now() - 1000) },
    })
    await NotificationService.processNotificationQueue({ batchSize: 5 }) // Attempt 3 (exhausted)

    const exhaustedJob2 = await prisma.notificationJob.findUnique({ where: { id: job2.id } })
    assert(exhaustedJob2.attempts >= 3, `Job reached max attempts: ${exhaustedJob2.attempts}`)
    assert(exhaustedJob2.status === JobStatus.FAILED, "Job marked as FAILED after max attempts exhausted")

    // ==========================================
    // GROUP 5: RETRY FAILED JOBS
    // ==========================================
    console.log("\n--- GROUP 5: Retry Failed Jobs ---")
    const retryResult = await NotificationService.retryFailedJobs(adminUser.id)
    assert(retryResult.retriedCount >= 1, `retryFailedJobs reset ${retryResult.retriedCount} jobs`)

    const retriedJob = await prisma.notificationJob.findUnique({ where: { id: job2.id } })
    assert(retriedJob.status === JobStatus.PENDING, "Retried job status is back to PENDING")
    assert(retriedJob.attempts === 0, "Retried job attempts reset to 0")
    assert(retriedJob.errorMessage === null, "Retried job errorMessage cleared")

    // ==========================================
    // GROUP 6: INTEGRATION WITH REPORT PUBLICATION
    // ==========================================
    console.log("\n--- GROUP 6: Integration With Report Publication ---")
    // Create a new fresh finalized term to test publication trigger
    const existingTermsCount = await prisma.term.count({ where: { academicYearId: academicYear.id } })
    const publishTriggerTerm = await prisma.term.create({
      data: {
        academicYearId: academicYear.id,
        name: `P11 Pub Term ${Date.now()}`,
        termSequence: existingTermsCount + 1,
        startDate: new Date("2026-11-20"),
        endDate: new Date("2026-12-31"),
        status: TermStatus.FINALIZED,
        finalizedAt: new Date(),
        finalizedById: adminUser.id,
      },
    })

    // Link a student result with a valid guardian
    const pubStudent = await prisma.student.create({
      data: {
        studentIdNumber: `P11-PUB-${Date.now()}`,
        firstName: "Publish",
        lastName: "Test",
        gender: "FEMALE",
      },
    })

    const pubEnrollment = await prisma.studentEnrollment.create({
      data: {
        studentId: pubStudent.id,
        academicYearId: academicYear.id,
        classId: testClass.id,
      },
    })

    const pubGuardian = await prisma.guardian.create({
      data: {
        name: "Mrs. Pub Guardian",
        phone: "0244777888",
        relationship: "Mother",
      },
    })

    await prisma.studentGuardian.create({
      data: {
        studentId: pubStudent.id,
        guardianId: pubGuardian.id,
        isPrimary: true,
      },
    })

    await prisma.termResult.create({
      data: {
        studentEnrollmentId: pubEnrollment.id,
        termId: publishTriggerTerm.id,
        totalScore: 92.0,
        averageScore: 92.0,
        classPosition: 1,
        cohortSize: 10,
        status: ResultStatus.FINALIZED,
      },
    })

    // Formally publish the term
    const publishResponse = await ReportService.publishTermReports(publishTriggerTerm.id, adminUser.id)
    assert(publishResponse.success === true, "ReportService.publishTermReports executes successfully")
    assert(publishResponse.status === TermStatus.PUBLISHED, "Term transitioned to PUBLISHED")
    assert(
      publishResponse.notificationsQueued !== undefined && publishResponse.notificationsQueued >= 1,
      `publishTermReports automatically enqueued SMS jobs: ${publishResponse.notificationsQueued}`
    )

    const pubJob = await prisma.notificationJob.findFirst({
      where: { recipient: "0244777888" },
    })
    assert(!!pubJob, "Notification job created for newly published student result")
    assert(pubJob.status === JobStatus.PENDING, "Newly published notification job is PENDING")

    // ==========================================
    // GROUP 7: QUEUE STATS AND LISTING
    // ==========================================
    console.log("\n--- GROUP 7: Queue Stats & Listing ---")
    const stats = await NotificationService.getQueueStats()
    assert(typeof stats.jobs.total === "number" && stats.jobs.total > 0, `Stats return total jobs: ${stats.jobs.total}`)
    assert(typeof stats.jobs.completed === "number", `Stats return completed jobs: ${stats.jobs.completed}`)
    assert(typeof stats.smsLogs.total === "number" && stats.smsLogs.total > 0, `Stats return total SMS logs: ${stats.smsLogs.total}`)
    assert(typeof stats.smsLogs.delivered === "number", `Stats return delivered SMS logs: ${stats.smsLogs.delivered}`)

    const jobList = await NotificationService.listJobs({ limit: 5 })
    assert(Array.isArray(jobList.items) && jobList.items.length > 0, `listJobs returns items array: ${jobList.items.length}`)
    assert(typeof jobList.total === "number", `listJobs returns total count: ${jobList.total}`)

    const smsLogsList = await NotificationService.listSmsLogs({ limit: 5 })
    assert(Array.isArray(smsLogsList.items) && smsLogsList.items.length > 0, `listSmsLogs returns items array: ${smsLogsList.items.length}`)
    assert(typeof smsLogsList.total === "number", `listSmsLogs returns total count: ${smsLogsList.total}`)

    // ==========================================
    // GROUP 8: AUDIT TRAIL LOGGING
    // ==========================================
    console.log("\n--- GROUP 8: Audit Trail Logging ---")
    const queueAudit = await prisma.auditLog.findFirst({
      where: { action: "QUEUE_TERM_SMS_NOTIFICATIONS" },
      orderBy: { createdAt: "desc" },
    })
    assert(!!queueAudit, "AuditLog recorded for QUEUE_TERM_SMS_NOTIFICATIONS")

    const retryAudit = await prisma.auditLog.findFirst({
      where: { action: "RETRY_FAILED_NOTIFICATIONS" },
      orderBy: { createdAt: "desc" },
    })
    assert(!!retryAudit, "AuditLog recorded for RETRY_FAILED_NOTIFICATIONS")

    const customSmsAudit = await prisma.auditLog.findFirst({
      where: { action: "ENQUEUE_CUSTOM_SMS" },
      orderBy: { createdAt: "desc" },
    })
    assert(!!customSmsAudit, "AuditLog recorded for ENQUEUE_CUSTOM_SMS")

    // ==========================================
    // SUMMARY
    // ==========================================
    console.log(`\n========================================`)
    console.log(`PHASE 11 TESTS COMPLETE: ${passed} PASSED, ${failed} FAILED`)
    console.log(`========================================`)

    if (failed > 0) {
      process.exit(1)
    }
  } catch (error) {
    console.error("Test execution encountered an error:", error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

runPhase11Tests()
