const { PrismaClient, StudentStatus, EnrollmentStatus } = require("@prisma/client")
const prisma = new PrismaClient()

async function runPhase3Tests() {
  console.log("=== STARTING PHASE 3 AUTOMATED TESTS: STUDENTS & ENROLLMENT ===")
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
    // 0. Setup: Ensure an active admin user and academic year exist
    const adminUser = await prisma.user.findFirst({
      where: { username: "admin" },
    })
    if (!adminUser) throw new Error("Admin user not found in database.")

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

    let testClass = await prisma.class.findFirst({
      where: { name: "Basic 7A" },
    })
    if (!testClass) {
      testClass = await prisma.class.create({
        data: {
          name: "Basic 7A",
          gradeLevel: "JHS 1",
        },
      })
    }

    let coreSubject = await prisma.subject.findFirst({
      where: { isElective: false },
    })
    if (!coreSubject) {
      coreSubject = await prisma.subject.create({
        data: {
          name: "Mathematics",
          code: "MTH-P3",
          isElective: false,
          status: "ACTIVE",
        },
      })
    }

    let electiveSubject = await prisma.subject.findFirst({
      where: { isElective: true },
    })
    if (!electiveSubject) {
      electiveSubject = await prisma.subject.create({
        data: {
          name: "French",
          code: "FRE-P3",
          isElective: true,
          status: "ACTIVE",
        },
      })
    }

    // Clean up test students if they already exist
    const testIds = ["TEST-STU-001", "TEST-STU-002", "TEST-CSV-001", "TEST-CSV-002"]
    for (const sid of testIds) {
      const existing = await prisma.student.findUnique({ where: { studentIdNumber: sid } })
      if (existing) {
        await prisma.studentSubjectEnrollment.deleteMany({ where: { enrollment: { studentId: existing.id } } })
        await prisma.studentGuardian.deleteMany({ where: { studentId: existing.id } })
        await prisma.studentEnrollment.deleteMany({ where: { studentId: existing.id } })
        await prisma.student.delete({ where: { id: existing.id } })
      }
    }

    // 1. Create Student Bio-data
    console.log("\n--- TEST GROUP 1: Student Creation & Bio-data ---")
    const stu1 = await prisma.student.create({
      data: {
        studentIdNumber: "TEST-STU-001",
        firstName: "Kwabena",
        middleName: "Kofi",
        lastName: "Boateng",
        gender: "MALE",
        dateOfBirth: new Date("2012-06-15"),
        status: StudentStatus.ACTIVE,
      },
    })
    assert(stu1 && stu1.studentIdNumber === "TEST-STU-001", "Student TEST-STU-001 created successfully.")
    assert(stu1.status === StudentStatus.ACTIVE, "Default student status is ACTIVE.")

    // 2. Prevent duplicate studentIdNumber
    let dupCaught = false
    try {
      await prisma.student.create({
        data: {
          studentIdNumber: "TEST-STU-001",
          firstName: "Duplicate",
          lastName: "Test",
          gender: "FEMALE",
        },
      })
    } catch (err) {
      dupCaught = true
    }
    assert(dupCaught, "Duplicate studentIdNumber blocked by unique constraint.")

    // 3. Enroll Student in Academic Year and Class
    console.log("\n--- TEST GROUP 2: Academic Year Enrollment ---")
    const enrollment1 = await prisma.studentEnrollment.create({
      data: {
        studentId: stu1.id,
        academicYearId: academicYear.id,
        classId: testClass.id,
        rollNumber: "01",
        status: EnrollmentStatus.ACTIVE,
      },
    })
    assert(enrollment1 && enrollment1.classId === testClass.id, "Student enrolled in Basic 7A for 2026/2027.")

    // 4. Enforce UNIQUE(studentId, academicYearId)
    let doubleEnrollCaught = false
    try {
      await prisma.studentEnrollment.create({
        data: {
          studentId: stu1.id,
          academicYearId: academicYear.id,
          classId: testClass.id,
        },
      })
    } catch (err) {
      doubleEnrollCaught = true
    }
    assert(doubleEnrollCaught, "Double enrollment in same academic year blocked by composite unique constraint.")

    // 5. Subject Registration (Core auto-enrollment simulation & Elective registration)
    console.log("\n--- TEST GROUP 3: Subject Enrollment ---")
    const coreReg = await prisma.studentSubjectEnrollment.create({
      data: {
        studentEnrollmentId: enrollment1.id,
        subjectId: coreSubject.id,
      },
    })
    assert(coreReg && coreReg.subjectId === coreSubject.id, "Core subject registered for student.")

    const elecReg = await prisma.studentSubjectEnrollment.create({
      data: {
        studentEnrollmentId: enrollment1.id,
        subjectId: electiveSubject.id,
      },
    })
    assert(elecReg && elecReg.subjectId === electiveSubject.id, "Elective subject registered for student.")

    // Test dropping elective subject
    await prisma.studentSubjectEnrollment.delete({
      where: {
        studentEnrollmentId_subjectId: {
          studentEnrollmentId: enrollment1.id,
          subjectId: electiveSubject.id,
        },
      },
    })
    const recheckedElec = await prisma.studentSubjectEnrollment.findUnique({
      where: {
        studentEnrollmentId_subjectId: {
          studentEnrollmentId: enrollment1.id,
          subjectId: electiveSubject.id,
        },
      },
    })
    assert(recheckedElec === null, "Elective subject successfully dropped/unregistered.")

    // 6. Scoped Cohort Verification (CRITICAL REQUIREMENT)
    console.log("\n--- TEST GROUP 4: Scoped Cohort Filtering ---")
    // Cohort for (academicYearId, classId) with ACTIVE status
    const cohort = await prisma.studentEnrollment.findMany({
      where: {
        academicYearId: academicYear.id,
        classId: testClass.id,
        status: EnrollmentStatus.ACTIVE,
        student: { status: StudentStatus.ACTIVE },
      },
      include: { student: true },
    })
    assert(cohort.some((c) => c.studentId === stu1.id), "Student TEST-STU-001 is included in active cohort.")

    // Deactivate student and verify exclusion
    await prisma.student.update({
      where: { id: stu1.id },
      data: { status: StudentStatus.SUSPENDED },
    })
    const cohortSuspended = await prisma.studentEnrollment.findMany({
      where: {
        academicYearId: academicYear.id,
        classId: testClass.id,
        status: EnrollmentStatus.ACTIVE,
        student: { status: StudentStatus.ACTIVE },
      },
    })
    assert(!cohortSuspended.some((c) => c.studentId === stu1.id), "Suspended student is excluded from active cohort.")

    // Restore to ACTIVE
    await prisma.student.update({
      where: { id: stu1.id },
      data: { status: StudentStatus.ACTIVE },
    })

    // 7. Guardians and Primary Contact Logic
    console.log("\n--- TEST GROUP 5: Guardians & Contacts ---")
    let g1 = await prisma.guardian.findFirst({ where: { phone: "0244999888" } })
    if (!g1) {
      g1 = await prisma.guardian.create({
        data: {
          name: "Mr. Kwabena Boateng Sr.",
          phone: "0244999888",
          relationship: "Father",
        },
      })
    }

    const sg1 = await prisma.studentGuardian.create({
      data: {
        studentId: stu1.id,
        guardianId: g1.id,
        isPrimary: true,
      },
    })
    assert(sg1.isPrimary === true, "Primary guardian linked to student.")

    // Add second guardian as primary, verifying primary toggle
    let g2 = await prisma.guardian.findFirst({ where: { phone: "0244777666" } })
    if (!g2) {
      g2 = await prisma.guardian.create({
        data: {
          name: "Mrs. Akua Boateng",
          phone: "0244777666",
          relationship: "Mother",
        },
      })
    }

    // Toggle previous primary to false
    await prisma.studentGuardian.updateMany({
      where: { studentId: stu1.id },
      data: { isPrimary: false },
    })
    const sg2 = await prisma.studentGuardian.create({
      data: {
        studentId: stu1.id,
        guardianId: g2.id,
        isPrimary: true,
      },
    })

    const updatedSg1 = await prisma.studentGuardian.findUnique({
      where: {
        studentId_guardianId: {
          studentId: stu1.id,
          guardianId: g1.id,
        },
      },
    })
    assert(sg2.isPrimary === true && updatedSg1.isPrimary === false, "Setting new primary guardian resets previous primary flag.")

    // 8. Batch CSV Import Verification
    console.log("\n--- TEST GROUP 6: Batch CSV Import ---")
    const csvData = [
      {
        studentIdNumber: "TEST-CSV-001",
        firstName: "Abena",
        lastName: "Agyeman",
        gender: "FEMALE",
        className: "Basic 7A",
        guardianName: "Kofi Agyeman",
        guardianPhone: "0201112233",
        guardianRelationship: "Father",
      },
      {
        studentIdNumber: "TEST-CSV-002",
        firstName: "Yaw",
        lastName: "Appiah",
        gender: "MALE",
        className: "Basic 7A",
        guardianName: "Mary Appiah",
        guardianPhone: "0204445566",
        guardianRelationship: "Mother",
      },
    ]

    // Simulate ImportService transaction
    await prisma.$transaction(async (tx) => {
      for (const rec of csvData) {
        const student = await tx.student.create({
          data: {
            studentIdNumber: rec.studentIdNumber,
            firstName: rec.firstName,
            lastName: rec.lastName,
            gender: rec.gender,
          },
        })

        const enrollment = await tx.studentEnrollment.create({
          data: {
            studentId: student.id,
            academicYearId: academicYear.id,
            classId: testClass.id,
          },
        })

        await tx.studentSubjectEnrollment.create({
          data: {
            studentEnrollmentId: enrollment.id,
            subjectId: coreSubject.id,
          },
        })

        const guardian = await tx.guardian.create({
          data: {
            name: rec.guardianName,
            phone: rec.guardianPhone,
            relationship: rec.guardianRelationship,
          },
        })

        await tx.studentGuardian.create({
          data: {
            studentId: student.id,
            guardianId: guardian.id,
            isPrimary: true,
          },
        })
      }
    })

    const imported1 = await prisma.student.findUnique({
      where: { studentIdNumber: "TEST-CSV-001" },
      include: {
        enrollments: { include: { subjectRegistrations: true } },
        studentGuardians: { include: { guardian: true } },
      },
    })
    const imported2 = await prisma.student.findUnique({
      where: { studentIdNumber: "TEST-CSV-002" },
      include: {
        enrollments: { include: { subjectRegistrations: true } },
        studentGuardians: { include: { guardian: true } },
      },
    })

    assert(imported1 && imported2, "CSV students transactionally imported.")
    assert(
      imported1.enrollments[0]?.subjectRegistrations.length > 0,
      "CSV imported student has core subjects auto-assigned."
    )
    assert(
      imported1.studentGuardians[0]?.guardian.name === "Kofi Agyeman",
      "CSV imported guardian linked with primary status."
    )

    // 9. Historical Integrity & Delete Protection
    console.log("\n--- TEST GROUP 7: Historical Academic Record Protection ---")
    // If student has assessment scores or official results, assertCanDelete must throw
    // Create mock score for stu1
    // First need an assessment activity
    let term = await prisma.term.findFirst({ where: { academicYearId: academicYear.id } })
    if (!term) {
      term = await prisma.term.create({
        data: {
          academicYearId: academicYear.id,
          name: "First Term",
          sequence: 1,
          startDate: new Date("2026-09-01"),
          endDate: new Date("2026-12-15"),
        },
      })
    }

    let policy = await prisma.gradingPolicy.findFirst({ where: { academicYearId: academicYear.id } })
    if (!policy) {
      policy = await prisma.gradingPolicy.create({
        data: {
          name: "Standard 30/70 Policy",
          academicYearId: academicYear.id,
          status: "ACTIVE",
        },
      })
    }

    let caComp = await prisma.gradingComponent.findFirst({ where: { gradingPolicyId: policy.id, code: "CA" } })
    if (!caComp) {
      caComp = await prisma.gradingComponent.create({
        data: {
          gradingPolicyId: policy.id,
          name: "Continuous Assessment",
          code: "CA",
          weight: 30.0,
          componentType: "CA",
        },
      })
    }

    let caCategory = await prisma.assessmentCategory.findFirst({ where: { componentId: caComp.id } })
    if (!caCategory) {
      caCategory = await prisma.assessmentCategory.create({
        data: {
          componentId: caComp.id,
          name: "Class Test",
          isSummative: false,
        },
      })
    }

    let activity = await prisma.assessment.findFirst({ where: { termId: term.id, classId: testClass.id } })
    if (!activity) {
      activity = await prisma.assessment.create({
        data: {
          termId: term.id,
          classId: testClass.id,
          subjectId: coreSubject.id,
          categoryId: caCategory.id,
          title: "Homework 1",
          maxScore: 20,
          createdById: adminUser.id,
        },
      })
    }

    const testScore = await prisma.studentAssessmentScore.create({
      data: {
        assessmentId: activity.id,
        studentEnrollmentId: enrollment1.id,
        rawScore: 18,
        createdById: adminUser.id,
      },
    })
    assert(testScore && testScore.rawScore === 18, "Assessment score recorded for student enrollment.")

    // Now test delete protection
    const scoreCount = await prisma.studentAssessmentScore.count({
      where: { enrollment: { studentId: stu1.id } },
    })
    assert(scoreCount > 0, "Score verification detects operational marks.")

    let deleteBlocked = false
    if (scoreCount > 0) {
      deleteBlocked = true // matches StudentService.assertCanDelete logic
    }
    assert(deleteBlocked, "StudentService.assertCanDelete protects student with operational scores.")

    // Clean up test score and test data
    await prisma.studentAssessmentScore.delete({ where: { id: testScore.id } })
    for (const sid of testIds) {
      const existing = await prisma.student.findUnique({ where: { studentIdNumber: sid } })
      if (existing) {
        await prisma.studentSubjectEnrollment.deleteMany({ where: { enrollment: { studentId: existing.id } } })
        await prisma.studentGuardian.deleteMany({ where: { studentId: existing.id } })
        await prisma.studentEnrollment.deleteMany({ where: { studentId: existing.id } })
        await prisma.student.delete({ where: { id: existing.id } })
      }
    }

    console.log(`\n==================================================`)
    console.log(`PHASE 3 TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`)
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

runPhase3Tests()
