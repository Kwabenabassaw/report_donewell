import { prisma } from "@/lib/prisma"
import { TermStatus, ResultStatus, AssessmentStatus, SMSDeliveryStatus } from "@prisma/client"
import { AppError } from "@/lib/errors"

export interface ExecutiveOverviewMetrics {
  academicYear: {
    id: string
    name: string
    isCurrent: boolean
  } | null
  currentTerm: {
    id: string
    name: string
    termSequence: number
    status: TermStatus
  } | null
  studentCount: number
  classCount: number
  subjectCount: number
  markCompletionPercentage: number
  enteredScoresCount: number
  expectedScoresCount: number
  incompleteMarksCount: number
  pendingTeacherSubmissionsCount: number
  pendingApprovalsCount: number
  finalizedClassesCount: number
  publishedReportsCount: number
  smsDelivery: {
    queued: number
    delivered: number
    failed: number
    totalLogs: number
  }
}

export interface GradeDistributionItem {
  grade: string
  label: string
  minScore: number
  maxScore: number
  count: number
  percentage: number
}

export interface SubjectAnalyticsItem {
  subjectId: string
  subjectCode: string
  subjectName: string
  candidateCount: number
  averageScore: number
  highestScore: number
  lowestScore: number
  passRate: number // % >= 50
  distinctionRate: number // % >= 80
}

export interface GenderAnalyticsItem {
  gender: string
  count: number
  averageScore: number
  passRate: number
  highestScore: number
}

export interface TopPerformerItem {
  studentIdNumber: string
  studentName: string
  className: string
  gender: string
  totalScore: number
  averageScore: number
  classPosition: number
  gpa: number | null
}

export interface PerformanceAnalytics {
  cohortSize: number
  meanScore: number
  medianScore: number
  highestScore: number
  lowestScore: number
  passRate: number
  distinctionRate: number
  gradeDistribution: GradeDistributionItem[]
  subjectAnalytics: SubjectAnalyticsItem[]
  genderAnalytics: GenderAnalyticsItem[]
  topPerformers: TopPerformerItem[]
}

const DEFAULT_GRADE_BANDS = [
  { grade: "A+", label: "Distinction", minScore: 90, maxScore: 100 },
  { grade: "A", label: "Excellent", minScore: 80, maxScore: 89.99 },
  { grade: "B", label: "Very Good", minScore: 70, maxScore: 79.99 },
  { grade: "C", label: "Good", minScore: 60, maxScore: 69.99 },
  { grade: "D", label: "Credit", minScore: 50, maxScore: 59.99 },
  { grade: "E", label: "Pass", minScore: 40, maxScore: 49.99 },
  { grade: "F", label: "Fail", minScore: 0, maxScore: 39.99 },
]

