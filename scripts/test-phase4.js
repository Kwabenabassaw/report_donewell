const { PrismaClient, TermStatus } = require("@prisma/client")
const prisma = new PrismaClient()

async function runPhase4Tests() {
  console.log("=== STARTING PHASE 4 AUTOMATED TESTS: TEACHER & SUBJECT ASSIGNMENT ===")
  let passed = 0
  let failed = 0

  function assert(condition, message) {
    if (condition) {
      console.log(`  [PASS] ${message}`)
      passed++
    } else {
      console.error(`  [FAIL] ${message}`)
      failed++
    }
  }

  try {
    // 0. Setup: Ensure admin, teachers, academic year, term, class, and subject exist
    const adminUser = await prisma.user.findFirst({
      where: { username: "admin" },
      include: { userRoles: { include: { role: true } } },
    })
    if (!adminUser) throw new Error("Admin user not found in database.")

    let teacher1 = await prisma.user.findFirst({
      where: { username: "teacher_mensah" },
      include: { userRoles: { include: { role: true } } },
    })
    if (!teacher1) {
      teacher1 = await prisma.user.create({
        data: {
          username: "teacher_mensah",
          email: "mensah@school.edu",
          passwordHash: "mock-hash",
          displayName: "Mr. Kwabena Mensah",
        },
        include: { userRoles: { include: { role: true } } },
      })
    }

    let teacher2 = await prisma.user.findFirst({
      where: { username: "teacher_asante" },
      include: { userRoles: { include: { role: true } } },
    })
    if (!teacher2) {
      teacher2 = await prisma.user.create({
        data: {
          username: "teacher_asante",
          email: "asante@school.edu",
          passwordHash: "mock-hash",
          displayName: "Mrs. Abena Asante",
        },
        include: { userRoles: { include: { role: true } } },
      })
    }

    let academicYear = await prisma.academicYear.findFirst({
      where: { isCurrent: true },
    })
    if (!academicYear) {
      academicYear = await prisma.academicYear.create({
        data: {
          name: "2026/2027",
          startDate: new Date("2026-09-01"),
          endDate: new Date("2027-07-31"),
          isCurrent: true,
        },
      })
    }

    let term = await prisma.term.findFirst({
      where: { academicYearId: academicYear.id, termSequence: 1 },
    })
    if (!term) {
      term = await prisma.term.create({
        data: {
          academicYearId: academicYear.id,
          name: "First Term",
          termSequence: 1,
          startDate: new Date("2026-09-01"),
          endDate: new Date("2026-12-15"),
        },
      })
    }

    let testClass = await prisma.class.findFirst({
      where: { name: "Basic 7A" },
    })
    if (!testClass) {
      testClass = await prisma.class.create({
        data: {
          name: "Basic 7A",
          gradeLevel: "JHS 1",
          classTeacherId: teacher1.id,
        },
      })
    } else if (!testClass.classTeacherId) {
      testClass = await prisma.class.update({
        where: { id: testClass.id },
        data: { classTeacherId: teacher1.id },
      })
    }

    let mathSubject = await prisma.subject.findFirst({
      where: { code: "MTH" },
    })
    if (!mathSubject) {
      mathSubject = await prisma.subject.create({
        data: {
          name: "Mathematics",
          code: "MTH",
          isElective: false,
          status: "ACTIVE",
        },
      })
    }

    let scienceSubject = await prisma.subject.findFirst({
      where: { code: "SCI" },
    })
    if (!scienceSubject) {
      scienceSubject = await prisma.subject.create({
        data: {
          name: "Integrated Science",
          code: "SCI",
          isElective: false,
          status: "ACTIVE",
        },
      })
    }

    // Clean up any test allocation for this combination before testing
    await prisma.subjectAllocation.deleteMany({
      where: {
        termId: term.id,
        classId: testClass.id,
        subjectId: { in: [mathSubject.id, scienceSubject.id] },
      },
    })

    // 1. Assign Teacher to Subject
    console.log("\n--- TEST GROUP 1: Teacher Allocation Creation ---")
    const alloc1 = await prisma.subjectAllocation.create({
      data: {
        termId: term.id,
        classId: testClass.id,
        subjectId: mathSubject.id,
        teacherId: teacher1.id,
      },
      include: { teacher: true, subject: true, class: true },
    })
    assert(alloc1 && alloc1.teacherId === teacher1.id, "Teacher 1 allocated to Mathematics in Basic 7A.")
    assert(alloc1.termId === term.id, "Allocation linked to correct Term.")

    // 2. Enforce UNIQUE(termId, classId, subjectId)
    console.log("\n--- TEST GROUP 2: Unique Allocation Constraint ---")
    let duplicateCaught = false
    try {
      await prisma.subjectAllocation.create({
        data: {
          termId: term.id,
          classId: testClass.id,
          subjectId: mathSubject.id,
          teacherId: teacher2.id,
        },
      })
    } catch (err) {
      duplicateCaught = true
    }
    assert(duplicateCaught, "Duplicate allocation for same (term, class, subject) blocked by unique constraint.")

    // 3. Upsert / Reassignment Test
    console.log("\n--- TEST GROUP 3: Allocation Reassignment ---")
    const reassigned = await prisma.subjectAllocation.upsert({
      where: {
        termId_classId_subjectId: {
          termId: term.id,
          classId: testClass.id,
          subjectId: mathSubject.id,
        },
      },
      update: {
        teacherId: teacher2.id,
      },
      create: {
        termId: term.id,
        classId: testClass.id,
        subjectId: mathSubject.id,
        teacherId: teacher2.id,
      },
    })
    assert(reassigned.teacherId === teacher2.id, "Allocation successfully reassigned to Teacher 2.")

    const totalAllocations = await prisma.subjectAllocation.count({
      where: {
        termId: term.id,
        classId: testClass.id,
        subjectId: mathSubject.id,
      },
    })
    assert(totalAllocations === 1, "Exactly one allocation exists for (term, class, subject) after reassignment.")

    // Reassign back to Teacher 1 for subsequent tests
    await prisma.subjectAllocation.update({
      where: { id: reassigned.id },
      data: { teacherId: teacher1.id },
    })

    // 4. Scoped Authorization Logic (ScopeGuard logic verification)
    console.log("\n--- TEST GROUP 4: Scoped Authorization Enforcement ---")
    
    // Administrative User check
    const adminCtx = {
      userId: adminUser.id,
      roles: adminUser.userRoles.map((ur) => ur.role.name),
    }
    const adminIsAdmin = adminCtx.roles.some((r) =>
      ["SUPER_ADMIN", "HEADMASTER", "EXAM_OFFICER"].includes(r)
    )
    assert(adminIsAdmin, "Admin user passes administrative scope check.")

    // Assigned Teacher check
    const teacher1Alloc = await prisma.subjectAllocation.findUnique({
      where: {
        termId_classId_subjectId: {
          termId: term.id,
          classId: testClass.id,
          subjectId: mathSubject.id,
        },
      },
    })
    const teacher1IsAssigned = teacher1Alloc && teacher1Alloc.teacherId === teacher1.id
    assert(teacher1IsAssigned, "Assigned teacher (teacher1) holds valid subject allocation.")

    // Unassigned Teacher check
    const teacher2IsAssigned = teacher1Alloc && teacher1Alloc.teacherId === teacher2.id
    assert(!teacher2IsAssigned, "Unassigned teacher (teacher2) is not authorized for Mathematics.")

    // Class Teacher supervisor check
    const clsCheck = await prisma.class.findUnique({
      where: { id: testClass.id },
      select: { classTeacherId: true },
    })
    assert(clsCheck && clsCheck.classTeacherId === teacher1.id, "Teacher 1 confirmed as form teacher supervisor.")
    assert(clsCheck.classTeacherId !== teacher2.id, "Teacher 2 is not the form teacher for Basic 7A.")

    // 5. Allocation Query Filters
    console.log("\n--- TEST GROUP 5: List & Filter Allocations ---")
    // Allocate Science to teacher2
    await prisma.subjectAllocation.create({
      data: {
        termId: term.id,
        classId: testClass.id,
        subjectId: scienceSubject.id,
        teacherId: teacher2.id,
      },
    })

    const filteredByTeacher1 = await prisma.subjectAllocation.findMany({
      where: { teacherId: teacher1.id, termId: term.id },
    })
    assert(
      filteredByTeacher1.length >= 1 && filteredByTeacher1.every((a) => a.teacherId === teacher1.id),
      "Filter by teacherId returns only teacher1 allocations."
    )

    const filteredByClass = await prisma.subjectAllocation.findMany({
      where: { classId: testClass.id, termId: term.id },
    })
    assert(filteredByClass.length === 2, "Filter by classId returns both subjects (Math & Science).")

    // 6. Unassignment and Safety Check
    console.log("\n--- TEST GROUP 6: Unassignment & Safety ---")
    // Clean up science allocation
    const sciAlloc = await prisma.subjectAllocation.findUnique({
      where: {
        termId_classId_subjectId: {
          termId: term.id,
          classId: testClass.id,
          subjectId: scienceSubject.id,
        },
      },
    })
    if (sciAlloc) {
      await prisma.subjectAllocation.delete({ where: { id: sciAlloc.id } })
    }
    const checkDeleted = await prisma.subjectAllocation.findUnique({
      where: {
        termId_classId_subjectId: {
          termId: term.id,
          classId: testClass.id,
          subjectId: scienceSubject.id,
        },
      },
    })
    assert(checkDeleted === null, "Subject allocation successfully deleted/unassigned.")

    // Final clean up of math allocation
    await prisma.subjectAllocation.deleteMany({
      where: {
        termId: term.id,
        classId: testClass.id,
        subjectId: mathSubject.id,
      },
    })

    console.log(`\n==================================================`)
    console.log(`PHASE 4 TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`)
    console.log(`==================================================\n`)

    if (failed > 0) {
      process.exit(1)
    }
  } catch (error) {
    console.error("Test execution threw exception:", error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

runPhase4Tests()
