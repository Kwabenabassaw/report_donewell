import { prisma } from "@/lib/prisma"
import { EnrollmentStatus, StudentStatus } from "@prisma/client"
import { AuditService } from "./AuditService"
import { AppError } from "@/lib/errors"

export interface EnrollStudentInput {
  studentId: string
  academicYearId: string
  classId: string
  rollNumber?: string
  autoEnrollCoreSubjects?: boolean
}

export class EnrollmentService {
  /**
   * Enrolls a student into a class for an academic year.
   * Enforces UNIQUE(student_id, academic_year_id).
   */
  static async enrollStudent(input: EnrollStudentInput, actorUserId?: string) {
    const existing = await prisma.studentEnrollment.findUnique({
      where: {
        studentId_academicYearId: {
          studentId: input.studentId,
          academicYearId: input.academicYearId,
        },
      },
    })

    if (existing) {
      throw new AppError(
        "VALIDATION_FAILED",
        "Student is already enrolled in this academic year.",
        400
      )
    }

    return await prisma.$transaction(async (tx) => {
      const enrollment = await tx.studentEnrollment.create({
        data: {
          studentId: input.studentId,
          academicYearId: input.academicYearId,
          classId: input.classId,
          rollNumber: input.rollNumber,
          status: EnrollmentStatus.ACTIVE,
        },
        include: {
          student: true,
          class: true,
          academicYear: true,
        },
      })

      // Auto-enroll all core subjects if requested
      if (input.autoEnrollCoreSubjects !== false) {
        const coreSubjects = await tx.subject.findMany({
          where: { isElective: false, status: "ACTIVE" },
        })

        for (const subject of coreSubjects) {
          await tx.studentSubjectEnrollment.create({
            data: {
              studentEnrollmentId: enrollment.id,
              subjectId: subject.id,
            },
          })
        }
      }

      await AuditService.logAction({
        userId: actorUserId,
        action: "ENROLL_STUDENT",
        entityType: "StudentEnrollment",
        entityId: enrollment.id,
        newValues: {
          studentId: input.studentId,
          classId: input.classId,
          academicYearId: input.academicYearId,
          rollNumber: input.rollNumber,
        },
      })

      return enrollment
    })
  }

  /**
   * CRITICAL REQUIREMENT: Scoped Cohort Calculation.
   * NEVER queries by class ID alone. Always scopes by academic year, class, and ACTIVE status.
   */
  static async getEligibleCohort(params: {
    academicYearId: string
    classId: string
  }) {
    return await prisma.studentEnrollment.findMany({
      where: {
        academicYearId: params.academicYearId,
        classId: params.classId,
        status: EnrollmentStatus.ACTIVE,
        student: {
          status: StudentStatus.ACTIVE,
        },
      },
      include: {
        student: true,
        class: true,
        subjectRegistrations: {
          include: {
            subject: true,
          },
        },
      },
      orderBy: [
        { student: { lastName: "asc" } },
        { student: { firstName: "asc" } },
      ],
    })
  }

  /**
   * Registers a student for a subject within their enrollment.
   */
  static async registerSubject(enrollmentId: string, subjectId: string) {
    return await prisma.studentSubjectEnrollment.upsert({
      where: {
        studentEnrollmentId_subjectId: {
          studentEnrollmentId: enrollmentId,
          subjectId,
        },
      },
      update: {},
      create: {
        studentEnrollmentId: enrollmentId,
        subjectId,
      },
    })
  }

  /**
   * Unregisters a student from a subject (e.g. elective drop).
   */
  static async unregisterSubject(enrollmentId: string, subjectId: string) {
    // Check if marks already exist for this subject in the current term
    const existingScores = await prisma.studentAssessmentScore.count({
      where: {
        studentEnrollmentId: enrollmentId,
        assessment: { subjectId },
      },
    })

    if (existingScores > 0) {
      throw new AppError(
        "VALIDATION_FAILED",
        "Cannot unregister subject with recorded assessment scores.",
        400
      )
    }

    return await prisma.studentSubjectEnrollment.delete({
      where: {
        studentEnrollmentId_subjectId: {
          studentEnrollmentId: enrollmentId,
          subjectId,
        },
      },
    })
  }

  /**
   * Bulk registers all active students in a class for a list of mandatory subjects.
   * Uses upsert — idempotent; existing registrations are silently skipped.
   * Returns a summary of how many students were processed and registrations created.
   */
  static async bulkRegisterClassSubjects(
    academicYearId: string,
    classId: string,
    subjectIds: string[]
  ): Promise<{ totalStudents: number; totalCreated: number }> {
    const cohort = await this.getEligibleCohort({ academicYearId, classId })

    let totalCreated = 0
    for (const enrollment of cohort) {
      for (const subjectId of subjectIds) {
        const before = await prisma.studentSubjectEnrollment.findUnique({
          where: {
            studentEnrollmentId_subjectId: {
              studentEnrollmentId: enrollment.id,
              subjectId,
            },
          },
          select: { id: true },
        })
        await this.registerSubject(enrollment.id, subjectId)
        if (!before) totalCreated++
      }
    }

    return { totalStudents: cohort.length, totalCreated }
  }

  /**
   * Bulk registers a single student's enrollment for multiple subjects at once.
   * Uses upsert — idempotent; already-registered subjects are silently skipped.
   */
  static async bulkRegisterSubjectsForStudent(
    enrollmentId: string,
    subjectIds: string[]
  ): Promise<{ created: number; skipped: number }> {
    let created = 0
    let skipped = 0
    for (const subjectId of subjectIds) {
      const before = await prisma.studentSubjectEnrollment.findUnique({
        where: {
          studentEnrollmentId_subjectId: {
            studentEnrollmentId: enrollmentId,
            subjectId,
          },
        },
        select: { id: true },
      })
      await this.registerSubject(enrollmentId, subjectId)
      if (before) {
        skipped++
      } else {
        created++
      }
    }
    return { created, skipped }
  }

  /**
   * Returns a count of active students in a class for a given academic year.
   * Used by the bulk enrollment dialog to preview cohort size without fetching full records.
   */
  static async getEligibleCohortCount(params: {
    academicYearId: string
    classId: string
  }): Promise<number> {
    return prisma.studentEnrollment.count({
      where: {
        academicYearId: params.academicYearId,
        classId: params.classId,
        status: EnrollmentStatus.ACTIVE,
        student: {
          status: StudentStatus.ACTIVE,
        },
      },
    })
  }
}

