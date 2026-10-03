import { prisma } from "../lib/prisma.ts"
import { AcademicYearService } from "../server/services/AcademicYearService.ts"
import { TermService } from "../server/services/TermService.ts"
import { ClassService } from "../server/services/ClassService.ts"
import { SubjectService } from "../server/services/SubjectService.ts"
import { TermStatus, AcademicYearStatus } from "@prisma/client"

let passed = 0
let failed = 0

function assert(condition, message) {
  if (condition) {
    console.log(`  ✅ PASS: ${message}`)
    passed++
  } else {
    console.error(`  ❌ FAIL: ${message}`)
    failed++
  }
}

async function runTests() {
  console.log("==========================================")
  console.log("PHASE 2: ACADEMIC STRUCTURE TEST SUITE")
  console.log("==========================================")

  let testYearId = null
  let testTermId = null
  let testClassId = null
  let testSubjectId = null

  try {
    const adminUser = await prisma.user.findUnique({ where: { username: "admin" } })
    const adminId = adminUser?.id

    // 1. Academic Year Creation & Date Validation
    console.log("\n1. Testing Academic Year Date Validation...")
    try {
      await AcademicYearService.createAcademicYear({
        name: "Invalid Year",
        startDate: new Date("2028-09-01"),
        endDate: new Date("2028-08-01"), // End before start
      })
      assert(false, "Start date >= End date should have failed")
    } catch (e) {
      assert(e.code === "INVALID_ACADEMIC_YEAR" || e.message.includes("Start date"), "Invalid year dates rejected correctly")
    }

    const newYear = await AcademicYearService.createAcademicYear({
      name: `Test Year ${Date.now()}`,
      startDate: new Date("2028-09-01"),
      endDate: new Date("2029-07-31"),
      isCurrent: false,
    })
    testYearId = newYear.id
    assert(newYear !== null && newYear.id !== undefined, "Valid academic year created successfully")

    // Test Single Current Academic Year rule
    await AcademicYearService.setCurrentYear(newYear.id)
    const currentYear = await AcademicYearService.getCurrentYear()
    assert(currentYear?.id === newYear.id, "Academic year set as current")

    const allCurrentYears = await prisma.academicYear.count({ where: { isCurrent: true } })
    assert(allCurrentYears === 1, "Exactly one academic year has is_current=true")

    // 2. Term Creation & Boundary Validation
    console.log("\n2. Testing Term Boundaries & Date Validation...")
    try {
      await TermService.createTerm({
        academicYearId: newYear.id,
        name: "Out of Bounds Term",
        termSequence: 1,
        startDate: new Date("2027-01-01"), // Before academic year start (2028-09-01)
        endDate: new Date("2028-12-15"),
      })
      assert(false, "Term dates outside academic year boundaries should have failed")
    } catch (e) {
      assert(e.code === "INVALID_TERM_DATES" || e.message.includes("boundary") || e.message.includes("fall entirely"), "Term dates outside academic year boundary rejected")
    }

    // Valid Term
    const newTerm = await TermService.createTerm({
      academicYearId: newYear.id,
      name: "Test First Term",
      termSequence: 1,
      startDate: new Date("2028-09-10"),
      endDate: new Date("2028-12-18"),
      totalSchoolDays: 65,
    })
    testTermId = newTerm.id
    assert(newTerm.status === TermStatus.DRAFT, "New term created with initial DRAFT status")

    // Duplicate term sequence test
    try {
      await TermService.createTerm({
        academicYearId: newYear.id,
        name: "Duplicate Seq Term",
        termSequence: 1, // Duplicate
        startDate: new Date("2028-09-10"),
        endDate: new Date("2028-12-18"),
      })
      assert(false, "Duplicate term sequence should fail")
    } catch (e) {
      assert(e.code === "VALIDATION_FAILED" || e.message.includes("already exists"), "Duplicate term sequence in same academic year rejected")
    }

    // 3. Term State Machine Transitions
    console.log("\n3. Testing Term State Machine Lifecycle...")
    // DRAFT -> APPROVED directly should fail
    try {
      await TermService.transitionStatus(newTerm.id, TermStatus.APPROVED, adminId)
      assert(false, "Invalid transition DRAFT -> APPROVED should fail")
    } catch (e) {
      assert(e.code === "VALIDATION_FAILED" || e.message.includes("Invalid state transition"), "Invalid state transition DRAFT -> APPROVED rejected")
    }

    // Legal transitions: DRAFT -> MARK_ENTRY -> SUBMITTED -> UNDER_REVIEW -> APPROVED
    const markEntryTerm = await TermService.transitionStatus(newTerm.id, TermStatus.MARK_ENTRY, adminId)
    assert(markEntryTerm.status === TermStatus.MARK_ENTRY, "Term transitioned to MARK_ENTRY")

    const canEnter = await TermService.canEnterMarks(newTerm.id)
    assert(canEnter === true, "canEnterMarks confirms MARK_ENTRY is active")

    const submittedTerm = await TermService.transitionStatus(newTerm.id, TermStatus.SUBMITTED, adminId)
    assert(submittedTerm.status === TermStatus.SUBMITTED, "Term transitioned to SUBMITTED")

    const underReviewTerm = await TermService.transitionStatus(newTerm.id, TermStatus.UNDER_REVIEW, adminId)
    assert(underReviewTerm.status === TermStatus.UNDER_REVIEW, "Term transitioned to UNDER_REVIEW")

    const approvedTerm = await TermService.transitionStatus(newTerm.id, TermStatus.APPROVED, adminId)
    assert(approvedTerm.status === TermStatus.APPROVED, "Term transitioned to APPROVED")

    // 4. Class & Supervisor Management
    console.log("\n4. Testing Class Management & Supervisor Assignment...")
    const testClassName = `Basic 7Test-${Date.now()}`
    const newClass = await ClassService.createClass({
      name: testClassName,
      gradeLevel: "Basic 7",
    })
    testClassId = newClass.id
    assert(newClass.name === testClassName, "Class created successfully")

    // Duplicate class name test
    try {
      await ClassService.createClass({
        name: testClassName,
        gradeLevel: "Basic 7",
      })
      assert(false, "Duplicate class name should fail")
    } catch (e) {
      assert(e.code === "VALIDATION_FAILED", "Duplicate class name rejected")
    }

    // Assign class supervisor
    const teacher = await prisma.user.findFirst({
      where: { userRoles: { some: { role: { name: "CLASS_TEACHER" } } } },
    })
    if (teacher) {
      const assignedClass = await ClassService.assignClassTeacher(newClass.id, teacher.id, adminId)
      assert(assignedClass.classTeacherId === teacher.id, "Form teacher assigned to class")
    }

    // 5. Subject Management & Core/Elective Classification
    console.log("\n5. Testing Subject Management...")
    const testCode = `TST${Math.floor(Math.random() * 899 + 100)}`
    const newSubject = await SubjectService.createSubject({
      name: "Robotics & AI",
      code: testCode,
      isElective: true,
    })
    testSubjectId = newSubject.id
    assert(newSubject.code === testCode, "Elective subject created successfully")
    assert(newSubject.isElective === true, "Subject marked as elective")

    // Duplicate code test
    try {
      await SubjectService.createSubject({
        name: "Another Subject",
        code: testCode,
      })
      assert(false, "Duplicate subject code should fail")
    } catch (e) {
      assert(e.code === "VALIDATION_FAILED", "Duplicate subject code rejected")
    }

    // Toggle status
    const toggled = await SubjectService.toggleSubjectStatus(newSubject.id, adminId)
    assert(toggled.status === "INACTIVE", "Subject status toggled to INACTIVE")

    console.log("\n==========================================")
    console.log(`PHASE 2 TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`)
    console.log("==========================================")

    if (failed > 0) {
      process.exit(1)
    }
  } catch (error) {
    console.error("Test execution error:", error)
    process.exit(1)
  } finally {
    // Cleanup temporary test records
    try {
      if (testTermId) await prisma.term.delete({ where: { id: testTermId } }).catch(() => {})
      if (testYearId) {
        // Reset current year to original 2026/2027
        const defaultYear = await prisma.academicYear.findFirst({ where: { name: "2026/2027" } })
        if (defaultYear) {
          await prisma.academicYear.updateMany({ data: { isCurrent: false } })
          await prisma.academicYear.update({ where: { id: defaultYear.id }, data: { isCurrent: true } })
        }
        await prisma.academicYear.delete({ where: { id: testYearId } }).catch(() => {})
      }
      if (testClassId) await prisma.class.delete({ where: { id: testClassId } }).catch(() => {})
      if (testSubjectId) await prisma.subject.delete({ where: { id: testSubjectId } }).catch(() => {})
    } catch {}
    await prisma.$disconnect()
  }
}

runTests()
