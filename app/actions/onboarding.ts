"use server"

import { prisma } from "@/lib/prisma"
import { getSession, setSessionCookie, signSession } from "@/lib/auth/session"
import { AuditService } from "@/server/services/AuditService"
import bcrypt from "bcryptjs"
import { revalidatePath } from "next/cache"
import { headers } from "next/headers"

export interface OnboardingContextData {
  user: {
    id: string
    username: string
    displayName: string
    email: string | null
    phone: string | null
    roles: string[]
    activeRole: string
    hasCompletedOnboarding: boolean
    mustChangePassword: boolean
  }
  roleContext: Record<string, any>
}

export async function getOnboardingContextAction(): Promise<OnboardingContextData | null> {
  const session = await getSession()
  if (!session) return null

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: {
      id: true,
      username: true,
      displayName: true,
      email: true,
      phone: true,
      hasCompletedOnboarding: true,
      mustChangePassword: true,
      userRoles: {
        select: { role: { select: { name: true } } },
      },
    },
  })

  if (!user) return null

  const roles = user.userRoles.map((ur) => ur.role.name)
  const activeRole = session.activeRole || roles[0] || "SUBJECT_TEACHER"

  const roleContext: Record<string, any> = {}

  // Fetch common active term and school profile
  const [schoolProfile, currentAcademicYear] = await Promise.all([
    prisma.schoolProfile.findFirst({
      select: {
        schoolName: true,
        schoolCode: true,
        motto: true,
        email: true,
        phone: true,
        postalAddress: true,
      },
    }),
    prisma.academicYear.findFirst({
      where: { isCurrent: true },
      include: {
        terms: {
          orderBy: { termSequence: "asc" },
        },
      },
    }),
  ])

  const activeTerm =
    currentAcademicYear?.terms.find((t) => t.status === "MARK_ENTRY") ||
    currentAcademicYear?.terms[0] ||
    null

  roleContext.schoolProfile = schoolProfile || {
    schoolName: "Demonstration Academy",
    schoolCode: "DEMO-001",
    motto: "Excellence and Integrity",
    email: "info@school.edu",
    phone: "+233 20 000 0000",
  }

  roleContext.activeTerm = activeTerm
    ? {
        id: activeTerm.id,
        name: activeTerm.name,
        status: activeTerm.status,
        academicYearName: currentAcademicYear?.name || "Current Year",
      }
    : null

  // Role-specific contextual enrichment
  if (activeRole === "SUPER_ADMIN") {
    const [userCount, classCount, studentCount, subjectCount] = await Promise.all([
      prisma.user.count(),
      prisma.class.count(),
      prisma.student.count(),
      prisma.subject.count(),
    ])
    roleContext.systemStats = {
      userCount,
      classCount,
      studentCount,
      subjectCount,
    }
  } else if (activeRole === "HEADMASTER") {
    const [studentCount, classCount, pendingApprovalsCount] = await Promise.all([
      prisma.student.count({ where: { status: "ACTIVE" } }),
      prisma.class.count(),
      prisma.termResult.count({ where: { status: "UNDER_REVIEW" } }),
    ])
    roleContext.executiveStats = {
      studentCount,
      classCount,
      pendingApprovalsCount,
    }
  } else if (activeRole === "EXAM_OFFICER") {
    const [policyCount, allocationCount, assessmentCount] = await Promise.all([
      prisma.gradingPolicy.count(),
      activeTerm
        ? prisma.subjectAllocation.count({ where: { termId: activeTerm.id } })
        : prisma.subjectAllocation.count(),
      activeTerm
        ? prisma.assessment.count({ where: { termId: activeTerm.id } })
        : prisma.assessment.count(),
    ])
    roleContext.examOfficerStats = {
      policyCount,
      allocationCount,
      assessmentCount,
    }
  } else if (activeRole === "CLASS_TEACHER") {
    const classesSupervised = await prisma.class.findMany({
      where: { classTeacherId: user.id },
      include: {
        _count: {
          select: {
            enrollments: {
              where: { status: "ACTIVE" },
            },
          },
        },
      },
    })
    roleContext.classesSupervised = classesSupervised.map((c) => ({
      id: c.id,
      name: c.name,
      gradeLevel: c.gradeLevel,
      studentCount: c._count.enrollments,
    }))
  } else if (activeRole === "SUBJECT_TEACHER") {
    const allocations = await prisma.subjectAllocation.findMany({
      where: {
        teacherId: user.id,
        ...(activeTerm ? { termId: activeTerm.id } : {}),
      },
      include: {
        class: { select: { id: true, name: true, gradeLevel: true } },
        subject: { select: { id: true, name: true, code: true } },
      },
    })
    roleContext.allocations = allocations.map((a) => ({
      id: a.id,
      className: a.class.name,
      gradeLevel: a.class.gradeLevel,
      subjectName: a.subject.name,
      subjectCode: a.subject.code,
    }))
  } else if (activeRole === "STUDENT") {
    // Check if student record links to this username or email
    const student = await prisma.student.findFirst({
      where: {
        OR: [
          { studentIdNumber: user.username },
          { studentIdNumber: user.username.toUpperCase() },
        ],
      },
      include: {
        enrollments: {
          where: { status: "ACTIVE" },
          include: {
            class: true,
            subjectRegistrations: {
              include: { subject: true },
            },
          },
          take: 1,
        },
      },
    })
    if (student && student.enrollments.length > 0) {
      const enrollment = student.enrollments[0]
      roleContext.studentProfile = {
        studentIdNumber: student.studentIdNumber,
        fullName: `${student.firstName} ${student.lastName}`,
        className: enrollment?.class.name || "Unassigned",
        subjectCount: enrollment?.subjectRegistrations.length || 0,
      }
    } else {
      roleContext.studentProfile = {
        studentIdNumber: user.username.toUpperCase(),
        fullName: user.displayName,
        className: "Enrolled Student",
        subjectCount: 8,
      }
    }
  } else if (activeRole === "GUARDIAN") {
    // Check guardian record linked by phone or email
    const guardian = await prisma.guardian.findFirst({
      where: {
        OR: [
          { email: user.email || undefined },
          { name: { contains: user.displayName, mode: "insensitive" } },
        ],
      },
      include: {
        studentGuardians: {
          include: {
            student: {
              include: {
                enrollments: {
                  where: { status: "ACTIVE" },
                  include: { class: true },
                  take: 1,
                },
              },
            },
          },
        },
      },
    })
    if (guardian && guardian.studentGuardians.length > 0) {
      roleContext.wards = guardian.studentGuardians.map((sg) => ({
        id: sg.student.id,
        name: `${sg.student.firstName} ${sg.student.lastName}`,
        studentIdNumber: sg.student.studentIdNumber,
        className: sg.student.enrollments[0]?.class.name || "Assigned Class",
        relationship: guardian.relationship,
      }))
    } else {
      roleContext.wards = [
        {
          id: "ward-demo",
          name: "Sample Student Ward",
          studentIdNumber: "STU-2026-001",
          className: "Form 1A",
          relationship: "Ward",
        },
      ]
    }
  }

  return {
    user: {
      id: user.id,
      username: user.username,
      displayName: user.displayName,
      email: user.email,
      phone: user.phone,
      roles,
      activeRole,
      hasCompletedOnboarding: user.hasCompletedOnboarding,
      mustChangePassword: user.mustChangePassword,
    },
    roleContext,
  }
}

