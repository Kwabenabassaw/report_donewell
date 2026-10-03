"use server"

import { getSession } from "@/lib/auth/session"
import { ScopeGuard } from "@/lib/auth/scope-guard"
import { AcademicYearService } from "@/server/services/AcademicYearService"
import { TermService } from "@/server/services/TermService"
import { ClassService } from "@/server/services/ClassService"
import { SubjectService } from "@/server/services/SubjectService"
import { TermStatus, AcademicYearStatus } from "@prisma/client"
import { revalidatePath } from "next/cache"

async function assertAdminAuth() {
  const session = await getSession()
  if (!session) {
    throw new Error("Unauthorized. Please log in.")
  }

  const ctx = { userId: session.userId, roles: session.roles }
  if (!ScopeGuard.isAdministrative(ctx)) {
    throw new Error("Unauthorized: Administrative privileges required.")
  }

  return session
}

export async function createAcademicYearAction(formData: FormData): Promise<void> {
  const session = await assertAdminAuth()
  const name = formData.get("name") as string
  const startDate = new Date(formData.get("startDate") as string)
  const endDate = new Date(formData.get("endDate") as string)
  const isCurrent = formData.get("isCurrent") === "true"

  await AcademicYearService.createAcademicYear(
    {
      name,
      startDate,
      endDate,
      isCurrent,
      status: isCurrent ? AcademicYearStatus.ACTIVE : AcademicYearStatus.DRAFT,
    },
    session.userId
  )

  revalidatePath("/academic-years")
  revalidatePath("/dashboard")
  revalidatePath("/")
}

export async function setCurrentAcademicYearAction(yearId: string): Promise<void> {
  const session = await assertAdminAuth()
  await AcademicYearService.setCurrentYear(yearId, session.userId)
  revalidatePath("/academic-years")
  revalidatePath("/dashboard")
  revalidatePath("/")
}

export async function createTermAction(formData: FormData): Promise<void> {
  const session = await assertAdminAuth()
  const academicYearId = formData.get("academicYearId") as string
  const name = formData.get("name") as string
  const termSequence = parseInt(formData.get("termSequence") as string, 10)
  const startDate = new Date(formData.get("startDate") as string)
  const endDate = new Date(formData.get("endDate") as string)
  const nextTermResumptionRaw = formData.get("nextTermResumption") as string
  const nextTermResumption = nextTermResumptionRaw ? new Date(nextTermResumptionRaw) : undefined
  const totalSchoolDays = parseInt((formData.get("totalSchoolDays") as string) || "60", 10)

  await TermService.createTerm(
    {
      academicYearId,
      name,
      termSequence,
      startDate,
      endDate,
      nextTermResumption,
      totalSchoolDays,
    },
    session.userId
  )

  revalidatePath("/academic-years")
  revalidatePath("/dashboard")
  revalidatePath("/")
}

export async function transitionTermStatusAction(
  termId: string,
  targetStatus: TermStatus,
  reason?: string
): Promise<void> {
  const session = await assertAdminAuth()
  await TermService.transitionStatus(termId, targetStatus, session.userId, reason)
  revalidatePath("/academic-years")
  revalidatePath("/dashboard")
  revalidatePath("/")
}

export async function createClassAction(formData: FormData): Promise<void> {
  const session = await assertAdminAuth()
  const name = formData.get("name") as string
  const gradeLevel = formData.get("gradeLevel") as string
  const classTeacherId = (formData.get("classTeacherId") as string) || undefined

  await ClassService.createClass(
    { name, gradeLevel, classTeacherId },
    session.userId
  )

  revalidatePath("/classes")
  revalidatePath("/dashboard")
  revalidatePath("/")
}

export async function assignClassTeacherAction(classId: string, teacherId: string | null): Promise<void> {
  const session = await assertAdminAuth()
  await ClassService.assignClassTeacher(classId, teacherId, session.userId)
  revalidatePath("/classes")
  revalidatePath("/dashboard")
  revalidatePath("/")
}

export async function createSubjectAction(formData: FormData): Promise<void> {
  const session = await assertAdminAuth()
  const name = formData.get("name") as string
  const code = formData.get("code") as string
  const isElective = formData.get("isElective") === "true"

  await SubjectService.createSubject({ name, code, isElective }, session.userId)
  revalidatePath("/classes")
  revalidatePath("/dashboard")
  revalidatePath("/")
}

