import { prisma } from "@/lib/prisma"
import { AuditService } from "./AuditService"
import { AppError } from "@/lib/errors"

export interface CreateSubjectInput {
  name: string
  code: string
  isElective?: boolean
  status?: string
}

export class SubjectService {
  /**
   * Creates a new academic subject.
   */
  static async createSubject(input: CreateSubjectInput, actorUserId?: string) {
    const existingCode = await prisma.subject.findUnique({
      where: { code: input.code.trim().toUpperCase() },
    })

    if (existingCode) {
      throw new AppError("VALIDATION_FAILED", `Subject with code "${input.code}" already exists.`, 400)
    }

    const subject = await prisma.subject.create({
      data: {
        name: input.name.trim(),
        code: input.code.trim().toUpperCase(),
        isElective: input.isElective ?? false,
        status: input.status ?? "ACTIVE",
      },
    })

    await AuditService.logAction({
      userId: actorUserId,
      action: "CREATE_SUBJECT",
      entityType: "Subject",
      entityId: subject.id,
      newValues: { name: subject.name, code: subject.code, isElective: subject.isElective },
    })

    return subject
  }

  /**
   * Lists all subjects.
   */
  static async listSubjects(activeOnly = false) {
    return await prisma.subject.findMany({
      where: activeOnly ? { status: "ACTIVE" } : undefined,
      orderBy: [{ isElective: "asc" }, { name: "asc" }],
      include: {
        _count: {
          select: {
            subjectAllocations: true,
            studentSubjectEnrollments: true,
            assessments: true,
          },
        },
      },
    })
  }

  /**
   * Toggles subject status.
   */
  static async toggleSubjectStatus(subjectId: string, actorUserId?: string) {
    const existing = await prisma.subject.findUnique({ where: { id: subjectId } })
    if (!existing) {
      throw new AppError("NOT_FOUND", "Subject not found.", 404)
    }

    const nextStatus = existing.status === "ACTIVE" ? "INACTIVE" : "ACTIVE"
    const updated = await prisma.subject.update({
      where: { id: subjectId },
      data: { status: nextStatus },
    })

    await AuditService.logAction({
      userId: actorUserId,
      action: "TOGGLE_SUBJECT_STATUS",
      entityType: "Subject",
      entityId: subjectId,
      oldValues: { status: existing.status },
      newValues: { status: nextStatus },
    })

    return updated
  }

  /**
   * Updates subject details.
   */
  static async updateSubject(
    subjectId: string,
    input: { name?: string; code?: string; isElective?: boolean },
    actorUserId?: string
  ) {
    const existing = await prisma.subject.findUnique({ where: { id: subjectId } })
    if (!existing) throw new AppError("NOT_FOUND", "Subject not found.", 404)

    const updated = await prisma.subject.update({
      where: { id: subjectId },
      data: {
        ...(input.name ? { name: input.name.trim() } : {}),
        ...(input.code ? { code: input.code.trim().toUpperCase() } : {}),
        ...(input.isElective !== undefined ? { isElective: input.isElective } : {}),
      },
    })

    await AuditService.logAction({
      userId: actorUserId,
      action: "UPDATE_SUBJECT",
      entityType: "Subject",
      entityId: subjectId,
      oldValues: { name: existing.name, code: existing.code },
      newValues: { name: updated.name, code: updated.code },
    })

    return updated
  }

  /**
   * Deletes a subject if no registrations or assessments exist.
   */
  static async deleteSubject(subjectId: string, actorUserId?: string) {
    const existing = await prisma.subject.findUnique({
      where: { id: subjectId },
      include: {
        _count: {
          select: {
            subjectAllocations: true,
            studentSubjectEnrollments: true,
            assessments: true,
          },
        },
      },
    })
    if (!existing) throw new AppError("NOT_FOUND", "Subject not found.", 404)

    if (
      existing._count.subjectAllocations > 0 ||
      existing._count.studentSubjectEnrollments > 0 ||
      existing._count.assessments > 0
    ) {
      throw new AppError(
        "CANNOT_DELETE",
        "Cannot delete subject with active teacher allocations, enrolled students, or assessments.",
        400
      )
    }

    await prisma.subject.delete({ where: { id: subjectId } })

    await AuditService.logAction({
      userId: actorUserId,
      action: "DELETE_SUBJECT",
      entityType: "Subject",
      entityId: subjectId,
      oldValues: { name: existing.name, code: existing.code },
    })
  }
}
