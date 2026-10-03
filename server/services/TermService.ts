import { prisma } from "@/lib/prisma"
import { TermStatus } from "@prisma/client"
import { AuditService } from "./AuditService"
import { AppError } from "@/lib/errors"

export interface CreateTermInput {
  academicYearId: string
  name: string
  termSequence: number
  startDate: Date
  endDate: Date
  nextTermResumption?: Date
  totalSchoolDays?: number
}

// Valid state machine transitions
const VALID_TRANSITIONS: Record<TermStatus, TermStatus[]> = {
  DRAFT: [TermStatus.MARK_ENTRY],
  MARK_ENTRY: [TermStatus.SUBMITTED, TermStatus.DRAFT],
  SUBMITTED: [TermStatus.UNDER_REVIEW, TermStatus.MARK_ENTRY],
  UNDER_REVIEW: [TermStatus.APPROVED, TermStatus.MARK_ENTRY],
  APPROVED: [TermStatus.FINALIZED, TermStatus.UNDER_REVIEW],
  FINALIZED: [TermStatus.PUBLISHED, TermStatus.REOPENED],
  PUBLISHED: [TermStatus.REOPENED, TermStatus.CLOSED],
  REOPENED: [TermStatus.UNDER_REVIEW, TermStatus.MARK_ENTRY],
  CLOSED: [TermStatus.REOPENED],
}

export class TermService {
  /**
   * Creates a term with strict validation against academic year boundaries.
   */
  static async createTerm(input: CreateTermInput, actorUserId?: string) {
    if (input.startDate >= input.endDate) {
      throw new AppError("INVALID_TERM_DATES", "Term start date must be strictly before end date.", 400)
    }

    const academicYear = await prisma.academicYear.findUnique({
      where: { id: input.academicYearId },
    })

    if (!academicYear) {
      throw new AppError("NOT_FOUND", "Academic year not found.", 404)
    }

    if (input.startDate < academicYear.startDate || input.endDate > academicYear.endDate) {
      throw new AppError(
        "INVALID_TERM_DATES",
        "Term dates must fall entirely within the academic year dates.",
        400
      )
    }

    // Check for duplicate termSequence in same academic year
    const existing = await prisma.term.findUnique({
      where: {
        academicYearId_termSequence: {
          academicYearId: input.academicYearId,
          termSequence: input.termSequence,
        },
      },
    })
    if (existing) {
      throw new AppError(
        "VALIDATION_FAILED",
        `Term with sequence number ${input.termSequence} already exists in this academic year.`,
        400
      )
    }

    const term = await prisma.term.create({
      data: {
        academicYearId: input.academicYearId,
        name: input.name,
        termSequence: input.termSequence,
        startDate: input.startDate,
        endDate: input.endDate,
        nextTermResumption: input.nextTermResumption,
        totalSchoolDays: input.totalSchoolDays ?? 60,
        status: TermStatus.DRAFT,
      },
    })

    await AuditService.logAction({
      userId: actorUserId,
      action: "CREATE_TERM",
      entityType: "Term",
      entityId: term.id,
      newValues: { name: term.name, sequence: term.termSequence, status: term.status },
    })

    return term
  }

  /**
   * Evaluates if a state transition is legal in the lifecycle.
   */
  static isValidTransition(currentStatus: TermStatus, targetStatus: TermStatus): boolean {
    const allowed = VALID_TRANSITIONS[currentStatus] || []
    return allowed.includes(targetStatus)
  }

  /**
   * Transitions a term to a new status with validation and audit logging.
   */
  static async transitionStatus(
    termId: string,
    targetStatus: TermStatus,
    actorUserId: string,
    reason?: string
  ) {
    const term = await prisma.term.findUnique({
      where: { id: termId },
      include: { academicYear: true },
    })

    if (!term) {
      throw new AppError("NOT_FOUND", "The requested term does not exist.", 404)
    }

    if (!this.isValidTransition(term.status, targetStatus)) {
      throw new AppError(
        "VALIDATION_FAILED",
        `Invalid state transition: Cannot transition term from ${term.status} to ${targetStatus}.`,
        400
      )
    }

    // Reopening requires a mandatory reason
    if (targetStatus === TermStatus.REOPENED && !reason?.trim()) {
      throw new AppError(
        "VALIDATION_FAILED",
        "A mandatory reason is required to reopen a finalized or published term.",
        400
      )
    }

    // Special metadata updates based on target status
    const updateData: Record<string, unknown> = {
      status: targetStatus,
    }

    if (targetStatus === TermStatus.SUBMITTED) {
      updateData.submittedAt = new Date()
      updateData.submittedById = actorUserId
    } else if (targetStatus === TermStatus.APPROVED) {
      updateData.approvedAt = new Date()
      updateData.approvedById = actorUserId
    } else if (targetStatus === TermStatus.FINALIZED) {
      updateData.finalizedAt = new Date()
      updateData.finalizedById = actorUserId
    } else if (targetStatus === TermStatus.PUBLISHED) {
      updateData.publishedAt = new Date()
      updateData.publishedById = actorUserId
    }

    const updatedTerm = await prisma.term.update({
      where: { id: termId },
      data: updateData,
    })

    await AuditService.logAction({
      userId: actorUserId,
      action: `TRANSITION_TERM_${targetStatus}`,
      entityType: "Term",
      entityId: termId,
      oldValues: { status: term.status },
      newValues: { status: targetStatus, reason: reason ?? null },
    })

    return updatedTerm
  }

