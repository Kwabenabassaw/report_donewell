import { prisma } from "@/lib/prisma"
import { TermStatus, ResultStatus, AssessmentStatus } from "@prisma/client"
import { CalculationEngineService } from "./CalculationEngineService"
import { TermService } from "./TermService"
import { AuditService } from "./AuditService"
import { AppError } from "@/lib/errors"

export interface FinalizedStudentSubject {
  subjectId: string
  subjectName: string
  subjectCode: string
  caRawScore: number | null
  caMaxScore: number | null
  caWeightedScore: number
  examRawScore: number | null
  examMaxScore: number | null
  examWeightedScore: number
  totalScore: number
  grade: string
  gradePoint: number | null
  interpretation: string | null
  subjectPosition: number | null
  teacherRemarks: string | null
}

export interface FinalizedStudentRow {
  termResultId: string
  studentEnrollmentId: string
  studentIdNumber: string
  studentName: string
  rollNumber: string | null
  totalScore: number
  averageScore: number
  classPosition: number
  cohortSize: number
  gpa: number | null
  status: ResultStatus
  finalizedAt: Date
  subjects: FinalizedStudentSubject[]
}

export interface FinalizedBroadsheet {
  termId: string
  classId: string
  termName: string
  className: string
  academicYearName: string
  cohortSize: number
  classAverage: number
  highestAverage: number
  lowestAverage: number
  isFinalized: boolean
  finalizedAt?: Date | null
  finalizedBy?: string | null
  students: FinalizedStudentRow[]
  subjectStatistics: Record<
    string,
    {
      subjectId: string
      subjectName: string
      subjectCode: string
      averageScore: number
      highestScore: number
      lowestScore: number
    }
  >
}

export class FinalizationService {
  /**
   * Finalizes a term atomically.
   * Prerequisite: Term must be in APPROVED status.
   * Ensures all class marks are complete, generates immutable snapshot records,
   * locks operational assessments, and transitions the term to FINALIZED.
   */
  static async finalizeTerm(termId: string, actorUserId: string) {
    const term = await prisma.term.findUnique({
      where: { id: termId },
      include: { academicYear: true },
    })

    if (!term) {
      throw new AppError("NOT_FOUND", "Term not found.", 404)
    }

    if (term.status !== TermStatus.APPROVED) {
      throw new AppError(
        "TERM_NOT_READY",
        `Cannot finalize term: Term status is currently "${term.status}". It must be APPROVED by the Headmaster before finalization.`,
        400
      )
    }

    // Find all active classes for this academic year
    const distinctClassEnrollments = await prisma.studentEnrollment.findMany({
      where: {
        academicYearId: term.academicYearId,
        status: "ACTIVE",
      },
      select: { classId: true },
      distinct: ["classId"],
    })

    const classIds = distinctClassEnrollments.map((e) => e.classId)

    // Check mark completeness across all classes
    for (const classId of classIds) {
      const completeness = await CalculationEngineService.validateClassCompleteness(termId, classId)
      if (!completeness.isComplete) {
        throw new AppError(
          "INCOMPLETE_RESULT",
          `Cannot finalize term: Class ${classId} has ${completeness.missingMarks.length} incomplete mark records. Complete all assessments before finalization.`,
          400
        )
      }
    }

    // Compute deterministic results for each class
    const classResults = await Promise.all(
      classIds.map((cId) => CalculationEngineService.calculateClassTermResults(termId, cId))
    )

    // Commit snapshot in an atomic transaction
    await prisma.$transaction(async (tx) => {
      for (const calcResult of classResults) {
        for (const student of calcResult.students) {
          // 1. Create or update TermResult snapshot
          const termResult = await tx.termResult.upsert({
            where: {
              studentEnrollmentId_termId: {
                studentEnrollmentId: student.studentEnrollmentId,
                termId,
              },
            },
            create: {
              studentEnrollmentId: student.studentEnrollmentId,
              termId,
              totalScore: student.totalScore,
              averageScore: student.averageScore,
              classPosition: student.classPosition,
              cohortSize: calcResult.cohortSize,
              gpa: student.gpa,
              status: ResultStatus.FINALIZED,
              finalizedAt: new Date(),
              finalizedById: actorUserId,
            },
            update: {
              totalScore: student.totalScore,
              averageScore: student.averageScore,
              classPosition: student.classPosition,
              cohortSize: calcResult.cohortSize,
              gpa: student.gpa,
              status: ResultStatus.FINALIZED,
              finalizedAt: new Date(),
              finalizedById: actorUserId,
            },
          })

          // 2. Create or update TermResultSubject records
          for (const subj of student.subjectScores) {
            await tx.termResultSubject.upsert({
              where: {
                termResultId_subjectId: {
                  termResultId: termResult.id,
                  subjectId: subj.subjectId,
                },
              },
              create: {
                termResultId: termResult.id,
                subjectId: subj.subjectId,
                caRawScore: subj.caRawScore,
                caMaxScore: subj.caMaxScore,
                caWeightedScore: subj.caWeightedScore,
                examRawScore: subj.examRawScore,
                examMaxScore: subj.examMaxScore,
                examWeightedScore: subj.examWeightedScore,
                totalScore: subj.totalScore,
                grade: subj.grade,
                gradePoint: subj.gradePoint,
                interpretation: subj.interpretation,
                subjectPosition: subj.subjectPosition,
                teacherRemarks: null,
              },
              update: {
                caRawScore: subj.caRawScore,
                caMaxScore: subj.caMaxScore,
                caWeightedScore: subj.caWeightedScore,
                examRawScore: subj.examRawScore,
                examMaxScore: subj.examMaxScore,
                examWeightedScore: subj.examWeightedScore,
                totalScore: subj.totalScore,
                grade: subj.grade,
                gradePoint: subj.gradePoint,
                interpretation: subj.interpretation,
                subjectPosition: subj.subjectPosition,
              },
            })
          }
        }
      }

      // 3. Lock all operational assessments for this term
      await tx.assessment.updateMany({
        where: { termId },
        data: {
          status: AssessmentStatus.LOCKED,
          lockedAt: new Date(),
          lockedById: actorUserId,
        },
      })

      // 4. Transition term status to FINALIZED
      await tx.term.update({
        where: { id: termId },
        data: {
          status: TermStatus.FINALIZED,
          finalizedAt: new Date(),
          finalizedById: actorUserId,
        },
      })
    })

    // 5. Log audit trail
    await AuditService.logAction({
      userId: actorUserId,
      action: "FINALIZE_TERM",
      entityType: "Term",
      entityId: termId,
      oldValues: { status: term.status },
      newValues: { status: TermStatus.FINALIZED },
    })

    return { success: true, termId, status: TermStatus.FINALIZED }
  }

