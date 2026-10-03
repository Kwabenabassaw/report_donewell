"use server"

import { getSession } from "@/lib/auth/session"
import { ScopeGuard } from "@/lib/auth/scope-guard"
import { UserService } from "@/server/services/UserService"
import { revalidatePath } from "next/cache"

async function assertAdministrative() {
  const session = await getSession()
  if (!session) {
    throw new Error("Unauthorized. Please log in.")
  }

  const isAdmin = ScopeGuard.isAdministrative({
    userId: session.userId,
    roles: session.roles,
  })

  if (!isAdmin) {
    throw new Error("Unauthorized: Administrative privileges required.")
  }

  return session
}

export async function createUserAction(formData: FormData): Promise<void> {
  const session = await assertAdministrative()

  const username = formData.get("username") as string
  const displayName = formData.get("displayName") as string
  const email = (formData.get("email") as string) || undefined
  const password = formData.get("password") as string
  const rawRoles = formData.getAll("roles") as string[]

  await UserService.createUser(
    {
      username,
      displayName,
      email,
      password,
      roles: rawRoles.length > 0 ? rawRoles : ["SUBJECT_TEACHER"],
    },
    session.userId
  )

  revalidatePath("/users")
}

export async function toggleUserStatusAction(userIdOrFormData: string | FormData): Promise<void> {
  const session = await assertAdministrative()
  const userId =
    typeof userIdOrFormData === "string"
      ? userIdOrFormData
      : (userIdOrFormData.get("userId") as string)

  if (!userId) throw new Error("User ID is required.")

  await UserService.toggleStatus(userId, session.userId)
  revalidatePath("/users")
}

export async function resetPasswordAction(
  userIdOrFormData: string | FormData,
  maybeFormData?: FormData
): Promise<void> {
  const session = await assertAdministrative()
  let userId: string
  let newPassword: string

  if (typeof userIdOrFormData === "string") {
    userId = userIdOrFormData
    newPassword = (maybeFormData?.get("newPassword") as string) || ""
  } else {
    userId = userIdOrFormData.get("userId") as string
    newPassword = (userIdOrFormData.get("newPassword") as string) || ""
  }

  if (!userId || !newPassword) {
    throw new Error("User ID and new password are required.")
  }

  await UserService.resetPassword(userId, newPassword, session.userId)
  revalidatePath("/users")
}

export async function updateUserAction(formData: FormData): Promise<void> {
  const session = await assertAdministrative()

  const userId = formData.get("userId") as string
  if (!userId) throw new Error("User ID is required.")

  const displayName = formData.get("displayName") as string
  const emailRaw = formData.get("email") as string
  const email = emailRaw ? emailRaw.trim() : null
  const status = (formData.get("status") as string) || undefined
  const passwordRaw = formData.get("password") as string
  const password = passwordRaw && passwordRaw.trim().length > 0 ? passwordRaw.trim() : undefined
  const rawRoles = formData.getAll("roles") as string[]

  await UserService.updateUser(
    userId,
    {
      displayName,
      email,
      status,
      password,
      roles: rawRoles.length > 0 ? rawRoles : undefined,
    },
    session.userId
  )

  revalidatePath("/users")
}

