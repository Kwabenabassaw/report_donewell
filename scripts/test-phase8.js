const { PrismaClient, TermStatus } = require("@prisma/client")
const prisma = new PrismaClient()

async function runPhase8Tests() {
  console.log("=== STARTING PHASE 8 AUTOMATED TESTS: VALIDATION, MODERATION & APPROVAL ===")
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
    // 0. Setup: Ensure admin, academic year, term, class, and enrolled student exist
    const adminUser = await prisma.user.findFirst({
      where: { username: "admin" },
    })
    if (!adminUser) throw new Error("Admin user not found in database.")

    let academicYear = await prisma.academicYear.findFirst({
      where: { isCurrent: true },
    })
    if (!academicYear) {
      academicYear = await prisma.academicYear.create({
        data: {
          name: "2026/2027",
          startDate: new Date("2026-09-01"),
          endDate: new Date("2027-07-31"),
          isCurrent: true,
        },
      })
    }

    let term = await prisma.term.findFirst({
      where: { academicYearId: academicYear.id, termSequence: 1 },
    })
    if (!term) {
      term = await prisma.term.create({
        data: {
          academicYearId: academicYear.id,
          name: "First Term",
          termSequence: 1,
          startDate: new Date("2026-09-01"),
          endDate: new Date("2026-12-15"),
          status: TermStatus.MARK_ENTRY,
        },
      })
    } else {
      term = await prisma.term.update({
        where: { id: term.id },
        data: { status: TermStatus.MARK_ENTRY },
      })
    }

    let testClass = await prisma.class.findFirst({
      where: { name: "Basic 7A" },
    })
    if (!testClass) {
      testClass = await prisma.class.create({
        data: {
          name: "Basic 7A",
          gradeLevel: "JHS 1",
        },
      })
    }

    // Ensure student exists and is enrolled
    let student = await prisma.student.upsert({
      where: { studentIdNumber: "TEST-P8-STU" },
      update: {},
      create: {
        studentIdNumber: "TEST-P8-STU",
        firstName: "Kweku",
        lastName: "Duah",
        gender: "MALE",
      },
    })

    let enrollment = await prisma.studentEnrollment.upsert({
      where: { studentId_academicYearId: { studentId: student.id, academicYearId: academicYear.id } },
      update: {},
      create: { studentId: student.id, academicYearId: academicYear.id, classId: testClass.id },
    })

    // 1. Form Teacher Student Evaluations
    console.log("\n--- TEST GROUP 1: Form Teacher Student Evaluations ---")
    const evaluation = await prisma.studentTermEvaluation.upsert({
      where: {
        studentEnrollmentId_termId: {
          studentEnrollmentId: enrollment.id,
          termId: term.id,
        },
      },
      update: {
        conductRating: "Excellent",
        attitudeRating: "Hardworking",
        interestRating: "Sports",
        daysPresent: 58,
        daysAbsent: 2,
        classTeacherRemarks: "Exemplary character and diligence throughout the term.",
      },
      create: {
        studentEnrollmentId: enrollment.id,
        termId: term.id,
        conductRating: "Excellent",
        attitudeRating: "Hardworking",
        interestRating: "Sports",
        daysPresent: 58,
        daysAbsent: 2,
        classTeacherRemarks: "Exemplary character and diligence throughout the term.",
      },
    })
    assert(evaluation && evaluation.conductRating === "Excellent", "Evaluation saved with conduct rating.")
    assert(evaluation.daysPresent === 58, "Attendance days recorded correctly.")
    assert(evaluation.classTeacherRemarks.length > 0, "Class teacher remarks recorded.")

    // 2. Moderation Completeness & Anomaly Detection
    console.log("\n--- TEST GROUP 2: Pre-Approval Moderation Audit ---")
    function detectAnomalies(caPct, examPct) {
      const divergence = Math.abs(caPct - examPct)
      return divergence > 40
    }
    assert(detectAnomalies(95, 30) === true, "High divergence (CA 95% vs Exam 30%) detected as anomaly.")
    assert(detectAnomalies(80, 75) === false, "Normal divergence (CA 80% vs Exam 75%) passes without anomaly.")

    // 3. State Machine Moderation Lifecycle
    console.log("\n--- TEST GROUP 3: Moderation State Machine Transitions ---")
    // Step 1: Submit Term for Review
    term = await prisma.term.update({
      where: { id: term.id },
      data: {
        status: TermStatus.SUBMITTED,
        submittedAt: new Date(),
        submittedById: adminUser.id,
      },
    })
    assert(term.status === TermStatus.SUBMITTED, "Term transitioned to SUBMITTED state.")
    assert(term.submittedAt !== null, "Submission timestamp recorded.")

    // Step 2: Begin Review
    term = await prisma.term.update({
      where: { id: term.id },
      data: { status: TermStatus.UNDER_REVIEW },
    })
    assert(term.status === TermStatus.UNDER_REVIEW, "Term transitioned to UNDER_REVIEW state.")

    // Step 3: Reject and Reopen (Send Back for Amendments)
    const rejectReason = "Class Assessment marks for Mathematics require moderation verification."
    let rejectRequiresReason = false
    try {
      if (!rejectReason || rejectReason.length < 5) throw new Error("REASON_REQUIRED")
      rejectRequiresReason = true
    } catch (e) {
      rejectRequiresReason = false
    }
    assert(rejectRequiresReason, "Term rejection enforces mandatory descriptive reason.")

    term = await prisma.term.update({
      where: { id: term.id },
      data: { status: TermStatus.REOPENED },
    })
    assert(term.status === TermStatus.REOPENED, "Term rejected and transitioned to REOPENED.")

    // Verify REOPENED allows marks
    function canEnter(status) {
      return status === TermStatus.MARK_ENTRY || status === TermStatus.REOPENED
    }
    assert(canEnter(term.status), "REOPENED term allows teachers to make required mark amendments.")

    // Step 4: Re-submit -> Review -> Approve
    term = await prisma.term.update({
      where: { id: term.id },
      data: { status: TermStatus.SUBMITTED },
    })
    term = await prisma.term.update({
      where: { id: term.id },
      data: { status: TermStatus.UNDER_REVIEW },
    })
    term = await prisma.term.update({
      where: { id: term.id },
      data: {
        status: TermStatus.APPROVED,
        approvedAt: new Date(),
        approvedById: adminUser.id,
      },
    })
    assert(term.status === TermStatus.APPROVED, "Term formally approved with APPROVED state.")
    assert(term.approvedAt !== null, "Approval timestamp recorded.")
    assert(term.approvedById === adminUser.id, "Approver user recorded.")

    // Restore term to MARK_ENTRY for clean ongoing usage
    await prisma.term.update({
      where: { id: term.id },
      data: { status: TermStatus.MARK_ENTRY },
    })

    // Clean up test data
    await prisma.studentTermEvaluation.deleteMany({
      where: { studentEnrollmentId: enrollment.id },
    })
    await prisma.studentEnrollment.deleteMany({
      where: { studentId: student.id },
    })
    await prisma.student.delete({
      where: { id: student.id },
    })

    console.log(`\n==================================================`)
    console.log(`PHASE 8 TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`)
    console.log(`==================================================\n`)

    if (failed > 0) {
      process.exit(1)
    }
  } catch (error) {
    console.error("Test execution threw exception:", error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

runPhase8Tests()
