import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"
import { signSession, SessionPayload } from "@/lib/auth/session"
import { AuditService } from "./AuditService"
import { AppError } from "@/lib/errors"

export interface LoginResult {
  user: {
    id: string
    username: string
    displayName: string
    email: string | null
    roles: string[]
    activeRole: string
    hasCompletedOnboarding: boolean
    mustChangePassword: boolean
  }
  token: string
}

const ROLE_PRIORITY = [
  "SUPER_ADMIN",
  "HEADMASTER",
  "EXAM_OFFICER",
  "CLASS_TEACHER",
  "SUBJECT_TEACHER",
  "STUDENT",
  "GUARDIAN",
]

export class AuthService {
  /**
   * Authenticates a user against database records with password verification and audit logging.
   */
  static async login(params: {
    username: string
    password: string
    ipAddress?: string
    userAgent?: string
  }): Promise<LoginResult> {
    const { username, password, ipAddress, userAgent } = params

    // 1. Fetch user by username or email
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { username: username.trim().toLowerCase() },
          { email: username.trim().toLowerCase() },
        ],
      },
      include: {
        userRoles: {
          include: { role: true },
        },
      },
    })

    if (!user) {
      await AuditService.logAction({
        action: "LOGIN_FAILED",
        entityType: "User",
        entityId: username,
        newValues: { reason: "USER_NOT_FOUND" },
        ipAddress,
        userAgent,
      })
      throw new AppError("INVALID_CREDENTIALS", "Invalid username or password.", 401)
    }

    if (user.status !== "ACTIVE") {
      throw new AppError("ACCOUNT_INACTIVE", "This user account is currently suspended or inactive.", 403)
    }

    // 2. Verify password with bcryptjs
    const passwordMatch = await bcrypt.compare(password, user.passwordHash)
    if (!passwordMatch) {
      await AuditService.logAction({
        userId: user.id,
        action: "LOGIN_FAILED",
        entityType: "User",
        entityId: user.id,
        newValues: { reason: "PASSWORD_MISMATCH" },
        ipAddress,
        userAgent,
      })
      throw new AppError("INVALID_CREDENTIALS", "Invalid username or password.", 401)
    }

    // 3. Resolve user roles and determine primary active role
    const roles = user.userRoles.map((ur) => ur.role.name)
    const activeRole =
      ROLE_PRIORITY.find((r) => roles.includes(r)) || roles[0] || "SUBJECT_TEACHER"

    // 4. Generate signed cryptographic session token
    const token = signSession({
      userId: user.id,
      username: user.username,
      displayName: user.displayName,
      roles,
      activeRole,
      hasCompletedOnboarding: user.hasCompletedOnboarding,
      mustChangePassword: user.mustChangePassword,
    })

    // 5. Audit successful login
    await AuditService.logAction({
      userId: user.id,
      action: "LOGIN_SUCCESS",
      entityType: "User",
      entityId: user.id,
      newValues: { roles, activeRole, hasCompletedOnboarding: user.hasCompletedOnboarding },
      ipAddress,
      userAgent,
    })

    return {
      user: {
        id: user.id,
        username: user.username,
        displayName: user.displayName,
        email: user.email,
        roles,
        activeRole,
        hasCompletedOnboarding: user.hasCompletedOnboarding,
        mustChangePassword: user.mustChangePassword,
      },
      token,
    }
  }

  /**
   * Fetches fresh user profile with role details and allocations.
   */
  static async getMe(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        email: true,
        phone: true,
        displayName: true,
        status: true,
        hasCompletedOnboarding: true,
        mustChangePassword: true,
        userRoles: {
          select: { role: { select: { name: true, description: true } } },
        },
        classesSupervised: {
          select: { id: true, name: true, gradeLevel: true },
        },
        subjectAllocations: {
          select: {
            id: true,
            class: { select: { id: true, name: true } },
            subject: { select: { id: true, name: true, code: true } },
            term: { select: { id: true, name: true, status: true } },
          },
        },
      },
    })

    if (!user) return null

    const roles = user.userRoles.map((ur) => ur.role.name)
    return {
      ...user,
      roles,
    }
  }
}
