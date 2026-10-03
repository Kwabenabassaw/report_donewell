import { prisma } from "@/lib/prisma"
import { RankingMethod } from "@prisma/client"
import { AuditService } from "./AuditService"
import { AppError } from "@/lib/errors"

export interface GradingComponentInput {
  name: string
  code: string
  weight: number
  componentType?: string
  sortOrder?: number
  categories?: Array<{
    name: string
    isSummative?: boolean
  }>
}

export interface GradeBandInput {
  grade: string
  minimumScore: number
  maximumScore: number
  gradePoint: number
  interpretation: string
  sortOrder?: number
}

export interface CreateGradingPolicyInput {
  name: string
  academicYearId?: string
  rankingMethod?: RankingMethod
  components: GradingComponentInput[]
  gradeBands: GradeBandInput[]
}

export interface UpdateGradingPolicyInput {
  name?: string
  academicYearId?: string | null
  rankingMethod?: RankingMethod
  caWeight?: number
  examWeight?: number
}


export class GradingPolicyService {
  /**
   * Validates that component weights sum strictly to 100%.
   */
  static validatePolicyComponents(components: GradingComponentInput[]) {
    if (!components || components.length === 0) {
      throw new AppError(
        "INVALID_GRADING_POLICY",
        "A grading policy must contain at least one grading component.",
        400
      )
    }

    const totalWeight = components.reduce((sum, c) => sum + c.weight, 0)
    if (Math.abs(totalWeight - 100.0) > 0.001) {
      throw new AppError(
        "INVALID_GRADING_POLICY",
        `Grading component weights must sum strictly to 100%. Current sum: ${totalWeight}%.`,
        400
      )
    }

    const codes = new Set<string>()
    for (const comp of components) {
      if (!comp.name.trim() || !comp.code.trim()) {
        throw new AppError(
          "INVALID_GRADING_POLICY",
          "Component name and code are required.",
          400
        )
      }
      const upperCode = comp.code.trim().toUpperCase()
      if (codes.has(upperCode)) {
        throw new AppError(
          "INVALID_GRADING_POLICY",
          `Duplicate component code "${upperCode}". Codes must be unique within a policy.`,
          400
        )
      }
      codes.add(upperCode)

      if (comp.weight <= 0 || comp.weight > 100) {
        throw new AppError(
          "INVALID_GRADING_POLICY",
          `Component weight for "${comp.name}" must be greater than 0 and at most 100.`,
          400
        )
      }
    }
  }

  /**
   * Validates non-overlapping grade bands and boundary ranges.
   */
  static validateGradeBands(bands: GradeBandInput[]) {
    if (!bands || bands.length === 0) {
      throw new AppError(
        "INVALID_GRADE_BANDS",
        "A grading policy must define at least one grade band.",
        400
      )
    }

    for (const b of bands) {
      if (b.minimumScore < 0 || b.maximumScore > 100) {
        throw new AppError(
          "INVALID_GRADE_BANDS",
          `Score boundaries for grade "${b.grade}" must be within 0 and 100. Got [${b.minimumScore}, ${b.maximumScore}].`,
          400
        )
      }
      if (b.minimumScore > b.maximumScore) {
        throw new AppError(
          "INVALID_GRADE_BANDS",
          `Minimum score (${b.minimumScore}) cannot exceed maximum score (${b.maximumScore}) for grade "${b.grade}".`,
          400
        )
      }
    }

    // Sort by minimumScore ascending
    const sorted = [...bands].sort((a, b) => a.minimumScore - b.minimumScore)

    for (let i = 0; i < sorted.length - 1; i++) {
      const current = sorted[i]
      const next = sorted[i + 1]

      // Overlap occurs if current.maximumScore >= next.minimumScore
      if (current.maximumScore >= next.minimumScore) {
        throw new AppError(
          "INVALID_GRADE_BANDS",
          `Overlapping grade bands detected between "${current.grade}" [${current.minimumScore}-${current.maximumScore}] and "${next.grade}" [${next.minimumScore}-${next.maximumScore}].`,
          400
        )
      }
    }
  }

