import { supabase } from "./client"

export const STORAGE_BUCKETS = {
  SCHOOL_ASSETS: "school-assets",
  STUDENT_PHOTOS: "student-photos",
  REPORT_CARDS: "report-cards",
  SIGNATURES: "signatures",
} as const

export type StorageBucket = typeof STORAGE_BUCKETS[keyof typeof STORAGE_BUCKETS]

/**
 * Uploads a file buffer or Blob to Supabase Storage
 */
export async function uploadToStorage(params: {
  bucket: StorageBucket | string
  path: string
  file: Buffer | Blob | File | ArrayBuffer
  contentType?: string
  upsert?: boolean
}): Promise<{ path: string; publicUrl: string } | { error: string }> {
  try {
    const { bucket, path, file, contentType, upsert = true } = params

    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(path, file, {
        contentType,
        upsert,
      })

    if (error) {
      return { error: error.message }
    }

    const { data: publicData } = supabase.storage.from(bucket).getPublicUrl(data.path)

    return {
      path: data.path,
      publicUrl: publicData.publicUrl,
    }
  } catch (err: any) {
    return { error: err.message || "Failed to upload file to Supabase storage." }
  }
}

/**
 * Retrieves the public URL of a file in Supabase storage
 */
export function getStoragePublicUrl(bucket: StorageBucket | string, path: string): string {
  const { data } = supabase.storage.from(bucket).getPublicUrl(path)
  return data.publicUrl
}

/**
 * Deletes a file from Supabase storage
 */
export async function deleteFromStorage(
  bucket: StorageBucket | string,
  paths: string[]
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase.storage.from(bucket).remove(paths)
    if (error) return { success: false, error: error.message }
    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}
