import { NextRequest, NextResponse } from "next/server"
import { getSession, setSessionCookie, signSession } from "@/lib/auth/session"
import { AuditService } from "@/server/services/AuditService"

export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { role } = await request.json()
    if (!role || !session.roles.includes(role)) {
      return NextResponse.json(
        { error: "User does not hold the requested role." },
        { status: 403 }
      )
    }

    // Re-sign token with new activeRole
    const newToken = signSession({
      userId: session.userId,
      username: session.username,
      displayName: session.displayName,
      roles: session.roles,
      activeRole: role,
      hasCompletedOnboarding: session.hasCompletedOnboarding,
      mustChangePassword: session.mustChangePassword,
    })

    await setSessionCookie(newToken)

    await AuditService.logAction({
      userId: session.userId,
      action: "SWITCH_ACTIVE_ROLE",
      entityType: "User",
      entityId: session.userId,
      oldValues: { role: session.activeRole },
      newValues: { role },
    })

    return NextResponse.json({ success: true, activeRole: role })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }
}