  /**
   * Reopens a finalized term with explicit justification reason.
   * Marks existing snapshots as SUPERSEDED.
   * Unlocks operational assessments so teachers can make authorized corrections.
   * Transitions the term to REOPENED status.
   */
  static async reopenFinalizedTerm(termId: string, reason: string, actorUserId: string) {
    if (!reason || reason.trim().length < 5) {
      throw new AppError(
        "VALIDATION_FAILED",
        "A clear, descriptive reason (minimum 5 characters) is required to reopen a finalized term.",
        400
      )
    }

    const term = await prisma.term.findUnique({
      where: { id: termId },
    })

    if (!term) {
      throw new AppError("NOT_FOUND", "Term not found.", 404)
    }

    if (term.status !== TermStatus.FINALIZED && term.status !== TermStatus.PUBLISHED) {
      throw new AppError(
        "INVALID_STATE_TRANSITION",
        `Only FINALIZED or PUBLISHED terms can be reopened via this workflow. Current status is "${term.status}".`,
        400
      )
    }

    // Atomic transaction for reopening
    await prisma.$transaction(async (tx) => {
      // 1. Mark existing term results as SUPERSEDED
      await tx.termResult.updateMany({
        where: { termId },
        data: {
          status: ResultStatus.SUPERSEDED,
        },
      })

      // 2. Unlock operational assessments so adjustments can be recorded
      await tx.assessment.updateMany({
        where: { termId },
        data: {
          status: AssessmentStatus.OPEN,
          lockedAt: null,
          lockedById: null,
        },
      })

      // 3. Transition term status to REOPENED
      await tx.term.update({
        where: { id: termId },
        data: {
          status: TermStatus.REOPENED,
        },
      })
    })

    // 4. Log audit action
    await AuditService.logAction({
      userId: actorUserId,
      action: "REOPEN_FINALIZED_TERM",
      entityType: "Term",
      entityId: termId,
      oldValues: { status: term.status },
      newValues: { status: TermStatus.REOPENED, reason: reason.trim() },
    })

    return { success: true, termId, status: TermStatus.REOPENED }
  }

