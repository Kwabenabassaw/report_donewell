import { prisma } from "@/lib/prisma"
import { AuditService } from "./AuditService"

export class SystemSettingService {
  /**
   * Retrieves a setting value from school profile or system defaults.
   */
  static async getSetting(key: string, defaultValue = ""): Promise<string> {
    const profile = await prisma.schoolProfile.findFirst()
    if (!profile) return defaultValue

    const settingsMap: Record<string, string | null | undefined> = {
      SCHOOL_NAME: profile.schoolName,
      SCHOOL_CODE: profile.schoolCode,
      MOTTO: profile.motto,
      POSTAL_ADDRESS: profile.postalAddress,
      EMAIL: profile.email,
      PHONE: profile.phone,
      CREST_URL: profile.crestUrl,
      HEADMASTER_SIGNATURE_URL: profile.headmasterSignatureUrl,
    }

    return settingsMap[key] ?? defaultValue
  }

  /**
   * Retrieves all core school settings.
   */
  static async getAllSettings() {
    const profile = await prisma.schoolProfile.findFirst()
    if (!profile) return []

    return [
      { key: "SCHOOL_NAME", value: profile.schoolName, category: "GENERAL", description: "Official School Name" },
      { key: "SCHOOL_CODE", value: profile.schoolCode, category: "GENERAL", description: "Unique School Identifier" },
      { key: "MOTTO", value: profile.motto || "", category: "GENERAL", description: "School Motto" },
      { key: "EMAIL", value: profile.email || "", category: "GENERAL", description: "Contact Email" },
      { key: "PHONE", value: profile.phone || "", category: "GENERAL", description: "Contact Phone" },
      { key: "POSTAL_ADDRESS", value: profile.postalAddress || "", category: "GENERAL", description: "Postal Address" },
    ]
  }

  /**
   * Updates a school setting.
   */
  static async setSetting(key: string, value: string, actorId?: string) {
    let profile = await prisma.schoolProfile.findFirst()
    if (!profile) {
      profile = await prisma.schoolProfile.create({
        data: {
          schoolName: "St. Augustine Academy",
          schoolCode: "SAA-GH",
        },
      })
    }

    const fieldMap: Record<string, keyof typeof profile> = {
      SCHOOL_NAME: "schoolName",
      SCHOOL_CODE: "schoolCode",
      MOTTO: "motto",
      POSTAL_ADDRESS: "postalAddress",
      EMAIL: "email",
      PHONE: "phone",
      CREST_URL: "crestUrl",
      HEADMASTER_SIGNATURE_URL: "headmasterSignatureUrl",
    }

    const field = fieldMap[key]
    if (field) {
      const updated = await prisma.schoolProfile.update({
        where: { id: profile.id },
        data: { [field]: value },
      })

      await AuditService.logAction({
        userId: actorId,
        action: "UPDATE_SYSTEM_SETTING",
        entityType: "SchoolProfile",
        entityId: profile.id,
        newValues: { [key]: value },
      })

      return updated
    }

    return profile
  }
}
