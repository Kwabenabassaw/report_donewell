const { PrismaClient, TermStatus, ResultStatus, AssessmentStatus } = require("@prisma/client")
const prisma = new PrismaClient()

async function runPhase9Tests() {
  console.log("=== STARTING PHASE 9 AUTOMATED TESTS: FINALIZATION & IMMUTABLE RESULTS ===")
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
    // 0. Setup: Admin user, academic year, grading policy
    const adminUser = await prisma.user.findFirst({ where: { username: "admin" } })
    if (!adminUser) throw new Error("Admin user not found.")

    let academicYear = await prisma.academicYear.findFirst({ where: { isCurrent: true } })
    if (!academicYear) throw new Error("Current academic year not found.")

    let testClass = await prisma.class.findFirst({ where: { name: "Basic 7A" } })
    if (!testClass) {
      testClass = await prisma.class.create({
        data: { name: "Basic 7A", gradeLevel: "JHS 1" },
      })
    }

    let mathSubject = await prisma.subject.findFirst({ where: { code: "MTH" } })
    if (!mathSubject) {
      mathSubject = await prisma.subject.create({
        data: { code: "MTH", name: "Mathematics", isCore: true },
      })
    }

    // Dynamic import of FinalizationService
    const { FinalizationService } = await import("../server/services/FinalizationService.ts")

    // Find or create test term
    let testTerm = await prisma.term.findFirst({
      where: { academicYearId: academicYear.id, name: "P9 Test Term" },
    })

    if (!testTerm) {
      const existingTerms = await prisma.term.findMany({ where: { academicYearId: academicYear.id } })
      const maxSeq = existingTerms.reduce((max, t) => Math.max(max, t.termSequence), 0)
      testTerm = await prisma.term.create({
        data: {
          academicYearId: academicYear.id,
          name: "P9 Test Term",
          termSequence: maxSeq + 1,
          startDate: new Date("2026-10-01"),
          endDate: new Date("2026-12-20"),
          status: TermStatus.MARK_ENTRY,
        },
      })
    } else {
      testTerm = await prisma.term.update({
        where: { id: testTerm.id },
        data: { status: TermStatus.MARK_ENTRY },
      })
    }

    // Setup 2 test students & enrollments
    const student1 = await prisma.student.upsert({
      where: { studentIdNumber: "TEST-P9-STU1" },
      update: {},
      create: {
        studentIdNumber: "TEST-P9-STU1",
        firstName: "Kofi",
        lastName: "Mensah",
        gender: "MALE",
      },
    })

    const student2 = await prisma.student.upsert({
      where: { studentIdNumber: "TEST-P9-STU2" },
      update: {},
      create: {
        studentIdNumber: "TEST-P9-STU2",
        firstName: "Abena",
        lastName: "Osei",
        gender: "FEMALE",
      },
    })

    const enrollment1 = await prisma.studentEnrollment.upsert({
      where: { studentId_academicYearId: { studentId: student1.id, academicYearId: academicYear.id } },
      update: { classId: testClass.id },
      create: { studentId: student1.id, academicYearId: academicYear.id, classId: testClass.id },
    })

    const enrollment2 = await prisma.studentEnrollment.upsert({
      where: { studentId_academicYearId: { studentId: student2.id, academicYearId: academicYear.id } },
      update: { classId: testClass.id },
      create: { studentId: student2.id, academicYearId: academicYear.id, classId: testClass.id },
    })

    // Register subject
    await prisma.studentSubjectEnrollment.upsert({
      where: { studentEnrollmentId_subjectId: { studentEnrollmentId: enrollment1.id, subjectId: mathSubject.id } },
      update: {},
      create: { studentEnrollmentId: enrollment1.id, subjectId: mathSubject.id },
    })
    await prisma.studentSubjectEnrollment.upsert({
      where: { studentEnrollmentId_subjectId: { studentEnrollmentId: enrollment2.id, subjectId: mathSubject.id } },
      update: {},
      create: { studentEnrollmentId: enrollment2.id, subjectId: mathSubject.id },
    })

    // Policy & Assessment Activities
    let policy = await prisma.gradingPolicy.findFirst({
      where: { status: "ACTIVE" },
      include: { components: { include: { categories: true } } },
    })
    const caCat = policy.components.find((c) => c.code === "CA")?.categories[0] || policy.components[0].categories[0]
    const examCat = policy.components.find((c) => c.code === "EXAM")?.categories[0] || policy.components[1]?.categories[0] || caCat

    let caAssessment = await prisma.assessment.findFirst({
      where: { termId: testTerm.id, classId: testClass.id, subjectId: mathSubject.id, categoryId: caCat.id },
    })
    if (!caAssessment) {
      caAssessment = await prisma.assessment.create({
        data: {
          termId: testTerm.id,
          classId: testClass.id,
          subjectId: mathSubject.id,
          categoryId: caCat.id,
          title: "Phase 9 Class Assessment",
          maxScore: 30.0,
          createdById: adminUser.id,
        },
      })
    }

    let examAssessment = await prisma.assessment.findFirst({
      where: { termId: testTerm.id, classId: testClass.id, subjectId: mathSubject.id, categoryId: examCat.id },
    })
    if (!examAssessment) {
      examAssessment = await prisma.assessment.create({
        data: {
          termId: testTerm.id,
          classId: testClass.id,
          subjectId: mathSubject.id,
          categoryId: examCat.id,
          title: "Phase 9 Terminal Exam",
          maxScore: 70.0,
          createdById: adminUser.id,
        },
      })
    }

    // Record complete scores for student 1 and student 2
    // Student 1: CA 24/30, Exam 56/70 -> Total 80.0%
    await prisma.studentAssessmentScore.upsert({
      where: { assessmentId_studentEnrollmentId: { assessmentId: caAssessment.id, studentEnrollmentId: enrollment1.id } },
      update: { rawScore: 24.0 },
      create: { assessmentId: caAssessment.id, studentEnrollmentId: enrollment1.id, rawScore: 24.0 },
    })
    await prisma.studentAssessmentScore.upsert({
      where: { assessmentId_studentEnrollmentId: { assessmentId: examAssessment.id, studentEnrollmentId: enrollment1.id } },
      update: { rawScore: 56.0 },
      create: { assessmentId: examAssessment.id, studentEnrollmentId: enrollment1.id, rawScore: 56.0 },
    })

    // Student 2: CA 21/30, Exam 42/70 -> Total 63.0%
    await prisma.studentAssessmentScore.upsert({
      where: { assessmentId_studentEnrollmentId: { assessmentId: caAssessment.id, studentEnrollmentId: enrollment2.id } },
      update: { rawScore: 21.0 },
      create: { assessmentId: caAssessment.id, studentEnrollmentId: enrollment2.id, rawScore: 21.0 },
    })
    await prisma.studentAssessmentScore.upsert({
      where: { assessmentId_studentEnrollmentId: { assessmentId: examAssessment.id, studentEnrollmentId: enrollment2.id } },
      update: { rawScore: 42.0 },
      create: { assessmentId: examAssessment.id, studentEnrollmentId: enrollment2.id, rawScore: 42.0 },
    })

    // --- TEST GROUP 1: Prerequisite Status Enforcement ---
    console.log("\n--- TEST GROUP 1: Prerequisite Status Enforcement ---")
    let prerequisiteBlocked = false
    try {
      await FinalizationService.finalizeTerm(testTerm.id, adminUser.id)
    } catch (err) {
      if (err.code === "TERM_NOT_READY" || err.message.includes("APPROVED")) {
        prerequisiteBlocked = true
      }
    }
    assert(prerequisiteBlocked, "Attempting to finalize term in MARK_ENTRY status is blocked (TERM_NOT_READY).")

    // Update term to SUBMITTED and UNDER_REVIEW to ensure those also block
    await prisma.term.update({ where: { id: testTerm.id }, data: { status: TermStatus.UNDER_REVIEW } })
    let underReviewBlocked = false
    try {
      await FinalizationService.finalizeTerm(testTerm.id, adminUser.id)
    } catch (err) {
      if (err.code === "TERM_NOT_READY" || err.message.includes("APPROVED")) {
        underReviewBlocked = true
      }
    }
    assert(underReviewBlocked, "Attempting to finalize term in UNDER_REVIEW status is blocked.")

    // --- TEST GROUP 2: Atomic Finalization & Snapshot Creation ---
    console.log("\n--- TEST GROUP 2: Atomic Finalization & Snapshot Creation ---")
    // Formally approve term
    await prisma.term.update({
      where: { id: testTerm.id },
      data: {
        status: TermStatus.APPROVED,
        approvedAt: new Date(),
        approvedById: adminUser.id,
      },
    })

    const finalizeResult = await FinalizationService.finalizeTerm(testTerm.id, adminUser.id)
    assert(finalizeResult.success === true, "FinalizationService.finalizeTerm executed successfully.")

    // Check term status
    const finalizedTerm = await prisma.term.findUnique({ where: { id: testTerm.id } })
    assert(finalizedTerm.status === TermStatus.FINALIZED, "Term status transitioned to FINALIZED.")
    assert(finalizedTerm.finalizedAt !== null, "Finalization timestamp recorded on term.")
    assert(finalizedTerm.finalizedById === adminUser.id, "Finalizing actor user ID recorded.")

    // Check assessment locking
    const assessments = await prisma.assessment.findMany({ where: { termId: testTerm.id } })
    const allLocked = assessments.every((a) => a.status === AssessmentStatus.LOCKED)
    assert(allLocked, "All operational assessments for the finalized term are locked.")

    // Check term_results snapshot
    const results = await prisma.termResult.findMany({
      where: { termId: testTerm.id, enrollment: { classId: testClass.id } },
      orderBy: { classPosition: "asc" },
    })
    assert(results.length >= 2, "TermResult snapshot records created for enrolled students in test class.")
    const r1 = results.find((r) => r.studentEnrollmentId === enrollment1.id)
    const r2 = results.find((r) => r.studentEnrollmentId === enrollment2.id)
    assert(r1 && r1.status === ResultStatus.FINALIZED, "TermResult snapshot has FINALIZED status.")
    assert(r1 && r1.classPosition === 1, "Top-performing student receives class position #1.")
    assert(r2 && r2.classPosition === 2, "Second-performing student receives class position #2.")

    // Check term_result_subjects snapshot
    const student1Result = results.find((r) => r.studentEnrollmentId === enrollment1.id)
    const subjResults = await prisma.termResultSubject.findMany({
      where: { termResultId: student1Result.id },
    })
    assert(subjResults.length > 0, "TermResultSubject snapshot records created.")
    assert(subjResults[0].totalScore === 80.0, "TermResultSubject recorded exact composite score (80.0).")
    assert(subjResults[0].grade.length > 0, "TermResultSubject recorded letter grade.")

    // --- TEST GROUP 3: Immutability Guarantee ---
    console.log("\n--- TEST GROUP 3: Immutability Guarantee (Live Data != Official Snapshot) ---")
    const originalSnapshotScore = student1Result.totalScore

    // Simulate direct tampering / modification in operational live score table
    await prisma.studentAssessmentScore.update({
      where: {
        assessmentId_studentEnrollmentId: {
          assessmentId: examAssessment.id,
          studentEnrollmentId: enrollment1.id,
        },
      },
      data: { rawScore: 10.0 }, // Altered from 56.0 down to 10.0
    })

    // Verify snapshot in term_results remains untouched
    const refetchedResult = await prisma.termResult.findUnique({
      where: { id: student1Result.id },
    })
    assert(
      refetchedResult.totalScore === originalSnapshotScore,
      "Modifying operational student assessment score DOES NOT change TermResult snapshot totalScore."
    )

    const refetchedSubj = await prisma.termResultSubject.findUnique({
      where: {
        termResultId_subjectId: {
          termResultId: student1Result.id,
          subjectId: mathSubject.id,
        },
      },
    })
    assert(
      refetchedSubj.totalScore === 80.0,
      "TermResultSubject snapshot score remains strictly immutable at 80.0."
    )

    // Verify getFinalizedBroadsheet reads purely from snapshot
    const broadsheet = await FinalizationService.getFinalizedBroadsheet(testTerm.id, testClass.id)
    assert(broadsheet.isFinalized === true, "getFinalizedBroadsheet flags report as finalized.")
    const s1Row = broadsheet.students.find((s) => s.studentEnrollmentId === enrollment1.id)
    assert(
      s1Row && s1Row.totalScore === originalSnapshotScore,
      "Finalized broadsheet student total score reads from immutable snapshot, not altered live score."
    )

    // Restore operational score
    await prisma.studentAssessmentScore.update({
      where: {
        assessmentId_studentEnrollmentId: {
          assessmentId: examAssessment.id,
          studentEnrollmentId: enrollment1.id,
        },
      },
      data: { rawScore: 56.0 },
    })

    // --- TEST GROUP 4: Reopening Workflow & Superseding ---
    console.log("\n--- TEST GROUP 4: Reopening Workflow & Snapshot Superseding ---")
    // Reopening without reason must fail
    let reopeningBlocked = false
    try {
      await FinalizationService.reopenFinalizedTerm(testTerm.id, "", adminUser.id)
    } catch (err) {
      if (err.code === "VALIDATION_FAILED" || err.message.includes("reason")) {
        reopeningBlocked = true
      }
    }
    assert(reopeningBlocked, "Reopening finalized term without descriptive reason is rejected.")

    // Reopen with valid reason
    const reopenResult = await FinalizationService.reopenFinalizedTerm(
      testTerm.id,
      "Moderation audit correction requested for term results.",
      adminUser.id
    )
    assert(reopenResult.success === true, "FinalizationService.reopenFinalizedTerm executed successfully.")

    const reopenedTerm = await prisma.term.findUnique({ where: { id: testTerm.id } })
    assert(reopenedTerm.status === TermStatus.REOPENED, "Term status transitioned to REOPENED.")

    // Check snapshots marked SUPERSEDED
    const supersededResults = await prisma.termResult.findMany({
      where: { termId: testTerm.id },
    })
    const allSuperseded = supersededResults.every((r) => r.status === ResultStatus.SUPERSEDED)
    assert(allSuperseded, "All prior snapshot records are marked as SUPERSEDED.")

    // Check assessments unlocked
    const unlockedAssessments = await prisma.assessment.findMany({ where: { termId: testTerm.id } })
    const allOpen = unlockedAssessments.every((a) => a.status === AssessmentStatus.OPEN)
    assert(allOpen, "Operational assessments unlocked back to OPEN for mark adjustments.")

    // --- TEST GROUP 5: Re-Finalization ---
    console.log("\n--- TEST GROUP 5: Re-Finalization After Corrections ---")
    // Transition term to APPROVED and re-finalize
    await prisma.term.update({
      where: { id: testTerm.id },
      data: { status: TermStatus.APPROVED },
    })

    const refinalizeResult = await FinalizationService.finalizeTerm(testTerm.id, adminUser.id)
    assert(refinalizeResult.success === true, "Re-finalization executed successfully.")

    const refinalizedTerm = await prisma.term.findUnique({ where: { id: testTerm.id } })
    assert(refinalizedTerm.status === TermStatus.FINALIZED, "Term successfully re-finalized to FINALIZED.")

    const refinalizedResults = await prisma.termResult.findMany({
      where: { termId: testTerm.id },
    })
    const allActiveFinalized = refinalizedResults.every((r) => r.status === ResultStatus.FINALIZED)
    assert(allActiveFinalized, "Snapshots updated and restored to FINALIZED status.")

    // Verify audit logs
    const auditLogs = await prisma.auditLog.findMany({
      where: {
        entityType: "Term",
        entityId: testTerm.id,
      },
    })
    const hasFinalizeAudit = auditLogs.some((l) => l.action === "FINALIZE_TERM")
    const hasReopenAudit = auditLogs.some((l) => l.action === "REOPEN_FINALIZED_TERM")
    assert(hasFinalizeAudit, "FINALIZE_TERM action logged in audit trail.")
    assert(hasReopenAudit, "REOPEN_FINALIZED_TERM action logged in audit trail.")

    // Clean up test term by reverting to MARK_ENTRY
    await prisma.term.update({
      where: { id: testTerm.id },
      data: { status: TermStatus.MARK_ENTRY },
    })
  } catch (err) {
    console.error("Test execution error:", err)
    failed++
  } finally {
    await prisma.$disconnect()
  }

  console.log(`\n==================================================`)
  console.log(`PHASE 9 TEST SUMMARY: ${passed} passed, ${failed} failed`)
  console.log(`==================================================`)
  if (failed > 0) process.exit(1)
}

runPhase9Tests()
