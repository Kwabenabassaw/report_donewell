import { prisma } from "@/lib/prisma"
import { MarkCompletionStatus, AssessmentStatus, StudentStatus, EnrollmentStatus } from "@prisma/client"
import { TermService } from "./TermService"
import { AuditService } from "./AuditService"
import { AppError } from "@/lib/errors"

export interface ScoreEntryInput {
  studentEnrollmentId: string
  assessmentId: string
  rawScore?: number | null
  status?: MarkCompletionStatus
}

export interface BatchSaveScoresInput {
  termId: string
  classId: string
  subjectId: string
  scores: ScoreEntryInput[]
}

export class ScoreService {
  /**
   * Retrieves complete mark entry sheet data for a specific term, class, and subject.
   */
  static async getMarkSheet(params: {
    termId: string
    classId: string
    subjectId: string
  }) {
    const { termId, classId, subjectId } = params

    const [term, targetClass, subject, assessments] = await Promise.all([
      prisma.term.findUnique({
        where: { id: termId },
        include: { academicYear: true },
      }),
      prisma.class.findUnique({ where: { id: classId } }),
      prisma.subject.findUnique({ where: { id: subjectId } }),
      prisma.assessment.findMany({
        where: { termId, classId, subjectId },
        include: {
          category: { include: { component: true } },
        },
        orderBy: [
          { category: { component: { sortOrder: "asc" } } },
          { createdAt: "asc" },
        ],
      }),
    ])

    if (!term) throw new AppError("NOT_FOUND", "Term not found.", 404)
    if (!targetClass) throw new AppError("NOT_FOUND", "Class not found.", 404)
    if (!subject) throw new AppError("NOT_FOUND", "Subject not found.", 404)

    // Load active cohort registered for this subject
    const enrollments = await prisma.studentEnrollment.findMany({
      where: {
        academicYearId: term.academicYearId,
        classId,
        status: EnrollmentStatus.ACTIVE,
        student: { status: StudentStatus.ACTIVE },
        subjectRegistrations: {
          some: { subjectId },
        },
      },
      include: {
        student: true,
      },
      orderBy: [
        { student: { lastName: "asc" } },
        { student: { firstName: "asc" } },
      ],
    })

    const enrollmentIds = enrollments.map((e) => e.id)
    const assessmentIds = assessments.map((a) => a.id)

    // Load existing scores
    const existingScores = await prisma.studentAssessmentScore.findMany({
      where: {
        studentEnrollmentId: { in: enrollmentIds },
        assessmentId: { in: assessmentIds },
      },
    })

    const canEnter = await TermService.canEnterMarks(termId)

    return {
      term,
      class: targetClass,
      subject,
      assessments,
      enrollments,
      scores: existingScores,
      canEnterMarks: canEnter,
    }
  }

  /**
   * Batch saves or updates scores in an atomic transaction.
   * Strictly enforces bounds (0 <= rawScore <= maxScore) and locking rules.
   */
  static async batchSaveScores(input: BatchSaveScoresInput, actorUserId?: string) {
    const { termId, classId, subjectId, scores } = input

    if (!scores || scores.length === 0) {
      return { savedCount: 0 }
    }

    // 1. Verify term allows mark entry
    const canEnter = await TermService.canEnterMarks(termId)
    if (!canEnter) {
      throw new AppError(
        "TERM_LOCKED",
        "Marks cannot be entered or modified because the term is not in MARK_ENTRY or REOPENED status.",
        400
      )
    }

    // 2. Fetch and validate all referenced assessments
    const assessmentIds = Array.from(new Set(scores.map((s) => s.assessmentId)))
    const assessments = await prisma.assessment.findMany({
      where: { id: { in: assessmentIds } },
    })

    const assessmentMap = new Map(assessments.map((a) => [a.id, a]))

    for (const aId of assessmentIds) {
      const a = assessmentMap.get(aId)
      if (!a) {
        throw new AppError("NOT_FOUND", `Assessment activity "${aId}" not found.`, 404)
      }
      if (a.status === AssessmentStatus.LOCKED) {
        throw new AppError(
          "ASSESSMENT_LOCKED",
          `Assessment "${a.title}" is locked. Scores cannot be modified.`,
          400
        )
      }
    }

    // 3. Validate score values
    for (const item of scores) {
      const assessment = assessmentMap.get(item.assessmentId)!

      if (item.rawScore !== null && item.rawScore !== undefined) {
        if (item.rawScore < 0) {
          throw new AppError(
            "SCORE_BELOW_ZERO",
            `Score cannot be negative. Got: ${item.rawScore}.`,
            400
          )
        }
        if (item.rawScore > assessment.maxScore) {
          throw new AppError(
            "SCORE_EXCEEDS_MAX",
            `Score (${item.rawScore}) exceeds the maximum score (${assessment.maxScore}) for "${assessment.title}".`,
            400
          )
        }
      }
    }

    // 4. Atomic transaction
    const saved = await prisma.$transaction(async (tx) => {
      let count = 0
      for (const item of scores) {
        await tx.studentAssessmentScore.upsert({
          where: {
            assessmentId_studentEnrollmentId: {
              assessmentId: item.assessmentId,
              studentEnrollmentId: item.studentEnrollmentId,
            },
          },
          update: {
            rawScore: item.rawScore ?? null,
            status: item.status || MarkCompletionStatus.COMPLETE,
            updatedById: actorUserId || null,
          },
          create: {
            assessmentId: item.assessmentId,
            studentEnrollmentId: item.studentEnrollmentId,
            rawScore: item.rawScore ?? null,
            status: item.status || MarkCompletionStatus.COMPLETE,
            createdById: actorUserId || null,
          },
        })
        count++
      }

      await AuditService.logAction({
        userId: actorUserId,
        action: "BATCH_SAVE_SCORES",
        entityType: "StudentAssessmentScore",
        entityId: `${termId}:${classId}:${subjectId}`,
        newValues: {
          scoresCount: count,
          termId,
          classId,
          subjectId,
        },
      })

      return count
    })

    return { savedCount: saved }
  }
}