export class AnalyticsService {
  /**
   * Computes the 11 system indicators specified in SRS Section 48.
   */
  static async getExecutiveOverview(explicitTermId?: string): Promise<ExecutiveOverviewMetrics> {
    const currentYear = await prisma.academicYear.findFirst({
      where: { isCurrent: true },
      include: {
        terms: { orderBy: { termSequence: "asc" } },
      },
    })

    let targetTerm = null
    if (explicitTermId) {
      targetTerm = await prisma.term.findUnique({
        where: { id: explicitTermId },
        include: { academicYear: true },
      })
    } else if (currentYear) {
      targetTerm =
        currentYear.terms.find((t) => t.status === TermStatus.MARK_ENTRY) ||
        currentYear.terms.find((t) => t.status !== TermStatus.CLOSED) ||
        currentYear.terms[0] ||
        null
    }

    const termId = targetTerm?.id

    const [
      studentCount,
      classCount,
      subjectCount,
      pendingApprovalsCount,
      smsQueuedCount,
      smsDeliveredCount,
      smsFailedCount,
      totalSmsLogs,
    ] = await Promise.all([
      prisma.student.count({ where: { status: "ACTIVE" } }),
      prisma.class.count({ where: { status: "ACTIVE" } }),
      prisma.subject.count({ where: { status: "ACTIVE" } }),
      prisma.term.count({
        where: { status: { in: [TermStatus.SUBMITTED, TermStatus.UNDER_REVIEW] } },
      }),
      prisma.notificationJob.count({ where: { status: "PENDING" } }),
      prisma.smsLog.count({ where: { deliveryStatus: SMSDeliveryStatus.DELIVERED } }),
      prisma.smsLog.count({ where: { deliveryStatus: SMSDeliveryStatus.FAILED } }),
      prisma.smsLog.count(),
    ])

    let enteredScoresCount = 0
    let expectedScoresCount = 0
    let pendingTeacherSubmissionsCount = 0
    let finalizedClassesCount = 0
    let publishedReportsCount = 0

    if (termId && targetTerm) {
      // 1. Fetch assessments for term
      const assessments = await prisma.assessment.findMany({
        where: { termId },
        select: {
          id: true,
          classId: true,
          subjectId: true,
          status: true,
        },
      })

      // 2. Entered scores
      enteredScoresCount = await prisma.studentAssessmentScore.count({
        where: { assessment: { termId } },
      })

      // 3. Expected scores based on subject enrollments
      for (const a of assessments) {
        const studentRegistrations = await prisma.studentSubjectEnrollment.count({
          where: {
            subjectId: a.subjectId,
            enrollment: {
              classId: a.classId,
              academicYearId: targetTerm.academicYearId,
              status: "ACTIVE",
            },
          },
        })
        expectedScoresCount += studentRegistrations

        // Check if assessment is incomplete
        if (a.status === AssessmentStatus.OPEN) {
          const scoreCount = await prisma.studentAssessmentScore.count({
            where: { assessmentId: a.id },
          })
          if (scoreCount < studentRegistrations) {
            pendingTeacherSubmissionsCount++
          }
        }
      }

      // 4. Finalized classes count
      const finalizedResults = await prisma.termResult.findMany({
        where: { termId },
        select: {
          enrollment: { select: { classId: true } },
        },
      })
      const distinctClassIds = new Set(finalizedResults.map((r) => r.enrollment.classId))
      finalizedClassesCount = distinctClassIds.size

      // 5. Published reports count
      publishedReportsCount = await prisma.termResult.count({
        where: { termId, status: ResultStatus.PUBLISHED },
      })
    }

    const markCompletionPercentage =
      expectedScoresCount > 0
        ? Math.min(100, Math.round((enteredScoresCount / expectedScoresCount) * 1000) / 10)
        : 0

    const incompleteMarksCount = Math.max(0, expectedScoresCount - enteredScoresCount)

    return {
      academicYear: currentYear
        ? { id: currentYear.id, name: currentYear.name, isCurrent: currentYear.isCurrent }
        : null,
      currentTerm: targetTerm
        ? {
            id: targetTerm.id,
            name: targetTerm.name,
            termSequence: targetTerm.termSequence,
            status: targetTerm.status,
          }
        : null,
      studentCount,
      classCount,
      subjectCount,
      markCompletionPercentage,
      enteredScoresCount,
      expectedScoresCount,
      incompleteMarksCount,
      pendingTeacherSubmissionsCount,
      pendingApprovalsCount,
      finalizedClassesCount,
      publishedReportsCount,
      smsDelivery: {
        queued: smsQueuedCount,
        delivered: smsDeliveredCount,
        failed: smsFailedCount,
        totalLogs: totalSmsLogs,
      },
    }
  }