export async function completeOnboardingAction(params: {
  phone?: string
  displayName?: string
  newPassword?: string
}): Promise<{ success: boolean; error?: string }> {
  const session = await getSession()
  if (!session) {
    return { success: false, error: "Unauthorized. Please log in." }
  }

  const headersList = await headers()
  const ipAddress = headersList.get("x-forwarded-for") || "127.0.0.1"
  const userAgent = headersList.get("user-agent") || undefined

  try {
    const updateData: Record<string, any> = {
      hasCompletedOnboarding: true,
      onboardedAt: new Date(),
    }

    if (params.phone && params.phone.trim()) {
      updateData.phone = params.phone.trim()
    }

    if (params.displayName && params.displayName.trim()) {
      updateData.displayName = params.displayName.trim()
    }

    if (params.newPassword && params.newPassword.trim().length >= 8) {
      updateData.passwordHash = await bcrypt.hash(params.newPassword.trim(), 10)
      updateData.mustChangePassword = false
    }

    const updatedUser = await prisma.user.update({
      where: { id: session.userId },
      data: updateData,
    })

    // Re-issue cookie with hasCompletedOnboarding: true
    const newToken = signSession({
      userId: updatedUser.id,
      username: updatedUser.username,
      displayName: updatedUser.displayName,
      roles: session.roles,
      activeRole: session.activeRole,
      hasCompletedOnboarding: true,
      mustChangePassword: updatedUser.mustChangePassword,
    })

    await setSessionCookie(newToken)

    // Log in Audit Trail
    await AuditService.logAction({
      userId: updatedUser.id,
      action: "ONBOARDING_COMPLETED",
      entityType: "User",
      entityId: updatedUser.id,
      newValues: {
        activeRole: session.activeRole,
        passwordChanged: !!params.newPassword,
        phoneUpdated: !!params.phone,
      },
      ipAddress,
      userAgent,
    })

    revalidatePath("/")
    revalidatePath("/dashboard")
    revalidatePath("/onboarding")

    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to complete onboarding." }
  }
}
