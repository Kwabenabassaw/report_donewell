import { prisma } from "@/lib/prisma"
import { GradingPolicyService } from "./GradingPolicyService"
import { StudentStatus, EnrollmentStatus } from "@prisma/client"
import { AppError } from "@/lib/errors"

export interface SubjectScoreBreakdown {
  studentEnrollmentId: string
  studentIdNumber: string
  studentName: string
  subjectId: string
  subjectName: string
  subjectCode: string
  caRawScore: number
  caMaxScore: number
  caWeightedScore: number
  examRawScore: number
  examMaxScore: number
  examWeightedScore: number
  totalScore: number
  grade: string
  gradePoint: number
  interpretation: string
  subjectPosition: number
}

export interface StudentTermCalculation {
  studentEnrollmentId: string
  studentIdNumber: string
  studentName: string
  rollNumber: string | null
  subjectScores: SubjectScoreBreakdown[]
  totalScore: number
  averageScore: number
  gpa: number
  classPosition: number
}

export interface SubjectStatistics {
  subjectId: string
  subjectName: string
  subjectCode: string
  averageScore: number
  highestScore: number
  lowestScore: number
}

export interface ClassCalculationResult {
  termId: string
  classId: string
  termName: string
  className: string
  cohortSize: number
  classAverage: number
  highestAverage: number
  lowestAverage: number
  students: StudentTermCalculation[]
  subjectStatistics: Record<string, SubjectStatistics>
}

export interface CompletenessReport {
  isComplete: boolean
  totalExpectedScores: number
  totalRecordedScores: number
  missingMarks: Array<{
    studentEnrollmentId: string
    studentIdNumber: string
    studentName: string
    subjectCode: string
    missingAssessments: string[]
  }>
}

export class CalculationEngineService {
  /**
   * Applies dense ranking to a list of items sorted by score descending.
   * Equal scores receive the same rank; next distinct score receives previous rank + 1.
   */
  static applyDenseRank<T extends { score: number }>(items: T[]): Array<T & { rank: number }> {
    if (items.length === 0) return []

    // Sort descending by score
    const sorted = [...items].sort((a, b) => b.score - a.score)
    let currentRank = 1
    const result: Array<T & { rank: number }> = [
      { ...sorted[0], rank: currentRank },
    ]

    for (let i = 1; i < sorted.length; i++) {
      if (Math.abs(sorted[i].score - sorted[i - 1].score) > 0.0001) {
        currentRank++
      }
      result.push({ ...sorted[i], rank: currentRank })
    }

    return result
  }

  /**
   * Validates score completeness for a class and term before finalization.
   */
  static async validateClassCompleteness(termId: string, classId: string): Promise<CompletenessReport> {
    const term = await prisma.term.findUnique({
      where: { id: termId },
      include: { academicYear: true },
    })
    if (!term) throw new AppError("NOT_FOUND", "Term not found.", 404)

    const enrollments = await prisma.studentEnrollment.findMany({
      where: {
        academicYearId: term.academicYearId,
        classId,
        status: EnrollmentStatus.ACTIVE,
        student: { status: StudentStatus.ACTIVE },
      },
      include: {
        student: true,
        subjectRegistrations: { include: { subject: true } },
      },
      orderBy: [{ student: { lastName: "asc" } }, { student: { firstName: "asc" } }],
    })

    const assessments = await prisma.assessment.findMany({
      where: { termId, classId },
      include: { subject: true },
    })

    const scores = await prisma.studentAssessmentScore.findMany({
      where: {
        assessment: { termId, classId },
        studentEnrollmentId: { in: enrollments.map((e) => e.id) },
      },
    })

    const scoreSet = new Set(
      scores.filter((s) => s.rawScore !== null).map((s) => `${s.studentEnrollmentId}:${s.assessmentId}`)
    )

    const missingMarks: CompletenessReport["missingMarks"] = []
    let totalExpected = 0
    let totalRecorded = 0

    for (const enrollment of enrollments) {
      for (const subReg of enrollment.subjectRegistrations) {
        const subAssessments = assessments.filter((a) => a.subjectId === subReg.subjectId)
        if (subAssessments.length === 0) continue

        const missingInSubj: string[] = []
        for (const a of subAssessments) {
          totalExpected++
          const key = `${enrollment.id}:${a.id}`
          if (scoreSet.has(key)) {
            totalRecorded++
          } else {
            missingInSubj.push(a.title)
          }
        }

        if (missingInSubj.length > 0) {
          missingMarks.push({
            studentEnrollmentId: enrollment.id,
            studentIdNumber: enrollment.student.studentIdNumber,
            studentName: `${enrollment.student.lastName}, ${enrollment.student.firstName}`,
            subjectCode: subReg.subject.code,
            missingAssessments: missingInSubj,
          })
        }
      }
    }

    return {
      isComplete: missingMarks.length === 0,
      totalExpectedScores: totalExpected,
      totalRecordedScores: totalRecorded,
      missingMarks,
    }
  }

