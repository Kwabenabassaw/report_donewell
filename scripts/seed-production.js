import { PrismaClient } from "@prisma/client"
import bcrypt from "bcryptjs"

const prisma = new PrismaClient()

async function main() {
  console.log("=========================================================")
  console.log("🌱 Seeding Important Production Data")
  console.log("   School: DoneWell Academy")
  console.log("=========================================================\n")

  // 1. School Profile
  console.log("1. Setting up School Profile...")
  const schoolProfile = await prisma.schoolProfile.upsert({
    where: { schoolCode: "DWA-001" },
    update: {
      schoolName: "DoneWell Academy",
      motto: "Knowledge, Integrity, and Excellence",
      email: "info@donewellacademy.edu",
      phone: "+233 24 000 0000",
      postalAddress: "P.O. Box DW 100, Accra, Ghana",
    },
    create: {
      schoolName: "DoneWell Academy",
      schoolCode: "DWA-001",
      motto: "Knowledge, Integrity, and Excellence",
      email: "info@donewellacademy.edu",
      phone: "+233 24 000 0000",
      postalAddress: "P.O. Box DW 100, Accra, Ghana",
    },
  })
  console.log(`✅ School Profile configured: ${schoolProfile.schoolName} (${schoolProfile.schoolCode})`)

  // 2. Foundational System Roles
  console.log("\n2. Initializing Core Roles...")
  const ROLES = [
    { name: "SUPER_ADMIN", description: "Super Administrator with school-wide configuration and security privileges" },
    { name: "HEADMASTER", description: "Executive Headmaster / Principal with terminal report sign-off authority" },
    { name: "EXAM_OFFICER", description: "Assessment & Examination Officer responsible for grading policies and moderation" },
    { name: "CLASS_TEACHER", description: "Form Master / Class Supervisor responsible for attendance and conduct evaluations" },
    { name: "SUBJECT_TEACHER", description: "Course Instructor authorized for live spreadsheet mark entry" },
    { name: "STUDENT", description: "Enrolled student with learner portal and terminal report card access" },
    { name: "GUARDIAN", description: "Parent or legal guardian with ward report card and SMS alert access" },
  ]

  const roleMap = new Map()
  for (const r of ROLES) {
    const roleRecord = await prisma.role.upsert({
      where: { name: r.name },
      update: { description: r.description },
      create: { name: r.name, description: r.description },
    })
    roleMap.set(r.name, roleRecord.id)
    console.log(`   - Role initialized: ${r.name}`)
  }

  // 3. Initial Root System Administrator
  console.log("\n3. Creating Root System Administrator...")
  const adminPasswordHash = await bcrypt.hash("Password123!", 10)
  const adminUser = await prisma.user.upsert({
    where: { username: "admin" },
    update: {
      displayName: "DoneWell Administrator",
      email: "admin@donewellacademy.edu",
    },
    create: {
      username: "admin",
      displayName: "DoneWell Administrator",
      email: "admin@donewellacademy.edu",
      passwordHash: adminPasswordHash,
      status: "ACTIVE",
      hasCompletedOnboarding: false,
      mustChangePassword: true,
      userRoles: {
        create: {
          roleId: roleMap.get("SUPER_ADMIN"),
        },
      },
    },
  })
  console.log(`✅ Root Administrator initialized: ${adminUser.username} (mustChangePassword=true, hasCompletedOnboarding=false)`)

  // 4. Academic Calendar (Current Year & Terms)
  console.log("\n4. Initializing Academic Calendar...")
  const academicYear = await prisma.academicYear.upsert({
    where: { name: "2026/2027" },
    update: {
      isCurrent: true,
      status: "ACTIVE",
    },
    create: {
      name: "2026/2027",
      startDate: new Date("2026-09-01"),
      endDate: new Date("2027-07-31"),
      isCurrent: true,
      status: "ACTIVE",
      terms: {
        create: [
          {
            name: "First Term",
            termSequence: 1,
            startDate: new Date("2026-09-08"),
            endDate: new Date("2026-12-18"),
            totalSchoolDays: 65,
            status: "MARK_ENTRY",
          },
          {
            name: "Second Term",
            termSequence: 2,
            startDate: new Date("2027-01-12"),
            endDate: new Date("2027-04-09"),
            totalSchoolDays: 60,
            status: "DRAFT",
          },
          {
            name: "Third Term",
            termSequence: 3,
            startDate: new Date("2027-05-04"),
            endDate: new Date("2027-07-23"),
            totalSchoolDays: 58,
            status: "DRAFT",
          },
        ],
      },
    },
  })
  console.log(`✅ Academic Year initialized: ${academicYear.name} (isCurrent=true, status=ACTIVE)`)

  // 5. Standard Academic Grading Policy
  console.log("\n5. Initializing Standard Academic Grading Policy...")
  const existingPolicy = await prisma.gradingPolicy.findFirst({
    where: { name: "Standard 9-Point Academic Grading Framework" },
  })

  if (!existingPolicy) {
    const policy = await prisma.gradingPolicy.create({
      data: {
        name: "Standard 9-Point Academic Grading Framework",
        academicYearId: academicYear.id,
        rankingMethod: "DENSE_RANK",
        status: "ACTIVE",
        components: {
          create: [
            {
              name: "Continuous Assessment",
              code: "CA",
              weight: 30.0,
              componentType: "CA",
              sortOrder: 1,
              categories: {
                create: [
                  { name: "Classwork & Quizzes", isSummative: false },
                  { name: "Mid-Term Assessment", isSummative: false },
                ],
              },
            },
            {
              name: "Terminal Examination",
              code: "EXAM",
              weight: 70.0,
              componentType: "EXAM",
              sortOrder: 2,
              categories: {
                create: [
                  { name: "End of Term Examination", isSummative: true },
                ],
              },
            },
          ],
        },
        gradeBands: {
          create: [
            { grade: "A1", minimumScore: 80.0, maximumScore: 100.0, gradePoint: 1.0, interpretation: "Excellent", sortOrder: 1 },
            { grade: "B2", minimumScore: 70.0, maximumScore: 79.99, gradePoint: 2.0, interpretation: "Very Good", sortOrder: 2 },
            { grade: "B3", minimumScore: 65.0, maximumScore: 69.99, gradePoint: 3.0, interpretation: "Good", sortOrder: 3 },
            { grade: "C4", minimumScore: 60.0, maximumScore: 64.99, gradePoint: 4.0, interpretation: "Credit", sortOrder: 4 },
            { grade: "C5", minimumScore: 55.0, maximumScore: 59.99, gradePoint: 5.0, interpretation: "Credit", sortOrder: 5 },
            { grade: "C6", minimumScore: 50.0, maximumScore: 54.99, gradePoint: 6.0, interpretation: "Credit", sortOrder: 6 },
            { grade: "D7", minimumScore: 45.0, maximumScore: 49.99, gradePoint: 7.0, interpretation: "Pass", sortOrder: 7 },
            { grade: "E8", minimumScore: 40.0, maximumScore: 44.99, gradePoint: 8.0, interpretation: "Pass", sortOrder: 8 },
            { grade: "F9", minimumScore: 0.0, maximumScore: 39.99, gradePoint: 9.0, interpretation: "Fail", sortOrder: 9 },
          ],
        },
      },
    })
    console.log(`✅ Grading Policy initialized: ${policy.name} (30% CA, 70% Exam, A1-F9 scale)`)
  } else {
    console.log(`✅ Grading Policy already exists: ${existingPolicy.name}`)
  }

  console.log("\n=========================================================")
  console.log("🎉 Production Database Seeding Complete!")
  console.log("   - Zero dummy students or mock scores created.")
  console.log("   - Root administrator ready to onboard.")
  console.log("   - Academic year, terms, and grading scales primed.")
  console.log("=========================================================")
}

main()
  .catch((e) => {
    console.error("❌ Seeding failed:", e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