  /**
   * Creates a complete grading policy with components, categories, and grade bands.
   */
  static async createPolicy(input: CreateGradingPolicyInput, actorUserId?: string) {
    this.validatePolicyComponents(input.components)
    this.validateGradeBands(input.gradeBands)

    return await prisma.$transaction(async (tx) => {
      const policy = await tx.gradingPolicy.create({
        data: {
          name: input.name.trim(),
          academicYearId: input.academicYearId || null,
          rankingMethod: input.rankingMethod || RankingMethod.DENSE_RANK,
          status: "ACTIVE",
          version: 1,
        },
      })

      // Create Components and Categories
      for (let i = 0; i < input.components.length; i++) {
        const comp = input.components[i]
        const createdComp = await tx.gradingComponent.create({
          data: {
            gradingPolicyId: policy.id,
            name: comp.name.trim(),
            code: comp.code.trim().toUpperCase(),
            weight: comp.weight,
            componentType: comp.componentType || comp.code.toUpperCase(),
            sortOrder: comp.sortOrder ?? i + 1,
          },
        })

        // Create Default Categories
        const categories = comp.categories && comp.categories.length > 0
          ? comp.categories
          : comp.code.toUpperCase() === "CA"
          ? [
              { name: "Class Test", isSummative: false },
              { name: "Homework / Assignment", isSummative: false },
              { name: "Project / Practical", isSummative: false },
            ]
          : [{ name: "Terminal Examination", isSummative: true }]

        for (const cat of categories) {
          await tx.assessmentCategory.create({
            data: {
              componentId: createdComp.id,
              name: cat.name,
              isSummative: cat.isSummative ?? false,
            },
          })
        }
      }

      // Create Grade Bands
      for (let i = 0; i < input.gradeBands.length; i++) {
        const band = input.gradeBands[i]
        await tx.gradeBand.create({
          data: {
            gradingPolicyId: policy.id,
            grade: band.grade.trim(),
            minimumScore: band.minimumScore,
            maximumScore: band.maximumScore,
            gradePoint: band.gradePoint,
            interpretation: band.interpretation.trim(),
            sortOrder: band.sortOrder ?? i + 1,
          },
        })
      }

      await AuditService.logAction({
        userId: actorUserId,
        action: "CREATE_GRADING_POLICY",
        entityType: "GradingPolicy",
        entityId: policy.id,
        newValues: {
          name: policy.name,
          componentsCount: input.components.length,
          gradeBandsCount: input.gradeBands.length,
        },
      })

      return policy
    })
  }

  /**
   * Updates an existing grading policy's name, scope, ranking method, and weights.
   */
  static async updatePolicy(
    policyId: string,
    input: UpdateGradingPolicyInput,
    actorUserId?: string
  ) {
    const existing = await prisma.gradingPolicy.findUnique({
      where: { id: policyId },
      include: {
        components: true,
      },
    })

    if (!existing) {
      throw new AppError("NOT_FOUND", "Grading policy not found.", 404)
    }

    if (input.caWeight !== undefined && input.examWeight !== undefined) {
      if (input.caWeight <= 0 || input.examWeight <= 0) {
        throw new AppError("INVALID_GRADING_POLICY", "Weights must be greater than 0.", 400)
      }
      if (Math.abs(input.caWeight + input.examWeight - 100.0) > 0.001) {
        throw new AppError(
          "INVALID_GRADING_POLICY",
          `Component weights must sum strictly to 100%. Provided: ${input.caWeight + input.examWeight}%.`,
          400
        )
      }
    }

    return await prisma.$transaction(async (tx) => {
      // 1. Update policy metadata and bump version
      const updatedPolicy = await tx.gradingPolicy.update({
        where: { id: policyId },
        data: {
          name: input.name ? input.name.trim() : undefined,
          academicYearId: input.academicYearId !== undefined ? input.academicYearId : undefined,
          rankingMethod: input.rankingMethod || undefined,
          version: existing.version + 1,
        },
      })

      // 2. Update component weights if provided
      if (input.caWeight !== undefined || input.examWeight !== undefined) {
        for (const comp of existing.components) {
          if (comp.code === "CA" && input.caWeight !== undefined) {
            await tx.gradingComponent.update({
              where: { id: comp.id },
              data: { weight: input.caWeight },
            })
          } else if (comp.code === "EXAM" && input.examWeight !== undefined) {
            await tx.gradingComponent.update({
              where: { id: comp.id },
              data: { weight: input.examWeight },
            })
          }
        }
      }

      await AuditService.logAction({
        userId: actorUserId,
        action: "UPDATE_GRADING_POLICY",
        entityType: "GradingPolicy",
        entityId: policyId,
        oldValues: {
          name: existing.name,
          rankingMethod: existing.rankingMethod,
          version: existing.version,
        },
        newValues: {
          name: updatedPolicy.name,
          rankingMethod: updatedPolicy.rankingMethod,
          version: updatedPolicy.version,
          caWeight: input.caWeight,
          examWeight: input.examWeight,
        },
      })

      return updatedPolicy
    })
  }

