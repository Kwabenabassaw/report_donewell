import React from "react"
import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import { getSession } from "@/lib/auth/session"
import { ScopeGuard } from "@/lib/auth/scope-guard"
import { ReportService } from "@/server/services/ReportService"
import { ReportTemplateService } from "@/server/services/ReportTemplateService"
import { ArrowLeft, ShieldCheck, Sliders } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { PrintButton } from "@/components/reports/print-button"
import { ReportCardView } from "@/components/reports/report-card-view"

export default async function ReportCardDetailPage({
  params,
}: {
  params: Promise<{ termResultId: string }>
}) {
  const session = await getSession()
  if (!session) {
    redirect("/login")
  }

  const { termResultId } = await params

  let reportData
  try {
    reportData = await ReportService.generateReportCardData(termResultId, undefined, session.userId)
  } catch {
    notFound()
  }

  const templateConfig = await ReportTemplateService.getTemplateConfig()

  const isAdmin = ScopeGuard.isAdministrative({
    userId: session.userId,
    roles: session.roles,
  })

  return (
    <div className="min-h-screen bg-muted/30 p-4 md:p-8 print:p-0 print:bg-white flex flex-col items-center">
      {/* Top Action Bar (hidden when printed) */}
      <div className="w-full max-w-4xl flex items-center justify-between gap-4 mb-6 print:hidden">
        <Link href="/reports">
          <Button variant="outline" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Roster
          </Button>
        </Link>
        <div className="flex items-center gap-2">
          {isAdmin && (
            <Link href="/reports/template-editor">
              <Button variant="outline" size="sm">
                <Sliders className="mr-1.5 h-3.5 w-3.5 text-primary" />
                Customize Template
              </Button>
            </Link>
          )}
          <Badge variant="outline" className="font-mono text-xs text-emerald-600 border-emerald-300">
            <ShieldCheck className="mr-1 h-3.5 w-3.5" />
            Verified Report v{reportData.verification.reportVersion}
          </Badge>
          <PrintButton />
        </div>
      </div>

      {/* Official Terminal Report Card Sheet (Rendered according to Template Config) */}
      <ReportCardView
        reportData={reportData}
        templateConfig={templateConfig}
      />
    </div>
  )
}
