import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

async function main() {
  try {
    console.log("Connecting to PostgreSQL database at DATABASE_URL...")
    await prisma.$connect()
    console.log("✅ Successfully connected to PostgreSQL database!")

    // Test querying tables
    const userCount = await prisma.user.count()
    console.log(`Current user count in DB: ${userCount}`)
    const schoolCount = await prisma.schoolProfile.count()
    console.log(`Current school profile count in DB: ${schoolCount}`)
  } catch (error) {
    console.error("❌ Database connection error:\n", error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

main()
