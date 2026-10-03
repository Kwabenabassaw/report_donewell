import { prisma } from "@/lib/prisma"
import { AssessmentStatus, TermStatus } from "@prisma/client"
import { AuditService } from "./AuditService"
import { AppError } from "@/lib/errors"

export interface CreateAssessmentInput {
  termId: string
  classId: string
  subjectId: string
  categoryId: string
  title: string
  maxScore: number
  dateAdministered?: Date
}

export interface UpdateAssessmentInput {
  title?: string
  maxScore?: number
  dateAdministered?: Date
  categoryId?: string
}

export class AssessmentService {
  /**
   * Creates an operational assessment activity under a category.
   */
  static async createAssessment(input: CreateAssessmentInput, actorUserId?: string) {
    if (input.maxScore <= 0) {
      throw new AppError(
        "VALIDATION_FAILED",
        "Assessment maximum score must be greater than zero.",
        400
      )
    }

    const [term, targetClass, subject, category] = await Promise.all([
      prisma.term.findUnique({ where: { id: input.termId } }),
      prisma.class.findUnique({ where: { id: input.classId } }),
      prisma.subject.findUnique({ where: { id: input.subjectId } }),
      prisma.assessmentCategory.findUnique({
        where: { id: input.categoryId },
        include: { component: true },
      }),
    ])

    if (!term) throw new AppError("NOT_FOUND", "Term not found.", 404)
    if (!targetClass) throw new AppError("NOT_FOUND", "Class not found.", 404)
    if (!subject) throw new AppError("NOT_FOUND", "Subject not found.", 404)
    if (!category) throw new AppError("NOT_FOUND", "Assessment category not found.", 404)

    if (term.status === TermStatus.CLOSED) {
      throw new AppError(
        "TERM_LOCKED",
        "Cannot create assessment activities in a CLOSED term.",
        400
      )
    }

    const assessment = await prisma.assessment.create({
      data: {
        termId: input.termId,
        classId: input.classId,
        subjectId: input.subjectId,
        categoryId: input.categoryId,
        title: input.title.trim(),
        maxScore: input.maxScore,
        dateAdministered: input.dateAdministered || new Date(),
        status: AssessmentStatus.OPEN,
        createdById: actorUserId || null,
      },
      include: {
        category: { include: { component: true } },
        class: true,
        subject: true,
        term: true,
      },
    })

    await AuditService.logAction({
      userId: actorUserId,
      action: "CREATE_ASSESSMENT_ACTIVITY",
      entityType: "Assessment",
      entityId: assessment.id,
      newValues: {
        title: assessment.title,
        maxScore: assessment.maxScore,
        className: targetClass.name,
        subjectCode: subject.code,
        categoryName: category.name,
      },
    })

    return assessment
  }

  /**
   * Updates an assessment activity. Guarded by lock status.
   */
  static async updateAssessment(id: string, input: UpdateAssessmentInput, actorUserId?: string) {
    const existing = await prisma.assessment.findUnique({ where: { id } })
    if (!existing) {
      throw new AppError("NOT_FOUND", "Assessment not found.", 404)
    }

    if (existing.status === AssessmentStatus.LOCKED) {
      throw new AppError(
        "ASSESSMENT_LOCKED",
        "Cannot modify a locked assessment activity. Unlock it first.",
        400
      )
    }

    if (input.maxScore !== undefined && input.maxScore <= 0) {
      throw new AppError(
        "VALIDATION_FAILED",
        "Assessment maximum score must be greater than zero.",
        400
      )
    }

    const updated = await prisma.assessment.update({
      where: { id },
      data: {
        ...(input.title && { title: input.title.trim() }),
        ...(input.maxScore !== undefined && { maxScore: input.maxScore }),
        ...(input.dateAdministered && { dateAdministered: input.dateAdministered }),
        ...(input.categoryId && { categoryId: input.categoryId }),
      },
    })

    await AuditService.logAction({
      userId: actorUserId,
      action: "UPDATE_ASSESSMENT_ACTIVITY",
      entityType: "Assessment",
      entityId: id,
      oldValues: { title: existing.title, maxScore: existing.maxScore },
      newValues: { title: updated.title, maxScore: updated.maxScore },
    })

    return updated
  }

