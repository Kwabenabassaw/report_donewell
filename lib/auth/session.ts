import crypto from "crypto"
import { cookies } from "next/headers"

export const SESSION_COOKIE_NAME = "school_system_session"
const SESSION_SECRET = process.env.SESSION_SECRET || "school-report-system-secure-session-secret-key-32-chars-min"
const SESSION_EXPIRY_DAYS = 7

export interface SessionPayload {
  userId: string
  username: string
  displayName: string
  roles: string[]
  activeRole: string
  hasCompletedOnboarding: boolean
  mustChangePassword: boolean
  exp: number
}

/**
 * Creates an HMAC-SHA256 signed session token
 */
export function signSession(payload: Omit<SessionPayload, "exp">): string {
  const exp = Date.now() + SESSION_EXPIRY_DAYS * 24 * 60 * 60 * 1000
  const fullPayload: SessionPayload = { ...payload, exp }
  
  const encodedData = Buffer.from(JSON.stringify(fullPayload)).toString("base64url")
  const signature = crypto
    .createHmac("sha256", SESSION_SECRET)
    .update(encodedData)
    .digest("base64url")

  return `${encodedData}.${signature}`
}

/**
 * Verifies and decodes an HMAC-SHA256 signed session token
 */
export function verifySession(token: string): SessionPayload | null {
  try {
    const [encodedData, signature] = token.split(".")
    if (!encodedData || !signature) return null

    const expectedSignature = crypto
      .createHmac("sha256", SESSION_SECRET)
      .update(encodedData)
      .digest("base64url")

    // Constant-time comparison to prevent timing attacks
    if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
      return null
    }

    const payload: SessionPayload = JSON.parse(Buffer.from(encodedData, "base64url").toString("utf-8"))

    // Check expiration
    if (Date.now() > payload.exp) {
      return null
    }

    return payload
  } catch {
    return null
  }
}

/**
 * Sets the session cookie on response
 */
export async function setSessionCookie(token: string) {
  const cookieStore = await cookies()
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_EXPIRY_DAYS * 24 * 60 * 60,
  })
}

/**
 * Clears the session cookie
 */
export async function clearSessionCookie() {
  const cookieStore = await cookies()
  cookieStore.set(SESSION_COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
    expires: new Date(0),
  })
}

/**
 * Retrieves and validates the current session from incoming request cookies
 */
export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value
  if (!token) return null
  return verifySession(token)
}
