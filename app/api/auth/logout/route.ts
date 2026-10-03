import { NextResponse, NextRequest } from "next/server"
import { clearSessionCookie, getSession, SESSION_COOKIE_NAME } from "@/lib/auth/session"
import { AuditService } from "@/server/services/AuditService"

async function performLogout(userId?: string, metadata?: Record<string, any>) {
  if (userId) {
    try {
      await AuditService.logAction({
        userId,
        action: "LOGOUT",
        entityType: "User",
        entityId: userId,
        newValues: metadata,
      })
    } catch (e) {
      console.error("[AuditService] Failed to log logout action:", e)
    }
  }
  await clearSessionCookie()
}

export async function POST() {
  const session = await getSession()

  await performLogout(session?.userId, {
    username: session?.username,
    activeRole: session?.activeRole,
  })

  const response = NextResponse.json({
    success: true,
    message: "Logged out successfully.",
  })

  response.cookies.set(SESSION_COOKIE_NAME, "", {
    path: "/",
    maxAge: 0,
    expires: new Date(0),
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
  })

  return response
}

export async function GET(request: NextRequest) {
  const session = await getSession()

  await performLogout(session?.userId, {
    username: session?.username,
    activeRole: session?.activeRole,
  })

  const loginUrl = new URL("/login?logged_out=true", request.url)
  const response = NextResponse.redirect(loginUrl)

  response.cookies.set(SESSION_COOKIE_NAME, "", {
    path: "/",
    maxAge: 0,
    expires: new Date(0),
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
  })

  return response
}
