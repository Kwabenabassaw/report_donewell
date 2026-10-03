const { PrismaClient, TermStatus, ResultStatus, AssessmentStatus } = require("@prisma/client")
const crypto = require("crypto")
const prisma = new PrismaClient()

async function runPhase10Tests() {
  console.log("=== STARTING PHASE 10 AUTOMATED TESTS: REPORTS & PUBLICATION ===")
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

    let academicYear = await prisma.academicYear.findFirst({ where: { isCurrent: true } })
    if (!academicYear) throw new Error("Academic year not found.")

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

    // Ensure SchoolProfile exists
    let schoolProfile = await prisma.schoolProfile.findFirst()
    if (!schoolProfile) {
      schoolProfile = await prisma.schoolProfile.create({
        data: {
          schoolName: "St. Augustine Academy",
          schoolCode: "SAA-001",
          motto: "Excellence in Truth",
          postalAddress: "P.O. Box 250, Cape Coast, Ghana",
          email: "admin@saa.edu.gh",
          phone: "+233 24 123 4567",
        },
      })
    }

    // Dynamic import of ReportService and FinalizationService
    const { ReportService } = await import("../server/services/ReportService.ts")

    // Find or create test student & enrollment
    const student = await prisma.student.upsert({
      where: { studentIdNumber: "TEST-P10-STU" },
      update: {},
      create: {
        studentIdNumber: "TEST-P10-STU",
        firstName: "Emmanuel",
        lastName: "Agyapong",
        gender: "MALE",
      },
    })

    const enrollment = await prisma.studentEnrollment.upsert({
      where: { studentId_academicYearId: { studentId: student.id, academicYearId: academicYear.id } },
      update: { classId: testClass.id },
      create: { studentId: student.id, academicYearId: academicYear.id, classId: testClass.id },
    })

    // Create a dedicated term for Phase 10
    let testTerm = await prisma.term.findFirst({
      where: { academicYearId: academicYear.id, name: "P10 Test Term" },
    })

    if (!testTerm) {
      const existingTerms = await prisma.term.findMany({ where: { academicYearId: academicYear.id } })
      const maxSeq = existingTerms.reduce((max, t) => Math.max(max, t.termSequence), 0)
      testTerm = await prisma.term.create({
        data: {
          academicYearId: academicYear.id,
          name: "P10 Test Term",
          termSequence: maxSeq + 1,
          startDate: new Date("2026-11-01"),
          endDate: new Date("2026-12-24"),
          totalSchoolDays: 60,
          status: TermStatus.FINALIZED,
          finalizedAt: new Date(),
          finalizedById: adminUser.id,
        },
      })
    } else {
      testTerm = await prisma.term.update({
        where: { id: testTerm.id },
        data: { status: TermStatus.FINALIZED },
      })
    }

    // Create official immutable TermResult snapshot
    const termResult = await prisma.termResult.upsert({
      where: {
        studentEnrollmentId_termId: {
          studentEnrollmentId: enrollment.id,
          termId: testTerm.id,
        },
      },
      update: {
        totalScore: 84.5,
        averageScore: 84.5,
        classPosition: 1,
        cohortSize: 35,
        gpa: 1.0,
        status: ResultStatus.FINALIZED,
      },
      create: {
        studentEnrollmentId: enrollment.id,
        termId: testTerm.id,
        totalScore: 84.5,
        averageScore: 84.5,
        classPosition: 1,
        cohortSize: 35,
        gpa: 1.0,
        status: ResultStatus.FINALIZED,
      },
    })

    // Create TermResultSubject snapshot
    await prisma.termResultSubject.upsert({
      where: {
        termResultId_subjectId: {
          termResultId: termResult.id,
          subjectId: mathSubject.id,
        },
      },
      update: {
        caWeightedScore: 26.5,
        examWeightedScore: 58.0,
        totalScore: 84.5,
        grade: "A1",
        gradePoint: 1.0,
        interpretation: "Excellent",
        subjectPosition: 1,
      },
      create: {
        termResultId: termResult.id,
        subjectId: mathSubject.id,
        caWeightedScore: 26.5,
        examWeightedScore: 58.0,
        totalScore: 84.5,
        grade: "A1",
        gradePoint: 1.0,
        interpretation: "Excellent",
        subjectPosition: 1,
      },
    })

    // Clean up any prior generated reports for this term result to ensure fresh versioning
    await prisma.generatedReport.deleteMany({
      where: { termResultId: termResult.id },
    })

    // Setup student evaluation
    await prisma.studentTermEvaluation.upsert({
      where: {
        studentEnrollmentId_termId: {
          studentEnrollmentId: enrollment.id,
          termId: testTerm.id,
        },
      },
      update: {
        daysPresent: 58,
        daysAbsent: 2,
        conductRating: "Excellent",
        attitudeRating: "Diligent",
        interestRating: "Mathematics & Robotics",
        classTeacherRemarks: "Outstanding analytical ability and leadership.",
        headmasterRemarks: "Consistently exceptional performance. Keep it up!",
      },
      create: {
        studentEnrollmentId: enrollment.id,
        termId: testTerm.id,
        daysPresent: 58,
        daysAbsent: 2,
        conductRating: "Excellent",
        attitudeRating: "Diligent",
        interestRating: "Mathematics & Robotics",
        classTeacherRemarks: "Outstanding analytical ability and leadership.",
        headmasterRemarks: "Consistently exceptional performance. Keep it up!",
      },
    })

    // --- TEST GROUP 1: Cryptographic Verification Token Generation ---
    console.log("\n--- TEST GROUP 1: Cryptographic Verification Token Generation ---")
    const tokenInfo1 = await ReportService.createVerificationToken(termResult.id, adminUser.id)
    assert(typeof tokenInfo1.token === "string" && tokenInfo1.token.length >= 32, "Cryptographic random token generated.")

    const expectedHash = crypto.createHash("sha256").update(tokenInfo1.token).digest("hex")
    assert(tokenInfo1.tokenHash === expectedHash, "SHA-256 token hash computed accurately.")

    const dbReport1 = await prisma.generatedReport.findUnique({
      where: { tokenHash: tokenInfo1.tokenHash },
    })
    assert(dbReport1 !== null, "GeneratedReport record stored in database by tokenHash.")
    assert(dbReport1.isCurrent === true, "Report record is marked isCurrent: true.")
    assert(dbReport1.reportVersion === 1, "Initial report version is 1.")

    // Verify raw token is NOT in database
    const rawInDb = JSON.stringify(dbReport1).includes(tokenInfo1.token)
    assert(!rawInDb, "Security Guard: Raw cryptographic token is NEVER persisted in the database, only SHA-256 hash.")

    // --- TEST GROUP 2: Public Verification Token Validation ---
    console.log("\n--- TEST GROUP 2: Public Verification Token Validation ---")
    const verifyResult = await ReportService.verifyReportToken(tokenInfo1.token)
    assert(verifyResult.isValid === true, "Public verification confirms token is authentic and valid.")
    assert(verifyResult.student.idNumber === "TEST-P10-STU", "Verified student ID number matches official record.")
    assert(verifyResult.student.fullName.includes("Agyapong"), "Verified student full name matches official record.")
    assert(verifyResult.performance.totalScore === 84.5, "Verified total score matches immutable snapshot.")
    assert(verifyResult.performance.classPosition === 1, "Verified class position matches immutable snapshot.")
    assert(verifyResult.downloadCount >= 1, "Verification audit access counter incremented.")

    // --- TEST GROUP 3: Tampered & Wrong Token Rejection ---
    console.log("\n--- TEST GROUP 3: Tampered & Wrong Token Rejection ---")
    const fakeVerify = await ReportService.verifyReportToken("forged-cryptographic-token-abc123xyz")
    assert(fakeVerify.isValid === false, "Forged token rejected by verification engine.")
    assert(fakeVerify.reason === "TOKEN_NOT_FOUND", "Forged token flags TOKEN_NOT_FOUND.")

    const emptyVerify = await ReportService.verifyReportToken("   ")
    assert(emptyVerify.isValid === false && emptyVerify.reason === "EMPTY_TOKEN", "Empty token correctly rejected.")

    // --- TEST GROUP 4: Token Superseding & Versioning ---
    console.log("\n--- TEST GROUP 4: Token Superseding & Versioning ---")
    const tokenInfo2 = await ReportService.createVerificationToken(termResult.id, adminUser.id)
    assert(tokenInfo2.reportVersion === 2, "Second token generation increments reportVersion to 2.")

    const oldTokenVerify = await ReportService.verifyReportToken(tokenInfo1.token)
    assert(oldTokenVerify.isValid === false, "Old token v1 is no longer valid after superseding.")
    assert(oldTokenVerify.reason === "TOKEN_SUPERSEDED", "Old token returns TOKEN_SUPERSEDED status.")

    const newTokenVerify = await ReportService.verifyReportToken(tokenInfo2.token)
    assert(newTokenVerify.isValid === true, "New token v2 is active and authentic.")
    assert(newTokenVerify.reportVersion === 2, "Verification reflects active reportVersion: 2.")

    // --- TEST GROUP 5: Token Revocation Workflow ---
    console.log("\n--- TEST GROUP 5: Token Revocation Workflow ---")
    const revokedRecord = await ReportService.revokeReportToken(tokenInfo2.tokenHash, adminUser.id)
    assert(revokedRecord.revokedAt !== null, "Token successfully marked with revokedAt timestamp.")
    assert(revokedRecord.isCurrent === false, "Revoked token isCurrent set to false.")

    const revokedVerify = await ReportService.verifyReportToken(tokenInfo2.token)
    assert(revokedVerify.isValid === false, "Revoked token rejected during verification.")
    assert(revokedVerify.reason === "TOKEN_REVOKED", "Revocation reason flags TOKEN_REVOKED.")

    // Re-issue active token for data assembly tests
    const activeTokenInfo = await ReportService.createVerificationToken(termResult.id, adminUser.id)

    // --- TEST GROUP 6: Comprehensive Report Card Data Assembly ---
    console.log("\n--- TEST GROUP 6: Comprehensive Report Card Data Assembly ---")
    const reportData = await ReportService.generateReportCardData(termResult.id, activeTokenInfo.token)
    assert(reportData.school.name.length > 0, "Report card includes official school name.")
    assert(reportData.student.fullName.includes("Agyapong"), "Report card includes student full name.")
    assert(reportData.subjects.length > 0, "Report card includes subject breakdown roster.")
    assert(reportData.subjects[0].totalScore === 84.5, "Subject composite score matches 84.5%.")
    assert(reportData.subjects[0].grade === "A1", "Subject grade matches A1.")
    assert(reportData.evaluation.conductRating === "Excellent", "Form teacher conduct rating included.")
    assert(reportData.evaluation.daysPresent === 58, "Attendance days present included.")
    assert(reportData.verification.qrSvg.includes("<svg"), "Report card embeds generated SVG QR code.")
    assert(reportData.verification.verifyUrl.includes("/reports/verify?token="), "QR code target points to official verification endpoint.")

    // --- TEST GROUP 7: Publication Lifecycle ---
    console.log("\n--- TEST GROUP 7: Publication Lifecycle ---")
    // Non-finalized term publication must fail
    await prisma.term.update({ where: { id: testTerm.id }, data: { status: TermStatus.MARK_ENTRY } })
    let unfinalizedBlocked = false
    try {
      await ReportService.publishTermReports(testTerm.id, adminUser.id)
    } catch (e) {
      if (e.code === "INVALID_STATE_TRANSITION" || e.message.includes("FINALIZED")) {
        unfinalizedBlocked = true
      }
    }
    assert(unfinalizedBlocked, "Attempting to publish an un-finalized term fails with INVALID_STATE_TRANSITION.")

    // Set to FINALIZED and publish
    await prisma.term.update({ where: { id: testTerm.id }, data: { status: TermStatus.FINALIZED } })
    const publishResult = await ReportService.publishTermReports(testTerm.id, adminUser.id)
    assert(publishResult.success === true, "ReportService.publishTermReports executed successfully.")

    const publishedTerm = await prisma.term.findUnique({ where: { id: testTerm.id } })
    assert(publishedTerm.status === TermStatus.PUBLISHED, "Term transitioned to PUBLISHED status.")
    assert(publishedTerm.publishedAt !== null, "Publication timestamp recorded.")
    assert(publishedTerm.publishedById === adminUser.id, "Publishing actor recorded.")

    const publishedResult = await prisma.termResult.findUnique({ where: { id: termResult.id } })
    assert(publishedResult.status === ResultStatus.PUBLISHED, "TermResult status transitioned to PUBLISHED.")

    // Verify publication audit log
    const auditLogs = await prisma.auditLog.findMany({
      where: { entityType: "Term", entityId: testTerm.id, action: "PUBLISH_TERM_REPORTS" },
    })
    assert(auditLogs.length > 0, "PUBLISH_TERM_REPORTS action recorded in system audit trail.")

    // Cleanup: restore term to MARK_ENTRY
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
  console.log(`PHASE 10 TEST SUMMARY: ${passed} passed, ${failed} failed`)
  console.log(`==================================================`)
  if (failed > 0) process.exit(1)
}

runPhase10Tests()
