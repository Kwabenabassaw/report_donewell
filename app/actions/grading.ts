"use server"

import { getSession } from "@/lib/auth/session"
import { ScopeGuard } from "@/lib/auth/scope-guard"
import { GradingPolicyService } from "@/server/services/GradingPolicyService"
import { AssessmentService } from "@/server/services/AssessmentService"
import { RankingMethod } from "@prisma/client"
import { revalidatePath } from "next/cache"


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

async function assertCanManageAssessments(termId: string, classId: string, subjectId: string) {
  const session = await getSession()
  if (!session) {
    throw new Error("Unauthorized. Please log in.")
  }

  const ctx = { userId: session.userId, roles: session.roles }
  if (ScopeGuard.isAdministrative(ctx)) {
    return session
  }

  // Check teacher allocation
  await ScopeGuard.assertTeacherSubjectScope({
    ctx,
    termId,
    classId,
    subjectId,
  })

  return session
}

export async function createGradingPolicyAction(formData: FormData): Promise<void> {
  const session = await assertAdministrative()

  const name = formData.get("name") as string
  const academicYearId = (formData.get("academicYearId") as string) || undefined
  const caWeight = parseFloat(formData.get("caWeight") as string || "30")
  const examWeight = parseFloat(formData.get("examWeight") as string || "70")

  if (Math.abs(caWeight + examWeight - 100) > 0.001) {
    throw new Error(`Component weights must sum strictly to 100%. Provided: CA (${caWeight}) + Exam (${examWeight}) = ${caWeight + examWeight}%.`)
  }

  // Standard WAEC / GES Grade Bands
  const standardGradeBands = [
    { grade: "A1", minimumScore: 80, maximumScore: 100, gradePoint: 1.0, interpretation: "Excellent", sortOrder: 1 },
    { grade: "B2", minimumScore: 70, maximumScore: 79.99, gradePoint: 2.0, interpretation: "Very Good", sortOrder: 2 },
    { grade: "B3", minimumScore: 65, maximumScore: 69.99, gradePoint: 3.0, interpretation: "Good", sortOrder: 3 },
    { grade: "C4", minimumScore: 60, maximumScore: 64.99, gradePoint: 4.0, interpretation: "Credit", sortOrder: 4 },
    { grade: "C5", minimumScore: 55, maximumScore: 59.99, gradePoint: 5.0, interpretation: "Credit", sortOrder: 5 },
    { grade: "C6", minimumScore: 50, maximumScore: 54.99, gradePoint: 6.0, interpretation: "Credit", sortOrder: 6 },
    { grade: "D7", minimumScore: 45, maximumScore: 49.99, gradePoint: 7.0, interpretation: "Pass", sortOrder: 7 },
    { grade: "E8", minimumScore: 40, maximumScore: 44.99, gradePoint: 8.0, interpretation: "Pass", sortOrder: 8 },
    { grade: "F9", minimumScore: 0, maximumScore: 39.99, gradePoint: 9.0, interpretation: "Fail", sortOrder: 9 },
  ]

  await GradingPolicyService.createPolicy(
    {
      name: name || "Standard Terminal Assessment Policy",
      academicYearId,
      components: [
        {
          name: "Class Continuous Assessment",
          code: "CA",
          weight: caWeight,
          componentType: "CA",
          sortOrder: 1,
          categories: [
            { name: "Class Test", isSummative: false },
            { name: "Homework / Assignment", isSummative: false },
            { name: "Project / Practical", isSummative: false },
          ],
        },
        {
          name: "Terminal Examination",
          code: "EXAM",
          weight: examWeight,
          componentType: "EXAM",
          sortOrder: 2,
          categories: [{ name: "Terminal Examination", isSummative: true }],
        },
      ],
      gradeBands: standardGradeBands,
    },
    session.userId
  )

  revalidatePath("/grading-policies")
  revalidatePath("/assessments")
  revalidatePath("/mark-entry")
}

export async function createAssessmentActivityAction(formData: FormData): Promise<void> {
  const termId = formData.get("termId") as string
  const classId = formData.get("classId") as string
  const subjectId = formData.get("subjectId") as string
  const categoryId = formData.get("categoryId") as string
  const title = formData.get("title") as string
  const maxScore = parseFloat(formData.get("maxScore") as string || "100")
  const dateAdministeredRaw = formData.get("dateAdministered") as string
  const dateAdministered = dateAdministeredRaw ? new Date(dateAdministeredRaw) : undefined

  const session = await assertCanManageAssessments(termId, classId, subjectId)

  await AssessmentService.createAssessment(
    {
      termId,
      classId,
      subjectId,
      categoryId,
      title,
      maxScore,
      dateAdministered,
    },
    session.userId
  )

  revalidatePath("/assessments")
  revalidatePath("/mark-entry")
}