  /**
   * Retrieves official broadsheet reading STRICTLY from immutable snapshots.
   * Does NOT query operational score tables.
   */
  static async getFinalizedBroadsheet(termId: string, classId: string): Promise<FinalizedBroadsheet> {
    const [term, targetClass] = await Promise.all([
      prisma.term.findUnique({
        where: { id: termId },
        include: { academicYear: true, finalizedBy: true },
      }),
      prisma.class.findUnique({ where: { id: classId } }),
    ])

    if (!term) throw new AppError("NOT_FOUND", "Term not found.", 404)
    if (!targetClass) throw new AppError("NOT_FOUND", "Class not found.", 404)

    // Query strictly from official snapshot tables
    const results = await prisma.termResult.findMany({
      where: {
        termId,
        enrollment: { classId },
        status: { in: [ResultStatus.FINALIZED, ResultStatus.PUBLISHED] },
      },
      include: {
        enrollment: {
          include: {
            student: true,
          },
        },
        subjects: {
          include: {
            subject: true,
          },
          orderBy: { subject: { name: "asc" } },
        },
      },
      orderBy: { classPosition: "asc" },
    })

    const isFinalized = term.status === TermStatus.FINALIZED || term.status === TermStatus.PUBLISHED

    if (results.length === 0) {
      return {
        termId,
        classId,
        termName: term.name,
        className: targetClass.name,
        academicYearName: term.academicYear.name,
        cohortSize: 0,
        classAverage: 0,
        highestAverage: 0,
        lowestAverage: 0,
        isFinalized,
        finalizedAt: term.finalizedAt,
        finalizedBy: term.finalizedBy?.displayName || term.finalizedById,
        students: [],
        subjectStatistics: {},
      }
    }

    const cohortSize = results.length
    const averages = results.map((r) => r.averageScore)
    const classAvg = averages.reduce((sum, a) => sum + a, 0) / cohortSize
    const highestAvg = Math.max(...averages)
    const lowestAvg = Math.min(...averages)

    // Compute subject statistics from snapshots
    const subjectScoresMap = new Map<
      string,
      {
        subjectId: string
        subjectName: string
        subjectCode: string
        scores: number[]
      }
    >()

    const students: FinalizedStudentRow[] = results.map((r) => {
      const studentSubjects: FinalizedStudentSubject[] = r.subjects.map((s) => {
        if (!subjectScoresMap.has(s.subjectId)) {
          subjectScoresMap.set(s.subjectId, {
            subjectId: s.subjectId,
            subjectName: s.subject.name,
            subjectCode: s.subject.code,
            scores: [],
          })
        }
        subjectScoresMap.get(s.subjectId)!.scores.push(s.totalScore)

        return {
          subjectId: s.subjectId,
          subjectName: s.subject.name,
          subjectCode: s.subject.code,
          caRawScore: s.caRawScore,
          caMaxScore: s.caMaxScore,
          caWeightedScore: s.caWeightedScore,
          examRawScore: s.examRawScore,
          examMaxScore: s.examMaxScore,
          examWeightedScore: s.examWeightedScore,
          totalScore: s.totalScore,
          grade: s.grade,
          gradePoint: s.gradePoint,
          interpretation: s.interpretation,
          subjectPosition: s.subjectPosition,
          teacherRemarks: s.teacherRemarks,
        }
      })

      return {
        termResultId: r.id,
        studentEnrollmentId: r.studentEnrollmentId,
        studentIdNumber: r.enrollment.student.studentIdNumber,
        studentName: `${r.enrollment.student.lastName}, ${r.enrollment.student.firstName}`,
        rollNumber: r.enrollment.rollNumber,
        totalScore: r.totalScore,
        averageScore: r.averageScore,
        classPosition: r.classPosition,
        cohortSize: r.cohortSize,
        gpa: r.gpa,
        status: r.status,
        finalizedAt: r.finalizedAt,
        subjects: studentSubjects,
      }
    })

    const subjectStatistics: FinalizedBroadsheet["subjectStatistics"] = {}
    subjectScoresMap.forEach((entry, subjId) => {
      const scores = entry.scores
      const avg = scores.reduce((sum, s) => sum + s, 0) / (scores.length || 1)
      const highest = Math.max(...scores, 0)
      const lowest = Math.min(...scores, 100)

      subjectStatistics[subjId] = {
        subjectId: entry.subjectId,
        subjectName: entry.subjectName,
        subjectCode: entry.subjectCode,
        averageScore: Math.round(avg * 100) / 100,
        highestScore: Math.round(highest * 100) / 100,
        lowestScore: Math.round(lowest * 100) / 100,
      }
    })

    return {
      termId,
      classId,
      termName: term.name,
      className: targetClass.name,
      academicYearName: term.academicYear.name,
      cohortSize,
      classAverage: Math.round(classAvg * 100) / 100,
      highestAverage: Math.round(highestAvg * 100) / 100,
      lowestAverage: Math.round(lowestAvg * 100) / 100,
      isFinalized,
      finalizedAt: term.finalizedAt,
      finalizedBy: term.finalizedBy?.displayName || term.finalizedById,
      students,
      subjectStatistics,
    }
  }

