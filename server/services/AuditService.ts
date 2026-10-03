import { prisma } from "@/lib/prisma"

export interface CreateAuditLogParams {
  userId?: string | null
  action: string
  entityType: string
  entityId: string
  oldValues?: Record<string, unknown> | null
  newValues?: Record<string, unknown> | null
  ipAddress?: string | null
  userAgent?: string | null
}

export class AuditService {
  /**
   * Creates an append-only audit log record.
   */
  static async logAction(params: CreateAuditLogParams) {
    try {
      return await prisma.auditLog.create({
        data: {
          userId: params.userId ?? null,
          action: params.action,
          entityType: params.entityType,
          entityId: params.entityId,
          oldValues: params.oldValues ? JSON.stringify(params.oldValues) : null,
          newValues: params.newValues ? JSON.stringify(params.newValues) : null,
          ipAddress: params.ipAddress ?? null,
          userAgent: params.userAgent ?? null,
        },
      })
    } catch (error) {
      console.error("Failed to write audit log:", error)
      return null
    }
  }

  /**
   * Retrieves audit logs for an entity or action with pagination.
   */
  static async getLogs(params: {
    entityType?: string
    entityId?: string
    action?: string
    userId?: string
    limit?: number
    offset?: number
  }) {
    const { entityType, entityId, action, userId, limit = 50, offset = 0 } = params

    return await prisma.auditLog.findMany({
      where: {
        ...(entityType && { entityType }),
        ...(entityId && { entityId }),
        ...(action && { action }),
        ...(userId && { userId }),
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            displayName: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
    })
  }
}
