import { prisma } from "../lib/prisma.ts"
import { AuthService } from "../server/services/AuthService.ts"
import { ScopeGuard } from "../lib/auth/scope-guard.ts"
import { signSession, verifySession } from "../lib/auth/session.ts"
import { AuditService } from "../server/services/AuditService.ts"
import { SchoolProfileService } from "../server/services/SchoolProfileService.ts"

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
  console.log("PHASE 1: FOUNDATION AUTOMATED TEST SUITE")
  console.log("==========================================")

  try {
    // 1. Session Token Crypto Test
    console.log("\n1. Testing HMAC-SHA256 Session Management...")
    const testPayload = {
      userId: "user-123",
      username: "testuser",
      displayName: "Test User",
      roles: ["SUPER_ADMIN"],
      activeRole: "SUPER_ADMIN",
    }
    const token = signSession(testPayload)
    assert(typeof token === "string" && token.includes("."), "Session token signed correctly with signature")

    const decoded = verifySession(token)
    assert(decoded !== null, "Session token decoded and verified successfully")
    assert(decoded?.userId === "user-123", "Session token payload preserved intact")
    assert(decoded?.exp > Date.now(), "Session expiration timestamp is valid")

    const tampered = token.slice(0, -4) + "XXXX"
    const tamperedResult = verifySession(tampered)
    assert(tamperedResult === null, "Tampered token correctly rejected by timingSafeEqual")

    // 2. Authentication with Seeded Users
    console.log("\n2. Testing Authentication Service...")
    const loginSuccess = await AuthService.login({
      username: "admin",
      password: "Password123!",
    })
    assert(loginSuccess.user.username === "admin", "Admin login successful")
    assert(loginSuccess.user.roles.includes("SUPER_ADMIN"), "Admin has SUPER_ADMIN role")
    assert(typeof loginSuccess.token === "string", "Login returns signed JWT/HMAC token")

    // Test Invalid Password
    try {
      await AuthService.login({
        username: "admin",
        password: "WrongPassword999!",
      })
      assert(false, "Invalid password should throw error")
    } catch (e) {
      assert(e.code === "INVALID_CREDENTIALS" || e.message.includes("Invalid"), "Invalid password correctly rejected with INVALID_CREDENTIALS")
    }

    // 3. Audit Logging
    console.log("\n3. Testing Append-Only Audit Logging...")
    const auditEntry = await AuditService.logAction({
      userId: loginSuccess.user.id,
      action: "TEST_AUDIT_ACTION",
      entityType: "System",
      entityId: "test-entity-1",
      newValues: { test: true },
      ipAddress: "127.0.0.1",
    })
    assert(auditEntry !== null, "Audit entry persisted to database")
    assert(auditEntry?.action === "TEST_AUDIT_ACTION", "Audit action recorded correctly")

    const logs = await AuditService.getLogs({ action: "TEST_AUDIT_ACTION" })
    assert(logs.length > 0, "Audit logs queryable by action")

    // Clean up test audit log
    await prisma.auditLog.deleteMany({ where: { action: "TEST_AUDIT_ACTION" } })

    // 4. Scoped Authorization Guard
    console.log("\n4. Testing Two-Tier Scoped Authorization Guard...")
    const adminCtx = {
      userId: loginSuccess.user.id,
      roles: ["SUPER_ADMIN"],
    }
    const adminAllowed = ScopeGuard.isAdministrative(adminCtx)
    assert(adminAllowed === true, "Administrative user recognized with school-wide scope")

    // Teacher Mensah
    const teacherUser = await prisma.user.findUnique({
      where: { username: "teacher_mensah" },
      include: { subjectAllocations: true, classesSupervised: true },
    })

    if (teacherUser) {
      const teacherCtx = {
        userId: teacherUser.id,
        roles: ["SUBJECT_TEACHER", "CLASS_TEACHER"],
      }
      assert(!ScopeGuard.isAdministrative(teacherCtx), "Teacher correctly not granted administrative scope")

      const term = await prisma.term.findFirst()
      const mathSubject = await prisma.subject.findUnique({ where: { code: "MTH" } })
      const class8A = await prisma.class.findUnique({ where: { name: "Basic 8A" } })

      if (term && mathSubject && class8A) {
        // Create an allocation for testing
        const allocation = await prisma.subjectAllocation.upsert({
          where: {
            termId_classId_subjectId: {
              termId: term.id,
              classId: class8A.id,
              subjectId: mathSubject.id,
            },
          },
          update: { teacherId: teacherUser.id },
          create: {
            termId: term.id,
            classId: class8A.id,
            subjectId: mathSubject.id,
            teacherId: teacherUser.id,
          },
        })

        const hasScope = await ScopeGuard.assertTeacherSubjectScope({
          ctx: teacherCtx,
          termId: term.id,
          classId: class8A.id,
          subjectId: mathSubject.id,
        })
        assert(hasScope === true, "Assigned teacher granted scope for assigned class, subject & term")

        // Test unauthorized teacher (Asante attempting to access Mensah's Math allocation)
        const otherTeacher = await prisma.user.findUnique({ where: { username: "teacher_asante" } })
        if (otherTeacher) {
          const unauthorizedCtx = {
            userId: otherTeacher.id,
            roles: ["SUBJECT_TEACHER"],
          }
          try {
            await ScopeGuard.assertTeacherSubjectScope({
              ctx: unauthorizedCtx,
              termId: term.id,
              classId: class8A.id,
              subjectId: mathSubject.id,
            })
            assert(false, "Unauthorized teacher should have been blocked")
          } catch (e) {
            assert(e.code === "UNAUTHORIZED_TEACHER" || e.message.includes("UNAUTHORIZED"), "Cross-teacher subject access blocked with UNAUTHORIZED_TEACHER")
          }
        }
      }
    }

    // 5. School Profile & System Settings
    console.log("\n5. Testing School Profile Service...")
    const profile = await SchoolProfileService.getProfile()
    assert(profile !== null, "School profile retrieved")
    assert(typeof profile.schoolName === "string", `School name: ${profile.schoolName}`)

    console.log("\n==========================================")
    console.log(`PHASE 1 TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`)
    console.log("==========================================")

    if (failed > 0) {
      process.exit(1)
    }
  } catch (error) {
    console.error("Test execution error:", error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

runTests()
