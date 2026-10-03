import { prisma } from "@/lib/prisma"
import { AssessmentStatus, MarkCompletionStatus, TermStatus } from "@prisma/client"
import { AuditService } from "./AuditService"
import { AppError } from "@/lib/errors"

export interface CsvStudentRecord {
  studentIdNumber: string
  firstName: string
  middleName?: string
  lastName: string
  gender: string
  dateOfBirth?: string
  className: string
  guardianName?: string
  guardianPhone?: string
  guardianRelationship?: string
}

export interface CsvScoreRecord {
  studentIdNumber: string
  score?: number | null
  status?: MarkCompletionStatus
}

export interface ValidationErrorItem {
  code: string
  message: string
}

export interface StudentValidationResult {
  valid: boolean
  records: Array<{
    row: number
    data: CsvStudentRecord
    errors: ValidationErrorItem[]
  }>
  totalRecords: number
  validRecordsCount: number
  invalidRecordsCount: number
}

export interface ScoreValidationResult {
  valid: boolean
  assessment: {
    id: string
    title: string
    maxScore: number
    className: string
    subjectName: string
    termName: string
  } | null
  records: Array<{
    row: number
    data: CsvScoreRecord
    studentName?: string
    enrollmentId?: string
    errors: ValidationErrorItem[]
  }>
  totalRecords: number
  validRecordsCount: number
  invalidRecordsCount: number
}

export class ImportService {
  // ==========================================
  // 1. STUDENT COHORT CSV OPERATIONS
  // ==========================================

  /**
   * Parses CSV string into structured student rows.
   */
  static parseStudentCsv(csvContent: string): CsvStudentRecord[] {
    const lines = csvContent
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l.length > 0)

    if (lines.length <= 1) return []

