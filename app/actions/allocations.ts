"use server"

import { getSession } from "@/lib/auth/session"
import { ScopeGuard } from "@/lib/auth/scope-guard"
import { TeacherAssignmentService } from "@/server/services/TeacherAssignmentService"
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
    throw new Error("Unauthorized: Administrative privileges required to manage teacher allocations.")
  }

  return session
}

export async function assignTeacherAction(formData: FormData): Promise<void> {
  const session = await assertAdministrative()

  const termId = formData.get("termId") as string
  const classId = formData.get("classId") as string
  const subjectId = formData.get("subjectId") as string
  const teacherId = formData.get("teacherId") as string

  if (!termId || !classId || !subjectId || !teacherId) {
    throw new Error("All fields (Term, Class, Subject, Teacher) are required.")
  }

  await TeacherAssignmentService.assignTeacher(
    {
      termId,
      classId,
      subjectId,
      teacherId,
    },
    session.userId
  )

  revalidatePath("/teacher-assignments")
  revalidatePath("/mark-entry")
  revalidatePath("/classes")
}

import { prisma } from "@/lib/prisma"

export async function unassignTeacherAction(allocationIdOrFormData: string | FormData): Promise<void> {
  const session = await assertAdministrative()
  const allocationId =
    typeof allocationIdOrFormData === "string"
      ? allocationIdOrFormData
      : (allocationIdOrFormData.get("allocationId") as string)

  if (!allocationId) {
    throw new Error("Allocation ID is required.")
  }

  await TeacherAssignmentService.unassignTeacher(allocationId, session.userId)

  revalidatePath("/teacher-assignments")
  revalidatePath("/mark-entry")
  revalidatePath("/classes")
}

export async function reassignTeacherAction(
  allocationId: string,
  newTeacherId: string
): Promise<void> {
  const session = await assertAdministrative()
  const alloc = await prisma.subjectAllocation.findUnique({
    where: { id: allocationId },
  })
  if (!alloc) throw new Error("Allocation not found.")

  await TeacherAssignmentService.assignTeacher(
    {
      termId: alloc.termId,
      classId: alloc.classId,
      subjectId: alloc.subjectId,
      teacherId: newTeacherId,
    },
    session.userId
  )

  revalidatePath("/teacher-assignments")
  revalidatePath("/mark-entry")
  revalidatePath("/classes")
}
