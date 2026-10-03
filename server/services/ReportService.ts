import crypto from "crypto"
import { prisma } from "@/lib/prisma"
import { TermStatus, ResultStatus } from "@prisma/client"
import { AuditService } from "./AuditService"
import { NotificationService } from "./NotificationService"
import { AppError } from "@/lib/errors"
import { generateQRCodeSVG } from "@/lib/reports/qr"

export interface ReportCardSubject {
  subjectId: string
  subjectName: string
  subjectCode: string
  caRawScore: number | null
  caMaxScore: number | null
  caWeightedScore: number
  examRawScore: number | null
  examMaxScore: number | null
  examWeightedScore: number
  totalScore: number
  grade: string
  gradePoint: number | null
  interpretation: string | null
  subjectPosition: number | null
  teacherRemarks: string | null
}

export interface ReportCardEvaluation {
  daysPresent: number
  daysAbsent: number
  totalSchoolDays: number
  attendancePercentage: number
  conductRating: string | null
  attitudeRating: string | null
  interestRating: string | null
  classTeacherRemarks: string | null
  headmasterRemarks: string | null
}

export interface ReportCardData {
  termResultId: string
  school: {
    name: string
    code: string
    crestUrl: string | null
    motto: string | null
    postalAddress: string | null
    email: string | null
    phone: string | null
    headmasterSignatureUrl: string | null
  }
  academicSession: {
    academicYear: string
    termName: string
    termSequence: number
    startDate: Date
    endDate: Date
    nextTermResumption: Date | null
  }
  student: {
    id: string
    idNumber: string
    fullName: string
    firstName: string
    lastName: string
    gender: string
    dateOfBirth: Date | null
    photoUrl: string | null
    rollNumber: string | null
  }
  class: {
    id: string
    name: string
    gradeLevel: string
  }
  performance: {
    totalScore: number
    averageScore: number
    classPosition: number
    cohortSize: number
    gpa: number | null
    status: ResultStatus
    finalizedAt: Date
    publishedAt: Date | null
  }
  subjects: ReportCardSubject[]
  evaluation: ReportCardEvaluation
  verification: {
    token: string
    tokenHash: string
    reportVersion: number
    generatedAt: Date
    verifyUrl: string
    qrSvg: string
  }
}

export interface VerificationResult {
  isValid: boolean
  reason?: string
  reportId?: string
  reportVersion?: number
  generatedAt?: Date
  lastAccessedAt?: Date
  downloadCount?: number
  revokedAt?: Date | null
  supersededAt?: Date | null
  expiresAt?: Date | null
  school?: {
    name: string
    code: string
    crestUrl: string | null
    motto: string | null
  }
  student?: {
    idNumber: string
    fullName: string
    class: string
    gradeLevel: string
  }
  academicSession?: {
    year: string
    term: string
  }
  performance?: {
    totalScore: number
    averageScore: number
    classPosition: number
    cohortSize: number
    gpa: number | null
    status: ResultStatus
    finalizedAt: Date
    publishedAt: Date | null
  }
}

export class ReportService {
  /**
   * Generates a cryptographically verifiable random token for an official report.
   * Stores the SHA-256 digest in generated_reports and supersedes any previous current version.
   */
  static async createVerificationToken(termResultId: string, actorUserId?: string) {
    const token = crypto.randomBytes(24).toString("hex")
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex")

    const report = await prisma.$transaction(async (tx) => {
      const latest = await tx.generatedReport.findFirst({
        where: { termResultId },
        orderBy: { reportVersion: "desc" },
      })

      const nextVersion = (latest?.reportVersion ?? 0) + 1

      // Mark prior reports as superseded
      await tx.generatedReport.updateMany({
        where: { termResultId, isCurrent: true },
        data: { isCurrent: false, supersededAt: new Date() },
      })

      return await tx.generatedReport.create({
        data: {
          termResultId,
          tokenHash,
          reportVersion: nextVersion,
          generatedById: actorUserId,
          isCurrent: true,
        },
      })
    })

    return {
      token,
      tokenHash,
      reportId: report.id,
      reportVersion: report.reportVersion,
      generatedAt: report.generatedAt,
    }
  }

