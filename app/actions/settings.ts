"use server"

import { getSession } from "@/lib/auth/session"
import { ScopeGuard } from "@/lib/auth/scope-guard"
import { SchoolProfileService } from "@/server/services/SchoolProfileService"
import { uploadToStorage, STORAGE_BUCKETS } from "@/lib/supabase/storage"
import { revalidatePath } from "next/cache"
import fs from "fs/promises"
import path from "path"

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

export async function updateSchoolProfileSettingsAction(
  formData: FormData
): Promise<{ success: boolean; error?: string; crestUrl?: string; headmasterSignatureUrl?: string }> {
  try {
    const session = await assertAdministrative()

    const schoolName = formData.get("schoolName") as string
    const schoolCode = formData.get("schoolCode") as string
    const motto = (formData.get("motto") as string) || undefined
    const postalAddress = (formData.get("postalAddress") as string) || undefined
    const email = (formData.get("email") as string) || undefined
    const phone = (formData.get("phone") as string) || undefined
    let crestUrl = (formData.get("crestUrl") as string) || undefined
    let headmasterSignatureUrl = (formData.get("headmasterSignatureUrl") as string) || undefined

    // 1. Process School Crest / Logo File Upload
    const crestFile = formData.get("crestFile") as File | null
    if (crestFile && crestFile.size > 0 && crestFile.name !== "undefined") {
      try {
        const buffer = Buffer.from(await crestFile.arrayBuffer())
        const cleanName = crestFile.name.replace(/[^a-zA-Z0-9.-]/g, "_")
        const ext = cleanName.split(".").pop() || "png"
        const storagePath = `logos/school-logo-${Date.now()}.${ext}`

        const uploadRes = await uploadToStorage({
          bucket: STORAGE_BUCKETS.SCHOOL_ASSETS,
          path: storagePath,
          file: buffer,
          contentType: crestFile.type || "image/png",
          upsert: true,
        })

        if ("publicUrl" in uploadRes) {
          crestUrl = uploadRes.publicUrl
        } else {
          // Fallback to local filesystem storage
          const localDir = path.join(process.cwd(), "public", "uploads", "logos")
          await fs.mkdir(localDir, { recursive: true })
          const localFileName = `school-logo-${Date.now()}.${ext}`
          await fs.writeFile(path.join(localDir, localFileName), buffer)
          crestUrl = `/uploads/logos/${localFileName}`
        }
      } catch (err: any) {
        console.warn("Logo upload error, using local fallback:", err.message)
      }
    }

    // 2. Process Headmaster Signature File Upload
    const signatureFile = formData.get("signatureFile") as File | null
    if (signatureFile && signatureFile.size > 0 && signatureFile.name !== "undefined") {
      try {
        const buffer = Buffer.from(await signatureFile.arrayBuffer())
        const cleanName = signatureFile.name.replace(/[^a-zA-Z0-9.-]/g, "_")
        const ext = cleanName.split(".").pop() || "png"
        const storagePath = `signatures/headmaster-${Date.now()}.${ext}`

        const uploadRes = await uploadToStorage({
          bucket: STORAGE_BUCKETS.SIGNATURES,
          path: storagePath,
          file: buffer,
          contentType: signatureFile.type || "image/png",
          upsert: true,
        })

        if ("publicUrl" in uploadRes) {
          headmasterSignatureUrl = uploadRes.publicUrl
        } else {
          const localDir = path.join(process.cwd(), "public", "uploads", "signatures")
          await fs.mkdir(localDir, { recursive: true })
          const localFileName = `headmaster-${Date.now()}.${ext}`
          await fs.writeFile(path.join(localDir, localFileName), buffer)
          headmasterSignatureUrl = `/uploads/signatures/${localFileName}`
        }
      } catch (err: any) {
        console.warn("Signature upload error, using local fallback:", err.message)
      }
    }

    await SchoolProfileService.updateProfile(
      {
        schoolName,
        schoolCode,
        motto,
        postalAddress,
        email,
        phone,
        crestUrl,
        headmasterSignatureUrl,
      },
      session.userId
    )

    revalidatePath("/settings")
    revalidatePath("/reports")
    revalidatePath("/")

    return {
      success: true,
      crestUrl,
      headmasterSignatureUrl,
    }
  } catch (error: any) {
    return {
      success: false,
      error: error.message || "Failed to update school profile settings.",
    }
  }
}
