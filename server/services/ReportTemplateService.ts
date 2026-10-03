import fs from "fs"
import path from "path"
import crypto from "crypto"
import { prisma } from "@/lib/prisma"
import { AuditService } from "./AuditService"

export type ReportHeaderLayout = "CLASSIC_CENTERED" | "MODERN_SPLIT" | "MINIMAL_BANNER"
export type ReportAccentColor = "slate" | "navy" | "emerald" | "burgundy" | "indigo" | "amber"

export interface ReportTemplateConfig {
  // 1. Branding & Header
  headerLayout: ReportHeaderLayout
  accentColor: ReportAccentColor
  reportTitle: string
  showSchoolCrest: boolean
  showSchoolMotto: boolean
  showSchoolCode: boolean
  showContactDetails: boolean

  // 2. Student & Academic Info
  showStudentPhoto: boolean
  showRollNumber: boolean
  showGender: boolean
  showDateOfBirth: boolean
  showAttendanceMetrics: boolean
  showNextTermResumption: boolean

  // 3. Performance Summary Strip
  showClassPosition: boolean
  showOverallTotal: boolean
  showTermAverage: boolean
  showTermGpa: boolean

  // 4. Academic Subjects Table Columns
  showCaScore: boolean
  showExamScore: boolean
  showTotalScore: boolean
  showGrade: boolean
  showGradeInterpretation: boolean
  showSubjectPosition: boolean
  showTeacherRemarks: boolean

  // 5. Evaluation, Remarks & Notes
  showCharacterTraits: boolean
  showClassTeacherRemarks: boolean
  showHeadmasterRemarks: boolean
  customFooterNote: string

  // 6. Signatures & Security
  showFormTeacherSignature: boolean
  showHeadmasterSignature: boolean
  showQrVerificationSeal: boolean
}

export const DEFAULT_REPORT_TEMPLATE_CONFIG: ReportTemplateConfig = {
  headerLayout: "CLASSIC_CENTERED",
  accentColor: "slate",
  reportTitle: "Official Terminal Academic Report",
  showSchoolCrest: true,
  showSchoolMotto: true,
  showSchoolCode: true,
  showContactDetails: true,

  showStudentPhoto: true,
  showRollNumber: true,
  showGender: true,
  showDateOfBirth: true,
  showAttendanceMetrics: true,
  showNextTermResumption: true,

  showClassPosition: true,
  showOverallTotal: true,
  showTermAverage: true,
  showTermGpa: true,

  showCaScore: true,
  showExamScore: true,
  showTotalScore: true,
  showGrade: true,
  showGradeInterpretation: true,
  showSubjectPosition: true,
  showTeacherRemarks: true,

  showCharacterTraits: true,
  showClassTeacherRemarks: true,
  showHeadmasterRemarks: true,
  customFooterNote: "Promising performance. With continuous focus and discipline, greater academic heights will be achieved.",

  showFormTeacherSignature: true,
  showHeadmasterSignature: true,
  showQrVerificationSeal: true,
}

const SETTING_KEY = "REPORT_TEMPLATE_CONFIG"
const FALLBACK_FILE_PATH = path.join(process.cwd(), "data", "report-template-config.json")

function readFromFile(): Partial<ReportTemplateConfig> | null {
  try {
    if (fs.existsSync(FALLBACK_FILE_PATH)) {
      const content = fs.readFileSync(FALLBACK_FILE_PATH, "utf8")
      return JSON.parse(content)
    }
  } catch {
    // Ignore file read error
  }
  return null
}

function writeToFile(config: ReportTemplateConfig) {
  try {
    const dir = path.dirname(FALLBACK_FILE_PATH)
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }
    fs.writeFileSync(FALLBACK_FILE_PATH, JSON.stringify(config, null, 2), "utf8")
  } catch {
    // Ignore file write error
  }
}

export class ReportTemplateService {
  /**
   * Retrieves the current report template configuration, merging with defaults.
   */
  static async getTemplateConfig(): Promise<ReportTemplateConfig> {
    try {
      const rows: Array<{ value: string }> = await prisma.$queryRawUnsafe(
        "SELECT value FROM system_settings WHERE key = $1 LIMIT 1",
        SETTING_KEY
      )

      if (rows && rows.length > 0 && rows[0].value) {
        const parsed = JSON.parse(rows[0].value) as Partial<ReportTemplateConfig>
        return {
          ...DEFAULT_REPORT_TEMPLATE_CONFIG,
          ...parsed,
        }
      }
    } catch {
      // Fallback to local config file if db query encounters an issue
    }

    const fileConfig = readFromFile()
    if (fileConfig) {
      return {
        ...DEFAULT_REPORT_TEMPLATE_CONFIG,
        ...fileConfig,
      }
    }

    return { ...DEFAULT_REPORT_TEMPLATE_CONFIG }
  }

  /**
   * Updates and persists the report template configuration.
   */
  static async updateTemplateConfig(
    config: Partial<ReportTemplateConfig>,
    actorUserId?: string
  ): Promise<ReportTemplateConfig> {
    const current = await this.getTemplateConfig()
    const merged: ReportTemplateConfig = {
      ...current,
      ...config,
    }

    const jsonValue = JSON.stringify(merged)
    writeToFile(merged)

    try {
      const id = crypto.randomUUID()
      await prisma.$executeRawUnsafe(
        `INSERT INTO system_settings (id, key, value, description, category, updated_at)
         VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
         ON CONFLICT (key) DO UPDATE
         SET value = $3, updated_at = CURRENT_TIMESTAMP`,
        id,
        SETTING_KEY,
        jsonValue,
        "Official terminal report card layout and styling configuration",
        "ACADEMIC"
      )
    } catch (err) {
      console.warn("Could not write to system_settings table, fallback to file only:", err)
    }

    await AuditService.logAction({
      userId: actorUserId,
      action: "UPDATE_REPORT_TEMPLATE",
      entityType: "SystemSetting",
      entityId: SETTING_KEY,
      oldValues: current as unknown as Record<string, unknown>,
      newValues: merged as unknown as Record<string, unknown>,
    })

    return merged
  }

  /**
   * Resets template configuration to standard defaults.
   */
  static async resetTemplateConfig(actorUserId?: string): Promise<ReportTemplateConfig> {
    return this.updateTemplateConfig(DEFAULT_REPORT_TEMPLATE_CONFIG, actorUserId)
  }
}
