const { PrismaClient, AssessmentStatus, TermStatus, MarkCompletionStatus } = require("@prisma/client")
const prisma = new PrismaClient()

async function runPhase12Tests() {
  console.log("=== STARTING PHASE 12 AUTOMATED TESTS: CSV IMPORT & BULK OPERATIONS ===")
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

    let testClass = await prisma.class.findFirst({ where: { name: "Basic 7A" } })
    if (!testClass) {
      testClass = await prisma.class.create({
        data: { name: "Basic 7A", gradeLevel: "JHS 1" },
      })
    }

    let coreMath = await prisma.subject.findFirst({ where: { code: "MTH" } })
    if (!coreMath) {
      coreMath = await prisma.subject.create({
        data: { code: "MTH", name: "Mathematics", isElective: false },
      })
    }

    let electiveFrench = await prisma.subject.findFirst({ where: { code: "FRE" } })
    if (!electiveFrench) {
      electiveFrench = await prisma.subject.create({
        data: { code: "FRE", name: "French", isElective: true },
      })
    }

    // Dynamic import of ImportService
    const { ImportService } = await import("../server/services/ImportService.ts")

    // Clean up prior test artifacts for Phase 12
    const testIds = ["P12-STU-01", "P12-STU-02", "P12-STU-03", "P12-STU-DUP", "P12-STU-BAD"]
    await prisma.studentAssessmentScore.deleteMany({
      where: { enrollment: { student: { studentIdNumber: { in: testIds } } } },
    })
    await prisma.studentSubjectEnrollment.deleteMany({
      where: { enrollment: { student: { studentIdNumber: { in: testIds } } } },
    })
    await prisma.studentGuardian.deleteMany({
      where: { student: { studentIdNumber: { in: testIds } } },
    })
    await prisma.studentEnrollment.deleteMany({
      where: { student: { studentIdNumber: { in: testIds } } },
    })
    await prisma.student.deleteMany({
      where: { studentIdNumber: { in: testIds } },
    })

    // ==========================================
    // GROUP 1: STUDENT CSV PARSING & VALIDATION
    // ==========================================
    console.log("\n--- GROUP 1: Student CSV Parsing & Validation ---")

    const rawCsv = `
      student_id, "first_name" , last_name , gender , class , guardian_name , guardian_phone , guardian_relationship
      P12-STU-01, Kofi, Mensah, MALE, Basic 7A, Kwame Mensah, 0244111222, Father
      P12-STU-02, Ama, Darko, FEMALE, Basic 7A, Akosua Darko, 0244333444, Mother
    `
    const parsedStudents = ImportService.parseStudentCsv(rawCsv)
    assert(parsedStudents.length === 2, `Parsed exactly 2 student rows: got ${parsedStudents.length}`)
    assert(parsedStudents[0].studentIdNumber === "P12-STU-01", "Parsed studentIdNumber correctly")
    assert(parsedStudents[0].firstName === "Kofi" && parsedStudents[0].lastName === "Mensah", "Parsed name fields correctly")
    assert(parsedStudents[0].gender === "MALE", "Parsed gender correctly")
    assert(parsedStudents[0].className === "Basic 7A", "Parsed class name correctly")

    // Validation of valid batch
    const validValidation = await ImportService.validateStudentCsv(parsedStudents, academicYear.id)
    assert(validValidation.valid === true, "Valid student CSV records pass validation")
    assert(validValidation.validRecordsCount === 2, "Valid records count is 2")
    assert(validValidation.invalidRecordsCount === 0, "Invalid records count is 0")

    // Validation with errors (Missing ID, Invalid Gender, Non-existent Class, Duplicate Row)
    const badCsv = `
      student_id,first_name,last_name,gender,class
      ,John,Doe,MALE,Basic 7A
      P12-STU-BAD,Jane,,FEMALE,Basic 7A
      P12-STU-03,Mark,Twain,UNKNOWN,Basic 7A
      P12-STU-04,Alice,Walker,FEMALE,NonExistentClass99
      P12-STU-DUP,Sam,Smith,MALE,Basic 7A
      P12-STU-DUP,Samantha,Smith,FEMALE,Basic 7A
    `
    const badParsed = ImportService.parseStudentCsv(badCsv)
    const badValidation = await ImportService.validateStudentCsv(badParsed, academicYear.id)
    assert(badValidation.valid === false, "Bad CSV rows fail validation")

    const row1Errors = badValidation.records[0].errors.map((e) => e.code)
    assert(row1Errors.includes("MISSING_STUDENT_ID"), "Identified MISSING_STUDENT_ID error code")

    const row2Errors = badValidation.records[1].errors.map((e) => e.code)
    assert(row2Errors.includes("MISSING_STUDENT_NAME"), "Identified MISSING_STUDENT_NAME error code")

    const row3Errors = badValidation.records[2].errors.map((e) => e.code)
    assert(row3Errors.includes("INVALID_GENDER"), "Identified INVALID_GENDER error code")

    const row4Errors = badValidation.records[3].errors.map((e) => e.code)
    assert(row4Errors.includes("CLASS_NOT_FOUND"), "Identified CLASS_NOT_FOUND error code")

    const row6Errors = badValidation.records[5].errors.map((e) => e.code)
    assert(row6Errors.includes("DUPLICATE_CSV_ROW"), "Identified DUPLICATE_CSV_ROW error code")

    // Test Template Generation
    const studentTemplate = ImportService.generateStudentTemplate()
    assert(
      studentTemplate.includes("student_id") && studentTemplate.includes("first_name") && studentTemplate.includes("class"),
      "generateStudentTemplate returns valid template headers"
    )

    // ==========================================
    // GROUP 2: ATOMIC STUDENT IMPORT EXECUTION
    // ==========================================
    console.log("\n--- GROUP 2: Atomic Student Import Execution ---")

    // Batch with error must throw and rollback completely
    let batchFailed = false
    try {
      await ImportService.executeStudentImport(badParsed, academicYear.id, adminUser.id)
    } catch (e) {
      batchFailed = true
    }
    assert(batchFailed === true, "executeStudentImport rejects invalid batch and blocks partial import")

    const shouldNotExist = await prisma.student.findUnique({ where: { studentIdNumber: "P12-STU-03" } })
    assert(shouldNotExist === null, "Transaction rollback verified: No partial student records written")

    // Execute valid batch
    const importResult = await ImportService.executeStudentImport(parsedStudents, academicYear.id, adminUser.id)
    assert(importResult.importedStudents === 2, `Successfully imported 2 students: got ${importResult.importedStudents}`)
    assert(importResult.importedEnrollments === 2, `Successfully imported 2 enrollments: got ${importResult.importedEnrollments}`)

    // Verify student and enrollment in database
    const dbStudent1 = await prisma.student.findUnique({
      where: { studentIdNumber: "P12-STU-01" },
      include: {
        enrollments: {
          include: {
            subjectRegistrations: { include: { subject: true } },
          },
        },
        studentGuardians: { include: { guardian: true } },
      },
    })
    assert(!!dbStudent1, "Student 1 found in database")
    assert(dbStudent1.enrollments.length === 1, "Student 1 has exactly 1 enrollment for current academic year")

    // Verify core subject auto-enrollment
    const registeredSubjCodes = dbStudent1.enrollments[0].subjectRegistrations.map((sr) => sr.subject.code)
    assert(registeredSubjCodes.includes("MTH"), "Student automatically enrolled in core subject (MTH)")

    // Verify guardian creation & primary link
    assert(dbStudent1.studentGuardians.length === 1, "Guardian created and linked to student")
    assert(dbStudent1.studentGuardians[0].isPrimary === true, "Guardian designated as isPrimary: true")
    assert(dbStudent1.studentGuardians[0].guardian.phone === "0244111222", "Guardian phone number saved correctly")

    // Verify duplicate enrollment rejection on re-import
    const reImportValidation = await ImportService.validateStudentCsv(parsedStudents, academicYear.id)
    assert(reImportValidation.valid === false, "Re-importing already enrolled students fails validation")
    const dupErrors = reImportValidation.records[0].errors.map((e) => e.code)
    assert(dupErrors.includes("DUPLICATE_ENROLLMENT"), "Identified DUPLICATE_ENROLLMENT error code")

    // Verify Audit Log
    const studentImportAudit = await prisma.auditLog.findFirst({
      where: { action: "IMPORT_CSV_STUDENTS" },
      orderBy: { createdAt: "desc" },
    })
    assert(!!studentImportAudit, "Audit log recorded for IMPORT_CSV_STUDENTS")

    // ==========================================
    // GROUP 3: ASSESSMENT MARKS CSV OPERATIONS
    // ==========================================
    console.log("\n--- GROUP 3: Assessment Marks CSV Operations ---")

    // Create a dedicated Term & Assessment for Phase 12
    const existingTerms = await prisma.term.findMany({ where: { academicYearId: academicYear.id } })
    const maxSeq = existingTerms.reduce((max, t) => Math.max(max, t.termSequence), 0)

    const p12Term = await prisma.term.create({
      data: {
        academicYearId: academicYear.id,
        name: `P12 Test Term ${Date.now()}`,
        termSequence: maxSeq + 1,
        startDate: new Date("2026-11-25"),
        endDate: new Date("2026-12-31"),
        status: TermStatus.MARK_ENTRY,
      },
    })

    const assessmentCat = await prisma.assessmentCategory.findFirst()
    if (!assessmentCat) throw new Error("AssessmentCategory not found.")

    const testAssessment = await prisma.assessment.create({
      data: {
        termId: p12Term.id,
        classId: testClass.id,
        subjectId: coreMath.id,
        categoryId: assessmentCat.id,
        title: "Mid-Term Math Quiz",
        maxScore: 30.0,
        status: AssessmentStatus.OPEN,
        createdById: adminUser.id,
      },
    })

    // Also register Student 1 and Student 2 for this assessment's subject in this term
    // Student 1 and 2 already have enrollments with coreMath registered in step 2.

    const scoreCsv = `
      student_id,score,status
      P12-STU-01,24.5,COMPLETE
      P12-STU-02,28.0,COMPLETE
    `
    const parsedScores = ImportService.parseScoreCsv(scoreCsv)
    assert(parsedScores.length === 2, `Parsed 2 score rows: got ${parsedScores.length}`)
    assert(parsedScores[0].studentIdNumber === "P12-STU-01", "Score row parsed student ID")
    assert(parsedScores[0].score === 24.5, "Score row parsed score value (24.5)")
    assert(parsedScores[0].status === MarkCompletionStatus.COMPLETE, "Score row parsed status")

    // Validate valid scores batch
    const scoreValidation = await ImportService.validateScoreCsv(testAssessment.id, parsedScores)
    assert(scoreValidation.valid === true, "Valid score CSV rows pass validation")
    assert(scoreValidation.validRecordsCount === 2, "Valid score records count is 2")
    assert(scoreValidation.assessment.maxScore === 30.0, "Score validation reflects assessment maxScore (30)")

    // Validate bad scores (Exceeds max, Below zero, Missing score, Unregistered student)
    const badScoreCsv = `
      student_id,score,status
      P12-STU-01,35.0,COMPLETE
      P12-STU-02,-5.0,COMPLETE
      P12-STU-01,,COMPLETE
      UNKNOWN-STU-99,20.0,COMPLETE
      P12-STU-01,15.0,COMPLETE
      P12-STU-01,18.0,COMPLETE
    `
    const badParsedScores = ImportService.parseScoreCsv(badScoreCsv)
    const badScoreVal = await ImportService.validateScoreCsv(testAssessment.id, badParsedScores)
    assert(badScoreVal.valid === false, "Bad score CSV rows fail validation")

    const scoreRow1Errors = badScoreVal.records[0].errors.map((e) => e.code)
    assert(scoreRow1Errors.includes("SCORE_EXCEEDS_MAX"), "Identified SCORE_EXCEEDS_MAX error code")

    const scoreRow2Errors = badScoreVal.records[1].errors.map((e) => e.code)
    assert(scoreRow2Errors.includes("SCORE_BELOW_ZERO"), "Identified SCORE_BELOW_ZERO error code")

    const scoreRow3Errors = badScoreVal.records[2].errors.map((e) => e.code)
    assert(scoreRow3Errors.includes("MISSING_REQUIRED_SCORE"), "Identified MISSING_REQUIRED_SCORE error code")

    const scoreRow4Errors = badScoreVal.records[3].errors.map((e) => e.code)
    assert(scoreRow4Errors.includes("STUDENT_NOT_REGISTERED_FOR_SUBJECT"), "Identified STUDENT_NOT_REGISTERED_FOR_SUBJECT error code")

    const scoreRow6Errors = badScoreVal.records[5].errors.map((e) => e.code)
    assert(scoreRow6Errors.includes("DUPLICATE_CSV_ROW"), "Identified DUPLICATE_CSV_ROW for duplicate score entry")

    // Test Assessment Lock Enforcement
    await prisma.assessment.update({
      where: { id: testAssessment.id },
      data: { status: AssessmentStatus.LOCKED },
    })
    const lockedVal = await ImportService.validateScoreCsv(testAssessment.id, parsedScores)
    assert(lockedVal.valid === false, "Score validation fails when assessment is LOCKED")
    const lockedErrors = lockedVal.records[0].errors.map((e) => e.code)
    assert(lockedErrors.includes("ASSESSMENT_LOCKED"), "Identified ASSESSMENT_LOCKED error code")

    // Unlock assessment
    await prisma.assessment.update({
      where: { id: testAssessment.id },
      data: { status: AssessmentStatus.OPEN },
    })

    // Test Term Finalized Enforcement
    await prisma.term.update({
      where: { id: p12Term.id },
      data: { status: TermStatus.FINALIZED },
    })
    const termFinalizedVal = await ImportService.validateScoreCsv(testAssessment.id, parsedScores)
    assert(termFinalizedVal.valid === false, "Score validation fails when term is FINALIZED")
    const termErrors = termFinalizedVal.records[0].errors.map((e) => e.code)
    assert(termErrors.includes("TERM_FINALIZED"), "Identified TERM_FINALIZED error code")

    // Reopen term for import test
    await prisma.term.update({
      where: { id: p12Term.id },
      data: { status: TermStatus.MARK_ENTRY },
    })

    // ==========================================
    // GROUP 4: ATOMIC SCORE IMPORT EXECUTION
    // ==========================================
    console.log("\n--- GROUP 4: Atomic Score Import Execution ---")

    // Reject invalid score batch
    let scoreBatchFailed = false
    try {
      await ImportService.executeScoreImport(testAssessment.id, badParsedScores, adminUser.id)
    } catch (e) {
      scoreBatchFailed = true
    }
    assert(scoreBatchFailed === true, "executeScoreImport rejects invalid score batch")

    // Import valid batch
    const scoreImportRes = await ImportService.executeScoreImport(testAssessment.id, parsedScores, adminUser.id)
    assert(scoreImportRes.success === true, "executeScoreImport executes successfully")
    assert(scoreImportRes.importedCount === 2, `Successfully committed 2 scores: got ${scoreImportRes.importedCount}`)

    // Verify scores in database
    const dbScores = await prisma.studentAssessmentScore.findMany({
      where: { assessmentId: testAssessment.id },
      include: { enrollment: { include: { student: true } } },
    })
    assert(dbScores.length === 2, "Found exactly 2 scores in student_assessment_scores")
    const scoreStu1 = dbScores.find((s) => s.enrollment.student.studentIdNumber === "P12-STU-01")
    assert(scoreStu1.rawScore === 24.5, "Student 1 raw score saved as 24.5")

    // Test Score Overwrite / Update
    const updateScoreCsv = `
      student_id,score,status
      P12-STU-01,26.0,COMPLETE
    `
    await ImportService.executeScoreImport(
      testAssessment.id,
      ImportService.parseScoreCsv(updateScoreCsv),
      adminUser.id
    )
    const updatedScore = await prisma.studentAssessmentScore.findFirst({
      where: {
        assessmentId: testAssessment.id,
        enrollment: { student: { studentIdNumber: "P12-STU-01" } },
      },
    })
    assert(updatedScore.rawScore === 26.0, "Score successfully updated via re-import (26.0)")

    // Verify Score Template Generation
    const scoreTemplate = await ImportService.generateScoreTemplate(testAssessment.id)
    assert(scoreTemplate.includes("student_id_number,student_name,score,status"), "Template includes required headers")
    assert(scoreTemplate.includes("P12-STU-01"), "Template pre-populates enrolled student P12-STU-01")
    assert(scoreTemplate.includes("P12-STU-02"), "Template pre-populates enrolled student P12-STU-02")

    // Verify Audit Log
    const scoreImportAudit = await prisma.auditLog.findFirst({
      where: { action: "IMPORT_CSV_ASSESSMENT_SCORES" },
      orderBy: { createdAt: "desc" },
    })
    assert(!!scoreImportAudit, "Audit log recorded for IMPORT_CSV_ASSESSMENT_SCORES")

    // ==========================================
    // SUMMARY
    // ==========================================
    console.log(`\n========================================`)
    console.log(`PHASE 12 TESTS COMPLETE: ${passed} PASSED, ${failed} FAILED`)
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

runPhase12Tests()
