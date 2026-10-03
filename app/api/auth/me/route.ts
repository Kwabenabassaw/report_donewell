import { NextResponse } from "next/server"
import { getSession } from "@/lib/auth/session"
import { AuthService } from "@/server/services/AuthService"

export async function GET() {
  const session = await getSession()

  if (!session) {
    return NextResponse.json({ user: null }, { status: 401 })
  }

  const profile = await AuthService.getMe(session.userId)

  return NextResponse.json({
    user: {
      ...profile,
      activeRole: session.activeRole,
    },
  })
}
