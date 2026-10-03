import React from "react"
import Link from "next/link"
import { redirect } from "next/navigation"
import { getSession } from "@/lib/auth/session"
import { ScopeGuard } from "@/lib/auth/scope-guard"
import { prisma } from "@/lib/prisma"
import { ReportService, ReportCardData } from "@/server/services/ReportService"
import { ReportTemplateService } from "@/server/services/ReportTemplateService"
import { SchoolProfileService } from "@/server/services/SchoolProfileService"
import { generateQRCodeSVG } from "@/lib/reports/qr"
import { ArrowLeft, Sliders } from "lucide-react"
import { Button } from "@/components/ui/button"
import { TemplateDesigner } from "@/components/reports/template-designer"

export default async function ReportTemplateEditorPage() {
  const session = await getSession()
  if (!session) {
    redirect("/login")
  }

  const isAdmin = ScopeGuard.isAdministrative({
    userId: session.userId,
    roles: session.roles,
  })

  if (!isAdmin) {
    redirect("/reports")
  }

  const [templateConfig, profile] = await Promise.all([
    ReportTemplateService.getTemplateConfig(),
    SchoolProfileService.getProfile(),
  ])

  // Try to find a real termResult for preview, otherwise generate high-fidelity sample data
  let sampleData: ReportCardData | null = null

  const latestResult = await prisma.termResult.findFirst({
    where: { status: { in: ["FINALIZED", "PUBLISHED"] } },
    orderBy: { createdAt: "desc" },
    select: { id: true },
  })

  if (latestResult) {
    try {
      sampleData = await ReportService.generateReportCardData(latestResult.id, undefined, session.userId)
    } catch {
      sampleData = null
    }
  }

  if (!sampleData) {
    const qrSvg = generateQRCodeSVG("/reports/verify?token=SAMPLE-PREVIEW-TOKEN-ABC123XYZ", 140)
    sampleData = {
      termResultId: "sample-term-result-id",
      school: {
        name: profile.schoolName || "St. Augustine Academy",
        code: profile.schoolCode || "SAA-GH",
        crestUrl: profile.crestUrl || null,
        motto: profile.motto || "Knowledge, Character, and Excellence",
        postalAddress: profile.postalAddress || "P.O. Box 250, Cape Coast, Central Region, Ghana",
        email: profile.email || "info@staugustine.edu.gh",
        phone: profile.phone || "+233 24 123 4567",
        headmasterSignatureUrl: profile.headmasterSignatureUrl || null,
      },
      academicSession: {
        academicYear: "2025/2026",
        termName: "Term 2",
        termSequence: 2,
        startDate: new Date("2026-01-10"),
        endDate: new Date("2026-04-12"),
        nextTermResumption: new Date("2026-05-08"),
      },
      student: {
        id: "sample-student-id",
        idNumber: "STU-2026-042",
        fullName: "Mensah, Kwame Junior",
        firstName: "Kwame",
        lastName: "Mensah",
        gender: "MALE",
        dateOfBirth: new Date("2012-05-18"),
        photoUrl: null,
        rollNumber: "14",
      },
      class: {
        id: "sample-class-id",
        name: "Basic 8 - Excellence",
        gradeLevel: "JHS 2",
      },
      performance: {
        totalScore: 568.4,
        averageScore: 81.2,
        classPosition: 3,
        cohortSize: 38,
        gpa: 3.85,
        status: "FINALIZED",
        finalizedAt: new Date(),
        publishedAt: new Date(),
      },
      subjects: [
        {
          subjectId: "sub-1",
          subjectName: "Mathematics",
          subjectCode: "MATH",
          caRawScore: 28,
          caMaxScore: 30,
          caWeightedScore: 28.0,
          examRawScore: 61,
          examMaxScore: 70,
          examWeightedScore: 61.0,
          totalScore: 89.0,
          grade: "1",
          gradePoint: 4.0,
          interpretation: "Highest (Excellent)",
          subjectPosition: 2,
          teacherRemarks: "Exceptional mastery of algebraic equations.",
        },
        {
          subjectId: "sub-2",
          subjectName: "English Language",
          subjectCode: "ENG",
          caRawScore: 25,
          caMaxScore: 30,
          caWeightedScore: 25.0,
          examRawScore: 57,
          examMaxScore: 70,
          examWeightedScore: 57.0,
          totalScore: 82.0,
          grade: "2",
          gradePoint: 3.8,
          interpretation: "Higher (Very Good)",
          subjectPosition: 4,
          teacherRemarks: "Very good creative writing and comprehension skills.",
        },
        {
          subjectId: "sub-3",
          subjectName: "Integrated Science",
          subjectCode: "SCI",
          caRawScore: 27,
          caMaxScore: 30,
          caWeightedScore: 27.0,
          examRawScore: 58,
          examMaxScore: 70,
          examWeightedScore: 58.0,
          totalScore: 85.0,
          grade: "1",
          gradePoint: 4.0,
          interpretation: "Highest (Excellent)",
          subjectPosition: 1,
          teacherRemarks: "Top of class in laboratory practicals.",
        },
        {
          subjectId: "sub-4",
          subjectName: "Social Studies",
          subjectCode: "SOC",
          caRawScore: 24,
          caMaxScore: 30,
          caWeightedScore: 24.0,
          examRawScore: 52,
          examMaxScore: 70,
          examWeightedScore: 52.0,
          totalScore: 76.0,
          grade: "3",
          gradePoint: 3.4,
          interpretation: "High (Good)",
          subjectPosition: 6,
          teacherRemarks: "Consistent and active participation in class discussions.",
        },
        {
          subjectId: "sub-5",
          subjectName: "Information & Communication Tech",
          subjectCode: "ICT",
          caRawScore: 29,
          caMaxScore: 30,
          caWeightedScore: 29.0,
          examRawScore: 65,
          examMaxScore: 70,
          examWeightedScore: 65.0,
          totalScore: 94.0,
          grade: "1",
          gradePoint: 4.0,
          interpretation: "Highest (Excellent)",
          subjectPosition: 1,
          teacherRemarks: "Superb programming and spreadsheet aptitude.",
        },
        {
          subjectId: "sub-6",
          subjectName: "French Language",
          subjectCode: "FRE",
          caRawScore: 22,
          caMaxScore: 30,
          caWeightedScore: 22.0,
          examRawScore: 48,
          examMaxScore: 70,
          examWeightedScore: 48.0,
          totalScore: 70.0,
          grade: "4",
          gradePoint: 3.0,
          interpretation: "High Average (Credit)",
          subjectPosition: 8,
          teacherRemarks: "Good effort; encourage reading French literature.",
        },
        {
          subjectId: "sub-7",
          subjectName: "Religious & Moral Education",
          subjectCode: "RME",
          caRawScore: 26,
          caMaxScore: 30,
          caWeightedScore: 26.0,
          examRawScore: 46,
          examMaxScore: 70,
          examWeightedScore: 46.0,
          totalScore: 72.4,
          grade: "3",
          gradePoint: 3.2,
          interpretation: "High (Good)",
          subjectPosition: 5,
          teacherRemarks: "Demonstrates commendable moral understanding.",
        },
      ],
      evaluation: {
        daysPresent: 58,
        daysAbsent: 2,
        totalSchoolDays: 60,
        attendancePercentage: 96.7,
        conductRating: "Exemplary",
        attitudeRating: "Diligent & Inquisitive",
        interestRating: "Debate & Robotics Club",
        classTeacherRemarks:
          "Kwame is an exceptionally well-behaved and studious pupil. He demonstrates strong analytical ability across both sciences and languages.",
        headmasterRemarks:
          "An outstanding terminal achievement. Maintain this commendable academic standard and leadership.",
      },
      verification: {
        token: "4f8a9b2c1d3e5f7a8b9c0d1e2f3a4b5c",
        tokenHash: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
        reportVersion: 1,
        generatedAt: new Date(),
        verifyUrl: "/reports/verify?token=SAMPLE-PREVIEW-TOKEN-ABC123XYZ",
        qrSvg,
      },
    }
  }

  return (
    <div className="p-4 md:p-8 flex flex-col gap-6 max-w-7xl mx-auto w-full">
      {/* Breadcrumb Navigation */}
      <div className="flex items-center justify-between gap-4 print:hidden">
        <Link
          href="/reports"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to Official Report Cards
        </Link>
        <Link href="/settings">
          <Button variant="ghost" size="sm" className="text-xs">
            <Sliders className="h-3.5 w-3.5 mr-1.5" /> School Profile Settings
          </Button>
        </Link>
      </div>

      <TemplateDesigner
        initialConfig={templateConfig}
        sampleReportData={sampleData}
      />
    </div>
  )
}
