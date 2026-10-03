import { prisma } from "@/lib/prisma"
import { AuditService } from "./AuditService"
import { AppError } from "@/lib/errors"

export interface CreateClassInput {
  name: string
  gradeLevel: string
  classTeacherId?: string
  status?: string
}

export class ClassService {
  /**
   * Creates a new class.
   */
  static async createClass(input: CreateClassInput, actorUserId?: string) {
    const existing = await prisma.class.findUnique({
      where: { name: input.name.trim() },
    })

    if (existing) {
      throw new AppError("VALIDATION_FAILED", `Class with name "${input.name}" already exists.`, 400)
    }

    const cls = await prisma.class.create({
      data: {
        name: input.name.trim(),
        gradeLevel: input.gradeLevel.trim(),
        classTeacherId: input.classTeacherId ?? null,
        status: input.status ?? "ACTIVE",
      },
      include: {
        classTeacher: {
          select: { id: true, displayName: true, username: true },
        },
      },
    })

    await AuditService.logAction({
      userId: actorUserId,
      action: "CREATE_CLASS",
      entityType: "Class",
      entityId: cls.id,
      newValues: { name: cls.name, gradeLevel: cls.gradeLevel, classTeacherId: cls.classTeacherId },
    })

    return cls
  }

  /**
   * Assigns a supervisor / class teacher to a class.
   */
  static async assignClassTeacher(classId: string, teacherId: string | null, actorUserId?: string) {
    const cls = await prisma.class.findUnique({ where: { id: classId } })
    if (!cls) {
      throw new AppError("NOT_FOUND", "Class not found.", 404)
    }

    if (teacherId) {
      const teacher = await prisma.user.findUnique({
        where: { id: teacherId },
        include: { userRoles: { include: { role: true } } },
      })
      if (!teacher) {
        throw new AppError("NOT_FOUND", "Teacher user not found.", 404)
      }
    }

    const updated = await prisma.class.update({
      where: { id: classId },
      data: { classTeacherId: teacherId },
      include: {
        classTeacher: {
          select: { id: true, displayName: true, username: true },
        },
      },
    })

    await AuditService.logAction({
      userId: actorUserId,
      action: "ASSIGN_CLASS_TEACHER",
      entityType: "Class",
      entityId: classId,
      oldValues: { classTeacherId: cls.classTeacherId },
      newValues: { classTeacherId: teacherId },
    })

    return updated
  }

  /**
   * Lists all classes with supervisor and enrollment counts.
   */
  static async listClasses() {
    return await prisma.class.findMany({
      orderBy: { name: "asc" },
      include: {
        classTeacher: {
          select: { id: true, displayName: true, username: true },
        },
        _count: {
          select: { enrollments: true, subjectAllocations: true, assessments: true },
        },
      },
    })
  }

  /**
   * Retrieves single class details.
   */
  /**
   * Updates class details.
   */
  static async updateClass(
    classId: string,
    input: { name?: string; gradeLevel?: string; classTeacherId?: string | null; status?: string },
    actorUserId?: string
  ) {
    const existing = await prisma.class.findUnique({ where: { id: classId } })
    if (!existing) throw new AppError("NOT_FOUND", "Class not found.", 404)

    const updated = await prisma.class.update({
      where: { id: classId },
      data: {
        ...(input.name ? { name: input.name.trim() } : {}),
        ...(input.gradeLevel ? { gradeLevel: input.gradeLevel.trim() } : {}),
        ...(input.classTeacherId !== undefined ? { classTeacherId: input.classTeacherId } : {}),
        ...(input.status ? { status: input.status } : {}),
      },
      include: {
        classTeacher: { select: { id: true, displayName: true, username: true } },
      },
    })

    await AuditService.logAction({
      userId: actorUserId,
      action: "UPDATE_CLASS",
      entityType: "Class",
      entityId: classId,
      oldValues: { name: existing.name, gradeLevel: existing.gradeLevel },
      newValues: { name: updated.name, gradeLevel: updated.gradeLevel },
    })

    return updated
  }

  /**
   * Deletes a class if no student enrollments or assessments exist.
   */
  static async deleteClass(classId: string, actorUserId?: string) {
    const existing = await prisma.class.findUnique({
      where: { id: classId },
      include: { _count: { select: { enrollments: true, assessments: true } } },
    })
    if (!existing) throw new AppError("NOT_FOUND", "Class not found.", 404)

    if (existing._count.enrollments > 0 || existing._count.assessments > 0) {
      throw new AppError(
        "CANNOT_DELETE",
        "Cannot delete class with existing enrollments or assessments.",
        400
      )
    }

    await prisma.class.delete({ where: { id: classId } })

    await AuditService.logAction({
      userId: actorUserId,
      action: "DELETE_CLASS",
      entityType: "Class",
      entityId: classId,
      oldValues: { name: existing.name },
    })
  }
}
