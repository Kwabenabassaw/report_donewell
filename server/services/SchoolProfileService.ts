import { prisma } from "@/lib/prisma"
import { AppError } from "@/lib/errors"
import { AuditService } from "./AuditService"

export interface UpdateSchoolProfileParams {
  schoolName?: string
  schoolCode?: string
  motto?: string
  postalAddress?: string
  email?: string
  phone?: string
  crestUrl?: string
  headmasterSignatureUrl?: string
}

export class SchoolProfileService {
  /**
   * Retrieves the current school profile (creates default if none exists).
   */
  static async getProfile() {
    let profile = await prisma.schoolProfile.findFirst()
    if (!profile) {
      profile = await prisma.schoolProfile.create({
        data: {
          schoolName: "St. Augustine Academy",
          schoolCode: "SAA-GH",
          motto: "Knowledge, Character, and Excellence",
          email: "admin@staugustine.edu",
          phone: "+233 20 123 4567",
        },
      })
    }
    return profile
  }

  /**
   * Updates the school profile.
   */
  static async updateProfile(params: UpdateSchoolProfileParams, actorId?: string) {
    const existing = await this.getProfile()

    const updated = await prisma.schoolProfile.update({
      where: { id: existing.id },
      data: params,
    })

    await AuditService.logAction({
      userId: actorId,
      action: "UPDATE_SCHOOL_PROFILE",
      entityType: "SchoolProfile",
      entityId: updated.id,
      oldValues: existing as unknown as Record<string, unknown>,
      newValues: updated as unknown as Record<string, unknown>,
    })

    return updated
  }
}
