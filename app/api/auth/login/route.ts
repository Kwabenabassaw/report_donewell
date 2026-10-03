import { NextRequest, NextResponse } from "next/server"
import { AuthService } from "@/server/services/AuthService"
import { setSessionCookie } from "@/lib/auth/session"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { username, password } = body

    if (!username || !password) {
      return NextResponse.json(
        { error: "Username and password are required." },
        { status: 400 }
      )
    }

    const ipAddress = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "127.0.0.1"
    const userAgent = request.headers.get("user-agent") || undefined

    const { user, token } = await AuthService.login({
      username,
      password,
      ipAddress,
      userAgent,
    })

    // Set HTTP-only signed session cookie
    await setSessionCookie(token)

    return NextResponse.json({
      success: true,
      user,
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Authentication failed." }, { status: 401 })
  }
}