export async function lockAssessmentAction(formData: FormData): Promise<void> {
  const session = await assertAdministrative()
  const assessmentId = formData.get("assessmentId") as string

  if (!assessmentId) throw new Error("Assessment ID required.")

  await AssessmentService.lockAssessment(assessmentId, session.userId)
  revalidatePath("/assessments")
  revalidatePath("/mark-entry")
}

export async function unlockAssessmentAction(formData: FormData): Promise<void> {
  const session = await assertAdministrative()
  const assessmentId = formData.get("assessmentId") as string

  if (!assessmentId) throw new Error("Assessment ID required.")

  await AssessmentService.unlockAssessment(assessmentId, session.userId)
  revalidatePath("/assessments")
  revalidatePath("/mark-entry")
}

export async function updateAssessmentAction(formData: FormData): Promise<void> {
  const assessmentId = formData.get("assessmentId") as string
  const title = formData.get("title") as string
  const maxScore = parseFloat((formData.get("maxScore") as string) || "100")
  const categoryId = (formData.get("categoryId") as string) || undefined
  const dateAdministeredRaw = formData.get("dateAdministered") as string
  const dateAdministered = dateAdministeredRaw ? new Date(dateAdministeredRaw) : undefined

  if (!assessmentId) throw new Error("Assessment ID required.")

  const assessment = await AssessmentService.getAssessmentById(assessmentId)
  if (!assessment) throw new Error("Assessment not found.")

  const session = await assertCanManageAssessments(assessment.termId, assessment.classId, assessment.subjectId)
  await AssessmentService.updateAssessment(
    assessmentId,
    {
      title,
      maxScore,
      categoryId,
      dateAdministered,
    },
    session.userId
  )

  revalidatePath("/assessments")
  revalidatePath("/mark-entry")
}

export async function deleteAssessmentAction(formData: FormData): Promise<void> {
  const assessmentId = formData.get("assessmentId") as string
  if (!assessmentId) throw new Error("Assessment ID required.")

  const assessment = await AssessmentService.getAssessmentById(assessmentId)
  if (!assessment) throw new Error("Assessment not found.")

  const session = await assertCanManageAssessments(assessment.termId, assessment.classId, assessment.subjectId)
  await AssessmentService.deleteAssessment(assessmentId, session.userId)

  revalidatePath("/assessments")
  revalidatePath("/mark-entry")
}

export async function activateGradingPolicyAction(policyId: string): Promise<void> {
  const session = await assertAdministrative()
  await GradingPolicyService.activatePolicy(policyId, session.userId)
  revalidatePath("/grading-policies")
  revalidatePath("/finalization")
  revalidatePath("/reports")
}

export async function deleteGradingPolicyAction(policyId: string): Promise<void> {
  const session = await assertAdministrative()
  await GradingPolicyService.deletePolicy(policyId, session.userId)
  revalidatePath("/grading-policies")
}

export async function updateGradingPolicyAction(formData: FormData): Promise<void> {
  const session = await assertAdministrative()

  const policyId = formData.get("policyId") as string
  if (!policyId) throw new Error("Policy ID required.")

  const name = formData.get("name") as string
  const academicYearId = (formData.get("academicYearId") as string) || null
  const rankingMethod = (formData.get("rankingMethod") as RankingMethod) || undefined
  const caWeight = parseFloat(formData.get("caWeight") as string || "30")
  const examWeight = parseFloat(formData.get("examWeight") as string || "70")

  if (Math.abs(caWeight + examWeight - 100) > 0.001) {
    throw new Error(
      `Component weights must sum strictly to 100%. Provided: CA (${caWeight}) + Exam (${examWeight}) = ${caWeight + examWeight}%.`
    )
  }

  await GradingPolicyService.updatePolicy(
    policyId,
    {
      name,
      academicYearId,
      rankingMethod,
      caWeight,
      examWeight,
    },
    session.userId
  )

  revalidatePath("/grading-policies")
  revalidatePath("/assessments")
  revalidatePath("/mark-entry")
  revalidatePath("/reports")
}