    const header = lines[0].split(",").map((h) => h.trim().toLowerCase().replace(/['"]/g, ""))
    const records: CsvStudentRecord[] = []

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(",").map((v) => v.trim().replace(/^["']|["']$/g, ""))
      if (values.length < 3) continue // Skip malformed or empty line

      const rowMap: Record<string, string> = {}
      header.forEach((h, idx) => {
        rowMap[h] = values[idx] || ""
      })

      const getField = (keys: string[], fallbackIdx?: number): string => {
        for (const k of keys) {
          if (k in rowMap) return rowMap[k]
        }
        return fallbackIdx !== undefined && values[fallbackIdx] !== undefined ? values[fallbackIdx] : ""
      }

      records.push({
        studentIdNumber: getField(["student_id", "student_id_number", "id_number", "id"], 0),
        firstName: getField(["first_name", "firstname"], 1),
        middleName: getField(["middle_name", "middlename"]) || undefined,
        lastName: getField(["last_name", "lastname"], 2),
        gender: (getField(["gender"], 3) || "MALE").toUpperCase(),
        dateOfBirth: getField(["dob", "date_of_birth"]) || undefined,
        className: getField(["class", "class_name"], 4),
        guardianName: getField(["guardian_name"]) || undefined,
        guardianPhone: getField(["guardian_phone"]) || undefined,
        guardianRelationship: getField(["guardian_relationship"]) || "Parent",
      })
    }

    return records
  }

  // Alias for backward compatibility
  static parseCsv(csvContent: string): CsvStudentRecord[] {
    return this.parseStudentCsv(csvContent)
  }

  /**
   * Validates parsed CSV records against database constraints with machine-readable error codes.
   */
  static async validateStudentCsv(
    records: CsvStudentRecord[],
    academicYearId: string
  ): Promise<StudentValidationResult> {
    const validatedRecords: StudentValidationResult["records"] = []
    let validCount = 0
    let invalidCount = 0

    // Cache classes in database
    const classes = await prisma.class.findMany()
    const classMap = new Map(classes.map((c) => [c.name.toLowerCase().trim(), c.id]))

    const seenIdsInBatch = new Set<string>()

    for (let i = 0; i < records.length; i++) {
      const rec = records[i]
      const errors: ValidationErrorItem[] = []
      const cleanId = (rec.studentIdNumber || "").trim()

      if (!cleanId) {
        errors.push({ code: "MISSING_STUDENT_ID", message: "Missing student ID number." })
      } else {
        if (seenIdsInBatch.has(cleanId.toLowerCase())) {
          errors.push({
            code: "DUPLICATE_CSV_ROW",
            message: `Duplicate student ID "${cleanId}" within this CSV file.`,
          })
        }
        seenIdsInBatch.add(cleanId.toLowerCase())
      }

      if (!rec.firstName?.trim() || !rec.lastName?.trim()) {
        errors.push({
          code: "MISSING_STUDENT_NAME",
          message: "First name and last name are required.",
        })
      }

      const gender = (rec.gender || "").toUpperCase().trim()
      if (!["MALE", "FEMALE"].includes(gender)) {
        errors.push({
          code: "INVALID_GENDER",
          message: "Gender must be 'MALE' or 'FEMALE'.",
        })
      }

      if (rec.className?.trim()) {
        const clsId = classMap.get(rec.className.toLowerCase().trim())
        if (!clsId) {
          errors.push({
            code: "CLASS_NOT_FOUND",
            message: `Class "${rec.className}" does not exist in academic structure.`,
          })
        }
      } else {
        errors.push({
          code: "CLASS_NOT_FOUND",
          message: "Class name is required for academic enrollment.",
        })
      }

      // Check duplicate student ID in DB
      if (cleanId) {
        const existingStudent = await prisma.student.findUnique({
          where: { studentIdNumber: cleanId },
          select: { id: true },
        })
        if (existingStudent) {
          // If student exists, check if already enrolled in this academic year
          const existingEnrollment = await prisma.studentEnrollment.findUnique({
            where: {
              studentId_academicYearId: {
                studentId: existingStudent.id,
                academicYearId,
              },
            },
          })
          if (existingEnrollment) {
            errors.push({
              code: "DUPLICATE_ENROLLMENT",
              message: "Student is already enrolled in this academic year.",
            })
          }
        }
      }

      if (errors.length === 0) {
        validCount++
      } else {
        invalidCount++
      }

      validatedRecords.push({
        row: i + 2, // Account for header row (1-indexed)
        data: rec,
        errors,
      })
    }

    return {
      valid: invalidCount === 0,
      records: validatedRecords,
      totalRecords: records.length,
      validRecordsCount: validCount,
      invalidRecordsCount: invalidCount,
    }
  }

  // Alias for backward compatibility
  static async validateCsv(records: CsvStudentRecord[], academicYearId: string) {
    const res = await this.validateStudentCsv(records, academicYearId)
    return {
      ...res,
      records: res.records.map((r) => ({
        ...r,
        errors: r.errors.map((e) => e.message),
      })),
    }
  }

  /**
   * Imports valid student cohort records inside an atomic PostgreSQL transaction.
   * Rollbacks completely if any unhandled error occurs.
   */
  static async executeStudentImport(
    records: CsvStudentRecord[],
    academicYearId: string,
    actorUserId?: string
  ) {
    // 1. Pre-validate entire batch
    const validation = await this.validateStudentCsv(records, academicYearId)
    if (!validation.valid) {
      const firstError = validation.records.find((r) => r.errors.length > 0)
      throw new AppError(
        "VALIDATION_FAILED",
        `[${firstError?.errors[0]?.code || "VALIDATION_FAILED"}] Row ${firstError?.row}: ${firstError?.errors[0]?.message || "Validation failed."}`,
        400
      )
    }

    const classes = await prisma.class.findMany()
    const classMap = new Map(classes.map((c) => [c.name.toLowerCase().trim(), c.id]))

    return await prisma.$transaction(
      async (tx) => {
        let importedStudents = 0
        let importedEnrollments = 0

        for (const rec of records) {
          const classId = classMap.get(rec.className.toLowerCase().trim())
          if (!classId) continue

          // 1. Upsert Student
          let student = await tx.student.findUnique({
            where: { studentIdNumber: rec.studentIdNumber.trim() },
          })

          let parsedDob: Date | null = null
          if (rec.dateOfBirth && rec.dateOfBirth.trim()) {
            const d = new Date(rec.dateOfBirth.trim())
            if (!isNaN(d.getTime())) {
              parsedDob = d
            }
          }

          if (!student) {
            student = await tx.student.create({
              data: {
                studentIdNumber: rec.studentIdNumber.trim(),
                firstName: rec.firstName.trim(),
                middleName: rec.middleName?.trim() || null,
                lastName: rec.lastName.trim(),
                gender: rec.gender.trim().toUpperCase(),
                dateOfBirth: parsedDob,
              },
            })
            importedStudents++
          }

          // 2. Create Enrollment
          const enrollment = await tx.studentEnrollment.upsert({
            where: {
              studentId_academicYearId: {
                studentId: student.id,
                academicYearId,
              },
            },
            update: { classId },
            create: {
              studentId: student.id,
              academicYearId,
              classId,
            },
          })
          importedEnrollments++

          // Auto-enroll core subjects
          const coreSubjects = await tx.subject.findMany({
            where: { isElective: false, status: "ACTIVE" },
          })
          for (const subj of coreSubjects) {
            await tx.studentSubjectEnrollment.upsert({
              where: {
                studentEnrollmentId_subjectId: {
                  studentEnrollmentId: enrollment.id,
                  subjectId: subj.id,
                },
              },
              update: {},
              create: {
                studentEnrollmentId: enrollment.id,
                subjectId: subj.id,
              },
            })
          }

          // 3. Add Guardian if provided
          if (rec.guardianPhone?.trim() && rec.guardianName?.trim()) {
            let guardian = await tx.guardian.findFirst({
              where: { phone: rec.guardianPhone.trim() },
            })
            if (!guardian) {
              guardian = await tx.guardian.create({
                data: {
                  name: rec.guardianName.trim(),
                  phone: rec.guardianPhone.trim(),
                  relationship: rec.guardianRelationship || "Parent",
                },
              })
            }

            await tx.studentGuardian.upsert({
              where: {
                studentId_guardianId: {
                  studentId: student.id,
                  guardianId: guardian.id,
                },
              },
              update: {},
              create: {
                studentId: student.id,
                guardianId: guardian.id,
                isPrimary: true,
              },
            })
          }
        }

        await AuditService.logAction({
          userId: actorUserId,
          action: "IMPORT_CSV_STUDENTS",
          entityType: "StudentEnrollment",
          entityId: academicYearId,
          newValues: {
            importedStudents,
            importedEnrollments,
          },
        })

        return {
          importedStudents,
          importedEnrollments,
        }
      },
      { timeout: 30000 }
    )
  }

  // Alias for backward compatibility
  static async executeImport(records: CsvStudentRecord[], academicYearId: string, actorUserId?: string) {
    return this.executeStudentImport(records, academicYearId, actorUserId)
  }

  /**
   * Generates sample student CSV template string.
   */
  static generateStudentTemplate(): string {
    return `student_id,first_name,middle_name,last_name,gender,dob,class,guardian_name,guardian_phone,guardian_relationship
STU-2026-001,Kwame,Kofi,Mensah,MALE,2012-05-14,Basic 7A,Emmanuel Mensah,0244111222,Father
STU-2026-002,Ama,Akua,Asantewaa,FEMALE,2012-09-21,Basic 7A,Grace Mensah,0244333444,Mother
STU-2026-003,Kojo,,Boateng,MALE,2011-11-03,Basic 8B,Yaw Boateng,0209888777,Guardian`
  }

  // ==========================================
  // 2. ASSESSMENT MARKS BULK CSV OPERATIONS
  // ==========================================

  /**
   * Parses CSV string into structured assessment score rows.
   */
  static parseScoreCsv(csvContent: string): CsvScoreRecord[] {
    const lines = csvContent
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l.length > 0)

    if (lines.length <= 1) return []

    const header = lines[0].split(",").map((h) => h.trim().toLowerCase().replace(/['"]/g, ""))
    const records: CsvScoreRecord[] = []

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(",").map((v) => v.trim().replace(/^["']|["']$/g, ""))
      if (values.length < 2) continue

      const rowMap: Record<string, string> = {}
      header.forEach((h, idx) => {
        rowMap[h] = values[idx] || ""
      })

      const rawScoreStr = rowMap["score"] || rowMap["raw_score"] || rowMap["marks"] || values[2] || values[1] || ""
      const statusStr = (rowMap["status"] || values[3] || "COMPLETE").toUpperCase().trim()

      let score: number | null = null
      if (rawScoreStr !== "" && !isNaN(Number(rawScoreStr))) {
        score = parseFloat(rawScoreStr)
      }

      let status: MarkCompletionStatus = MarkCompletionStatus.COMPLETE
      if (Object.values(MarkCompletionStatus).includes(statusStr as MarkCompletionStatus)) {
        status = statusStr as MarkCompletionStatus
      }

      records.push({
        studentIdNumber:
          rowMap["student_id"] ||
          rowMap["student_id_number"] ||
          rowMap["id_number"] ||
          rowMap["id"] ||
          values[0] ||
          "",
        score,
        status,
      })
    }

    return records
  }

  /**
   * Validates parsed score CSV rows against assessment boundaries, max score, and student registrations.
   */
  static async validateScoreCsv(
    assessmentId: string,
    records: CsvScoreRecord[]
  ): Promise<ScoreValidationResult> {
    const assessment = await prisma.assessment.findUnique({
      where: { id: assessmentId },
      include: {
        class: true,
        subject: true,
        term: { include: { academicYear: true } },
      },
    })

    if (!assessment) {
      throw new AppError("NOT_FOUND", "Assessment not found.", 404)
    }

    const validatedRecords: ScoreValidationResult["records"] = []
    let validCount = 0
    let invalidCount = 0

    // Check term lock / finalization
    const term = assessment.term
    const isTermLocked = ([TermStatus.FINALIZED, TermStatus.PUBLISHED, TermStatus.CLOSED] as TermStatus[]).includes(term.status)

    // Check assessment locked
    const isAssessmentLocked = assessment.status === AssessmentStatus.LOCKED

    // Fetch enrolled students for this class who are registered for this subject
    const subjectRegistrations = await prisma.studentSubjectEnrollment.findMany({
      where: {
        subjectId: assessment.subjectId,
        enrollment: {
          classId: assessment.classId,
          academicYearId: term.academicYearId,
        },
      },
      include: {
        enrollment: {
          include: { student: true },
        },
      },
    })

    const studentMap = new Map(
      subjectRegistrations.map((sr) => [
        sr.enrollment.student.studentIdNumber.toLowerCase().trim(),
        {
          studentName: `${sr.enrollment.student.firstName} ${sr.enrollment.student.lastName}`.trim(),
          enrollmentId: sr.enrollment.id,
        },
      ])
    )

    const seenStudentIds = new Set<string>()

    for (let i = 0; i < records.length; i++) {
      const rec = records[i]
      const errors: ValidationErrorItem[] = []
      const cleanId = (rec.studentIdNumber || "").trim()

      if (!cleanId) {
        errors.push({ code: "MISSING_STUDENT_ID", message: "Student ID number is required." })
      } else {
        if (seenStudentIds.has(cleanId.toLowerCase())) {
          errors.push({
            code: "DUPLICATE_CSV_ROW",
            message: `Student ID "${cleanId}" appears multiple times in this CSV.`,
          })
        }
        seenStudentIds.add(cleanId.toLowerCase())
      }

      // Check assessment status
      if (isAssessmentLocked) {
        errors.push({
          code: "ASSESSMENT_LOCKED",
          message: `Assessment is LOCKED. Score modifications are strictly prohibited.`,
        })
      }

      // Check term status
      if (isTermLocked) {
        errors.push({
          code: "TERM_FINALIZED",
          message: `Term is ${term.status}. Official marks are locked and immutable.`,
        })
      }

      // Student subject registration check
      const studentMatch = cleanId ? studentMap.get(cleanId.toLowerCase()) : null
      if (!studentMatch) {
        errors.push({
          code: "STUDENT_NOT_REGISTERED_FOR_SUBJECT",
          message: `Student "${cleanId}" is not enrolled in ${assessment.class.name} or not registered for ${assessment.subject.name}.`,
        })
      }

      // Score boundary checks
      if (rec.status === MarkCompletionStatus.COMPLETE) {
        if (rec.score === null || rec.score === undefined || isNaN(rec.score)) {
          errors.push({
            code: "MISSING_REQUIRED_SCORE",
            message: "Score value is required when status is COMPLETE.",
          })
        } else {
          if (rec.score < 0) {
            errors.push({
              code: "SCORE_BELOW_ZERO",
              message: `Score ${rec.score} is invalid: score cannot be negative.`,
            })
          }
          if (rec.score > assessment.maxScore) {
            errors.push({
              code: "SCORE_EXCEEDS_MAX",
              message: `Score ${rec.score} exceeds assessment maximum allowed score (${assessment.maxScore}).`,
            })
          }
        }
      }

      if (errors.length === 0) {
        validCount++
      } else {
        invalidCount++
      }

      validatedRecords.push({
        row: i + 2,
        data: rec,
        studentName: studentMatch?.studentName,
        enrollmentId: studentMatch?.enrollmentId,
        errors,
      })
    }

    return {
      valid: invalidCount === 0 && !isAssessmentLocked && !isTermLocked,
      assessment: {
        id: assessment.id,
        title: assessment.title,
        maxScore: assessment.maxScore,
        className: assessment.class.name,
        subjectName: assessment.subject.name,
        termName: term.name,
      },
      records: validatedRecords,
      totalRecords: records.length,
      validRecordsCount: validCount,
      invalidRecordsCount: invalidCount,
    }
  }

  /**
   * Executes atomic bulk import of assessment scores.
   * Rejects entire batch if any row fails validation.
   */
  static async executeScoreImport(
    assessmentId: string,
    records: CsvScoreRecord[],
    actorUserId?: string
  ) {
    const validation = await this.validateScoreCsv(assessmentId, records)
    if (!validation.valid) {
      const firstError = validation.records.find((r) => r.errors.length > 0)
      throw new AppError(
        "VALIDATION_FAILED",
        `[${firstError?.errors[0]?.code || "VALIDATION_FAILED"}] Row ${firstError?.row}: ${firstError?.errors[0]?.message || "Validation failed for score batch."}`,
        400
      )
    }

    return await prisma.$transaction(async (tx) => {
      let importedCount = 0

      for (const item of validation.records) {
        if (!item.enrollmentId) continue

        await tx.studentAssessmentScore.upsert({
          where: {
            assessmentId_studentEnrollmentId: {
              assessmentId,
              studentEnrollmentId: item.enrollmentId,
            },
          },
          update: {
            rawScore: item.data.score ?? null,
            status: item.data.status || MarkCompletionStatus.COMPLETE,
            updatedById: actorUserId,
          },
          create: {
            assessmentId,
            studentEnrollmentId: item.enrollmentId,
            rawScore: item.data.score ?? null,
            status: item.data.status || MarkCompletionStatus.COMPLETE,
            createdById: actorUserId,
          },
        })
        importedCount++
      }

      await AuditService.logAction({
        userId: actorUserId,
        action: "IMPORT_CSV_ASSESSMENT_SCORES",
        entityType: "Assessment",
        entityId: assessmentId,
        newValues: {
          importedScoresCount: importedCount,
        },
      })

      return {
        success: true,
        assessmentId,
        importedCount,
      }
    })
  }

  /**
   * Generates a pre-populated CSV template for an assessment activity
   * containing all enrolled students eligible to take this subject.
   */
  static async generateScoreTemplate(assessmentId: string): Promise<string> {
    const assessment = await prisma.assessment.findUnique({
      where: { id: assessmentId },
      include: {
        class: true,
        subject: true,
        term: true,
      },
    })

    if (!assessment) {
      throw new AppError("NOT_FOUND", "Assessment not found.", 404)
    }

    const registrations = await prisma.studentSubjectEnrollment.findMany({
      where: {
        subjectId: assessment.subjectId,
        enrollment: {
          classId: assessment.classId,
          academicYearId: assessment.term.academicYearId,
        },
      },
      include: {
        enrollment: {
          include: { student: true },
        },
      },
      orderBy: {
        enrollment: {
          student: { lastName: "asc" },
        },
      },
    })

    const header = "student_id_number,student_name,score,status\n"
    const rows = registrations.map((r) => {
      const s = r.enrollment.student
      const fullName = `${s.lastName} ${s.firstName} ${s.middleName || ""}`.trim().replace(/,/g, "")
      return `${s.studentIdNumber},"${fullName}",,COMPLETE`
    })

    return header + rows.join("\n")
  }
}