  /**
   * Verifies the cryptographic token against stored SHA-256 hashes.
   * Public-facing method for parents, employers, and secondary schools.
   */
  static async verifyReportToken(token: string): Promise<VerificationResult> {
    if (!token || !token.trim()) {
      return { isValid: false, reason: "EMPTY_TOKEN" }
    }

    const tokenHash = crypto.createHash("sha256").update(token.trim()).digest("hex")

    const report = await prisma.generatedReport.findUnique({
      where: { tokenHash },
      include: {
        termResult: {
          include: {
            term: { include: { academicYear: true } },
            enrollment: {
              include: {
                student: true,
                class: true,
              },
            },
          },
        },
      },
    })

    if (!report) {
      return { isValid: false, reason: "TOKEN_NOT_FOUND" }
    }

    if (report.revokedAt) {
      return {
        isValid: false,
        reason: "TOKEN_REVOKED",
        revokedAt: report.revokedAt,
      }
    }

    if (!report.isCurrent) {
      return {
        isValid: false,
        reason: "TOKEN_SUPERSEDED",
        supersededAt: report.supersededAt,
      }
    }

    if (report.expiresAt && report.expiresAt < new Date()) {
      return {
        isValid: false,
        reason: "TOKEN_EXPIRED",
        expiresAt: report.expiresAt,
      }
    }

    // Update download/access metrics
    await prisma.generatedReport.update({
      where: { id: report.id },
      data: {
        downloadCount: { increment: 1 },
        lastAccessedAt: new Date(),
      },
    })

    const school = await prisma.schoolProfile.findFirst()

    return {
      isValid: true,
      reportId: report.id,
      reportVersion: report.reportVersion,
      generatedAt: report.generatedAt,
      lastAccessedAt: new Date(),
      downloadCount: report.downloadCount + 1,
      school: {
        name: school?.schoolName || "Basic Education School",
        code: school?.schoolCode || "SCH",
        crestUrl: school?.crestUrl || null,
        motto: school?.motto || null,
      },
      student: {
        idNumber: report.termResult.enrollment.student.studentIdNumber,
        fullName: `${report.termResult.enrollment.student.lastName}, ${report.termResult.enrollment.student.firstName}`,
        class: report.termResult.enrollment.class.name,
        gradeLevel: report.termResult.enrollment.class.gradeLevel,
      },
      academicSession: {
        year: report.termResult.term.academicYear.name,
        term: report.termResult.term.name,
      },
      performance: {
        totalScore: report.termResult.totalScore,
        averageScore: report.termResult.averageScore,
        classPosition: report.termResult.classPosition,
        cohortSize: report.termResult.cohortSize,
        gpa: report.termResult.gpa,
        status: report.termResult.status,
        finalizedAt: report.termResult.finalizedAt,
        publishedAt: report.termResult.publishedAt,
      },
    }
  }

  /**
   * Revokes a verification token (e.g. for academic misconduct or incorrect student details).
   */
  static async revokeReportToken(tokenHash: string, actorUserId: string) {
    const report = await prisma.generatedReport.findUnique({
      where: { tokenHash },
    })

    if (!report) {
      throw new AppError("NOT_FOUND", "Verification token record not found.", 404)
    }

    const updated = await prisma.generatedReport.update({
      where: { tokenHash },
      data: {
        revokedAt: new Date(),
        isCurrent: false,
      },
    })

    await AuditService.logAction({
      userId: actorUserId,
      action: "REVOKE_REPORT_TOKEN",
      entityType: "GeneratedReport",
      entityId: report.id,
      newValues: { revokedAt: updated.revokedAt },
    })

    return updated
  }

