import { prisma } from "@/lib/prisma"
import { TermStatus } from "@prisma/client"
import { AuditService } from "./AuditService"
import { AppError } from "@/lib/errors"

export interface AssignTeacherInput {
  termId: string
  classId: string
  subjectId: string
  teacherId: string
}

export class TeacherAssignmentService {
  /**
   * Allocates a teacher to a subject for a specific class and term.
   * Enforces UNIQUE(term_id, class_id, subject_id).
   */
  static async assignTeacher(input: AssignTeacherInput, actorUserId?: string) {
    const { termId, classId, subjectId, teacherId } = input

    // 1. Verify Term exists and is active
    const term = await prisma.term.findUnique({
      where: { id: termId },
      include: { academicYear: true },
    })

    if (!term) {
      throw new AppError("NOT_FOUND", "The specified term was not found.", 404)
    }

    if (term.status === TermStatus.CLOSED) {
      throw new AppError(
        "INVALID_STATE_TRANSITION",
        "Cannot allocate teachers in a CLOSED term.",
        400
      )
    }

    // 2. Verify Class and Subject exist
    const [targetClass, targetSubject, teacherUser] = await Promise.all([
      prisma.class.findUnique({ where: { id: classId } }),
      prisma.subject.findUnique({ where: { id: subjectId } }),
      prisma.user.findUnique({
        where: { id: teacherId },
        include: {
          userRoles: {
            include: { role: true },
          },
        },
      }),
    ])

    if (!targetClass) {
      throw new AppError("NOT_FOUND", "The specified class does not exist.", 404)
    }

    if (!targetSubject) {
      throw new AppError("NOT_FOUND", "The specified subject does not exist.", 404)
    }

    if (!teacherUser) {
      throw new AppError("NOT_FOUND", "The specified teacher account does not exist.", 404)
    }

    // 3. Upsert allocation enforcing UNIQUE(termId, classId, subjectId)
    const existingAllocation = await prisma.subjectAllocation.findUnique({
      where: {
        termId_classId_subjectId: {
          termId,
          classId,
          subjectId,
        },
      },
      include: { teacher: true },
    })

    const allocation = await prisma.subjectAllocation.upsert({
      where: {
        termId_classId_subjectId: {
          termId,
          classId,
          subjectId,
        },
      },
      update: {
        teacherId,
      },
      create: {
        termId,
        classId,
        subjectId,
        teacherId,
      },
      include: {
        term: true,
        class: true,
        subject: true,
        teacher: {
          select: { id: true, displayName: true, username: true, email: true },
        },
      },
    })

    await AuditService.logAction({
      userId: actorUserId,
      action: existingAllocation ? "REASSIGN_SUBJECT_TEACHER" : "ASSIGN_SUBJECT_TEACHER",
      entityType: "SubjectAllocation",
      entityId: allocation.id,
      oldValues: existingAllocation
        ? {
            teacherId: existingAllocation.teacherId,
            teacherName: existingAllocation.teacher.displayName,
          }
        : undefined,
      newValues: {
        termName: term.name,
        className: targetClass.name,
        subjectCode: targetSubject.code,
        teacherId,
        teacherName: teacherUser.displayName,
      },
    })

    return allocation
  }

  /**
   * Removes a teacher allocation.
   */
  static async unassignTeacher(allocationId: string, actorUserId?: string) {
    const existing = await prisma.subjectAllocation.findUnique({
      where: { id: allocationId },
      include: {
        term: true,
        class: true,
        subject: true,
        teacher: true,
      },
    })

    if (!existing) {
      throw new AppError("NOT_FOUND", "Allocation record not found.", 404)
    }

    // Optional Safety: Check if assessments already have marks entered for this term/class/subject
    const scoresCount = await prisma.studentAssessmentScore.count({
      where: {
        assessment: {
          termId: existing.termId,
          classId: existing.classId,
          subjectId: existing.subjectId,
        },
      },
    })

    if (scoresCount > 0) {
      throw new AppError(
        "VALIDATION_FAILED",
        `Cannot remove teacher allocation. ${scoresCount} assessment score(s) have already been entered for this subject in this term. Reassign a new teacher instead.`,
        400
      )
    }

    await prisma.subjectAllocation.delete({
      where: { id: allocationId },
    })

    await AuditService.logAction({
      userId: actorUserId,
      action: "UNASSIGN_SUBJECT_TEACHER",
      entityType: "SubjectAllocation",
      entityId: allocationId,
      oldValues: {
        termId: existing.termId,
        classId: existing.classId,
        subjectId: existing.subjectId,
        teacherId: existing.teacherId,
        teacherName: existing.teacher.displayName,
      },
    })

    return true
  }

  /**
   * Lists allocations with flexible filters.
   */
  static async listAllocations(params?: {
    termId?: string
    classId?: string
    teacherId?: string
    subjectId?: string
  }) {
    const { termId, classId, teacherId, subjectId } = params || {}

    return await prisma.subjectAllocation.findMany({
      where: {
        ...(termId && { termId }),
        ...(classId && { classId }),
        ...(teacherId && { teacherId }),
        ...(subjectId && { subjectId }),
      },
      include: {
        term: {
          include: { academicYear: true },
        },
        class: true,
        subject: true,
        teacher: {
          select: { id: true, displayName: true, username: true, email: true },
        },
      },
      orderBy: [
        { class: { name: "asc" } },
        { subject: { name: "asc" } },
      ],
    })
  }

  /**
   * Retrieves active teaching allocations for a specific teacher.
   */
  static async getTeacherAllocations(teacherId: string, termId?: string) {
    return await prisma.subjectAllocation.findMany({
      where: {
        teacherId,
        ...(termId && { termId }),
      },
      include: {
        term: {
          include: { academicYear: true },
        },
        class: true,
        subject: true,
      },
      orderBy: [
        { class: { name: "asc" } },
        { subject: { name: "asc" } },
      ],
    })
  }

  /**
   * Checks if teacher is assigned to subject in class during term.
   */
  static async isTeacherAssigned(
    teacherId: string,
    termId: string,
    classId: string,
    subjectId: string
  ): Promise<boolean> {
    const count = await prisma.subjectAllocation.count({
      where: {
        teacherId,
        termId,
        classId,
        subjectId,
      },
    })
    return count > 0
  }
}
