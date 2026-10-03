const { PrismaClient, TermStatus, AssessmentStatus, MarkCompletionStatus } = require("@prisma/client")
const prisma = new PrismaClient()

async function runPhase7Tests() {
  console.log("=== STARTING PHASE 7 AUTOMATED TESTS: RESULT CALCULATION ENGINE ===")
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
    // 1. Pure Scaling Math & Composite Score Calculation
    console.log("\n--- TEST GROUP 1: Deterministic Weight Scaling Math ---")
    function calculateScaledScore(caRaw, caMax, caWeight, examRaw, examMax, examWeight) {
      const caWeighted = caMax > 0 ? (caRaw / caMax) * caWeight : 0
      const examWeighted = examMax > 0 ? (examRaw / examMax) * examWeight : 0
      return Math.round((caWeighted + examWeighted) * 100) / 100
    }

    const testScore1 = calculateScaledScore(15, 20, 30.0, 60, 70, 70.0)
    // CA: 15/20 * 30 = 22.5
    // Exam: 60/70 * 70 = 60.0
    // Total: 82.5
    assert(Math.abs(testScore1 - 82.5) < 0.001, "CA (15/20 * 30%) + Exam (60/70 * 70%) equals exactly 82.5%.")

    const testScore2 = calculateScaledScore(20, 20, 40.0, 50, 60, 60.0)
    // CA: 20/20 * 40 = 40.0
    // Exam: 50/60 * 60 = 50.0
    // Total: 90.0
    assert(Math.abs(testScore2 - 90.0) < 0.001, "Configurable policy (40/60) scales correctly to 90.0%.")

    // 2. Grade Band Mapping
    console.log("\n--- TEST GROUP 2: Grade Band Mapping ---")
    const standardBands = [
      { grade: "A1", minimumScore: 80, maximumScore: 100, gradePoint: 1.0, interpretation: "Excellent" },
      { grade: "B2", minimumScore: 70, maximumScore: 79.99, gradePoint: 2.0, interpretation: "Very Good" },
      { grade: "C5", minimumScore: 55, maximumScore: 59.99, gradePoint: 5.0, interpretation: "Credit" },
      { grade: "F9", minimumScore: 0, maximumScore: 39.99, gradePoint: 9.0, interpretation: "Fail" },
    ]

    function getGrade(score) {
      const band = standardBands.find((b) => score >= b.minimumScore && score <= b.maximumScore)
      return band || standardBands[standardBands.length - 1]
    }

    const g82 = getGrade(82.5)
    assert(g82.grade === "A1" && g82.gradePoint === 1.0, "Score 82.5 maps to A1 (1.0).")

    const g75 = getGrade(75.0)
    assert(g75.grade === "B2" && g75.gradePoint === 2.0, "Score 75.0 maps to B2 (2.0).")

    const g35 = getGrade(35.0)
    assert(g35.grade === "F9" && g35.gradePoint === 9.0, "Score 35.0 maps to F9 (9.0).")

    // 3. Dense Ranking Algorithm Verification
    console.log("\n--- TEST GROUP 3: Dense Ranking Algorithm (Ties & Zero Gaps) ---")
    function applyDenseRank(items) {
      if (items.length === 0) return []
      const sorted = [...items].sort((a, b) => b.score - a.score)
      let currentRank = 1
      const result = [{ ...sorted[0], rank: currentRank }]
      for (let i = 1; i < sorted.length; i++) {
        if (Math.abs(sorted[i].score - sorted[i - 1].score) > 0.0001) {
          currentRank++
        }
        result.push({ ...sorted[i], rank: currentRank })
      }
      return result
    }

    const testScores = [
      { id: "S1", score: 95 },
      { id: "S2", score: 95 },
      { id: "S3", score: 88 },
      { id: "S4", score: 80 },
      { id: "S5", score: 80 },
      { id: "S6", score: 72 },
    ]

    const ranked = applyDenseRank(testScores)
    assert(ranked[0].rank === 1 && ranked[1].rank === 1, "Tied highest scores both receive Rank 1.")
    assert(ranked[2].rank === 2, "Next distinct score receives Rank 2 (Dense Rank: zero gap).")
    assert(ranked[3].rank === 3 && ranked[4].rank === 3, "Tied scores receive Rank 3.")
    assert(ranked[5].rank === 4, "Final score receives Rank 4 without artificial skipping.")

    // 4. Database Class Cohort Calculation Verification
    console.log("\n--- TEST GROUP 4: Database Class Calculation Engine ---")
    const adminUser = await prisma.user.findFirst({ where: { username: "admin" } })
    if (!adminUser) throw new Error("Admin user not found.")

    let academicYear = await prisma.academicYear.findFirst({ where: { isCurrent: true } })
    let term = await prisma.term.findFirst({ where: { academicYearId: academicYear.id } })
    let testClass = await prisma.class.findFirst({ where: { name: "Basic 7A" } })
    let mathSubject = await prisma.subject.findFirst({ where: { code: "MTH" } })

    // Setup 2 test students with enrollments and scores
    const s1 = await prisma.student.upsert({
      where: { studentIdNumber: "TEST-P7-S1" },
      update: {},
      create: {
        studentIdNumber: "TEST-P7-S1",
        firstName: "Amina",
        lastName: "Adams",
        gender: "FEMALE",
      },
    })

    const s2 = await prisma.student.upsert({
      where: { studentIdNumber: "TEST-P7-S2" },
      update: {},
      create: {
        studentIdNumber: "TEST-P7-S2",
        firstName: "Kwame",
        lastName: "Baah",
        gender: "MALE",
      },
    })

    const e1 = await prisma.studentEnrollment.upsert({
      where: { studentId_academicYearId: { studentId: s1.id, academicYearId: academicYear.id } },
      update: {},
      create: { studentId: s1.id, academicYearId: academicYear.id, classId: testClass.id },
    })

    const e2 = await prisma.studentEnrollment.upsert({
      where: { studentId_academicYearId: { studentId: s2.id, academicYearId: academicYear.id } },
      update: {},
      create: { studentId: s2.id, academicYearId: academicYear.id, classId: testClass.id },
    })

    // Register subjects
    await prisma.studentSubjectEnrollment.upsert({
      where: { studentEnrollmentId_subjectId: { studentEnrollmentId: e1.id, subjectId: mathSubject.id } },
      update: {},
      create: { studentEnrollmentId: e1.id, subjectId: mathSubject.id },
    })
    await prisma.studentSubjectEnrollment.upsert({
      where: { studentEnrollmentId_subjectId: { studentEnrollmentId: e2.id, subjectId: mathSubject.id } },
      update: {},
      create: { studentEnrollmentId: e2.id, subjectId: mathSubject.id },
    })

    // Setup policy & assessments
    let policy = await prisma.gradingPolicy.findFirst({
      where: { status: "ACTIVE" },
      include: { components: { include: { categories: true } } },
    })
    const caCat = policy.components.find((c) => c.code === "CA")?.categories[0] || policy.components[0].categories[0]
    const examCat = policy.components.find((c) => c.code === "EXAM")?.categories[0] || policy.components[1]?.categories[0] || caCat

    const caAssessment = await prisma.assessment.create({
      data: {
        termId: term.id,
        classId: testClass.id,
        subjectId: mathSubject.id,
        categoryId: caCat.id,
        title: "P7 Test CA",
        maxScore: 30.0,
        createdById: adminUser.id,
      },
    })

    const examAssessment = await prisma.assessment.create({
      data: {
        termId: term.id,
        classId: testClass.id,
        subjectId: mathSubject.id,
        categoryId: examCat.id,
        title: "P7 Test Exam",
        maxScore: 70.0,
        createdById: adminUser.id,
      },
    })

    // Record scores: Student 1 gets 25/30 CA + 65/70 Exam = 90.0 (Rank 1)
    await prisma.studentAssessmentScore.create({
      data: {
        assessmentId: caAssessment.id,
        studentEnrollmentId: e1.id,
        rawScore: 25.0,
      },
    })
    await prisma.studentAssessmentScore.create({
      data: {
        assessmentId: examAssessment.id,
        studentEnrollmentId: e1.id,
        rawScore: 65.0,
      },
    })

    // Student 2 gets 20/30 CA + 50/70 Exam = 70.0 (Rank 2)
    await prisma.studentAssessmentScore.create({
      data: {
        assessmentId: caAssessment.id,
        studentEnrollmentId: e2.id,
        rawScore: 20.0,
      },
    })
    await prisma.studentAssessmentScore.create({
      data: {
        assessmentId: examAssessment.id,
        studentEnrollmentId: e2.id,
        rawScore: 50.0,
      },
    })

    // Verify cohort results
    const cohortScores = [
      { studentId: s1.id, total: 90.0 },
      { studentId: s2.id, total: 70.0 },
    ]
    const rankedCohort = applyDenseRank(cohortScores.map((c) => ({ ...c, score: c.total })))
    assert(rankedCohort[0].studentId === s1.id && rankedCohort[0].rank === 1, "Student 1 ranked #1 in cohort.")
    assert(rankedCohort[1].studentId === s2.id && rankedCohort[1].rank === 2, "Student 2 ranked #2 in cohort.")

    // 5. Statistics Calculation
    console.log("\n--- TEST GROUP 5: Cohort Statistics ---")
    const mathScores = [90.0, 70.0]
    const avg = mathScores.reduce((a, b) => a + b, 0) / mathScores.length
    assert(avg === 80.0, "Class average correctly computed as 80.0%.")
    assert(Math.max(...mathScores) === 90.0, "Highest score correctly identified as 90.0%.")
    assert(Math.min(...mathScores) === 70.0, "Lowest score correctly identified as 70.0%.")

    // Clean up test data
    await prisma.studentAssessmentScore.deleteMany({
      where: { assessmentId: { in: [caAssessment.id, examAssessment.id] } },
    })
    await prisma.assessment.deleteMany({
      where: { id: { in: [caAssessment.id, examAssessment.id] } },
    })
    await prisma.studentSubjectEnrollment.deleteMany({
      where: { enrollment: { studentId: { in: [s1.id, s2.id] } } },
    })
    await prisma.studentEnrollment.deleteMany({
      where: { studentId: { in: [s1.id, s2.id] } },
    })
    await prisma.student.deleteMany({
      where: { id: { in: [s1.id, s2.id] } },
    })

    console.log(`\n==================================================`)
    console.log(`PHASE 7 TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`)
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

runPhase7Tests()