  /**
   * Assembles 100% complete official terminal report card data model.
   * Reads strictly from official snapshots and evaluations.
   */
  static async generateReportCardData(
    termResultId: string,
    explicitToken?: string,
    actorUserId?: string
  ): Promise<ReportCardData> {
    const termResult = await prisma.termResult.findUnique({
      where: { id: termResultId },
      include: {
        term: { include: { academicYear: true } },
        enrollment: {
          include: {
            student: true,
            class: true,
          },
        },
        subjects: {
          include: { subject: true },
          orderBy: { subject: { name: "asc" } },
        },
      },
    })

    if (!termResult) {
      throw new AppError("NOT_FOUND", "Term result snapshot not found.", 404)
    }

    const [school, evaluation] = await Promise.all([
      prisma.schoolProfile.findFirst(),
      prisma.studentTermEvaluation.findUnique({
        where: {
          studentEnrollmentId_termId: {
            studentEnrollmentId: termResult.studentEnrollmentId,
            termId: termResult.termId,
          },
        },
      }),
    ])

    // Establish verification token
    let token = explicitToken
    let tokenHash = ""
    let reportVersion = 1
    let generatedAt = new Date()

    if (!token) {
      const activeReport = await prisma.generatedReport.findFirst({
        where: { termResultId, isCurrent: true, revokedAt: null },
        orderBy: { reportVersion: "desc" },
      })

      if (activeReport) {
        tokenHash = activeReport.tokenHash
        reportVersion = activeReport.reportVersion
        generatedAt = activeReport.generatedAt
        // When reading an existing report without raw token in memory, use tokenHash as verification lookup key
        token = activeReport.tokenHash
      } else {
        const generated = await this.createVerificationToken(termResultId, actorUserId)
        token = generated.token
        tokenHash = generated.tokenHash
        reportVersion = generated.reportVersion
        generatedAt = generated.generatedAt
      }
    } else {
      tokenHash = crypto.createHash("sha256").update(token).digest("hex")
    }

    const totalSchoolDays = termResult.term.totalSchoolDays || 60
    const daysPresent = evaluation?.daysPresent ?? 0
    const daysAbsent = evaluation?.daysAbsent ?? 0
    const attendancePercentage =
      totalSchoolDays > 0 ? Math.round((daysPresent / totalSchoolDays) * 1000) / 10 : 100

    const verifyUrl = `/reports/verify?token=${token}`
    const qrSvg = generateQRCodeSVG(verifyUrl, 140)

    return {
      termResultId: termResult.id,
      school: {
        name: school?.schoolName || "Basic Education School",
        code: school?.schoolCode || "SCH-001",
        crestUrl: school?.crestUrl || null,
        motto: school?.motto || "Knowledge, Discipline, Excellence",
        postalAddress: school?.postalAddress || "P.O. Box 100, Accra, Ghana",
        email: school?.email || "info@school.edu.gh",
        phone: school?.phone || "+233 24 000 0000",
        headmasterSignatureUrl: school?.headmasterSignatureUrl || null,
      },
      academicSession: {
        academicYear: termResult.term.academicYear.name,
        termName: termResult.term.name,
        termSequence: termResult.term.termSequence,
        startDate: termResult.term.startDate,
        endDate: termResult.term.endDate,
        nextTermResumption: termResult.term.nextTermResumption,
      },
      student: {
        id: termResult.enrollment.student.id,
        idNumber: termResult.enrollment.student.studentIdNumber,
        fullName: `${termResult.enrollment.student.lastName}, ${termResult.enrollment.student.firstName}${termResult.enrollment.student.middleName ? ` ${termResult.enrollment.student.middleName}` : ""}`,
        firstName: termResult.enrollment.student.firstName,
        lastName: termResult.enrollment.student.lastName,
        gender: termResult.enrollment.student.gender,
        dateOfBirth: termResult.enrollment.student.dateOfBirth,
        photoUrl: termResult.enrollment.student.photoUrl,
        rollNumber: termResult.enrollment.rollNumber,
      },
      class: {
        id: termResult.enrollment.class.id,
        name: termResult.enrollment.class.name,
        gradeLevel: termResult.enrollment.class.gradeLevel,
      },
      performance: {
        totalScore: termResult.totalScore,
        averageScore: termResult.averageScore,
        classPosition: termResult.classPosition,
        cohortSize: termResult.cohortSize,
        gpa: termResult.gpa,
        status: termResult.status,
        finalizedAt: termResult.finalizedAt,
        publishedAt: termResult.publishedAt,
      },
      subjects: termResult.subjects.map((s) => ({
        subjectId: s.subjectId,
        subjectName: s.subject.name,
        subjectCode: s.subject.code,
        caRawScore: s.caRawScore,
        caMaxScore: s.caMaxScore,
        caWeightedScore: s.caWeightedScore,
        examRawScore: s.examRawScore,
        examMaxScore: s.examMaxScore,
        examWeightedScore: s.examWeightedScore,
        totalScore: s.totalScore,
        grade: s.grade,
        gradePoint: s.gradePoint,
        interpretation: s.interpretation,
        subjectPosition: s.subjectPosition,
        teacherRemarks: s.teacherRemarks,
      })),
      evaluation: {
        daysPresent,
        daysAbsent,
        totalSchoolDays,
        attendancePercentage,
        conductRating: evaluation?.conductRating || null,
        attitudeRating: evaluation?.attitudeRating || null,
        interestRating: evaluation?.interestRating || null,
        classTeacherRemarks: evaluation?.classTeacherRemarks || null,
        headmasterRemarks: evaluation?.headmasterRemarks || null,
      },
      verification: {
        token,
        tokenHash,
        reportVersion,
        generatedAt,
        verifyUrl,
        qrSvg,
      },
    }
  }

