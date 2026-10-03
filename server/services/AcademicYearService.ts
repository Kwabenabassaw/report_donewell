import { prisma } from "@/lib/prisma"
import { AcademicYearStatus } from "@prisma/client"
import { AuditService } from "./AuditService"
import { AppError } from "@/lib/errors"

export interface CreateAcademicYearInput {
  name: string
  startDate: Date
  endDate: Date
  isCurrent?: boolean
  status?: AcademicYearStatus
}

export class AcademicYearService {
  /**
   * Creates a new academic year with date validation.
   */
  static async createAcademicYear(input: CreateAcademicYearInput, actorUserId?: string) {
    if (input.startDate >= input.endDate) {
      throw new AppError(
        "INVALID_ACADEMIC_YEAR",
        "Start date must be strictly before end date.",
        400
      )
    }

    return await prisma.$transaction(async (tx) => {
      // If marking as current, unset existing current years
      if (input.isCurrent) {
        await tx.academicYear.updateMany({
          where: { isCurrent: true },
          data: { isCurrent: false },
        })
      }

      const year = await tx.academicYear.create({
        data: {
          name: input.name,
          startDate: input.startDate,
          endDate: input.endDate,
          isCurrent: input.isCurrent ?? false,
          status: input.status ?? AcademicYearStatus.DRAFT,
        },
      })

      await AuditService.logAction({
        userId: actorUserId,
        action: "CREATE_ACADEMIC_YEAR",
        entityType: "AcademicYear",
        entityId: year.id,
        newValues: { name: year.name, isCurrent: year.isCurrent, status: year.status },
      })

      return year
    })
  }

  /**
   * Sets an academic year as the single active/current year.
   */
  static async setCurrentYear(yearId: string, actorUserId?: string) {
    return await prisma.$transaction(async (tx) => {
      const targetYear = await tx.academicYear.findUnique({
        where: { id: yearId },
      })

      if (!targetYear) {
        throw new AppError("NOT_FOUND", "The specified academic year does not exist.", 404)
      }

      // Deactivate all others
      await tx.academicYear.updateMany({
        where: { isCurrent: true, id: { not: yearId } },
        data: { isCurrent: false },
      })

      const updated = await tx.academicYear.update({
        where: { id: yearId },
        data: { isCurrent: true, status: AcademicYearStatus.ACTIVE },
      })

      await AuditService.logAction({
        userId: actorUserId,
        action: "SET_CURRENT_ACADEMIC_YEAR",
        entityType: "AcademicYear",
        entityId: yearId,
        oldValues: { isCurrent: targetYear.isCurrent, status: targetYear.status },
        newValues: { isCurrent: true, status: AcademicYearStatus.ACTIVE },
      })

      return updated
    })
  }

  /**
   * Retrieves the currently active academic year.
   */
  static async getCurrentYear() {
    return await prisma.academicYear.findFirst({
      where: { isCurrent: true },
      include: {
        terms: {
          orderBy: { termSequence: "asc" },
        },
      },
    })
  }

  /**
   * Lists all academic years.
   */
  static async listYears() {
    return await prisma.academicYear.findMany({
      orderBy: { startDate: "desc" },
      include: {
        terms: {
          orderBy: { termSequence: "asc" },
        },
        _count: {
          select: { terms: true, enrollments: true },
        },
      },
    })
  }

  /**
   * Updates an academic year.
   */
  static async updateAcademicYear(
    yearId: string,
    input: {
      name?: string
      startDate?: Date
      endDate?: Date
      status?: AcademicYearStatus
    },
    actorUserId?: string
  ) {
    const existing = await prisma.academicYear.findUnique({
      where: { id: yearId },
    })
    if (!existing) {
      throw new AppError("NOT_FOUND", "Academic year not found.", 404)
    }

    const startDate = input.startDate || existing.startDate
    const endDate = input.endDate || existing.endDate

    if (startDate >= endDate) {
      throw new AppError("INVALID_ACADEMIC_YEAR", "Start date must be strictly before end date.", 400)
    }

    const updated = await prisma.academicYear.update({
      where: { id: yearId },
      data: {
        ...(input.name ? { name: input.name } : {}),
        ...(input.startDate ? { startDate: input.startDate } : {}),
        ...(input.endDate ? { endDate: input.endDate } : {}),
        ...(input.status ? { status: input.status } : {}),
      },
    })

    await AuditService.logAction({
      userId: actorUserId,
      action: "UPDATE_ACADEMIC_YEAR",
      entityType: "AcademicYear",
      entityId: yearId,
      oldValues: { name: existing.name, startDate: existing.startDate, endDate: existing.endDate, status: existing.status },
      newValues: { name: updated.name, startDate: updated.startDate, endDate: updated.endDate, status: updated.status },
    })

    return updated
  }

  /**
   * Deletes an academic year if safe.
   */
  static async deleteAcademicYear(yearId: string, actorUserId?: string) {
    const existing = await prisma.academicYear.findUnique({
      where: { id: yearId },
      include: {
        terms: true,
        enrollments: true,
      },
    })
    if (!existing) {
      throw new AppError("NOT_FOUND", "Academic year not found.", 404)
    }

    if (existing.terms.length > 0 || existing.enrollments.length > 0) {
      throw new AppError(
        "CANNOT_DELETE",
        "Cannot delete academic year with existing terms or enrolled students. Please delete or migrate the associated terms first.",
        400
      )
    }

    await prisma.academicYear.delete({
      where: { id: yearId },
    })

    await AuditService.logAction({
      userId: actorUserId,
      action: "DELETE_ACADEMIC_YEAR",
      entityType: "AcademicYear",
      entityId: yearId,
      oldValues: { name: existing.name, isCurrent: existing.isCurrent },
    })
  }

  /**
   * Alias for getCurrentYear
   */
  static async getCurrentAcademicYear() {
    return this.getCurrentYear()
  }

  /**
   * Alias for listYears
   */
  static async listAcademicYears() {
    return this.listYears()
  }
}
