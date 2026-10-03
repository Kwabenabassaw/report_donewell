import React from "react"
import Link from "next/link"
import { redirect } from "next/navigation"
import { getSession } from "@/lib/auth/session"
import { ScopeGuard } from "@/lib/auth/scope-guard"
import { AcademicYearService } from "@/server/services/AcademicYearService"
import { ClassService } from "@/server/services/ClassService"
import { CsvImporter } from "@/components/students/csv-importer"
import { Upload, ArrowLeft } from "lucide-react"

export default async function StudentImportPage() {
  const session = await getSession()
  if (!session) {
    redirect("/login")
  }

  const isAdmin = ScopeGuard.isAdministrative({
    userId: session.userId,
    roles: session.roles,
  })

  if (!isAdmin) {
    redirect("/students")
  }

  const [academicYears, classes] = await Promise.all([
    AcademicYearService.listAcademicYears(),
    ClassService.listClasses(),
  ])

  return (
    <div className="p-6 md:p-8 flex flex-col gap-6 max-w-7xl mx-auto w-full">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <Link
          href="/students"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors w-fit"
        >
          <ArrowLeft className="size-3.5" /> Back to Student Directory
        </Link>
        <div className="flex flex-col gap-1">
          <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary uppercase tracking-wider">
            <Upload className="size-3.5" /> Batch Onboarding
          </div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
            CSV Student & Enrollment Import
          </h1>
          <p className="text-muted-foreground text-sm">
            Import bulk student records, automatically enroll them into designated classes, assign core subjects, and link guardian contacts.
          </p>
        </div>
      </div>

      <CsvImporter
        academicYears={academicYears.map((y) => ({
          id: y.id,
          name: y.name,
          isCurrent: y.isCurrent,
        }))}
        classes={classes.map((c) => ({
          id: c.id,
          name: c.name,
          gradeLevel: c.gradeLevel,
        }))}
      />
    </div>
  )
}
