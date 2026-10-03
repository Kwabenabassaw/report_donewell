"use server"

import { AuthService } from "@/server/services/AuthService"
import { setSessionCookie, clearSessionCookie, getSession } from "@/lib/auth/session"
import { headers } from "next/headers"
import { redirect } from "next/navigation"

export async function loginAction(formData: FormData) {
  const username = formData.get("username") as string
  const password = formData.get("password") as string

  if (!username || !password) {
    return { error: "Username and password are required." }
  }

    let target = "/dashboard"
    try {
      const headersList = await headers()
      const ipAddress = headersList.get("x-forwarded-for") || "127.0.0.1"
      const userAgent = headersList.get("user-agent") || undefined

      const result = await AuthService.login({
        username,
        password,
        ipAddress,
        userAgent,
      })

      await setSessionCookie(result.token)
      if (!result.user.hasCompletedOnboarding) {
        target = "/onboarding"
      }
    } catch (error: any) {
      return { error: error.message || "Authentication failed." }
    }

    redirect(target)
}

export async function logoutAction() {
  await clearSessionCookie()
  redirect("/login")
}

export async function getSessionAction() {
  return await getSession()
}
