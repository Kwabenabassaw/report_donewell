"use server"

import { getSession } from "@/lib/auth/session"
import { ScopeGuard } from "@/lib/auth/scope-guard"
import { ImportService } from "@/server/services/ImportService"
import { revalidatePath } from "next/cache"

async function assertAdministrative() {
  const session = await getSession()
  if (!session) {
    throw new Error("Unauthorized. Please log in.")
  }

  const isAdmin = ScopeGuard.isAdministrative({
    userId: session.userId,
    roles: session.roles,
  })

  if (!isAdmin) {
    throw new Error("Unauthorized: Administrative privileges required.")
  }

  return session
}

async function assertTeacherOrAdmin() {
  const session = await getSession()
  if (!session) {
    throw new Error("Unauthorized. Please log in.")
  }

  const allowedRoles = ["SUPER_ADMIN", "HEADMASTER", "EXAM_OFFICER", "CLASS_TEACHER", "SUBJECT_TEACHER"]
  const hasAccess = session.roles.some((r) => allowedRoles.includes(r))

  if (!hasAccess) {
    throw new Error("Unauthorized: Teacher or administrative access required.")
  }

  return session
}

export async function validateStudentCsvAction(csvContent: string, academicYearId: string) {
  await assertAdministrative()
  const records = ImportService.parseStudentCsv(csvContent)
  return await ImportService.validateStudentCsv(records, academicYearId)
}

export async function importStudentCsvAction(csvContent: string, academicYearId: string) {
  const session = await assertAdministrative()
  const records = ImportService.parseStudentCsv(csvContent)
  const result = await ImportService.executeStudentImport(records, academicYearId, session.userId)
  revalidatePath("/students")
  revalidatePath("/csv-import")
  return result
}

export async function validateScoreCsvAction(assessmentId: string, csvContent: string) {
  await assertTeacherOrAdmin()
  const records = ImportService.parseScoreCsv(csvContent)
  return await ImportService.validateScoreCsv(assessmentId, records)
}

export async function importScoreCsvAction(assessmentId: string, csvContent: string) {
  const session = await assertTeacherOrAdmin()
  const records = ImportService.parseScoreCsv(csvContent)
  const result = await ImportService.executeScoreImport(assessmentId, records, session.userId)
  revalidatePath("/assessments")
  revalidatePath("/mark-entry")
  revalidatePath("/csv-import")
  return result
}

export async function generateScoreTemplateAction(assessmentId: string) {
  await assertTeacherOrAdmin()
  return await ImportService.generateScoreTemplate(assessmentId)
}

export async function generateStudentTemplateAction() {
  await assertAdministrative()
  return ImportService.generateStudentTemplate()
}
