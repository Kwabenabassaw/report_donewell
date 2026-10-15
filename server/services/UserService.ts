import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"
import { AuditService } from "./AuditService"
import { AppError } from "@/lib/errors"

export interface CreateUserInput {
  username: string
  displayName: string
  email?: string
  password: string
  roles: string[]
}

export interface UpdateUserInput {
  displayName?: string
  email?: string
  status?: string
}

export class UserService {
  /**
   * Lists all users with their assigned roles and status.
   */
  static async listUsers() {
    const users = await prisma.user.findMany({
      include: {
        userRoles: {
          include: { role: true },
        },
        classesSupervised: {
          select: { id: true, name: true },
        },
      },
      orderBy: { createdAt: "desc" },
    })

    return users.map((u) => ({
      id: u.id,
      username: u.username,
      displayName: u.displayName,
      email: u.email,
      status: u.status,
      roles: u.userRoles.map((ur) => ur.role.name),
      classesSupervised: u.classesSupervised.map((c) => c.name),
      createdAt: u.createdAt,
    }))
  }

  /**
   * Retrieves all predefined roles.
   */
  static async listRoles() {
    return await prisma.role.findMany({
      orderBy: { name: "asc" },
    })
  }

  /**
   * Creates a new staff or user account.
   */
  static async createUser(input: CreateUserInput, actorUserId?: string) {
    const cleanUsername = input.username.trim().toLowerCase()
    const cleanEmail = input.email?.trim().toLowerCase() || null

    if (!cleanUsername) {
      throw new AppError("VALIDATION_FAILED", "Username is required.", 400)
    }

    if (!input.password || input.password.length < 6) {
      throw new AppError("VALIDATION_FAILED", "Password must be at least 6 characters.", 400)
    }

    const existing = await prisma.user.findFirst({
      where: {
        OR: [
          { username: cleanUsername },
          ...(cleanEmail ? [{ email: cleanEmail }] : []),
        ],
      },
    })

    if (existing) {
      throw new AppError("VALIDATION_FAILED", "Username or email is already taken.", 400)
    }

    const passwordHash = await bcrypt.hash(input.password, 10)

    // Pre-fetch roles in a single query outside of any transaction
    const roles = await prisma.role.findMany({
      where: { name: { in: input.roles } },
    })

    const user = await prisma.user.create({
      data: {
        username: cleanUsername,
        displayName: input.displayName.trim(),
        email: cleanEmail,
        passwordHash,
        status: "ACTIVE",
        userRoles: {
          create: roles.map((role) => ({
            roleId: role.id,
          })),
        },
      },
    })

    await AuditService.logAction({
      userId: actorUserId,
      action: "CREATE_USER",
      entityType: "User",
      entityId: user.id,
      newValues: {
        username: user.username,
        displayName: user.displayName,
        roles: input.roles,
      },
    })

    return user
  }

  /**
   * Toggles user status between ACTIVE and SUSPENDED.
   */
  static async toggleStatus(userId: string, actorUserId?: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user) {
      throw new AppError("NOT_FOUND", "User not found.", 404)
    }

    const nextStatus = user.status === "ACTIVE" ? "SUSPENDED" : "ACTIVE"

    const updated = await prisma.user.update({
      where: { id: userId },
      data: { status: nextStatus },
    })

    await AuditService.logAction({
      userId: actorUserId,
      action: "TOGGLE_USER_STATUS",
      entityType: "User",
      entityId: userId,
      oldValues: { status: user.status },
      newValues: { status: nextStatus },
    })

    return updated
  }

  /**
   * Resets password for a user.
   */
  static async resetPassword(userId: string, newPass: string, actorUserId?: string) {
    if (!newPass || newPass.length < 6) {
      throw new AppError("VALIDATION_FAILED", "New password must be at least 6 characters.", 400)
    }

    const passwordHash = await bcrypt.hash(newPass, 10)

    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    })

    await AuditService.logAction({
      userId: actorUserId,
      action: "RESET_USER_PASSWORD",
      entityType: "User",
      entityId: userId,
    })

    return { success: true }
  }

  /**
   * Reassigns roles for a user.
   */
  static async updateUserRoles(userId: string, roleNames: string[], actorUserId?: string) {
    const roles = await prisma.role.findMany({
      where: { name: { in: roleNames } },
    })

    await prisma.$transaction([
      prisma.userRole.deleteMany({ where: { userId } }),
      prisma.userRole.createMany({
        data: roles.map((r) => ({
          userId,
          roleId: r.id,
        })),
      }),
    ])

    await AuditService.logAction({
      userId: actorUserId,
      action: "UPDATE_USER_ROLES",
      entityType: "User",
      entityId: userId,
      newValues: { roles: roleNames },
    })

    return { success: true }
  }

  /**
   * Comprehensive update of user biodata, email, roles, status, and optional password.
   */
  static async updateUser(
    userId: string,
    input: {
      displayName?: string
      email?: string | null
      roles?: string[]
      status?: string
      password?: string
    },
    actorUserId?: string
  ) {
    const existing = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        userRoles: { include: { role: true } },
      },
    })

    if (!existing) {
      throw new AppError("NOT_FOUND", "User not found.", 404)
    }

    const cleanDisplayName = input.displayName !== undefined ? input.displayName.trim() : undefined
    const cleanEmail =
      input.email !== undefined ? (input.email ? input.email.trim().toLowerCase() : null) : undefined

    if (cleanEmail) {
      const duplicate = await prisma.user.findFirst({
        where: {
          email: cleanEmail,
          id: { not: userId },
        },
      })
      if (duplicate) {
        throw new AppError("VALIDATION_FAILED", "Email address is already in use by another account.", 400)
      }
    }

    let passwordHash: string | undefined = undefined
    if (input.password && input.password.trim().length > 0) {
      if (input.password.length < 6) {
        throw new AppError("VALIDATION_FAILED", "New password must be at least 6 characters.", 400)
      }
      passwordHash = await bcrypt.hash(input.password, 10)
    }

    const roles =
      input.roles && input.roles.length > 0
        ? await prisma.role.findMany({ where: { name: { in: input.roles } } })
        : []

    const updated = await prisma.$transaction(
      async (tx) => {
        const u = await tx.user.update({
          where: { id: userId },
          data: {
            ...(cleanDisplayName ? { displayName: cleanDisplayName } : {}),
            ...(cleanEmail !== undefined ? { email: cleanEmail } : {}),
            ...(input.status ? { status: input.status } : {}),
            ...(passwordHash ? { passwordHash } : {}),
          },
        })

        if (input.roles && input.roles.length > 0) {
          await tx.userRole.deleteMany({ where: { userId } })
          if (roles.length > 0) {
            await tx.userRole.createMany({
              data: roles.map((r) => ({
                userId,
                roleId: r.id,
              })),
            })
          }
        }

        return u
      },
      {
        maxWait: 10000,
        timeout: 20000,
      }
    )

    await AuditService.logAction({
      userId: actorUserId,
      action: "UPDATE_USER",
      entityType: "User",
      entityId: userId,
      oldValues: {
        displayName: existing.displayName,
        email: existing.email,
        status: existing.status,
        roles: existing.userRoles.map((ur) => ur.role.name),
      },
      newValues: {
        displayName: updated.displayName,
        email: updated.email,
        status: updated.status,
        roles: input.roles ?? existing.userRoles.map((ur) => ur.role.name),
        passwordChanged: !!passwordHash,
      },
    })

    return updated
  }
}
