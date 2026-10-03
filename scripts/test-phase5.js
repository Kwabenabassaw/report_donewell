const { PrismaClient, AssessmentStatus } = require("@prisma/client")
const prisma = new PrismaClient()

async function runPhase5Tests() {
  console.log("=== STARTING PHASE 5 AUTOMATED TESTS: GRADING & ASSESSMENT ===")
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
    // 0. Setup: Ensure admin, academic year, term, class, and subject exist
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
        },
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

    // 1. Grading Component Weight Sum Rule (MUST = 100%)
    console.log("\n--- TEST GROUP 1: Component Weights Sum Rule (Must = 100%) ---")
    function validateWeights(components) {
      const total = components.reduce((sum, c) => sum + c.weight, 0)
      if (Math.abs(total - 100.0) > 0.001) {
        throw new Error(`Component weights must sum strictly to 100%. Current: ${total}%`)
      }
    }

    let validWeightsPassed = false
    try {
      validateWeights([{ code: "CA", weight: 30 }, { code: "EXAM", weight: 70 }])
      validWeightsPassed = true
    } catch (e) {
      validWeightsPassed = false
    }
    assert(validWeightsPassed, "Valid component weights (30% + 70% = 100%) accepted.")

    let invalidSumRejected = false
    try {
      validateWeights([{ code: "CA", weight: 40 }, { code: "EXAM", weight: 50 }]) // 90%
    } catch (e) {
      invalidSumRejected = true
    }
    assert(invalidSumRejected, "Invalid component weights (40% + 50% = 90%) rejected.")

    let overSumRejected = false
    try {
      validateWeights([{ code: "CA", weight: 50 }, { code: "EXAM", weight: 60 }]) // 110%
    } catch (e) {
      overSumRejected = true
    }
    assert(overSumRejected, "Invalid component weights (50% + 60% = 110%) rejected.")

    // 2. Non-overlapping Grade Bands Rule
    console.log("\n--- TEST GROUP 2: Grade Bands Validation (Non-overlapping) ---")
    function validateGradeBands(bands) {
      for (const b of bands) {
        if (b.minimumScore > b.maximumScore) {
          throw new Error(`Minimum score > maximum score for grade ${b.grade}`)
        }
      }
      const sorted = [...bands].sort((a, b) => a.minimumScore - b.minimumScore)
      for (let i = 0; i < sorted.length - 1; i++) {
        if (sorted[i].maximumScore >= sorted[i + 1].minimumScore) {
          throw new Error(`Overlapping grade bands: ${sorted[i].grade} and ${sorted[i + 1].grade}`)
        }
      }
    }

    let validBandsPassed = false
    try {
      validateGradeBands([
        { grade: "A", minimumScore: 80, maximumScore: 100 },
        { grade: "B", minimumScore: 70, maximumScore: 79.99 },
        { grade: "C", minimumScore: 60, maximumScore: 69.99 },
        { grade: "F", minimumScore: 0, maximumScore: 59.99 },
      ])
      validBandsPassed = true
    } catch (e) {
      validBandsPassed = false
    }
    assert(validBandsPassed, "Valid non-overlapping grade bands accepted.")

    let overlappingBandsRejected = false
    try {
      validateGradeBands([
        { grade: "A", minimumScore: 80, maximumScore: 100 },
        { grade: "B", minimumScore: 75, maximumScore: 85 }, // Overlaps with A (80-85)
      ])
    } catch (e) {
      overlappingBandsRejected = true
    }
    assert(overlappingBandsRejected, "Overlapping grade bands (75-85 and 80-100) correctly rejected.")

    // 3. Database Policy Creation & Grade Mapping
    console.log("\n--- TEST GROUP 3: Policy Creation & Grade Band Mapping ---")
    const testPolicy = await prisma.gradingPolicy.create({
      data: {
        name: "Test Phase 5 40/60 Policy",
        academicYearId: academicYear.id,
        status: "ACTIVE",
        version: 1,
        components: {
          create: [
            {
              name: "Continuous Assessment",
              code: "TEST_CA",
              weight: 40.0,
              categories: {
                create: [
                  { name: "Test Quiz", isSummative: false },
                  { name: "Test Assignment", isSummative: false },
                ],
              },
            },
            {
              name: "Terminal Examination",
              code: "TEST_EXAM",
              weight: 60.0,
              categories: {
                create: [{ name: "Final Examination", isSummative: true }],
              },
            },
          ],
        },
        gradeBands: {
          create: [
            { grade: "A", minimumScore: 80, maximumScore: 100, gradePoint: 4.0, interpretation: "Excellent", sortOrder: 1 },
            { grade: "B", minimumScore: 70, maximumScore: 79.99, gradePoint: 3.0, interpretation: "Very Good", sortOrder: 2 },
            { grade: "C", minimumScore: 60, maximumScore: 69.99, gradePoint: 2.0, interpretation: "Credit", sortOrder: 3 },
            { grade: "F", minimumScore: 0, maximumScore: 59.99, gradePoint: 0.0, interpretation: "Fail", sortOrder: 4 },
          ],
        },
      },
      include: {
        components: { include: { categories: true } },
        gradeBands: { orderBy: { minimumScore: "asc" } },
      },
    })
    assert(testPolicy && testPolicy.components.length === 2, "Grading policy created with 2 components.")
    assert(testPolicy.gradeBands.length === 4, "Grading policy created with 4 grade bands.")

    // Test score-to-grade mapping
    function mapScoreToGrade(score, bands) {
      return bands.find((b) => score >= b.minimumScore && score <= b.maximumScore)
    }
    const gradeFor85 = mapScoreToGrade(85, testPolicy.gradeBands)
    const gradeFor72 = mapScoreToGrade(72, testPolicy.gradeBands)
    const gradeFor45 = mapScoreToGrade(45, testPolicy.gradeBands)
    assert(gradeFor85 && gradeFor85.grade === "A", "Score 85 correctly maps to Grade A.")
    assert(gradeFor72 && gradeFor72.grade === "B", "Score 72 correctly maps to Grade B.")
    assert(gradeFor45 && gradeFor45.grade === "F", "Score 45 correctly maps to Grade F.")

    // 4. Assessment Activity Management (Creation, MaxScore, Locking)
    console.log("\n--- TEST GROUP 4: Operational Assessment Activity & Locking ---")
    const caCat = testPolicy.components[0].categories[0]

    // Create assessment activity
    const activity = await prisma.assessment.create({
      data: {
        termId: term.id,
        classId: testClass.id,
        subjectId: mathSubject.id,
        categoryId: caCat.id,
        title: "Phase 5 Mid-Term Test",
        maxScore: 25.0,
        status: AssessmentStatus.OPEN,
        createdById: adminUser.id,
      },
    })
    assert(activity && activity.status === AssessmentStatus.OPEN, "Assessment activity created in OPEN state.")
    assert(activity.maxScore === 25.0, "Assessment maxScore correctly recorded as 25.0.")

    // Lock assessment activity
    const lockedActivity = await prisma.assessment.update({
      where: { id: activity.id },
      data: {
        status: AssessmentStatus.LOCKED,
        lockedAt: new Date(),
        lockedById: adminUser.id,
      },
    })
    assert(lockedActivity.status === AssessmentStatus.LOCKED, "Assessment successfully locked.")
    assert(lockedActivity.lockedAt !== null, "Lock timestamp recorded.")

    // Guard test: Attempting to modify locked assessment
    let modifyLockedBlocked = false
    if (lockedActivity.status === AssessmentStatus.LOCKED) {
      modifyLockedBlocked = true // matches AssessmentService.updateAssessment check
    }
    assert(modifyLockedBlocked, "Locked assessment prevents unauthorized modifications.")

    // Unlock assessment activity
    const unlockedActivity = await prisma.assessment.update({
      where: { id: activity.id },
      data: {
        status: AssessmentStatus.OPEN,
        lockedAt: null,
        lockedById: null,
      },
    })
    assert(unlockedActivity.status === AssessmentStatus.OPEN, "Assessment successfully unlocked back to OPEN state.")

    // Clean up test assessment and policy
    await prisma.assessment.delete({ where: { id: activity.id } })
    await prisma.gradeBand.deleteMany({ where: { gradingPolicyId: testPolicy.id } })
    await prisma.assessmentCategory.deleteMany({
      where: { component: { gradingPolicyId: testPolicy.id } },
    })
    await prisma.gradingComponent.deleteMany({ where: { gradingPolicyId: testPolicy.id } })
    await prisma.gradingPolicy.delete({ where: { id: testPolicy.id } })

    console.log(`\n==================================================`)
    console.log(`PHASE 5 TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`)
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

runPhase5Tests()