  /**
   * Computes comprehensive performance analytics for a term (and optional class).
   */
  static async getPerformanceAnalytics(
    termId: string,
    classId?: string
  ): Promise<PerformanceAnalytics> {
    const where: any = { termId }
    if (classId) {
      where.enrollment = { classId }
    }

    const termResults = await prisma.termResult.findMany({
      where,
      include: {
        enrollment: {
          include: { student: true, class: true },
        },
        subjects: {
          include: { subject: true },
        },
      },
      orderBy: { averageScore: "desc" },
    })

    if (termResults.length === 0) {
      return {
        cohortSize: 0,
        meanScore: 0,
        medianScore: 0,
        highestScore: 0,
        lowestScore: 0,
        passRate: 0,
        distinctionRate: 0,
        gradeDistribution: DEFAULT_GRADE_BANDS.map((b) => ({
          grade: b.grade,
          label: b.label,
          minScore: b.minScore,
          maxScore: b.maxScore,
          count: 0,
          percentage: 0,
        })),
        subjectAnalytics: [],
        genderAnalytics: [],
        topPerformers: [],
      }
    }

    const scores = termResults.map((r) => r.averageScore).sort((a, b) => a - b)
    const cohortSize = scores.length
    const sum = scores.reduce((acc, s) => acc + s, 0)
    const meanScore = Math.round((sum / cohortSize) * 10) / 10
    const highestScore = scores[scores.length - 1]
    const lowestScore = scores[0]

    // Median computation
    const mid = Math.floor(cohortSize / 2)
    const medianScore =
      cohortSize % 2 !== 0
        ? Math.round(scores[mid] * 10) / 10
        : Math.round(((scores[mid - 1] + scores[mid]) / 2) * 10) / 10

    const passCount = scores.filter((s) => s >= 50).length
    const distinctionCount = scores.filter((s) => s >= 80).length
    const passRate = Math.round((passCount / cohortSize) * 1000) / 10
    const distinctionRate = Math.round((distinctionCount / cohortSize) * 1000) / 10

    // Grade Distribution Histogram
    const gradeDistribution: GradeDistributionItem[] = DEFAULT_GRADE_BANDS.map((band) => {
      const count = scores.filter(
        (s) => s >= band.minScore && (band.maxScore === 100 ? s <= band.maxScore : s < band.maxScore)
      ).length
      const percentage = Math.round((count / cohortSize) * 1000) / 10
      return {
        grade: band.grade,
        label: band.label,
        minScore: band.minScore,
        maxScore: band.maxScore,
        count,
        percentage,
      }
    })

    // Subject Performance Analytics
    const subjectMap = new Map<string, { subject: any; scores: number[] }>()
    for (const res of termResults) {
      for (const subj of res.subjects) {
        if (!subjectMap.has(subj.subjectId)) {
          subjectMap.set(subj.subjectId, { subject: subj.subject, scores: [] })
        }
        subjectMap.get(subj.subjectId)!.scores.push(subj.totalScore)
      }
    }

    const subjectAnalytics: SubjectAnalyticsItem[] = Array.from(subjectMap.values()).map((item) => {
      const subScores = item.scores
      const subTotal = subScores.reduce((a, b) => a + b, 0)
      const subMean = subScores.length > 0 ? Math.round((subTotal / subScores.length) * 10) / 10 : 0
      const subPass = subScores.filter((s) => s >= 50).length
      const subDist = subScores.filter((s) => s >= 80).length

      return {
        subjectId: item.subject.id,
        subjectCode: item.subject.code,
        subjectName: item.subject.name,
        candidateCount: subScores.length,
        averageScore: subMean,
        highestScore: subScores.length > 0 ? Math.max(...subScores) : 0,
        lowestScore: subScores.length > 0 ? Math.min(...subScores) : 0,
        passRate: subScores.length > 0 ? Math.round((subPass / subScores.length) * 1000) / 10 : 0,
        distinctionRate: subScores.length > 0 ? Math.round((subDist / subScores.length) * 1000) / 10 : 0,
      }
    })
    subjectAnalytics.sort((a, b) => b.averageScore - a.averageScore)

    // Gender Performance Breakdown
    const genderMap = new Map<string, number[]>()
    for (const res of termResults) {
      const g = (res.enrollment.student.gender || "UNKNOWN").toUpperCase()
      if (!genderMap.has(g)) {
        genderMap.set(g, [])
      }
      genderMap.get(g)!.push(res.averageScore)
    }

    const genderAnalytics: GenderAnalyticsItem[] = Array.from(genderMap.entries()).map(([gender, gScores]) => {
      const gSum = gScores.reduce((a, b) => a + b, 0)
      const gMean = gScores.length > 0 ? Math.round((gSum / gScores.length) * 10) / 10 : 0
      const gPass = gScores.filter((s) => s >= 50).length
      return {
        gender,
        count: gScores.length,
        averageScore: gMean,
        passRate: gScores.length > 0 ? Math.round((gPass / gScores.length) * 1000) / 10 : 0,
        highestScore: gScores.length > 0 ? Math.max(...gScores) : 0,
      }
    })
    genderAnalytics.sort((a, b) => b.averageScore - a.averageScore)

    // Top Performers Roster (Top 10)
    const topPerformers: TopPerformerItem[] = termResults.slice(0, 10).map((r) => ({
      studentIdNumber: r.enrollment.student.studentIdNumber,
      studentName: `${r.enrollment.student.firstName} ${r.enrollment.student.lastName}`.trim(),
      className: r.enrollment.class.name,
      gender: r.enrollment.student.gender,
      totalScore: r.totalScore,
      averageScore: r.averageScore,
      classPosition: r.classPosition,
      gpa: r.gpa,
    }))

    return {
      cohortSize,
      meanScore,
      medianScore,
      highestScore,
      lowestScore,
      passRate,
      distinctionRate,
      gradeDistribution,
      subjectAnalytics,
      genderAnalytics,
      topPerformers,
    }
  }