  /**
   * Administrative override to change term status to any lifecycle state.
   */
  static async adminUpdateTermStatus(
    termId: string,
    targetStatus: TermStatus,
    actorUserId: string,
    reason?: string
  ) {
    const term = await prisma.term.findUnique({
      where: { id: termId },
      include: { academicYear: true },
    })

    if (!term) throw new AppError("NOT_FOUND", "Term not found.", 404)

    const now = new Date()

    if (targetStatus === TermStatus.FINALIZED) {
      if (term.status !== TermStatus.APPROVED && term.status !== TermStatus.FINALIZED) {
        await prisma.term.update({
          where: { id: termId },
          data: { status: TermStatus.APPROVED, approvedAt: now, approvedById: actorUserId },
        })
      }
      return await this.finalizeTerm(termId, actorUserId)
    }

    if (targetStatus === TermStatus.PUBLISHED) {
      const current = await prisma.term.findUnique({ where: { id: termId } })
      if (current?.status !== TermStatus.FINALIZED && current?.status !== TermStatus.PUBLISHED) {
        if (current?.status !== TermStatus.APPROVED) {
          await prisma.term.update({
            where: { id: termId },
            data: { status: TermStatus.APPROVED, approvedAt: now, approvedById: actorUserId },
          })
        }
        await this.finalizeTerm(termId, actorUserId)
      }

      await prisma.$transaction(async (tx) => {
        await tx.term.update({
          where: { id: termId },
          data: {
            status: TermStatus.PUBLISHED,
            publishedAt: now,
            publishedById: actorUserId,
          },
        })

        await tx.termResult.updateMany({
          where: { termId },
          data: {
            status: ResultStatus.PUBLISHED,
            publishedAt: now,
            publishedById: actorUserId,
          },
        })
      })

      await AuditService.logAction({
        userId: actorUserId,
        action: "ADMIN_PUBLISH_TERM_REPORTS",
        entityType: "Term",
        entityId: termId,
        oldValues: { status: term.status },
        newValues: { status: TermStatus.PUBLISHED, reason: reason ?? null },
      })

      return { success: true, termId, status: TermStatus.PUBLISHED }
    }

    if (targetStatus === TermStatus.REOPENED) {
      return await this.reopenFinalizedTerm(
        termId,
        reason || "Administrative manual status change to REOPENED",
        actorUserId
      )
    }

    // For any other status (DRAFT, MARK_ENTRY, SUBMITTED, UNDER_REVIEW, APPROVED, CLOSED)
    const updateData: Record<string, unknown> = {
      status: targetStatus,
    }

    if (targetStatus === TermStatus.SUBMITTED) {
      updateData.submittedAt = now
      updateData.submittedById = actorUserId
    } else if (targetStatus === TermStatus.APPROVED) {
      updateData.approvedAt = now
      updateData.approvedById = actorUserId
    } else if (targetStatus === TermStatus.MARK_ENTRY) {
      await prisma.assessment.updateMany({
        where: { termId },
        data: { status: AssessmentStatus.OPEN, lockedAt: null, lockedById: null },
      })
    }

    const updated = await prisma.term.update({
      where: { id: termId },
      data: updateData,
    })

    await AuditService.logAction({
      userId: actorUserId,
      action: "ADMIN_CHANGE_TERM_STATUS",
      entityType: "Term",
      entityId: termId,
      oldValues: { status: term.status },
      newValues: { status: targetStatus, reason: reason ?? null },
    })

    return { success: true, termId, status: targetStatus }
  }

  /**
   * Updates an individual student's TermResult status.
   */
  static async updateStudentResultStatus(
    termResultId: string,
    targetStatus: ResultStatus,
    actorUserId: string
  ) {
    const existing = await prisma.termResult.findUnique({
      where: { id: termResultId },
    })

    if (!existing) throw new AppError("NOT_FOUND", "Student term result not found.", 404)

    const now = new Date()
    const updateData: Record<string, unknown> = {
      status: targetStatus,
    }

    if (targetStatus === ResultStatus.PUBLISHED) {
      updateData.publishedAt = now
      updateData.publishedById = actorUserId
    }

    const updated = await prisma.termResult.update({
      where: { id: termResultId },
      data: updateData,
    })

    await AuditService.logAction({
      userId: actorUserId,
      action: "UPDATE_STUDENT_RESULT_STATUS",
      entityType: "TermResult",
      entityId: termResultId,
      oldValues: { status: existing.status },
      newValues: { status: targetStatus },
    })

    return updated
  }
}
