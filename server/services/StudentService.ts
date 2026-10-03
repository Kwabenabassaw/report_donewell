import { prisma } from "@/lib/prisma"
import { StudentStatus, EnrollmentStatus } from "@prisma/client"
import { AuditService } from "./AuditService"
import { AppError } from "@/lib/errors"

export interface CreateStudentInput {
  studentIdNumber: string
  firstName: string
  middleName?: string
  lastName: string
  gender: string
  dateOfBirth?: Date
  photoUrl?: string
  enrollmentDate?: Date
}

export interface UpdateStudentInput {
  firstName?: string
  middleName?: string
  lastName?: string
  gender?: string
  dateOfBirth?: Date
  photoUrl?: string
}

export class StudentService {
  /**
   * Registers a new student.
   */
  static async createStudent(input: CreateStudentInput, actorUserId?: string) {
    const existing = await prisma.student.findUnique({
      where: { studentIdNumber: input.studentIdNumber.trim() },
    })

    if (existing) {
      throw new AppError(
        "VALIDATION_FAILED",
        `Student with ID number "${input.studentIdNumber}" already exists.`,
        400
      )
    }

    const student = await prisma.student.create({
      data: {
        studentIdNumber: input.studentIdNumber.trim(),
        firstName: input.firstName.trim(),
        middleName: input.middleName?.trim() || null,
        lastName: input.lastName.trim(),
        gender: input.gender.trim().toUpperCase(),
        dateOfBirth: input.dateOfBirth,
        photoUrl: input.photoUrl,
        enrollmentDate: input.enrollmentDate || new Date(),
        status: StudentStatus.ACTIVE,
      },
    })

    await AuditService.logAction({
      userId: actorUserId,
      action: "CREATE_STUDENT",
      entityType: "Student",
      entityId: student.id,
      newValues: {
        studentIdNumber: student.studentIdNumber,
        name: `${student.firstName} ${student.lastName}`,
      },
    })

    return student
  }

  /**
   * Updates student bio-data.
   */
  static async updateStudent(id: string, input: UpdateStudentInput, actorUserId?: string) {
    const existing = await prisma.student.findUnique({ where: { id } })
    if (!existing) {
      throw new AppError("NOT_FOUND", "Student not found.", 404)
    }

    const updated = await prisma.student.update({
      where: { id },
      data: input,
    })

    await AuditService.logAction({
      userId: actorUserId,
      action: "UPDATE_STUDENT",
      entityType: "Student",
      entityId: id,
      oldValues: existing as unknown as Record<string, unknown>,
      newValues: updated as unknown as Record<string, unknown>,
    })

    return updated
  }

  /**
   * Updates student lifecycle status.
   */
  static async updateStudentStatus(id: string, status: StudentStatus, actorUserId?: string) {
    const existing = await prisma.student.findUnique({ where: { id } })
    if (!existing) {
      throw new AppError("NOT_FOUND", "Student not found.", 404)
    }

    const updated = await prisma.student.update({
      where: { id },
      data: { status },
    })

    await AuditService.logAction({
      userId: actorUserId,
      action: "UPDATE_STUDENT_STATUS",
      entityType: "Student",
      entityId: id,
      oldValues: { status: existing.status },
      newValues: { status },
    })

    return updated
  }

  /**
   * Retrieves single student details with complete academic history.
   */
  static async getStudentById(id: string) {
    return await prisma.student.findUnique({
      where: { id },
      include: {
        enrollments: {
          orderBy: { academicYear: { startDate: "desc" } },
          include: {
            academicYear: true,
            class: true,
            subjectRegistrations: {
              include: { subject: true },
            },
            termResults: {
              include: { term: true, subjects: { include: { subject: true } } },
            },
            evaluations: {
              include: { term: true },
            },
          },
        },
        studentGuardians: {
          include: { guardian: true },
        },
      },
    })
  }

  /**
   * Lists students with search and filters.
   */
  static async listStudents(params?: {
    search?: string
    classId?: string
    status?: StudentStatus
    gender?: string
    limit?: number
    offset?: number
  }) {
    const { search, classId, status, gender, limit = 100, offset = 0 } = params || {}

    return await prisma.student.findMany({
      where: {
        ...(status && { status }),
        ...(gender && { gender }),
        ...(classId && {
          enrollments: {
            some: {
              classId,
              status: EnrollmentStatus.ACTIVE,
            },
          },
        }),
        ...(search && {
          OR: [
            { studentIdNumber: { contains: search, mode: "insensitive" } },
            { firstName: { contains: search, mode: "insensitive" } },
            { lastName: { contains: search, mode: "insensitive" } },
          ],
        }),
      },
      include: {
        enrollments: {
          where: { academicYear: { isCurrent: true } },
          include: {
            class: true,
            academicYear: true,
          },
        },
        studentGuardians: {
          where: { isPrimary: true },
          include: { guardian: true },
        },
      },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
      take: limit,
      skip: offset,
    })
  }

  /**
   * Protects historical academic records from physical deletion.
   */
  static async assertCanDelete(id: string) {
    const resultsCount = await prisma.termResult.count({
      where: { enrollment: { studentId: id } },
    })

    if (resultsCount > 0) {
      throw new AppError(
        "VALIDATION_FAILED",
        "Cannot delete student with historical official academic results. Archive or change status to ALUMNI/WITHDRAWN instead.",
        400
      )
    }

    const scoresCount = await prisma.studentAssessmentScore.count({
      where: { enrollment: { studentId: id } },
    })

    if (scoresCount > 0) {
      throw new AppError(
        "VALIDATION_FAILED",
        "Cannot delete student with operational assessment scores.",
        400
      )
    }
  }

  /**
   * Safely deletes a student record if no official results or assessment scores exist.
   */
  static async deleteStudent(id: string, actorUserId?: string) {
    const student = await prisma.student.findUnique({
      where: { id },
      include: { enrollments: true },
    })
    if (!student) {
      throw new AppError("NOT_FOUND", "Student not found.", 404)
    }

    await this.assertCanDelete(id)

    return await prisma.$transaction(async (tx) => {
      await tx.studentGuardian.deleteMany({ where: { studentId: id } })
      await tx.studentSubjectEnrollment.deleteMany({
        where: { enrollment: { studentId: id } },
      })
      await tx.studentEnrollment.deleteMany({ where: { studentId: id } })
      const deleted = await tx.student.delete({ where: { id } })

      await AuditService.logAction({
        userId: actorUserId,
        action: "DELETE_STUDENT",
        entityType: "Student",
        entityId: id,
        oldValues: {
          studentIdNumber: student.studentIdNumber,
          name: `${student.firstName} ${student.lastName}`,
        },
      })

      return deleted
    })
  }
}
