import { prisma } from "@/lib/prisma"
import { AuditService } from "./AuditService"
import { AppError } from "@/lib/errors"

export interface SaveEvaluationInput {
  studentEnrollmentId: string
  termId: string
  daysPresent?: number
  daysAbsent?: number
  conductRating?: string
  attitudeRating?: string
  interestRating?: string
  classTeacherRemarks?: string
  headmasterRemarks?: string
}

export interface BatchSaveEvaluationsInput {
  termId: string
  classId: string
  evaluations: Array<{
    studentEnrollmentId: string
    daysPresent?: number
    daysAbsent?: number
    conductRating?: string
    attitudeRating?: string
    interestRating?: string
    classTeacherRemarks?: string
    headmasterRemarks?: string
  }>
}

export class EvaluationService {
  /**
   * Upserts a student term evaluation record.
   */
  static async saveEvaluation(input: SaveEvaluationInput, actorUserId?: string) {
    const evaluation = await prisma.studentTermEvaluation.upsert({
      where: {
        studentEnrollmentId_termId: {
          studentEnrollmentId: input.studentEnrollmentId,
          termId: input.termId,
        },
      },
      update: {
        ...(input.daysPresent !== undefined && { daysPresent: input.daysPresent }),
        ...(input.daysAbsent !== undefined && { daysAbsent: input.daysAbsent }),
        ...(input.conductRating !== undefined && { conductRating: input.conductRating }),
        ...(input.attitudeRating !== undefined && { attitudeRating: input.attitudeRating }),
        ...(input.interestRating !== undefined && { interestRating: input.interestRating }),
        ...(input.classTeacherRemarks !== undefined && { classTeacherRemarks: input.classTeacherRemarks }),
        ...(input.headmasterRemarks !== undefined && { headmasterRemarks: input.headmasterRemarks }),
      },
      create: {
        studentEnrollmentId: input.studentEnrollmentId,
        termId: input.termId,
        daysPresent: input.daysPresent ?? 0,
        daysAbsent: input.daysAbsent ?? 0,
        conductRating: input.conductRating || null,
        attitudeRating: input.attitudeRating || null,
        interestRating: input.interestRating || null,
        classTeacherRemarks: input.classTeacherRemarks || null,
        headmasterRemarks: input.headmasterRemarks || null,
      },
      include: {
        enrollment: {
          include: { student: true, class: true },
        },
      },
    })

    await AuditService.logAction({
      userId: actorUserId,
      action: "SAVE_STUDENT_EVALUATION",
      entityType: "StudentTermEvaluation",
      entityId: evaluation.id,
      newValues: {
        studentIdNumber: evaluation.enrollment.student.studentIdNumber,
        termId: input.termId,
        conduct: input.conductRating,
        attitude: input.attitudeRating,
      },
    })

    return evaluation
  }

  /**
   * Batch updates student evaluations for an entire class.
   */
  static async batchSaveEvaluations(input: BatchSaveEvaluationsInput, actorUserId?: string) {
    return await prisma.$transaction(async (tx) => {
      let count = 0
      for (const item of input.evaluations) {
        await tx.studentTermEvaluation.upsert({
          where: {
            studentEnrollmentId_termId: {
              studentEnrollmentId: item.studentEnrollmentId,
              termId: input.termId,
            },
          },
          update: {
            daysPresent: item.daysPresent ?? 0,
            daysAbsent: item.daysAbsent ?? 0,
            conductRating: item.conductRating || null,
            attitudeRating: item.attitudeRating || null,
            interestRating: item.interestRating || null,
            classTeacherRemarks: item.classTeacherRemarks || null,
            ...(item.headmasterRemarks && { headmasterRemarks: item.headmasterRemarks }),
          },
          create: {
            studentEnrollmentId: item.studentEnrollmentId,
            termId: input.termId,
            daysPresent: item.daysPresent ?? 0,
            daysAbsent: item.daysAbsent ?? 0,
            conductRating: item.conductRating || null,
            attitudeRating: item.attitudeRating || null,
            interestRating: item.interestRating || null,
            classTeacherRemarks: item.classTeacherRemarks || null,
            headmasterRemarks: item.headmasterRemarks || null,
          },
        })
        count++
      }

      await AuditService.logAction({
        userId: actorUserId,
        action: "BATCH_SAVE_STUDENT_EVALUATIONS",
        entityType: "StudentTermEvaluation",
        entityId: `${input.termId}:${input.classId}`,
        newValues: {
          savedCount: count,
          termId: input.termId,
          classId: input.classId,
        },
      })

      return { savedCount: count }
    })
  }

  /**
   * Lists all student evaluations for a class in a specific term.
   */
  static async listClassEvaluations(termId: string, classId: string) {
    const term = await prisma.term.findUnique({
      where: { id: termId },
      include: { academicYear: true },
    })
    if (!term) throw new AppError("NOT_FOUND", "Term not found.", 404)

    const enrollments = await prisma.studentEnrollment.findMany({
      where: {
        academicYearId: term.academicYearId,
        classId,
        status: "ACTIVE",
      },
      include: {
        student: true,
        evaluations: {
          where: { termId },
        },
      },
      orderBy: [{ student: { lastName: "asc" } }, { student: { firstName: "asc" } }],
    })

    return enrollments.map((e) => ({
      enrollmentId: e.id,
      studentIdNumber: e.student.studentIdNumber,
      studentName: `${e.student.lastName}, ${e.student.firstName}`,
      rollNumber: e.rollNumber,
      evaluation: e.evaluations[0] || null,
    }))
  }

  /**
   * Retrieves single student evaluation.
   */
  static async getStudentEvaluation(studentEnrollmentId: string, termId: string) {
    return await prisma.studentTermEvaluation.findUnique({
      where: {
        studentEnrollmentId_termId: {
          studentEnrollmentId,
          termId,
        },
      },
      include: {
        enrollment: {
          include: { student: true, class: true },
        },
      },
    })
  }
}