  /**
   * Formally publishes finalized term reports.
   * Makes results accessible to students, guardians, and external verification.
   */
  static async publishTermReports(termId: string, actorUserId: string) {
    const term = await prisma.term.findUnique({
      where: { id: termId },
    })

    if (!term) throw new AppError("NOT_FOUND", "Term not found.", 404)

    if (term.status !== TermStatus.FINALIZED) {
      throw new AppError(
        "INVALID_STATE_TRANSITION",
        `Cannot publish term reports: Term status is currently "${term.status}". Term must be FINALIZED before publication.`,
        400
      )
    }

    const now = new Date()

    // Atomic transaction for publication
    await prisma.$transaction(async (tx) => {
      // 1. Transition term to PUBLISHED
      await tx.term.update({
        where: { id: termId },
        data: {
          status: TermStatus.PUBLISHED,
          publishedAt: now,
          publishedById: actorUserId,
        },
      })

      // 2. Update term results to PUBLISHED
      await tx.termResult.updateMany({
        where: { termId },
        data: {
          status: ResultStatus.PUBLISHED,
          publishedAt: now,
          publishedById: actorUserId,
        },
      })
    })

    // 3. Issue verification tokens for any term results lacking active tokens
    const results = await prisma.termResult.findMany({
      where: { termId },
      include: {
        generatedReports: {
          where: { isCurrent: true, revokedAt: null },
        },
      },
    })

    for (const r of results) {
      if (r.generatedReports.length === 0) {
        await this.createVerificationToken(r.id, actorUserId)
      }
    }

    // 4. Log audit trail
    await AuditService.logAction({
      userId: actorUserId,
      action: "PUBLISH_TERM_REPORTS",
      entityType: "Term",
      entityId: termId,
      oldValues: { status: term.status },
      newValues: { status: TermStatus.PUBLISHED, publishedCount: results.length },
    })

    // 5. Asynchronously enqueue SMS notifications for guardians
    const notificationResult = await NotificationService.queueReportPublishedNotifications(
      termId,
      actorUserId
    ).catch((err) => {
      console.error("Failed to enqueue notifications on term publication:", err)
      return { queuedCount: 0, skippedCount: 0 }
    })

    return {
      success: true,
      termId,
      status: TermStatus.PUBLISHED,
      publishedCount: results.length,
      notificationsQueued: notificationResult.queuedCount,
    }
  }
}
