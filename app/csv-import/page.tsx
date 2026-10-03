import React from "react"
import { redirect } from "next/navigation"
import { getSession } from "@/lib/auth/session"
import { prisma } from "@/lib/prisma"
import { FileSpreadsheet } from "lucide-react"
import { BulkCsvHub } from "@/components/import/bulk-csv-hub"

export default async function CsvImportPage() {
  const session = await getSession()
  if (!session) {
    redirect("/login")
  }

  const allowedRoles = ["SUPER_ADMIN", "HEADMASTER", "EXAM_OFFICER", "CLASS_TEACHER", "SUBJECT_TEACHER"]
  const hasAccess = session.roles.some((r) => allowedRoles.includes(r))

  if (!hasAccess) {
    redirect("/")
  }

  // Fetch academic years
  const academicYears = await prisma.academicYear.findMany({
    orderBy: { startDate: "desc" },
    select: { id: true, name: true, isCurrent: true },
  })

  // Fetch open assessments
  const assessmentsData = await prisma.assessment.findMany({
    where: {
      status: "OPEN",
    },
    include: {
      class: true,
      subject: true,
      term: true,
    },
    orderBy: [{ term: { startDate: "desc" } }, { class: { name: "asc" } }, { subject: { name: "asc" } }],
  })

  const assessments = assessmentsData.map((a) => ({
    id: a.id,
    title: a.title,
    maxScore: a.maxScore,
    className: a.class.name,
    subjectName: a.subject.name,
    termName: a.term.name,
    status: a.status,
  }))

  return (
    <div className="p-6 md:p-8 flex flex-col gap-8 max-w-7xl mx-auto w-full">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-6">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-primary/10 text-primary rounded-xl">
              <FileSpreadsheet className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Bulk CSV Operations Hub</h1>
              <p className="text-sm text-muted-foreground mt-0.5">
                Ingest student cohort rosters and assessment marks via validated, atomic CSV workflows.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Hub Client Component */}
      <BulkCsvHub
        academicYears={academicYears}
        assessments={assessments}
      />
    </div>
  )
}