  /**
   * Deterministically calculates term results, subject scaling, rankings, and GPA.
   */
  static async calculateClassTermResults(termId: string, classId: string): Promise<ClassCalculationResult> {
    const [term, targetClass] = await Promise.all([
      prisma.term.findUnique({
        where: { id: termId },
        include: { academicYear: true },
      }),
      prisma.class.findUnique({ where: { id: classId } }),
    ])

    if (!term) throw new AppError("NOT_FOUND", "Term not found.", 404)
    if (!targetClass) throw new AppError("NOT_FOUND", "Class not found.", 404)

    // Load active grading policy
    const policy = await GradingPolicyService.getActivePolicy(term.academicYearId)
    if (!policy) {
      throw new AppError(
        "INVALID_GRADING_POLICY",
        "No active grading policy found for this academic session.",
        400
      )
    }

    const caComponent = policy.components.find((c) => c.code.toUpperCase() === "CA")
    const examComponent = policy.components.find((c) => c.code.toUpperCase() === "EXAM")
    const caWeight = caComponent?.weight ?? 30.0
    const examWeight = examComponent?.weight ?? 70.0

    // Load cohort and registrations
    const enrollments = await prisma.studentEnrollment.findMany({
      where: {
        academicYearId: term.academicYearId,
        classId,
        status: EnrollmentStatus.ACTIVE,
        student: { status: StudentStatus.ACTIVE },
      },
      include: {
        student: true,
        subjectRegistrations: { include: { subject: true } },
      },
      orderBy: [{ student: { lastName: "asc" } }, { student: { firstName: "asc" } }],
    })

    if (enrollments.length === 0) {
      return {
        termId,
        classId,
        termName: term.name,
        className: targetClass.name,
        cohortSize: 0,
        classAverage: 0,
        highestAverage: 0,
        lowestAverage: 0,
        students: [],
        subjectStatistics: {},
      }
    }

    // Load all assessments and recorded scores
    const [assessments, allScores] = await Promise.all([
      prisma.assessment.findMany({
        where: { termId, classId },
        include: { category: { include: { component: true } }, subject: true },
      }),
      prisma.studentAssessmentScore.findMany({
        where: {
          assessment: { termId, classId },
          studentEnrollmentId: { in: enrollments.map((e) => e.id) },
        },
      }),
    ])

    const scoreMap = new Map<string, number | null>()
    allScores.forEach((s) => {
      scoreMap.set(`${s.studentEnrollmentId}:${s.assessmentId}`, s.rawScore)
    })

    // 1. Calculate Subject Marks for all student-subject pairs
    // Map: subjectId -> Array of { studentEnrollmentId, totalScore, ... }
    const subjectRosters = new Map<string, Array<{
      studentEnrollmentId: string
      studentIdNumber: string
      studentName: string
      subjectId: string
      subjectName: string
      subjectCode: string
      caRawScore: number
      caMaxScore: number
      caWeightedScore: number
      examRawScore: number
      examMaxScore: number
      examWeightedScore: number
      totalScore: number
      grade: string
      gradePoint: number
      interpretation: string
    }>>()

    for (const enrollment of enrollments) {
      for (const reg of enrollment.subjectRegistrations) {
        const subjId = reg.subjectId
        const subjAssessments = assessments.filter((a) => a.subjectId === subjId)

        // Split assessments into CA vs Exam
        let caRaw = 0
        let caMax = 0
        let examRaw = 0
        let examMax = 0

        for (const a of subjAssessments) {
          const compCode = a.category.component.code.toUpperCase()
          const raw = scoreMap.get(`${enrollment.id}:${a.id}`) ?? 0

          if (compCode === "CA") {
            caRaw += raw
            caMax += a.maxScore
          } else {
            examRaw += raw
            examMax += a.maxScore
          }
        }

        // Scale CA and Exam
        const caWeighted = caMax > 0 ? (caRaw / caMax) * caWeight : 0
        const examWeighted = examMax > 0 ? (examRaw / examMax) * examWeight : 0
        const total = Math.min(100.0, Math.round((caWeighted + examWeighted) * 100) / 100)

        // Grade mapping from policy
        const gradeBand = GradingPolicyService.getGradeBandForScore(total, policy.gradeBands)

        if (!subjectRosters.has(subjId)) {
          subjectRosters.set(subjId, [])
        }

        subjectRosters.get(subjId)!.push({
          studentEnrollmentId: enrollment.id,
          studentIdNumber: enrollment.student.studentIdNumber,
          studentName: `${enrollment.student.lastName}, ${enrollment.student.firstName}`,
          subjectId: reg.subject.id,
          subjectName: reg.subject.name,
          subjectCode: reg.subject.code,
          caRawScore: Math.round(caRaw * 100) / 100,
          caMaxScore: Math.round(caMax * 100) / 100,
          caWeightedScore: Math.round(caWeighted * 100) / 100,
          examRawScore: Math.round(examRaw * 100) / 100,
          examMaxScore: Math.round(examMax * 100) / 100,
          examWeightedScore: Math.round(examWeighted * 100) / 100,
          totalScore: total,
          grade: gradeBand?.grade || "F",
          gradePoint: gradeBand?.gradePoint || 0.0,
          interpretation: gradeBand?.interpretation || "Fail",
        })
      }
    }

    // 2. Rank each subject using Dense Rank and compute statistics
    const subjectStats: Record<string, SubjectStatistics> = {}
    const rankedSubjectScoresByEnrollment = new Map<string, SubjectScoreBreakdown[]>()

    subjectRosters.forEach((roster, subjId) => {
      // Apply dense ranking
      const rankedRoster = this.applyDenseRank(
        roster.map((r) => ({ ...r, score: r.totalScore }))
      )

      // Calculate statistics
      const scoresList = rankedRoster.map((r) => r.totalScore)
      const avg = scoresList.reduce((sum, s) => sum + s, 0) / (scoresList.length || 1)
      const highest = Math.max(...scoresList, 0)
      const lowest = Math.min(...scoresList, 100)

      const firstItem = roster[0]
      subjectStats[subjId] = {
        subjectId: subjId,
        subjectName: firstItem?.subjectName || "Subject",
        subjectCode: firstItem?.subjectCode || "SUBJ",
        averageScore: Math.round(avg * 100) / 100,
        highestScore: Math.round(highest * 100) / 100,
        lowestScore: Math.round(lowest * 100) / 100,
      }

      // Store in per-student map
      rankedRoster.forEach((item) => {
        if (!rankedSubjectScoresByEnrollment.has(item.studentEnrollmentId)) {
          rankedSubjectScoresByEnrollment.set(item.studentEnrollmentId, [])
        }
        rankedSubjectScoresByEnrollment.get(item.studentEnrollmentId)!.push({
          studentEnrollmentId: item.studentEnrollmentId,
          studentIdNumber: item.studentIdNumber,
          studentName: item.studentName,
          subjectId: item.subjectId,
          subjectName: item.subjectName,
          subjectCode: item.subjectCode,
          caRawScore: item.caRawScore,
          caMaxScore: item.caMaxScore,
          caWeightedScore: item.caWeightedScore,
          examRawScore: item.examRawScore,
          examMaxScore: item.examMaxScore,
          examWeightedScore: item.examWeightedScore,
          totalScore: item.totalScore,
          grade: item.grade,
          gradePoint: item.gradePoint,
          interpretation: item.interpretation,
          subjectPosition: item.rank,
        })
      })
    })

    // 3. Compute student overall composite totals, averages, GPA, and class positions
    const studentCompositeList: Array<{
      enrollment: (typeof enrollments)[0]
      subjectScores: SubjectScoreBreakdown[]
      totalScore: number
      averageScore: number
      gpa: number
      score: number // for ranking
    }> = []

    for (const enrollment of enrollments) {
      const studentSubjScores = rankedSubjectScoresByEnrollment.get(enrollment.id) || []
      const totalScore = studentSubjScores.reduce((sum, s) => sum + s.totalScore, 0)
      const avgScore = studentSubjScores.length > 0 ? totalScore / studentSubjScores.length : 0
      const totalGradePoints = studentSubjScores.reduce((sum, s) => sum + (s.gradePoint || 0), 0)
      const gpa = studentSubjScores.length > 0 ? totalGradePoints / studentSubjScores.length : 0

      studentCompositeList.push({
        enrollment,
        subjectScores: studentSubjScores,
        totalScore: Math.round(totalScore * 100) / 100,
        averageScore: Math.round(avgScore * 100) / 100,
        gpa: Math.round(gpa * 100) / 100,
        score: Math.round(avgScore * 100) / 100,
      })
    }

    // Apply dense rank across the class by Average Score
    const rankedClass = this.applyDenseRank(studentCompositeList)

    const finalStudents: StudentTermCalculation[] = rankedClass.map((item) => ({
      studentEnrollmentId: item.enrollment.id,
      studentIdNumber: item.enrollment.student.studentIdNumber,
      studentName: `${item.enrollment.student.lastName}, ${item.enrollment.student.firstName}`,
      rollNumber: item.enrollment.rollNumber,
      subjectScores: item.subjectScores,
      totalScore: item.totalScore,
      averageScore: item.averageScore,
      gpa: item.gpa,
      classPosition: item.rank,
    }))

    // Class level statistics
    const allAverages = finalStudents.map((s) => s.averageScore)
    const classAvg = allAverages.length > 0
      ? allAverages.reduce((sum, a) => sum + a, 0) / allAverages.length
      : 0
    const highestAvg = allAverages.length > 0 ? Math.max(...allAverages) : 0
    const lowestAvg = allAverages.length > 0 ? Math.min(...allAverages) : 0

    return {
      termId,
      classId,
      termName: term.name,
      className: targetClass.name,
      cohortSize: enrollments.length,
      classAverage: Math.round(classAvg * 100) / 100,
      highestAverage: Math.round(highestAvg * 100) / 100,
      lowestAverage: Math.round(lowestAvg * 100) / 100,
      students: finalStudents,
      subjectStatistics: subjectStats,
    }
  }
}
