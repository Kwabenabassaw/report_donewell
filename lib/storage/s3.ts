import { S3Client, PutObjectCommand, DeleteObjectCommand, DeleteObjectsCommand } from "@aws-sdk/client-s3"

let _s3Client: S3Client | null = null

export function getS3Client(): S3Client {
  if (!_s3Client) {
    const endpoint = process.env.AWS_ENDPOINT_URL_S3 || "https://br-long-tooth-a5trbv6l.storage.c-1.us-east-2.aws.neon.tech"
    const region = process.env.AWS_REGION || "us-east-2"
    const accessKeyId = process.env.AWS_ACCESS_KEY_ID || ""
    const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY || ""

    _s3Client = new S3Client({
      endpoint,
      region,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
      forcePathStyle: true,
    })
  }
  return _s3Client
}

export const STORAGE_BUCKETS = {
  SCHOOL_ASSETS: "school-assets",
  STUDENT_PHOTOS: "student-photos",
  REPORT_CARDS: "report-cards",
  SIGNATURES: "signatures",
} as const

export type StorageBucket = typeof STORAGE_BUCKETS[keyof typeof STORAGE_BUCKETS]

const BUCKET_CONFIG: Record<string, { actualBucket: string; prefix: string }> = {
  "school-assets": { actualBucket: "donewell", prefix: "school-assets" },
  "student-photos": { actualBucket: "donewell", prefix: "student-photos" },
  "signatures": { actualBucket: "donewell", prefix: "signatures" },
  "report-cards": { actualBucket: "donewellreport", prefix: "report-cards" },
  "donewell": { actualBucket: "donewell", prefix: "" },
  "donewellreport": { actualBucket: "donewellreport", prefix: "" },
}

function resolveS3Location(bucketName: string, path: string): { bucket: string; key: string } {
  const config = BUCKET_CONFIG[bucketName]
  const cleanPath = path.replace(/^\/+/, "")
  if (config) {
    const key = config.prefix ? `${config.prefix}/${cleanPath}` : cleanPath
    return { bucket: config.actualBucket, key }
  }
  return { bucket: "donewell", key: cleanPath }
}

export function getStoragePublicUrl(bucket: StorageBucket | string, path: string): string {
  const endpoint = process.env.AWS_ENDPOINT_URL_S3 || "https://br-long-tooth-a5trbv6l.storage.c-1.us-east-2.aws.neon.tech"
  const { bucket: actualBucket, key } = resolveS3Location(bucket, path)
  return `${endpoint.replace(/\/+$/, "")}/${actualBucket}/${key}`
}

export async function uploadToStorage(params: {
  bucket: StorageBucket | string
  path: string
  file: Buffer | Blob | File | ArrayBuffer
  contentType?: string
  upsert?: boolean
}): Promise<{ path: string; publicUrl: string } | { error: string }> {
  try {
    const { bucket, path, file, contentType } = params
    const { bucket: actualBucket, key } = resolveS3Location(bucket, path)

    let bodyBuffer: Buffer
    if (Buffer.isBuffer(file)) {
      bodyBuffer = file
    } else if (file instanceof ArrayBuffer) {
      bodyBuffer = Buffer.from(file)
    } else if (typeof (file as any).arrayBuffer === "function") {
      const ab = await (file as any).arrayBuffer()
      bodyBuffer = Buffer.from(ab)
    } else {
      bodyBuffer = Buffer.from(file as any)
    }

    const s3 = getS3Client()
    await s3.send(
      new PutObjectCommand({
        Bucket: actualBucket,
        Key: key,
        Body: bodyBuffer,
        ContentType: contentType || "application/octet-stream",
      })
    )

    const publicUrl = getStoragePublicUrl(bucket, path)
    return {
      path: key,
      publicUrl,
    }
  } catch (err: any) {
    console.error("Storage upload error:", err)
    return { error: err.message || "Failed to upload file to S3 storage." }
  }
}

export async function deleteFromStorage(
  bucket: StorageBucket | string,
  paths: string[]
): Promise<{ success: boolean; error?: string }> {
  try {
    const s3 = getS3Client()
    const deletions = paths.map((p) => {
      const { bucket: actualBucket, key } = resolveS3Location(bucket, p)
      return s3.send(
        new DeleteObjectCommand({
          Bucket: actualBucket,
          Key: key,
        })
      )
    })

    await Promise.all(deletions)
    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}