  /**
   * Retrieves active grading policy for an academic year (or global active policy).
   */
  static async getActivePolicy(academicYearId?: string) {
    if (academicYearId) {
      const yearPolicy = await prisma.gradingPolicy.findFirst({
        where: {
          academicYearId,
          status: "ACTIVE",
        },
        include: {
          components: {
            include: { categories: true },
            orderBy: { sortOrder: "asc" },
          },
          gradeBands: {
            orderBy: { minimumScore: "asc" },
          },
        },
      })
      if (yearPolicy) return yearPolicy
    }

    return await prisma.gradingPolicy.findFirst({
      where: { status: "ACTIVE" },
      include: {
        components: {
          include: { categories: true },
          orderBy: { sortOrder: "asc" },
        },
        gradeBands: {
          orderBy: { minimumScore: "asc" },
        },
      },
      orderBy: { createdAt: "desc" },
    })
  }

  /**
   * Lists all policies with components and grade bands.
   */
  static async listPolicies(academicYearId?: string) {
    return await prisma.gradingPolicy.findMany({
      where: {
        ...(academicYearId && { academicYearId }),
      },
      include: {
        academicYear: true,
        components: {
          include: { categories: true },
          orderBy: { sortOrder: "asc" },
        },
        gradeBands: {
          orderBy: { minimumScore: "asc" },
        },
      },
      orderBy: { createdAt: "desc" },
    })
  }

  /**
   * Maps a calculated composite numerical score to the correct grade band.
   */
  static getGradeBandForScore(score: number, gradeBands: Array<{
    grade: string
    minimumScore: number
    maximumScore: number
    gradePoint: number
    interpretation: string
  }>) {
    // Find matching band where minimumScore <= score <= maximumScore
    const matched = gradeBands.find(
      (b) => score >= b.minimumScore && score <= b.maximumScore
    )

    if (matched) return matched

    // Fallback for edge cases
    if (score >= 100) return gradeBands[gradeBands.length - 1]
    return gradeBands[0]
  }

  /**
   * Activates a grading policy and archives previous active policies.
   */
  static async activatePolicy(policyId: string, actorUserId?: string) {
    const policy = await prisma.gradingPolicy.findUnique({
      where: { id: policyId },
    })

    if (!policy) {
      throw new AppError("NOT_FOUND", "Grading policy not found.", 404)
    }

    return await prisma.$transaction(async (tx) => {
      // Archive other policies for the same academic year scope
      await tx.gradingPolicy.updateMany({
        where: {
          academicYearId: policy.academicYearId,
          id: { not: policyId },
          status: "ACTIVE",
        },
        data: { status: "ARCHIVED" },
      })

      const updated = await tx.gradingPolicy.update({
        where: { id: policyId },
        data: { status: "ACTIVE" },
      })

      await AuditService.logAction({
        userId: actorUserId,
        action: "ACTIVATE_GRADING_POLICY",
        entityType: "GradingPolicy",
        entityId: policyId,
        newValues: { name: policy.name, status: "ACTIVE" },
      })

      return updated
    })
  }

  /**
   * Safely deletes an inactive or draft grading policy.
   */
  static async deletePolicy(policyId: string, actorUserId?: string) {
    const policy = await prisma.gradingPolicy.findUnique({
      where: { id: policyId },
      include: { components: true },
    })

    if (!policy) {
      throw new AppError("NOT_FOUND", "Grading policy not found.", 404)
    }

    // Check if this policy has any child components with active assessments
    const componentIds = policy.components.map((c) => c.id)
    const categoryCount = await prisma.assessmentCategory.count({
      where: {
        componentId: { in: componentIds },
        assessments: { some: {} },
      },
    })

    if (categoryCount > 0) {
      throw new AppError(
        "CANNOT_DELETE",
        "Cannot delete grading policy linked to active class assessments. Archive it instead.",
        400
      )
    }

    return await prisma.$transaction(async (tx) => {
      // Delete categories, components, gradeBands, then policy
      for (const compId of componentIds) {
        await tx.assessmentCategory.deleteMany({ where: { componentId: compId } })
      }
      await tx.gradingComponent.deleteMany({ where: { gradingPolicyId: policyId } })
      await tx.gradeBand.deleteMany({ where: { gradingPolicyId: policyId } })
      const deleted = await tx.gradingPolicy.delete({ where: { id: policyId } })

      await AuditService.logAction({
        userId: actorUserId,
        action: "DELETE_GRADING_POLICY",
        entityType: "GradingPolicy",
        entityId: policyId,
        oldValues: { name: policy.name },
      })

      return deleted
    })
  }
}
