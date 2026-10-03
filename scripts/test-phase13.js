const { PrismaClient, TermStatus, ResultStatus } = require("@prisma/client")
const prisma = new PrismaClient()

async function runPhase13Tests() {
  console.log("=== STARTING PHASE 13 AUTOMATED TESTS: DASHBOARDS & ACADEMIC ANALYTICS ===")
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
    const { AnalyticsService } = await import("../server/services/AnalyticsService.ts")

    // ==========================================
    // TEST SECTION 1: SRS Section 48 Executive Dashboard Indicators
    // ==========================================
    console.log("\n--- TEST SECTION 1: Executive Overview (11 SRS Section 48 Indicators) ---")
    const overview = await AnalyticsService.getExecutiveOverview()

    assert(overview !== null && typeof overview === "object", "Executive overview object returned")
    assert(overview.academicYear !== undefined, "Indicator 1: Academic Year property present")
    assert(overview.currentTerm !== undefined, "Indicator 2: Current Term property present")
    assert(typeof overview.studentCount === "number" && overview.studentCount >= 0, "Indicator 3: Total active students is non-negative number")
    assert(typeof overview.classCount === "number" && overview.classCount >= 0, "Indicator 4: Total classes is non-negative number")
    assert(typeof overview.subjectCount === "number" && overview.subjectCount >= 0, "Indicator 5: Total subjects is non-negative number")
    assert(
      typeof overview.markCompletionPercentage === "number" &&
        overview.markCompletionPercentage >= 0 &&
        overview.markCompletionPercentage <= 100,
      "Indicator 6: Mark completion percentage is between 0 and 100"
    )
    assert(typeof overview.incompleteMarksCount === "number" && overview.incompleteMarksCount >= 0, "Indicator 7: Incomplete marks count is non-negative")
    assert(typeof overview.pendingTeacherSubmissionsCount === "number" && overview.pendingTeacherSubmissionsCount >= 0, "Indicator 8: Pending teacher submissions count is non-negative")
    assert(typeof overview.pendingApprovalsCount === "number" && overview.pendingApprovalsCount >= 0, "Indicator 9: Pending approvals count is non-negative")
    assert(typeof overview.finalizedClassesCount === "number" && overview.finalizedClassesCount >= 0, "Indicator 10: Finalized classes count is non-negative")
    assert(typeof overview.publishedReportsCount === "number" && overview.publishedReportsCount >= 0, "Indicator 11: Published reports count is non-negative")

    assert(overview.smsDelivery !== undefined, "SMS Notification delivery statistics present")
    assert(typeof overview.smsDelivery.queued === "number", "SMS queued count present")
    assert(typeof overview.smsDelivery.delivered === "number", "SMS delivered count present")
    assert(typeof overview.smsDelivery.failed === "number", "SMS failed count present")

    // ==========================================
    // TEST SECTION 2: Statistical & Performance Analytics Cohort
    // ==========================================
    console.log("\n--- TEST SECTION 2: Performance Cohort Analytics & Statistical Accuracy ---")

    const academicYear = await prisma.academicYear.findFirst({ where: { isCurrent: true } })
    if (!academicYear) throw new Error("Current academic year missing for tests.")

    let testTerm = await prisma.term.findFirst({
      where: { academicYearId: academicYear.id, name: "P13 Analytics Term" },
    })
    if (!testTerm) {
      testTerm = await prisma.term.create({
        data: {
          name: "P13 Analytics Term",
          termSequence: 99,
          startDate: new Date("2026-09-01"),
          endDate: new Date("2026-12-15"),
          academicYearId: academicYear.id,
          status: TermStatus.CLOSED,
        },
      })
    }

    let testClass = await prisma.class.findFirst({ where: { name: "P13 Class A" } })
    if (!testClass) {
      testClass = await prisma.class.create({
        data: { name: "P13 Class A", gradeLevel: "JHS 1" },
      })
    }

    let mathSubj = await prisma.subject.findFirst({ where: { code: "P13-MTH" } })
    if (!mathSubj) {
      mathSubj = await prisma.subject.create({
        data: { code: "P13-MTH", name: "P13 Mathematics", isElective: false },
      })
    }

    let engSubj = await prisma.subject.findFirst({ where: { code: "P13-ENG" } })
    if (!engSubj) {
      engSubj = await prisma.subject.create({
        data: { code: "P13-ENG", name: "P13 English", isElective: false },
      })
    }

    // Clean up any old test cohort data
    const cohortStudentIds = [
      "P13-STU-01",
      "P13-STU-02",
      "P13-STU-03",
      "P13-STU-04",
      "P13-STU-05",
    ]

    await prisma.termResultSubject.deleteMany({
      where: { termResult: { termId: testTerm.id } },
    })
    await prisma.termResult.deleteMany({
      where: { termId: testTerm.id },
    })
    await prisma.studentEnrollment.deleteMany({
      where: { student: { studentIdNumber: { in: cohortStudentIds } } },
    })
    await prisma.student.deleteMany({
      where: { studentIdNumber: { in: cohortStudentIds } },
    })

    // Create 5 controlled students:
    // S1: Female, Math: 95, Eng: 90 -> Total: 185, Avg: 92.5 (A+ Distinction)
    // S2: Male,   Math: 80, Eng: 88 -> Total: 168, Avg: 84.0 (A Distinction)
    // S3: Female, Math: 70, Eng: 80 -> Total: 150, Avg: 75.0 (B)
    // S4: Male,   Math: 60, Eng: 64 -> Total: 124, Avg: 62.0 (C)
    // S5: Male,   Math: 30, Eng: 40 -> Total: 70,  Avg: 35.0 (F)

    const cohortData = [
      { idNum: "P13-STU-01", first: "Abena", last: "Agyei", gender: "FEMALE", mScore: 95, eScore: 90, avg: 92.5, tot: 185, rank: 1, gpa: 4.0 },
      { idNum: "P13-STU-02", first: "Kwame", last: "Mensah", gender: "MALE", mScore: 80, eScore: 88, avg: 84.0, tot: 168, rank: 2, gpa: 3.5 },
      { idNum: "P13-STU-03", first: "Akosua", last: "Boateng", gender: "FEMALE", mScore: 70, eScore: 80, avg: 75.0, tot: 150, rank: 3, gpa: 3.0 },
      { idNum: "P13-STU-04", first: "Kofi", last: "Osei", gender: "MALE", mScore: 60, eScore: 64, avg: 62.0, tot: 124, rank: 4, gpa: 2.5 },
      { idNum: "P13-STU-05", first: "Yaw", last: "Appiah", gender: "MALE", mScore: 30, eScore: 40, avg: 35.0, tot: 70, rank: 5, gpa: 0.0 },
    ]

    for (const c of cohortData) {
      const stu = await prisma.student.create({
        data: {
          studentIdNumber: c.idNum,
          firstName: c.first,
          lastName: c.last,
          gender: c.gender,
          dateOfBirth: new Date("2012-05-10"),
          enrollmentDate: new Date("2024-09-01"),
        },
      })

      const enr = await prisma.studentEnrollment.create({
        data: {
          studentId: stu.id,
          classId: testClass.id,
          academicYearId: academicYear.id,
          status: "ACTIVE",
        },
      })

      const tr = await prisma.termResult.create({
        data: {
          studentEnrollmentId: enr.id,
          termId: testTerm.id,
          totalScore: c.tot,
          averageScore: c.avg,
          classPosition: c.rank,
          cohortSize: 5,
          gpa: c.gpa,
          status: ResultStatus.PUBLISHED,
        },
      })

      await prisma.termResultSubject.createMany({
        data: [
          {
            termResultId: tr.id,
            subjectId: mathSubj.id,
            caRawScore: c.mScore * 0.4,
            caMaxScore: 100,
            caWeightedScore: c.mScore * 0.4,
            examRawScore: c.mScore * 0.6,
            examMaxScore: 100,
            examWeightedScore: c.mScore * 0.6,
            totalScore: c.mScore,
            grade: c.mScore >= 90 ? "A+" : c.mScore >= 80 ? "A" : c.mScore >= 70 ? "B" : c.mScore >= 60 ? "C" : "F",
            gradePoint: 4.0,
            interpretation: "Pass",
            subjectPosition: 1,
          },
          {
            termResultId: tr.id,
            subjectId: engSubj.id,
            caRawScore: c.eScore * 0.4,
            caMaxScore: 100,
            caWeightedScore: c.eScore * 0.4,
            examRawScore: c.eScore * 0.6,
            examMaxScore: 100,
            examWeightedScore: c.eScore * 0.6,
            totalScore: c.eScore,
            grade: c.eScore >= 90 ? "A+" : c.eScore >= 80 ? "A" : c.eScore >= 70 ? "B" : c.eScore >= 60 ? "C" : "F",
            gradePoint: 4.0,
            interpretation: "Pass",
            subjectPosition: 1,
          },
        ],
      })
    }

    // Now test Performance Analytics for this term
    const analytics = await AnalyticsService.getPerformanceAnalytics(testTerm.id)

    assert(analytics.cohortSize === 5, `Cohort size is 5 (got ${analytics.cohortSize})`)
    // Mean: (92.5 + 84.0 + 75.0 + 62.0 + 35.0) / 5 = 348.5 / 5 = 69.7
    assert(analytics.meanScore === 69.7, `Mean score is exactly 69.7% (got ${analytics.meanScore}%)`)
    // Median of [35, 62, 75, 84, 92.5] -> 75
    assert(analytics.medianScore === 75, `Median score is 75.0% (got ${analytics.medianScore}%)`)
    assert(analytics.highestScore === 92.5, `Highest average score is 92.5 (got ${analytics.highestScore})`)
    assert(analytics.lowestScore === 35.0, `Lowest average score is 35.0 (got ${analytics.lowestScore})`)
    // Pass rate: 4 out of 5 = 80.0%
    assert(analytics.passRate === 80.0, `Pass rate is 80.0% (got ${analytics.passRate}%)`)
    // Distinction rate: 2 out of 5 = 40.0%
    assert(analytics.distinctionRate === 40.0, `Distinction rate is 40.0% (got ${analytics.distinctionRate}%)`)

    // ==========================================
    // TEST SECTION 3: Grade Distribution Histogram
    // ==========================================
    console.log("\n--- TEST SECTION 3: Grade Distribution Histogram ---")
    const gd = analytics.gradeDistribution
    assert(Array.isArray(gd) && gd.length === 7, "Grade distribution has 7 bands (A+ to F)")

    const aPlusBand = gd.find((b) => b.grade === "A+")
    const aBand = gd.find((b) => b.grade === "A")
    const bBand = gd.find((b) => b.grade === "B")
    const cBand = gd.find((b) => b.grade === "C")
    const dBand = gd.find((b) => b.grade === "D")
    const eBand = gd.find((b) => b.grade === "E")
    const fBand = gd.find((b) => b.grade === "F")

    assert(aPlusBand && aPlusBand.count === 1 && aPlusBand.percentage === 20.0, "Grade A+: 1 student (20.0%)")
    assert(aBand && aBand.count === 1 && aBand.percentage === 20.0, "Grade A: 1 student (20.0%)")
    assert(bBand && bBand.count === 1 && bBand.percentage === 20.0, "Grade B: 1 student (20.0%)")
    assert(cBand && cBand.count === 1 && cBand.percentage === 20.0, "Grade C: 1 student (20.0%)")
    assert(dBand && dBand.count === 0 && dBand.percentage === 0.0, "Grade D: 0 students (0.0%)")
    assert(eBand && eBand.count === 0 && eBand.percentage === 0.0, "Grade E: 0 students (0.0%)")
    assert(fBand && fBand.count === 1 && fBand.percentage === 20.0, "Grade F: 1 student (20.0%)")

    const totalHistogramCount = gd.reduce((acc, b) => acc + b.count, 0)
    assert(totalHistogramCount === 5, `Total count across all bands matches cohort size (${totalHistogramCount} === 5)`)

    // ==========================================
    // TEST SECTION 4: Subject Performance Analytics
    // ==========================================
    console.log("\n--- TEST SECTION 4: Curriculum Subject Performance Analytics ---")
    assert(analytics.subjectAnalytics.length === 2, `Subject analytics returned 2 subjects (got ${analytics.subjectAnalytics.length})`)

    const engAnalysis = analytics.subjectAnalytics.find((s) => s.subjectCode === "P13-ENG")
    const mthAnalysis = analytics.subjectAnalytics.find((s) => s.subjectCode === "P13-MTH")

    assert(engAnalysis !== undefined, "English analytics found")
    assert(mthAnalysis !== undefined, "Math analytics found")

    // English: 90, 88, 80, 64, 40 -> sum = 362 / 5 = 72.4
    assert(engAnalysis.candidateCount === 5, "English candidates = 5")
    assert(engAnalysis.averageScore === 72.4, `English mean is 72.4 (got ${engAnalysis.averageScore})`)
    assert(engAnalysis.highestScore === 90, `English max is 90 (got ${engAnalysis.highestScore})`)
    assert(engAnalysis.lowestScore === 40, `English min is 40 (got ${engAnalysis.lowestScore})`)
    assert(engAnalysis.passRate === 80.0, `English pass rate is 80.0% (got ${engAnalysis.passRate}%)`)
    assert(engAnalysis.distinctionRate === 60.0, `English distinction rate is 60.0% (got ${engAnalysis.distinctionRate}%)`)

    // Math: 95, 80, 70, 60, 30 -> sum = 335 / 5 = 67.0
    assert(mthAnalysis.averageScore === 67.0, `Math mean is 67.0 (got ${mthAnalysis.averageScore})`)
    assert(mthAnalysis.highestScore === 95, `Math max is 95 (got ${mthAnalysis.highestScore})`)
    assert(mthAnalysis.lowestScore === 30, `Math min is 30 (got ${mthAnalysis.lowestScore})`)

    // English average (72.4) > Math average (67.0) so English ranks first
    assert(analytics.subjectAnalytics[0].subjectCode === "P13-ENG", "Curriculum ranking correctly ordered highest average first")

    // ==========================================
    // TEST SECTION 5: Gender Disparity Analysis
    // ==========================================
    console.log("\n--- TEST SECTION 5: Gender Performance Disparity ---")
    const femaleStats = analytics.genderAnalytics.find((g) => g.gender === "FEMALE")
    const maleStats = analytics.genderAnalytics.find((g) => g.gender === "MALE")

    assert(femaleStats !== undefined, "Female gender cohort analyzed")
    assert(maleStats !== undefined, "Male gender cohort analyzed")
    assert(femaleStats.count === 2, `Female count is 2 (got ${femaleStats.count})`)
    assert(maleStats.count === 3, `Male count is 3 (got ${maleStats.count})`)

    // Female: (92.5 + 75.0) / 2 = 83.8%
    assert(femaleStats.averageScore === 83.8, `Female average score is 83.8% (got ${femaleStats.averageScore}%)`)
    assert(femaleStats.passRate === 100.0, "Female pass rate is 100.0%")
    // Male: (84.0 + 62.0 + 35.0) / 3 = 181.0 / 3 = 60.3%
    assert(maleStats.averageScore === 60.3, `Male average score is 60.3% (got ${maleStats.averageScore}%)`)
    assert(maleStats.highestScore === 84.0, "Male highest score is 84.0")

    // ==========================================
    // TEST SECTION 6: Cohort Top Performers (Honor Roll)
    // ==========================================
    console.log("\n--- TEST SECTION 6: Top Performers Honor Roll ---")
    assert(analytics.topPerformers.length === 5, `Top performers returned all 5 students (got ${analytics.topPerformers.length})`)
    assert(analytics.topPerformers[0].studentIdNumber === "P13-STU-01", "Rank 1 is P13-STU-01 (Abena Agyei)")
    assert(analytics.topPerformers[0].averageScore === 92.5, "Rank 1 average score is 92.5")
    assert(analytics.topPerformers[1].studentIdNumber === "P13-STU-02", "Rank 2 is P13-STU-02 (Kwame Mensah)")
    assert(analytics.topPerformers[4].studentIdNumber === "P13-STU-05", "Rank 5 is P13-STU-05 (Yaw Appiah)")

    // ==========================================
    // TEST SECTION 7: Class-Filtered Analytics
    // ==========================================
    console.log("\n--- TEST SECTION 7: Class-Filtered Analytics ---")
    const classFiltered = await AnalyticsService.getPerformanceAnalytics(testTerm.id, testClass.id)
    assert(classFiltered.cohortSize === 5, "Class filtered cohort size matches class enrollment (5)")

    // Non-existent class returns empty stats gracefully
    const emptyClassStats = await AnalyticsService.getPerformanceAnalytics(testTerm.id, "non-existent-class-id")
    assert(emptyClassStats.cohortSize === 0, "Non-existent class returns empty cohort (0)")
    assert(emptyClassStats.meanScore === 0, "Empty cohort mean score is 0")

    // ==========================================
    // TEST SECTION 8: Role-Scoped Dashboards
    // ==========================================
    console.log("\n--- TEST SECTION 8: Role-Scoped Dashboards ---")
    const adminUser = await prisma.user.findFirst({ where: { username: "admin" } })
    const adminDashboard = await AnalyticsService.getRoleScopedDashboard(adminUser.id, "SUPER_ADMIN", testTerm.id)
    assert(adminDashboard.overview !== undefined, "Admin dashboard contains executive overview")

    // Class Teacher scope
    let testTeacher = await prisma.user.findFirst({ where: { username: "p13_teacher" } })
    if (!testTeacher) {
      testTeacher = await prisma.user.create({
        data: {
          username: "p13_teacher",
          passwordHash: "hash",
          displayName: "Class Teacher",
          email: "p13_teacher@school.local",
        },
      })
    }

    await prisma.class.update({
      where: { id: testClass.id },
      data: { classTeacherId: testTeacher.id },
    })

    const classTeacherDashboard = await AnalyticsService.getRoleScopedDashboard(
      testTeacher.id,
      "CLASS_TEACHER",
      testTerm.id
    )
    assert(classTeacherDashboard.scopedData.supervisedClass !== undefined, "Class Teacher dashboard returns supervised class")
    assert(
      classTeacherDashboard.scopedData.supervisedClass.id === testClass.id,
      "Supervised class matches assigned class"
    )
    assert(
      classTeacherDashboard.scopedData.classAnalytics.cohortSize === 5,
      "Class Teacher dashboard includes cohort analytics for supervised class"
    )

    // Subject Teacher scope
    let alloc = await prisma.subjectAllocation.findFirst({
      where: { teacherId: testTeacher.id, termId: testTerm.id },
    })
    if (!alloc) {
      alloc = await prisma.subjectAllocation.create({
        data: {
          teacherId: testTeacher.id,
          classId: testClass.id,
          subjectId: mathSubj.id,
          termId: testTerm.id,
        },
      })
    }

    const subjectTeacherDashboard = await AnalyticsService.getRoleScopedDashboard(
      testTeacher.id,
      "SUBJECT_TEACHER",
      testTerm.id
    )
    assert(subjectTeacherDashboard.scopedData.allocations !== undefined, "Subject Teacher dashboard returns allocations")
    assert(
      subjectTeacherDashboard.scopedData.allocations.length >= 1,
      "Subject Teacher dashboard includes allocation progress tracking"
    )

    // Clean up test data
    await prisma.termResultSubject.deleteMany({ where: { termResult: { termId: testTerm.id } } })
    await prisma.termResult.deleteMany({ where: { termId: testTerm.id } })
    await prisma.studentEnrollment.deleteMany({ where: { student: { studentIdNumber: { in: cohortStudentIds } } } })
    await prisma.student.deleteMany({ where: { studentIdNumber: { in: cohortStudentIds } } })
    await prisma.subjectAllocation.deleteMany({ where: { id: alloc.id } })
    await prisma.class.update({ where: { id: testClass.id }, data: { classTeacherId: null } })
    await prisma.user.delete({ where: { id: testTeacher.id } })

    console.log(`\n=== PHASE 13 TESTS COMPLETE: ${passed} passed, ${failed} failed ===\n`)
    if (failed > 0) process.exit(1)
  } catch (err) {
    console.error("Test execution error:", err)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

runPhase13Tests()