  /**
   * Retrieves active terms currently accepting mark entries.
   */
  static async getActiveMarkEntryTerms() {
    return await prisma.term.findMany({
      where: {
        status: TermStatus.MARK_ENTRY,
        academicYear: { isCurrent: true },
      },
      include: {
        academicYear: true,
      },
    })
  }

  /**
   * Checks if mark entry is permitted for a term.
   */
  static async canEnterMarks(termId: string): Promise<boolean> {
    const term = await prisma.term.findUnique({
      where: { id: termId },
      select: { status: true },
    })

    return (
      term?.status === TermStatus.MARK_ENTRY ||
      term?.status === TermStatus.REOPENED
    )
  }

  /**
   * Lists all terms with academic year information.
   */
  static async listTerms(academicYearId?: string) {
    return await prisma.term.findMany({
      where: academicYearId ? { academicYearId } : undefined,
      orderBy: [{ academicYear: { startDate: "desc" } }, { termSequence: "asc" }],
      include: {
        academicYear: true,
        _count: {
          select: { assessments: true, subjectAllocations: true, termResults: true },
        },
      },
    })
  }

  /**
   * Updates an existing term.
   */
  static async updateTerm(
    termId: string,
    input: {
      name?: string
      startDate?: Date
      endDate?: Date
      nextTermResumption?: Date
      totalSchoolDays?: number
    },
    actorUserId?: string
  ) {
    const existing = await prisma.term.findUnique({
      where: { id: termId },
      include: { academicYear: true },
    })
    if (!existing) {
      throw new AppError("NOT_FOUND", "Term not found.", 404)
    }

    const startDate = input.startDate || existing.startDate
    const endDate = input.endDate || existing.endDate

    if (startDate >= endDate) {
      throw new AppError("INVALID_TERM_DATES", "Term start date must be strictly before end date.", 400)
    }

    if (startDate < existing.academicYear.startDate || endDate > existing.academicYear.endDate) {
      throw new AppError(
        "INVALID_TERM_DATES",
        "Term dates must fall entirely within the academic year dates.",
        400
      )
    }

    const updated = await prisma.term.update({
      where: { id: termId },
      data: {
        ...(input.name ? { name: input.name } : {}),
        ...(input.startDate ? { startDate: input.startDate } : {}),
        ...(input.endDate ? { endDate: input.endDate } : {}),
        ...(input.nextTermResumption !== undefined ? { nextTermResumption: input.nextTermResumption } : {}),
        ...(input.totalSchoolDays ? { totalSchoolDays: input.totalSchoolDays } : {}),
      },
    })

    await AuditService.logAction({
      userId: actorUserId,
      action: "UPDATE_TERM",
      entityType: "Term",
      entityId: termId,
      oldValues: { name: existing.name, startDate: existing.startDate, endDate: existing.endDate },
      newValues: { name: updated.name, startDate: updated.startDate, endDate: updated.endDate },
    })

    return updated
  }

  /**
   * Deletes a term if safe.
   */
  static async deleteTerm(termId: string, actorUserId?: string) {
    const existing = await prisma.term.findUnique({
      where: { id: termId },
      include: {
        assessments: true,
        termResults: true,
      },
    })
    if (!existing) {
      throw new AppError("NOT_FOUND", "Term not found.", 404)
    }

    if (existing.status !== TermStatus.DRAFT && (existing.assessments.length > 0 || existing.termResults.length > 0)) {
      throw new AppError(
        "CANNOT_DELETE",
        "Cannot delete a term with active assessments or finalized results.",
        400
      )
    }

    await prisma.term.delete({
      where: { id: termId },
    })

    await AuditService.logAction({
      userId: actorUserId,
      action: "DELETE_TERM",
      entityType: "Term",
      entityId: termId,
      oldValues: { name: existing.name, status: existing.status },
    })
  }
}
