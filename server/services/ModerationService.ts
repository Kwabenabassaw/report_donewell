import { prisma } from "@/lib/prisma"
import { TermService } from "./TermService"
import { CalculationEngineService } from "./CalculationEngineService"
import { AuditService } from "./AuditService"
import { TermStatus, MarkCompletionStatus } from "@prisma/client"
import { AppError } from "@/lib/errors"

export interface ModerationAnomaly {
  studentName: string
  studentIdNumber: string
  subjectName: string
  issue: string
  severity: "CRITICAL" | "WARNING"
}

export interface ModerationAuditResult {
  isReadyForApproval: boolean
  blockers: string[]
  warnings: string[]
  anomalies: ModerationAnomaly[]
  totalStudents: number
  evaluatedStudents: number
  completenessPercentage: number
}

export class ModerationService {
  /**
   * Conducts pre-approval moderation audit: completeness, evaluations, and score anomaly detection.
   */
  static async runModerationAudit(termId: string, classId: string): Promise<ModerationAuditResult> {
    const [completeness, term, targetClass] = await Promise.all([
      CalculationEngineService.validateClassCompleteness(termId, classId),
      prisma.term.findUnique({ where: { id: termId } }),
      prisma.class.findUnique({ where: { id: classId } }),
    ])

    if (!term) throw new AppError("NOT_FOUND", "Term not found.", 404)
    if (!targetClass) throw new AppError("NOT_FOUND", "Class not found.", 404)

    const blockers: string[] = []
    const warnings: string[] = []
    const anomalies: ModerationAnomaly[] = []

    // 1. Mark Entry Completeness Check
    if (!completeness.isComplete) {
      blockers.push(
        `Incomplete marks: ${completeness.missingMarks.length} student-subject instances have unrecorded assessment scores.`
      )
    }

    // 2. Form Teacher Evaluations Check
    const enrollments = await prisma.studentEnrollment.findMany({
      where: {
        academicYearId: term.academicYearId,
        classId,
        status: "ACTIVE",
      },
      include: {
        student: true,
        evaluations: { where: { termId } },
      },
    })

    const totalStudents = enrollments.length
    const evaluatedStudents = enrollments.filter(
      (e) => e.evaluations.length > 0 && e.evaluations[0].classTeacherRemarks
    ).length

    if (evaluatedStudents < totalStudents) {
      warnings.push(
        `Form teacher evaluations incomplete: ${totalStudents - evaluatedStudents} of ${totalStudents} students lack recorded terminal remarks.`
      )
    }

    // 3. Score Anomaly Detection
    const calculations = await CalculationEngineService.calculateClassTermResults(termId, classId)

    for (const student of calculations.students) {
      for (const subj of student.subjectScores) {
        // Discrepancy between CA and Exam percentage (> 40% divergence)
        const caPercentage = subj.caMaxScore > 0 ? (subj.caRawScore / subj.caMaxScore) * 100 : 0
        const examPercentage = subj.examMaxScore > 0 ? (subj.examRawScore / subj.examMaxScore) * 100 : 0
        const divergence = Math.abs(caPercentage - examPercentage)

        if (divergence > 45.0 && subj.caMaxScore > 0 && subj.examMaxScore > 0) {
          anomalies.push({
            studentName: student.studentName,
            studentIdNumber: student.studentIdNumber,
            subjectName: subj.subjectName,
            issue: `Significant divergence between continuous assessment (${caPercentage.toFixed(0)}%) and terminal examination (${examPercentage.toFixed(0)}%). Difference: ${divergence.toFixed(0)}%.`,
            severity: "WARNING",
          })
        }

        // Suspicious extreme low score (< 20%) that wasn't flagged Absent/Exempt
        if (subj.totalScore < 20.0 && subj.totalScore > 0) {
          anomalies.push({
            studentName: student.studentName,
            studentIdNumber: student.studentIdNumber,
            subjectName: subj.subjectName,
            issue: `Unusually low final score (${subj.totalScore.toFixed(0)}%). Verify score accuracy before approval.`,
            severity: "WARNING",
          })
        }
      }
    }

    const completenessPct = completeness.totalExpectedScores > 0
      ? (completeness.totalRecordedScores / completeness.totalExpectedScores) * 100
      : 100

    return {
      isReadyForApproval: blockers.length === 0,
      blockers,
      warnings,
      anomalies,
      totalStudents,
      evaluatedStudents,
      completenessPercentage: Math.round(completenessPct * 10) / 10,
    }
  }

  /**
   * Submits term marks for moderation review (Teacher / Exam Officer action).
   */
  static async submitTermForReview(termId: string, actorUserId: string) {
    return await TermService.transitionStatus(termId, TermStatus.SUBMITTED, actorUserId)
  }

  /**
   * Moves term into active review state (Exam Officer / Headmaster action).
   */
  static async startTermReview(termId: string, actorUserId: string) {
    return await TermService.transitionStatus(termId, TermStatus.UNDER_REVIEW, actorUserId)
  }

  /**
   * Formally approves and signs off term marks (Headmaster action).
   */
  static async approveTerm(termId: string, actorUserId: string) {
    return await TermService.transitionStatus(termId, TermStatus.APPROVED, actorUserId)
  }

  /**
   * Rejects term during review and reopens for teacher corrections with mandatory reason.
   */
  static async rejectAndReopenTerm(termId: string, reason: string, actorUserId: string) {
    if (!reason || reason.trim().length < 5) {
      throw new AppError(
        "VALIDATION_FAILED",
        "A clear, descriptive reason is required to reject and reopen a term.",
        400
      )
    }

    return await TermService.transitionStatus(termId, TermStatus.REOPENED, actorUserId, reason.trim())
  }
}