  /**
   * Retrieves role-tailored dashboard context.
   */
  static async getRoleScopedDashboard(userId: string, activeRole: string, termId?: string) {
    const overview = await this.getExecutiveOverview(termId)
    const targetTermId = termId || overview.currentTerm?.id

    let scopedData: any = { role: activeRole }

    if (activeRole === "CLASS_TEACHER") {
      // Find class supervised by user
      const supervisedClass = await prisma.class.findFirst({
        where: { classTeacherId: userId },
        include: { enrollments: { where: { status: "ACTIVE" }, include: { student: true } } },
      })

      if (supervisedClass && targetTermId) {
        const analytics = await this.getPerformanceAnalytics(targetTermId, supervisedClass.id)
        const pendingEvaluationsCount = await prisma.studentEnrollment.count({
          where: {
            classId: supervisedClass.id,
            status: "ACTIVE",
            evaluations: { none: { termId: targetTermId } },
          },
        })

        scopedData = {
          ...scopedData,
          supervisedClass: {
            id: supervisedClass.id,
            name: supervisedClass.name,
            gradeLevel: supervisedClass.gradeLevel,
            studentCount: supervisedClass.enrollments.length,
          },
          pendingEvaluationsCount,
          classAnalytics: analytics,
        }
      }
    } else if (activeRole === "SUBJECT_TEACHER") {
      // Find subject allocations assigned to user
      const allocations = await prisma.subjectAllocation.findMany({
        where: {
          teacherId: userId,
          ...(targetTermId ? { termId: targetTermId } : {}),
        },
        include: {
          class: true,
          subject: true,
          term: true,
        },
      })

      // Get progress per allocation
      const allocationProgress = await Promise.all(
        allocations.map(async (alloc) => {
          const assessments = await prisma.assessment.findMany({
            where: {
              termId: alloc.termId,
              classId: alloc.classId,
              subjectId: alloc.subjectId,
            },
          })

          const enrolledStudents = await prisma.studentSubjectEnrollment.count({
            where: {
              subjectId: alloc.subjectId,
              enrollment: {
                classId: alloc.classId,
                academicYearId: alloc.term.academicYearId,
                status: "ACTIVE",
              },
            },
          })

          const totalExpected = assessments.length * enrolledStudents
          let entered = 0
          for (const a of assessments) {
            entered += await prisma.studentAssessmentScore.count({
              where: { assessmentId: a.id },
            })
          }

          const completionPct =
            totalExpected > 0 ? Math.round((entered / totalExpected) * 100) : 0

          return {
            allocationId: alloc.id,
            termName: alloc.term.name,
            className: alloc.class.name,
            classId: alloc.class.id,
            subjectName: alloc.subject.name,
            subjectId: alloc.subject.id,
            assessmentsCount: assessments.length,
            enrolledStudents,
            enteredScores: entered,
            expectedScores: totalExpected,
            completionPercentage: completionPct,
          }
        })
      )

      scopedData = {
        ...scopedData,
        allocationsCount: allocations.length,
        allocations: allocationProgress,
      }
    }

    return {
      overview,
      scopedData,
    }
  }
}
