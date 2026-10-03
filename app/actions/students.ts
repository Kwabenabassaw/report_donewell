"use server"

import { getSession } from "@/lib/auth/session"
import { ScopeGuard } from "@/lib/auth/scope-guard"
import { StudentService } from "@/server/services/StudentService"
import { EnrollmentService } from "@/server/services/EnrollmentService"
import { GuardianService } from "@/server/services/GuardianService"
import { ImportService } from "@/server/services/ImportService"
import { StudentStatus } from "@prisma/client"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

async function assertAdminOrStaff() {
  const session = await getSession()
  if (!session) {
    throw new Error("Unauthorized. Please log in.")
  }

  const ctx = { userId: session.userId, roles: session.roles }
  if (
    !ScopeGuard.isAdministrative(ctx) &&
    !session.roles.includes("CLASS_TEACHER") &&
    !session.roles.includes("SUBJECT_TEACHER")
  ) {
    throw new Error("Unauthorized: Academic staff privileges required.")
  }

  return session
}

export async function createStudentAction(formData: FormData): Promise<void> {
  const session = await assertAdminOrStaff()
  const studentIdNumber = formData.get("studentIdNumber") as string
  const firstName = formData.get("firstName") as string
  const middleName = (formData.get("middleName") as string) || undefined
  const lastName = formData.get("lastName") as string
  const gender = formData.get("gender") as string
  const dobRaw = formData.get("dateOfBirth") as string
  const dateOfBirth = dobRaw ? new Date(dobRaw) : undefined
  const classId = (formData.get("classId") as string) || undefined
  const academicYearId = (formData.get("academicYearId") as string) || undefined

  const student = await StudentService.createStudent(
    {
      studentIdNumber,
      firstName,
      middleName,
      lastName,
      gender,
      dateOfBirth,
    },
    session.userId
  )

  // If class and academic year were provided, enroll immediately
  if (classId && academicYearId) {
    await EnrollmentService.enrollStudent(
      {
        studentId: student.id,
        academicYearId,
        classId,
      },
      session.userId
    )
  }

  revalidatePath("/students")
  revalidatePath("/dashboard")
  revalidatePath("/")
}

export async function updateStudentStatusAction(studentId: string, status: StudentStatus): Promise<void> {
  const session = await assertAdminOrStaff()
  await StudentService.updateStudentStatus(studentId, status, session.userId)
  revalidatePath(`/students/${studentId}`)
  revalidatePath("/students")
}

export async function enrollStudentAction(formData: FormData): Promise<void> {
  const session = await assertAdminOrStaff()
  const studentId = formData.get("studentId") as string
  const academicYearId = formData.get("academicYearId") as string
  const classId = formData.get("classId") as string
  const rollNumber = (formData.get("rollNumber") as string) || undefined

  await EnrollmentService.enrollStudent(
    {
      studentId,
      academicYearId,
      classId,
      rollNumber,
    },
    session.userId
  )

  revalidatePath(`/students/${studentId}`)
  revalidatePath("/students")
  revalidatePath("/classes")
}

export async function registerSubjectAction(enrollmentId: string, subjectId: string): Promise<void> {
  await assertAdminOrStaff()
  await EnrollmentService.registerSubject(enrollmentId, subjectId)
  revalidatePath("/students")
}

export async function bulkRegisterSubjectsForStudentAction(
  enrollmentId: string,
  subjectIds: string[]
): Promise<{ created: number; skipped: number }> {
  await assertAdminOrStaff()
  if (!subjectIds || subjectIds.length === 0) {
    throw new Error("Please select at least one subject.")
  }
  const result = await EnrollmentService.bulkRegisterSubjectsForStudent(enrollmentId, subjectIds)
  revalidatePath("/students")
  return result
}

export async function bulkRegisterClassSubjectsAction(
  academicYearId: string,
  classId: string,
  subjectIds: string[]
): Promise<{ totalStudents: number; totalCreated: number }> {
  const session = await getSession()
  if (!session) throw new Error("Unauthorized. Please log in.")
  const ctx = { userId: session.userId, roles: session.roles }
  if (!ScopeGuard.isAdministrative(ctx)) {
    throw new Error("Unauthorized: Administrative privileges required for class-wide bulk enrollment.")
  }
  if (!subjectIds || subjectIds.length === 0) {
    throw new Error("Please select at least one subject.")
  }
  const result = await EnrollmentService.bulkRegisterClassSubjects(academicYearId, classId, subjectIds)
  revalidatePath("/students")
  return result
}

export async function getEligibleCohortCountAction(
  academicYearId: string,
  classId: string
): Promise<number> {
  await assertAdminOrStaff()
  return EnrollmentService.getEligibleCohortCount({ academicYearId, classId })
}



export async function unregisterSubjectAction(enrollmentId: string, subjectId: string): Promise<void> {
  await assertAdminOrStaff()
  await EnrollmentService.unregisterSubject(enrollmentId, subjectId)
  revalidatePath("/students")
}

export async function addGuardianAction(formData: FormData): Promise<void> {
  const session = await assertAdminOrStaff()
  const studentId = formData.get("studentId") as string
  const name = formData.get("name") as string
  const phone = formData.get("phone") as string
  const email = (formData.get("email") as string) || undefined
  const relationship = formData.get("relationship") as string
  const isPrimary = formData.get("isPrimary") === "true"

  await GuardianService.addGuardianForStudent(
    {
      studentId,
      name,
      phone,
      email,
      relationship,
      isPrimary,
    },
    session.userId
  )

  revalidatePath(`/students/${studentId}`)
}

export async function importCsvStudentsAction(
  csvContent: string,
  academicYearId: string
): Promise<{ success: boolean; importedStudents: number; importedEnrollments: number }> {
  const session = await assertAdminOrStaff()
  const records = ImportService.parseCsv(csvContent)
  const validation = await ImportService.validateCsv(records, academicYearId)

  if (!validation.valid) {
    const errorMsg = validation.records
      .filter((r) => r.errors.length > 0)
      .map((r) => `Row ${r.row}: ${r.errors.join("; ")}`)
      .slice(0, 5)
      .join("\n")
    throw new Error(`CSV Validation Failed:\n${errorMsg}`)
  }

  const result = await ImportService.executeImport(records, academicYearId, session.userId)
  revalidatePath("/students")
  revalidatePath("/dashboard")
  revalidatePath("/")
  return { success: true, ...result }
}

export async function updateStudentBiodataAction(
  studentId: string,
  formData: FormData
): Promise<void> {
  const session = await assertAdminOrStaff()
  const firstName = formData.get("firstName") as string
  const lastName = formData.get("lastName") as string
  const middleName = (formData.get("middleName") as string) || undefined
  const gender = (formData.get("gender") as string) || undefined
  const dobRaw = formData.get("dateOfBirth") as string
  const dateOfBirth = dobRaw ? new Date(dobRaw) : undefined

  await StudentService.updateStudent(
    studentId,
    {
      firstName,
      lastName,
      middleName,
      gender,
      dateOfBirth,
    },
    session.userId
  )

  revalidatePath(`/students/${studentId}`)
  revalidatePath("/students")
}

export async function deleteStudentAction(studentId: string): Promise<void> {
  const session = await assertAdminOrStaff()
  await StudentService.deleteStudent(studentId, session.userId)
  revalidatePath("/students")
  revalidatePath("/dashboard")
  revalidatePath("/")
}
