import { prisma } from "@/lib/prisma"
import { AppError } from "@/lib/errors"

export interface AuthContext {
  userId: string
  roles: string[]
}

export class ScopeGuard {
  /**
   * Evaluates if the authenticated user has administrative / school-wide access.
   */
  static isAdministrative(ctx: AuthContext): boolean {
    return ctx.roles.some((r) =>
      ["SUPER_ADMIN", "HEADMASTER", "EXAM_OFFICER"].includes(r)
    )
  }

  /**
   * CRITICAL REQUIREMENT: Scoped Teacher Authorization.
   * Asserts that a teacher is assigned to this exact subject, class, and term.
   */
  static async assertTeacherSubjectScope(params: {
    ctx: AuthContext
    termId: string
    classId: string
    subjectId: string
  }): Promise<boolean> {
    // School administrators have school-wide scope
    if (this.isAdministrative(params.ctx)) {
      return true
    }

    // Teacher role must exist
    if (!params.ctx.roles.includes("SUBJECT_TEACHER")) {
      throw new AppError(
        "UNAUTHORIZED_ACTION",
        "UNAUTHORIZED: User does not hold the SUBJECT_TEACHER role.",
        403
      )
    }

    // Must be assigned in subject_allocations
    const allocation = await prisma.subjectAllocation.findUnique({
      where: {
        termId_classId_subjectId: {
          termId: params.termId,
          classId: params.classId,
          subjectId: params.subjectId,
        },
      },
    })

    if (!allocation || allocation.teacherId !== params.ctx.userId) {
      throw new AppError(
        "UNAUTHORIZED_TEACHER",
        "UNAUTHORIZED_TEACHER_SCOPE: You are not assigned to teach this subject in this class for the specified term.",
        403
      )
    }

    return true
  }

  /**
   * Asserts that a teacher is the assigned form / class teacher for the class.
   */
  static async assertClassTeacherScope(params: {
    ctx: AuthContext
    classId: string
  }): Promise<boolean> {
    if (this.isAdministrative(params.ctx)) {
      return true
    }

    const cls = await prisma.class.findUnique({
      where: { id: params.classId },
      select: { classTeacherId: true },
    })

    if (!cls || cls.classTeacherId !== params.ctx.userId) {
      throw new AppError(
        "UNAUTHORIZED_ACTION",
        "UNAUTHORIZED_CLASS_TEACHER: You are not the assigned class supervisor for this class.",
        403
      )
    }

    return true
  }
}