  /**
   * Locks an assessment activity against further mark modifications.
   */
  static async lockAssessment(id: string, actorUserId?: string) {
    const existing = await prisma.assessment.findUnique({ where: { id } })
    if (!existing) {
      throw new AppError("NOT_FOUND", "Assessment not found.", 404)
    }

    const updated = await prisma.assessment.update({
      where: { id },
      data: {
        status: AssessmentStatus.LOCKED,
        lockedAt: new Date(),
        lockedById: actorUserId || null,
      },
    })

    await AuditService.logAction({
      userId: actorUserId,
      action: "LOCK_ASSESSMENT",
      entityType: "Assessment",
      entityId: id,
      newValues: { status: AssessmentStatus.LOCKED, lockedAt: updated.lockedAt },
    })

    return updated
  }

  /**
   * Unlocks an assessment activity to allow authorized mark amendments.
   */
  static async unlockAssessment(id: string, actorUserId?: string) {
    const existing = await prisma.assessment.findUnique({ where: { id } })
    if (!existing) {
      throw new AppError("NOT_FOUND", "Assessment not found.", 404)
    }

    const updated = await prisma.assessment.update({
      where: { id },
      data: {
        status: AssessmentStatus.OPEN,
        lockedAt: null,
        lockedById: null,
      },
    })

    await AuditService.logAction({
      userId: actorUserId,
      action: "UNLOCK_ASSESSMENT",
      entityType: "Assessment",
      entityId: id,
      newValues: { status: AssessmentStatus.OPEN },
    })

    return updated
  }

  /**
   * Lists assessment activities with flexible filters.
   */
  static async listAssessments(params?: {
    termId?: string
    classId?: string
    subjectId?: string
    categoryId?: string
  }) {
    const { termId, classId, subjectId, categoryId } = params || {}

    return await prisma.assessment.findMany({
      where: {
        ...(termId && { termId }),
        ...(classId && { classId }),
        ...(subjectId && { subjectId }),
        ...(categoryId && { categoryId }),
      },
      include: {
        category: {
          include: { component: true },
        },
        class: true,
        subject: true,
        term: {
          include: { academicYear: true },
        },
        _count: {
          select: { scores: true },
        },
      },
      orderBy: [
        { term: { termSequence: "asc" } },
        { class: { name: "asc" } },
        { subject: { name: "asc" } },
        { createdAt: "desc" },
      ],
    })
  }

  /**
   * Retrieves single assessment with score counts and details.
   */
  static async getAssessmentById(id: string) {
    return await prisma.assessment.findUnique({
      where: { id },
      include: {
        category: { include: { component: true } },
        class: true,
        subject: true,
        term: { include: { academicYear: true } },
        createdBy: { select: { displayName: true, username: true } },
        lockedBy: { select: { displayName: true, username: true } },
        _count: { select: { scores: true } },
      },
    })
  }

  /**
   * Deletes an assessment activity if no student scores exist.
   */
  static async deleteAssessment(id: string, actorUserId?: string) {
    const scoresCount = await prisma.studentAssessmentScore.count({
      where: { assessmentId: id },
    })

    if (scoresCount > 0) {
      throw new AppError(
        "VALIDATION_FAILED",
        `Cannot delete assessment with ${scoresCount} recorded student scores. Delete or clear the scores first.`,
        400
      )
    }

    await prisma.assessment.delete({ where: { id } })

    await AuditService.logAction({
      userId: actorUserId,
      action: "DELETE_ASSESSMENT_ACTIVITY",
      entityType: "Assessment",
      entityId: id,
    })

    return true
  }
}
