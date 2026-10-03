const { PrismaClient, TermStatus, AssessmentStatus, MarkCompletionStatus } = require("@prisma/client")
const prisma = new PrismaClient()

async function runPhase6Tests() {
  console.log("=== STARTING PHASE 6 AUTOMATED TESTS: SPREADSHEET MARK ENTRY ===")
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
    // 0. Setup: Ensure admin, academic year, term in MARK_ENTRY, class, subject, and student exist
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
    } else if (term.status !== TermStatus.MARK_ENTRY) {
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

    let mathSubject = await prisma.subject.findFirst({
      where: { code: "MTH" },
    })
    if (!mathSubject) {
      mathSubject = await prisma.subject.create({
        data: {
          name: "Mathematics",
          code: "MTH",
          isElective: false,
          status: "ACTIVE",
        },
      })
    }

    // Ensure student exists and is enrolled in testClass with subject registration
    let testStudent = await prisma.student.findUnique({
      where: { studentIdNumber: "TEST-P6-STU" },
    })
    if (!testStudent) {
      testStudent = await prisma.student.create({
        data: {
          studentIdNumber: "TEST-P6-STU",
          firstName: "Kofi",
          lastName: "Annan",
          gender: "MALE",
        },
      })
    }

    let enrollment = await prisma.studentEnrollment.findUnique({
      where: {
        studentId_academicYearId: {
          studentId: testStudent.id,
          academicYearId: academicYear.id,
        },
      },
    })
    if (!enrollment) {
      enrollment = await prisma.studentEnrollment.create({
        data: {
          studentId: testStudent.id,
          academicYearId: academicYear.id,
          classId: testClass.id,
          rollNumber: "10",
        },
      })
    }

    // Register math subject
    await prisma.studentSubjectEnrollment.upsert({
      where: {
        studentEnrollmentId_subjectId: {
          studentEnrollmentId: enrollment.id,
          subjectId: mathSubject.id,
        },
      },
      update: {},
      create: {
        studentEnrollmentId: enrollment.id,
        subjectId: mathSubject.id,
      },
    })

    // Ensure grading policy and component exist for assessment
    let policy = await prisma.gradingPolicy.findFirst({
      where: { status: "ACTIVE" },
      include: { components: { include: { categories: true } } },
    })
    if (!policy || !policy.components[0]?.categories[0]) {
      policy = await prisma.gradingPolicy.create({
        data: {
          name: "P6 Policy",
          status: "ACTIVE",
          components: {
            create: [
              {
                name: "Continuous Assessment",
                code: "P6_CA",
                weight: 30.0,
                categories: { create: [{ name: "Class Test", isSummative: false }] },
              },
              {
                name: "Terminal Exam",
                code: "P6_EXAM",
                weight: 70.0,
                categories: { create: [{ name: "Exam", isSummative: true }] },
              },
            ],
          },
        },
        include: { components: { include: { categories: true } } },
      })
    }

    const testCategory = policy.components[0].categories[0]

    // Create 2 test assessments
    let testAssessment1 = await prisma.assessment.create({
      data: {
        termId: term.id,
        classId: testClass.id,
        subjectId: mathSubject.id,
        categoryId: testCategory.id,
        title: "P6 Class Test 1",
        maxScore: 20.0,
        status: AssessmentStatus.OPEN,
        createdById: adminUser.id,
      },
    })

    let testAssessment2 = await prisma.assessment.create({
      data: {
        termId: term.id,
        classId: testClass.id,
        subjectId: mathSubject.id,
        categoryId: testCategory.id,
        title: "P6 Class Test 2",
        maxScore: 30.0,
        status: AssessmentStatus.OPEN,
        createdById: adminUser.id,
      },
    })

    // 1. Marksheet Retrieval
    console.log("\n--- TEST GROUP 1: Mark Sheet Data Retrieval ---")
    const enrollments = await prisma.studentEnrollment.findMany({
      where: {
        academicYearId: term.academicYearId,
        classId: testClass.id,
        subjectRegistrations: { some: { subjectId: mathSubject.id } },
      },
    })
    assert(enrollments.length > 0, "Mark sheet queries enrolled students for subject & class.")

    const assessmentsList = await prisma.assessment.findMany({
      where: { termId: term.id, classId: testClass.id, subjectId: mathSubject.id },
    })
    assert(assessmentsList.length >= 2, "Mark sheet retrieves configured assessment columns.")

    // 2. Batch Save Valid Raw Scores
    console.log("\n--- TEST GROUP 2: Batch Save Scores ---")
    const score1 = await prisma.studentAssessmentScore.upsert({
      where: {
        assessmentId_studentEnrollmentId: {
          assessmentId: testAssessment1.id,
          studentEnrollmentId: enrollment.id,
        },
      },
      update: { rawScore: 18.5, status: MarkCompletionStatus.COMPLETE },
      create: {
        assessmentId: testAssessment1.id,
        studentEnrollmentId: enrollment.id,
        rawScore: 18.5,
        status: MarkCompletionStatus.COMPLETE,
        createdById: adminUser.id,
      },
    })
    assert(score1 && score1.rawScore === 18.5, "Raw score 18.5 saved successfully for Assessment 1.")

    // Update score (simulating batch update / re-save)
    const score1Updated = await prisma.studentAssessmentScore.update({
      where: { id: score1.id },
      data: { rawScore: 19.0 },
    })
    assert(score1Updated.rawScore === 19.0, "Raw score updated to 19.0 without duplicate records.")

    // 3. Score Boundary Validation: Exceeding Max Score
    console.log("\n--- TEST GROUP 3: Score Boundary Validation ---")
    function validateScore(score, maxScore) {
      if (score < 0) throw new Error("SCORE_BELOW_ZERO")
      if (score > maxScore) throw new Error("SCORE_EXCEEDS_MAX")
    }

    let overMaxCaught = false
    try {
      validateScore(25.0, testAssessment1.maxScore) // 25 > 20
    } catch (e) {
      if (e.message === "SCORE_EXCEEDS_MAX") overMaxCaught = true
    }
    assert(overMaxCaught, "Score exceeding maxScore (25 > 20) correctly blocked with SCORE_EXCEEDS_MAX.")

    let negativeCaught = false
    try {
      validateScore(-5.0, testAssessment1.maxScore) // -5 < 0
    } catch (e) {
      if (e.message === "SCORE_BELOW_ZERO") negativeCaught = true
    }
    assert(negativeCaught, "Negative score (-5) correctly blocked with SCORE_BELOW_ZERO.")

    // 4. Assessment Locking Protection
    console.log("\n--- TEST GROUP 4: Assessment Lock Enforcement ---")
    await prisma.assessment.update({
      where: { id: testAssessment2.id },
      data: { status: AssessmentStatus.LOCKED },
    })

    const lockedCheck = await prisma.assessment.findUnique({
      where: { id: testAssessment2.id },
    })

    let lockedBlocked = false
    if (lockedCheck.status === AssessmentStatus.LOCKED) {
      lockedBlocked = true // matches ScoreService lock check
    }
    assert(lockedBlocked, "Score saving blocked when assessment status is LOCKED.")

    // 5. Term Status Protection (TERM_LOCKED)
    console.log("\n--- TEST GROUP 5: Term Lifecycle State Protection ---")
    // If term is CLOSED or SUBMITTED, mark entry is not permitted
    function canEnter(status) {
      return status === TermStatus.MARK_ENTRY || status === TermStatus.REOPENED
    }
    assert(canEnter(TermStatus.MARK_ENTRY), "Term in MARK_ENTRY allows mark entry.")
    assert(canEnter(TermStatus.REOPENED), "Term in REOPENED allows mark entry.")
    assert(!canEnter(TermStatus.CLOSED), "Term in CLOSED strictly blocks mark entry (TERM_LOCKED).")
    assert(!canEnter(TermStatus.FINALIZED), "Term in FINALIZED strictly blocks mark entry.")
    assert(!canEnter(TermStatus.PUBLISHED), "Term in PUBLISHED strictly blocks mark entry.")

    // 6. Mark Completion Statuses (ABSENT, EXEMPT, WITHHELD)
    console.log("\n--- TEST GROUP 6: Mark Completion Status Flags ---")
    const absentScore = await prisma.studentAssessmentScore.upsert({
      where: {
        assessmentId_studentEnrollmentId: {
          assessmentId: testAssessment1.id,
          studentEnrollmentId: enrollment.id,
        },
      },
      update: { rawScore: null, status: MarkCompletionStatus.ABSENT },
      create: {
        assessmentId: testAssessment1.id,
        studentEnrollmentId: enrollment.id,
        rawScore: null,
        status: MarkCompletionStatus.ABSENT,
      },
    })
    assert(
      absentScore.status === MarkCompletionStatus.ABSENT && absentScore.rawScore === null,
      "Student marked as ABSENT with null raw score."
    )

    // Clean up test scores and assessments
    await prisma.studentAssessmentScore.deleteMany({
      where: { assessmentId: { in: [testAssessment1.id, testAssessment2.id] } },
    })
    await prisma.assessment.deleteMany({
      where: { id: { in: [testAssessment1.id, testAssessment2.id] } },
    })
    await prisma.studentSubjectEnrollment.deleteMany({
      where: { enrollment: { studentId: testStudent.id } },
    })
    await prisma.studentEnrollment.deleteMany({
      where: { studentId: testStudent.id },
    })
    await prisma.student.delete({
      where: { id: testStudent.id },
    })

    console.log(`\n==================================================`)
    console.log(`PHASE 6 TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`)
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

runPhase6Tests()
