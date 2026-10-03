import { prisma } from "@/lib/prisma"
import { AuditService } from "./AuditService"
import { AppError } from "@/lib/errors"

export interface AddGuardianInput {
  studentId: string
  name: string
  phone: string
  email?: string
  relationship: string
  isPrimary?: boolean
}

export class GuardianService {
  /**
   * Adds or links a guardian to a student.
   */
  static async addGuardianForStudent(input: AddGuardianInput, actorUserId?: string) {
    const student = await prisma.student.findUnique({ where: { id: input.studentId } })
    if (!student) {
      throw new AppError("NOT_FOUND", "Student not found.", 404)
    }

    return await prisma.$transaction(async (tx) => {
      // Find or create guardian
      let guardian = await tx.guardian.findFirst({
        where: {
          phone: input.phone.trim(),
        },
      })

      if (!guardian) {
        guardian = await tx.guardian.create({
          data: {
            name: input.name.trim(),
            phone: input.phone.trim(),
            email: input.email?.trim() || null,
            relationship: input.relationship.trim(),
          },
        })
      }

      // If this guardian is designated primary, unset existing primary flags
      if (input.isPrimary) {
        await tx.studentGuardian.updateMany({
          where: { studentId: input.studentId },
          data: { isPrimary: false },
        })
      }

      // Upsert link
      const link = await tx.studentGuardian.upsert({
        where: {
          studentId_guardianId: {
            studentId: input.studentId,
            guardianId: guardian.id,
          },
        },
        update: {
          isPrimary: input.isPrimary ?? false,
        },
        create: {
          studentId: input.studentId,
          guardianId: guardian.id,
          isPrimary: input.isPrimary ?? false,
        },
        include: {
          guardian: true,
        },
      })

      await AuditService.logAction({
        userId: actorUserId,
        action: "ADD_STUDENT_GUARDIAN",
        entityType: "StudentGuardian",
        entityId: `${input.studentId}:${guardian.id}`,
        newValues: { guardianName: guardian.name, phone: guardian.phone, isPrimary: link.isPrimary },
      })

      return link
    })
  }

  /**
   * Lists guardians for a student.
   */
  static async listStudentGuardians(studentId: string) {
    return await prisma.studentGuardian.findMany({
      where: { studentId },
      include: { guardian: true },
      orderBy: { isPrimary: "desc" },
    })
  }
}