export async function toggleSubjectStatusAction(subjectId: string): Promise<void> {
  const session = await assertAdminAuth()
  await SubjectService.toggleSubjectStatus(subjectId, session.userId)
  revalidatePath("/classes")
  revalidatePath("/dashboard")
  revalidatePath("/")
}

export async function updateAcademicYearAction(formData: FormData): Promise<void> {
  const session = await assertAdminAuth()
  const yearId = formData.get("yearId") as string
  const name = (formData.get("name") as string) || undefined
  const startDateRaw = formData.get("startDate") as string
  const endDateRaw = formData.get("endDate") as string
  const status = (formData.get("status") as AcademicYearStatus) || undefined

  await AcademicYearService.updateAcademicYear(
    yearId,
    {
      name,
      startDate: startDateRaw ? new Date(startDateRaw) : undefined,
      endDate: endDateRaw ? new Date(endDateRaw) : undefined,
      status,
    },
    session.userId
  )

  revalidatePath("/academic-years")
  revalidatePath("/dashboard")
  revalidatePath("/")
}

export async function deleteAcademicYearAction(yearId: string): Promise<void> {
  const session = await assertAdminAuth()
  await AcademicYearService.deleteAcademicYear(yearId, session.userId)
  revalidatePath("/academic-years")
  revalidatePath("/dashboard")
  revalidatePath("/")
}

export async function updateTermAction(formData: FormData): Promise<void> {
  const session = await assertAdminAuth()
  const termId = formData.get("termId") as string
  const name = (formData.get("name") as string) || undefined
  const startDateRaw = formData.get("startDate") as string
  const endDateRaw = formData.get("endDate") as string
  const nextResumptionRaw = formData.get("nextTermResumption") as string
  const schoolDaysRaw = formData.get("totalSchoolDays") as string

  await TermService.updateTerm(
    termId,
    {
      name,
      startDate: startDateRaw ? new Date(startDateRaw) : undefined,
      endDate: endDateRaw ? new Date(endDateRaw) : undefined,
      nextTermResumption: nextResumptionRaw ? new Date(nextResumptionRaw) : undefined,
      totalSchoolDays: schoolDaysRaw ? parseInt(schoolDaysRaw, 10) : undefined,
    },
    session.userId
  )

  revalidatePath("/academic-years")
  revalidatePath("/dashboard")
  revalidatePath("/")
}

export async function deleteTermAction(termId: string): Promise<void> {
  const session = await assertAdminAuth()
  await TermService.deleteTerm(termId, session.userId)
  revalidatePath("/academic-years")
  revalidatePath("/dashboard")
  revalidatePath("/")
}

export async function updateClassAction(formData: FormData): Promise<void> {
  const session = await assertAdminAuth()
  const classId = formData.get("classId") as string
  const name = (formData.get("name") as string) || undefined
  const gradeLevel = (formData.get("gradeLevel") as string) || undefined
  const classTeacherId = formData.get("classTeacherId") as string

  await ClassService.updateClass(
    classId,
    {
      name,
      gradeLevel,
      classTeacherId: classTeacherId ? classTeacherId : null,
    },
    session.userId
  )

  revalidatePath("/classes")
  revalidatePath("/dashboard")
  revalidatePath("/")
}

export async function deleteClassAction(classId: string): Promise<void> {
  const session = await assertAdminAuth()
  await ClassService.deleteClass(classId, session.userId)
  revalidatePath("/classes")
  revalidatePath("/dashboard")
  revalidatePath("/")
}

export async function updateSubjectAction(formData: FormData): Promise<void> {
  const session = await assertAdminAuth()
  const subjectId = formData.get("subjectId") as string
  const name = (formData.get("name") as string) || undefined
  const code = (formData.get("code") as string) || undefined
  const isElective = formData.get("isElective") === "true"

  await SubjectService.updateSubject(
    subjectId,
    { name, code, isElective },
    session.userId
  )

  revalidatePath("/classes")
  revalidatePath("/dashboard")
  revalidatePath("/")
}

export async function deleteSubjectAction(subjectId: string): Promise<void> {
  const session = await assertAdminAuth()
  await SubjectService.deleteSubject(subjectId, session.userId)
  revalidatePath("/classes")
  revalidatePath("/dashboard")
  revalidatePath("/")
}
