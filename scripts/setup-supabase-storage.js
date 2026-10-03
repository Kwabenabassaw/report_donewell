import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://uxbrnmxcolmaelpcjarn.supabase.co"
const supabaseKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  "sb_publishable_KplbYQm-zWmxQbj8oTTG2Q_gMhqqWBV"

const supabase = createClient(supabaseUrl, supabaseKey)

const BUCKETS = [
  { id: "school-assets", public: true },
  { id: "student-photos", public: true },
  { id: "report-cards", public: true },
  { id: "signatures", public: true },
]

async function setupBuckets() {
  console.log(`Connecting to Supabase Storage at: ${supabaseUrl}...`)

  const { data: existingBuckets, error: listError } = await supabase.storage.listBuckets()
  if (listError) {
    console.error("Error listing buckets:", listError.message)
    console.log("Note: Creating/listing buckets directly requires service_role key or bucket policies. Attempting individual creation...")
  }

  const existingIds = new Set((existingBuckets || []).map((b) => b.id))

  for (const bucket of BUCKETS) {
    if (existingIds.has(bucket.id)) {
      console.log(`Bucket '${bucket.id}' already exists.`)
    } else {
      const { data, error } = await supabase.storage.createBucket(bucket.id, {
        public: bucket.public,
      })
      if (error) {
        console.log(`Bucket '${bucket.id}': ${error.message}`)
      } else {
        console.log(`✅ Created bucket: '${bucket.id}' (public: ${bucket.public})`)
      }
    }
  }

  console.log("Supabase storage setup completed.")
}

setupBuckets().catch(console.error)
