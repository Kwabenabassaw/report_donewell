"use client"

import React, { useState, useTransition } from "react"
import {
  Sliders,
  Palette,
  Layout,
  GraduationCap,
  TableProperties,
  MessageSquare,
  ShieldCheck,
  Save,
  RotateCcw,
  Printer,
  CheckCircle2,
  AlertCircle,
  Eye,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import {
  ReportTemplateConfig,
  ReportHeaderLayout,
  ReportAccentColor,
  DEFAULT_REPORT_TEMPLATE_CONFIG,
} from "@/server/services/ReportTemplateService"
import { ReportCardData } from "@/server/services/ReportService"
import { saveReportTemplateAction, resetReportTemplateAction } from "@/app/actions/report-template"
import { ReportCardView } from "./report-card-view"

interface TemplateDesignerProps {
  initialConfig: ReportTemplateConfig
  sampleReportData: ReportCardData
}

export function TemplateDesigner({
  initialConfig,
  sampleReportData,
}: TemplateDesignerProps) {
  const [config, setConfig] = useState<ReportTemplateConfig>(initialConfig)
  const [activeTab, setActiveTab] = useState<"header" | "student" | "academic" | "remarks">("header")
  const [isPending, startTransition] = useTransition()
  const [notification, setNotification] = useState<{ type: "success" | "error"; message: string } | null>(null)

  function updateField<K extends keyof ReportTemplateConfig>(field: K, value: ReportTemplateConfig[K]) {
    setConfig((prev) => ({ ...prev, [field]: value }))
    setNotification(null)
  }

  function handleSave() {
    startTransition(async () => {
      try {
        const res = await saveReportTemplateAction(config)
        if (res.success) {
          setConfig(res.config)
          setNotification({ type: "success", message: "Report template customizations saved successfully!" })
        }
      } catch (err: unknown) {
        setNotification({
          type: "error",
          message: err instanceof Error ? err.message : "Failed to save template configuration.",
        })
      }
    })
  }

  function handleReset() {
    if (!confirm("Are you sure you want to reset all template settings to factory defaults?")) {
      return
    }

    startTransition(async () => {
      try {
        const res = await resetReportTemplateAction()
        if (res.success) {
          setConfig(res.config)
          setNotification({ type: "success", message: "Template reset to standard factory defaults." })
        }
      } catch (err: unknown) {
        setNotification({
          type: "error",
          message: err instanceof Error ? err.message : "Failed to reset template.",
        })
      }
    })
  }

  const colorOptions: Array<{ id: ReportAccentColor; label: string; bg: string; border: string }> = [
    { id: "slate", label: "Classic Slate", bg: "bg-slate-900", border: "border-slate-800" },
    { id: "navy", label: "Royal Navy", bg: "bg-blue-950", border: "border-blue-900" },
    { id: "emerald", label: "Forest Emerald", bg: "bg-emerald-950", border: "border-emerald-800" },
    { id: "burgundy", label: "Deep Burgundy", bg: "bg-rose-950", border: "border-rose-900" },
    { id: "indigo", label: "Academic Indigo", bg: "bg-indigo-950", border: "border-indigo-900" },
    { id: "amber", label: "Gold Amber", bg: "bg-amber-950", border: "border-amber-800" },
  ]

  const headerOptions: Array<{ id: ReportHeaderLayout; title: string; desc: string }> = [
    {
      id: "CLASSIC_CENTERED",
      title: "Classic Centered",
      desc: "Traditional academic format with centered school crest, name, and balanced school code badge.",
    },
    {
      id: "MODERN_SPLIT",
      title: "Modern Split",
      desc: "Contemporary two-column layout with crest & school identity on the left and report credentials on the right.",
    },
    {
      id: "MINIMAL_BANNER",
      title: "Minimal Banner",
      desc: "Streamlined horizontal letterhead maximizing vertical space for extensive subject lists.",
    },
  ]

  return (
    <div className="flex flex-col gap-6 w-full">
      {/* Top Controls & Status Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-card border rounded-xl shadow-xs print:hidden">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 text-primary rounded-lg">
            <Sliders className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base font-bold tracking-tight">Report Card Template Designer</h2>
            <p className="text-xs text-muted-foreground">
              Customize visual branding, visible metrics, and print layout with instant live preview.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleReset}
            disabled={isPending}
            className="text-xs"
          >
            <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
            Reset Defaults
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => window.print()}
            className="text-xs"
          >
            <Printer className="h-3.5 w-3.5 mr-1.5" />
            Print Sample
          </Button>

          <Button
            size="sm"
            onClick={handleSave}
            disabled={isPending}
            className="text-xs shadow-xs"
          >
            <Save className="h-3.5 w-3.5 mr-1.5" />
            {isPending ? "Saving..." : "Save Template"}
          </Button>
        </div>
      </div>

      {notification && (
        <div
          className={`p-3 text-xs rounded-lg border flex items-center gap-2 print:hidden ${
            notification.type === "success"
              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300"
              : "bg-destructive/10 border-destructive/20 text-destructive"
          }`}
        >
          {notification.type === "success" ? (
            <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
          ) : (
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
          )}
          <span>{notification.message}</span>
        </div>
      )}

      {/* Main Split-Screen Workspace */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
        {/* Left Column: Editor Controls (5 cols on xl) */}
        <div className="xl:col-span-5 flex flex-col gap-4 print:hidden">
          {/* Category Tabs */}
          <div className="grid grid-cols-4 gap-1 p-1 bg-muted/60 border rounded-lg text-xs font-medium">
            <button
              onClick={() => setActiveTab("header")}
              className={`py-2 px-2 rounded-md transition-all flex flex-col items-center gap-1 ${
                activeTab === "header"
                  ? "bg-background text-foreground shadow-xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Layout className="h-4 w-4" />
              <span>Header</span>
            </button>
            <button
              onClick={() => setActiveTab("student")}
              className={`py-2 px-2 rounded-md transition-all flex flex-col items-center gap-1 ${
                activeTab === "student"
                  ? "bg-background text-foreground shadow-xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <GraduationCap className="h-4 w-4" />
              <span>Student</span>
            </button>
            <button
              onClick={() => setActiveTab("academic")}
              className={`py-2 px-2 rounded-md transition-all flex flex-col items-center gap-1 ${
                activeTab === "academic"
                  ? "bg-background text-foreground shadow-xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <TableProperties className="h-4 w-4" />
              <span>Table</span>
            </button>
            <button
              onClick={() => setActiveTab("remarks")}
              className={`py-2 px-2 rounded-md transition-all flex flex-col items-center gap-1 ${
                activeTab === "remarks"
                  ? "bg-background text-foreground shadow-xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <MessageSquare className="h-4 w-4" />
              <span>Remarks</span>
            </button>
          </div>

          {/* TAB 1: Header & Visual Branding */}
          {activeTab === "header" && (
            <Card className="border shadow-xs">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Palette className="h-4 w-4 text-primary" /> Institutional Branding & Header Layout
                </CardTitle>
                <CardDescription className="text-xs">
                  Choose your school accent palette and letterhead structure.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-5 text-xs">
                {/* Accent Color Picker */}
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block mb-2">
                    Official Color Scheme
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {colorOptions.map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => updateField("accentColor", opt.id)}
                        className={`flex items-center gap-2 p-2 rounded-lg border text-left transition-all ${
                          config.accentColor === opt.id
                            ? "border-primary ring-2 ring-primary/20 bg-primary/5"
                            : "hover:bg-muted/40"
                        }`}
                      >
                        <div className={`h-4 w-4 rounded-full ${opt.bg} flex-shrink-0`} />
                        <span className="text-xs font-medium truncate">{opt.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Header Layout Style */}
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block mb-2">
                    Letterhead Layout Style
                  </label>
                  <div className="flex flex-col gap-2">
                    {headerOptions.map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => updateField("headerLayout", opt.id)}
                        className={`p-3 rounded-lg border text-left transition-all ${
                          config.headerLayout === opt.id
                            ? "border-primary ring-2 ring-primary/20 bg-primary/5"
                            : "hover:bg-muted/40"
                        }`}
                      >
                        <span className="font-bold text-foreground text-xs block">{opt.title}</span>
                        <span className="text-[11px] text-muted-foreground mt-0.5 block leading-normal">
                          {opt.desc}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Custom Document Title */}
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block mb-1">
                    Document Title Banner
                  </label>
                  <Input
                    value={config.reportTitle}
                    onChange={(e) => updateField("reportTitle", e.target.value)}
                    placeholder="e.g. Official Terminal Academic Report"
                    className="h-8 text-xs"
                  />
                </div>

                {/* Header Element Toggles */}
                <div className="flex flex-col gap-2 pt-2 border-t">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
                    Header Details
                  </label>

                  <label className="flex items-center justify-between p-2 rounded hover:bg-muted/40 cursor-pointer">
                    <span className="text-xs">Show School Crest / Logo</span>
                    <input
                      type="checkbox"
                      checked={config.showSchoolCrest}
                      onChange={(e) => updateField("showSchoolCrest", e.target.checked)}
                      className="h-4 w-4 rounded accent-primary"
                    />
                  </label>

                  <label className="flex items-center justify-between p-2 rounded hover:bg-muted/40 cursor-pointer">
                    <span className="text-xs">Show School Motto</span>
                    <input
                      type="checkbox"
                      checked={config.showSchoolMotto}
                      onChange={(e) => updateField("showSchoolMotto", e.target.checked)}
                      className="h-4 w-4 rounded accent-primary"
                    />
                  </label>

                  <label className="flex items-center justify-between p-2 rounded hover:bg-muted/40 cursor-pointer">
                    <span className="text-xs">Show School Code Box</span>
                    <input
                      type="checkbox"
                      checked={config.showSchoolCode}
                      onChange={(e) => updateField("showSchoolCode", e.target.checked)}
                      className="h-4 w-4 rounded accent-primary"
                    />
                  </label>

                  <label className="flex items-center justify-between p-2 rounded hover:bg-muted/40 cursor-pointer">
                    <span className="text-xs">Show Official Contact Info (Address/Phone/Email)</span>
                    <input
                      type="checkbox"
                      checked={config.showContactDetails}
                      onChange={(e) => updateField("showContactDetails", e.target.checked)}
                      className="h-4 w-4 rounded accent-primary"
                    />
                  </label>
                </div>
              </CardContent>
            </Card>
          )}

          {/* TAB 2: Student Biodata & Session Info */}
          {activeTab === "student" && (
            <Card className="border shadow-xs">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <GraduationCap className="h-4 w-4 text-primary" /> Student Biodata & Session Box
                </CardTitle>
                <CardDescription className="text-xs">
                  Choose which student identity and attendance fields to display.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-2 text-xs">
                <label className="flex items-center justify-between p-2 rounded hover:bg-muted/40 cursor-pointer">
                  <div>
                    <span className="text-xs font-medium block">Show Student Photo Avatar</span>
                    <span className="text-[10px] text-muted-foreground">Displays passport photo or initial avatar</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={config.showStudentPhoto}
                    onChange={(e) => updateField("showStudentPhoto", e.target.checked)}
                    className="h-4 w-4 rounded accent-primary"
                  />
                </label>

                <label className="flex items-center justify-between p-2 rounded hover:bg-muted/40 cursor-pointer">
                  <div>
                    <span className="text-xs font-medium block">Show Roll / Index Number</span>
                    <span className="text-[10px] text-muted-foreground">Displays class roll or index number if assigned</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={config.showRollNumber}
                    onChange={(e) => updateField("showRollNumber", e.target.checked)}
                    className="h-4 w-4 rounded accent-primary"
                  />
                </label>

                <label className="flex items-center justify-between p-2 rounded hover:bg-muted/40 cursor-pointer">
                  <div>
                    <span className="text-xs font-medium block">Show Gender</span>
                    <span className="text-[10px] text-muted-foreground">Displays Male / Female indicator</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={config.showGender}
                    onChange={(e) => updateField("showGender", e.target.checked)}
                    className="h-4 w-4 rounded accent-primary"
                  />
                </label>

                <label className="flex items-center justify-between p-2 rounded hover:bg-muted/40 cursor-pointer">
                  <div>
                    <span className="text-xs font-medium block">Show Date of Birth</span>
                    <span className="text-[10px] text-muted-foreground">Formatted calendar birth date</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={config.showDateOfBirth}
                    onChange={(e) => updateField("showDateOfBirth", e.target.checked)}
                    className="h-4 w-4 rounded accent-primary"
                  />
                </label>

                <label className="flex items-center justify-between p-2 rounded hover:bg-muted/40 cursor-pointer">
                  <div>
                    <span className="text-xs font-medium block">Show Term Attendance Metrics</span>
                    <span className="text-[10px] text-muted-foreground">Days present / total days and attendance %</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={config.showAttendanceMetrics}
                    onChange={(e) => updateField("showAttendanceMetrics", e.target.checked)}
                    className="h-4 w-4 rounded accent-primary"
                  />
                </label>

                <label className="flex items-center justify-between p-2 rounded hover:bg-muted/40 cursor-pointer">
                  <div>
                    <span className="text-xs font-medium block">Show Next Term Resumption Date</span>
                    <span className="text-[10px] text-muted-foreground">Informs guardians when the next term commences</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={config.showNextTermResumption}
                    onChange={(e) => updateField("showNextTermResumption", e.target.checked)}
                    className="h-4 w-4 rounded accent-primary"
                  />
                </label>
              </CardContent>
            </Card>
          )}

          {/* TAB 3: Academic Summary Strip & Table Columns */}
          {activeTab === "academic" && (
            <Card className="border shadow-xs">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <TableProperties className="h-4 w-4 text-primary" /> Performance Strip & Table Columns
                </CardTitle>
                <CardDescription className="text-xs">
                  Configure overall summary metrics and tabular marks columns.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-4 text-xs">
                {/* Summary Strip */}
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block mb-1">
                    Performance Summary Strip
                  </label>
                  <div className="flex flex-col gap-1.5">
                    <label className="flex items-center justify-between p-2 rounded hover:bg-muted/40 cursor-pointer">
                      <div>
                        <span className="text-xs font-medium block">Class Position / Rank</span>
                        <span className="text-[10px] text-muted-foreground">E.g. #1 / 40. Disable to hide class ranking.</span>
                      </div>
                      <input
                        type="checkbox"
                        checked={config.showClassPosition}
                        onChange={(e) => updateField("showClassPosition", e.target.checked)}
                        className="h-4 w-4 rounded accent-primary"
                      />
                    </label>

                    <label className="flex items-center justify-between p-2 rounded hover:bg-muted/40 cursor-pointer">
                      <span className="text-xs font-medium">Overall Composite Total Score</span>
                      <input
                        type="checkbox"
                        checked={config.showOverallTotal}
                        onChange={(e) => updateField("showOverallTotal", e.target.checked)}
                        className="h-4 w-4 rounded accent-primary"
                      />
                    </label>

                    <label className="flex items-center justify-between p-2 rounded hover:bg-muted/40 cursor-pointer">
                      <span className="text-xs font-medium">Term Percentage Average (%)</span>
                      <input
                        type="checkbox"
                        checked={config.showTermAverage}
                        onChange={(e) => updateField("showTermAverage", e.target.checked)}
                        className="h-4 w-4 rounded accent-primary"
                      />
                    </label>

                    <label className="flex items-center justify-between p-2 rounded hover:bg-muted/40 cursor-pointer">
                      <span className="text-xs font-medium">Term Grade Point Average (GPA)</span>
                      <input
                        type="checkbox"
                        checked={config.showTermGpa}
                        onChange={(e) => updateField("showTermGpa", e.target.checked)}
                        className="h-4 w-4 rounded accent-primary"
                      />
                    </label>
                  </div>
                </div>

                {/* Subject Table Columns */}
                <div className="pt-2 border-t">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block mb-1">
                    Subject Table Columns
                  </label>
                  <div className="flex flex-col gap-1.5">
                    <label className="flex items-center justify-between p-2 rounded hover:bg-muted/40 cursor-pointer">
                      <span className="text-xs font-medium">Continuous Assessment / Class Score (CA)</span>
                      <input
                        type="checkbox"
                        checked={config.showCaScore}
                        onChange={(e) => updateField("showCaScore", e.target.checked)}
                        className="h-4 w-4 rounded accent-primary"
                      />
                    </label>

                    <label className="flex items-center justify-between p-2 rounded hover:bg-muted/40 cursor-pointer">
                      <span className="text-xs font-medium">End of Term Examination Score</span>
                      <input
                        type="checkbox"
                        checked={config.showExamScore}
                        onChange={(e) => updateField("showExamScore", e.target.checked)}
                        className="h-4 w-4 rounded accent-primary"
                      />
                    </label>

                    <label className="flex items-center justify-between p-2 rounded hover:bg-muted/40 cursor-pointer">
                      <span className="text-xs font-medium">Combined Subject Total (100)</span>
                      <input
                        type="checkbox"
                        checked={config.showTotalScore}
                        onChange={(e) => updateField("showTotalScore", e.target.checked)}
                        className="h-4 w-4 rounded accent-primary"
                      />
                    </label>

                    <label className="flex items-center justify-between p-2 rounded hover:bg-muted/40 cursor-pointer">
                      <span className="text-xs font-medium">Letter Grade (e.g. A, B, C)</span>
                      <input
                        type="checkbox"
                        checked={config.showGrade}
                        onChange={(e) => updateField("showGrade", e.target.checked)}
                        className="h-4 w-4 rounded accent-primary"
                      />
                    </label>

                    <label className="flex items-center justify-between p-2 rounded hover:bg-muted/40 cursor-pointer">
                      <span className="text-xs font-medium">Performance Interpretation (e.g. Excellent, Credit)</span>
                      <input
                        type="checkbox"
                        checked={config.showGradeInterpretation}
                        onChange={(e) => updateField("showGradeInterpretation", e.target.checked)}
                        className="h-4 w-4 rounded accent-primary"
                      />
                    </label>

                    <label className="flex items-center justify-between p-2 rounded hover:bg-muted/40 cursor-pointer">
                      <span className="text-xs font-medium">Subject Rank / Position</span>
                      <input
                        type="checkbox"
                        checked={config.showSubjectPosition}
                        onChange={(e) => updateField("showSubjectPosition", e.target.checked)}
                        className="h-4 w-4 rounded accent-primary"
                      />
                    </label>

                    <label className="flex items-center justify-between p-2 rounded hover:bg-muted/40 cursor-pointer">
                      <span className="text-xs font-medium">Subject Teacher Remarks</span>
                      <input
                        type="checkbox"
                        checked={config.showTeacherRemarks}
                        onChange={(e) => updateField("showTeacherRemarks", e.target.checked)}
                        className="h-4 w-4 rounded accent-primary"
                      />
                    </label>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* TAB 4: Remarks, Signatures & Security */}
          {activeTab === "remarks" && (
            <Card className="border shadow-xs">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-primary" /> Remarks, Signatures & Security
                </CardTitle>
                <CardDescription className="text-xs">
                  Configure qualitative evaluations, signature lines, and anti-fraud seal.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-4 text-xs">
                <div className="flex flex-col gap-2">
                  <label className="flex items-center justify-between p-2 rounded hover:bg-muted/40 cursor-pointer">
                    <div>
                      <span className="text-xs font-medium block">Character Demeanor & Traits</span>
                      <span className="text-[10px] text-muted-foreground">Conduct, Attitude to Study, and Interest</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={config.showCharacterTraits}
                      onChange={(e) => updateField("showCharacterTraits", e.target.checked)}
                      className="h-4 w-4 rounded accent-primary"
                    />
                  </label>

                  <label className="flex items-center justify-between p-2 rounded hover:bg-muted/40 cursor-pointer">
                    <div>
                      <span className="text-xs font-medium block">Form / Class Teacher Narrative Remarks</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={config.showClassTeacherRemarks}
                      onChange={(e) => updateField("showClassTeacherRemarks", e.target.checked)}
                      className="h-4 w-4 rounded accent-primary"
                    />
                  </label>

                  <label className="flex items-center justify-between p-2 rounded hover:bg-muted/40 cursor-pointer">
                    <div>
                      <span className="text-xs font-medium block">Headmaster / Principal Remarks</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={config.showHeadmasterRemarks}
                      onChange={(e) => updateField("showHeadmasterRemarks", e.target.checked)}
                      className="h-4 w-4 rounded accent-primary"
                    />
                  </label>
                </div>

                {/* Custom Institutional Notice */}
                <div className="pt-2 border-t">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block mb-1">
                    Institutional Footer Announcement / Notice
                  </label>
                  <textarea
                    value={config.customFooterNote}
                    onChange={(e) => updateField("customFooterNote", e.target.value)}
                    rows={2}
                    placeholder="e.g. Promoted to Basic 5. Outstanding tuition fees must be cleared before resumption."
                    className="w-full text-xs rounded-md border border-input bg-transparent p-2 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  />
                  <span className="text-[10px] text-muted-foreground mt-0.5 block">
                    Printed at the bottom of the card as an official school memo.
                  </span>
                </div>

                {/* Signatures & Seal */}
                <div className="pt-2 border-t flex flex-col gap-2">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
                    Authentication & Sign-Off
                  </label>

                  <label className="flex items-center justify-between p-2 rounded hover:bg-muted/40 cursor-pointer">
                    <span className="text-xs font-medium">Form Teacher Signature Line</span>
                    <input
                      type="checkbox"
                      checked={config.showFormTeacherSignature}
                      onChange={(e) => updateField("showFormTeacherSignature", e.target.checked)}
                      className="h-4 w-4 rounded accent-primary"
                    />
                  </label>

                  <label className="flex items-center justify-between p-2 rounded hover:bg-muted/40 cursor-pointer">
                    <span className="text-xs font-medium">Headmaster Signature & Stamp</span>
                    <input
                      type="checkbox"
                      checked={config.showHeadmasterSignature}
                      onChange={(e) => updateField("showHeadmasterSignature", e.target.checked)}
                      className="h-4 w-4 rounded accent-primary"
                    />
                  </label>

                  <label className="flex items-center justify-between p-2 rounded hover:bg-muted/40 cursor-pointer">
                    <div>
                      <span className="text-xs font-medium block">Cryptographic QR Verification Seal</span>
                      <span className="text-[10px] text-muted-foreground">Scannable token seal for instant digital authenticity check</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={config.showQrVerificationSeal}
                      onChange={(e) => updateField("showQrVerificationSeal", e.target.checked)}
                      className="h-4 w-4 rounded accent-primary"
                    />
                  </label>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Column: Live Real-Time A4 Preview (7 cols on xl) */}
        <div className="xl:col-span-7 flex flex-col gap-3">
          <div className="flex items-center justify-between px-2 text-xs font-semibold text-muted-foreground print:hidden">
            <span className="flex items-center gap-1.5">
              <Eye className="h-4 w-4 text-primary" /> Live Real-Time A4 Print Preview
            </span>
            <Badge variant="outline" className="text-[10px] font-mono">
              Auto-updating
            </Badge>
          </div>

          <div className="bg-muted/30 p-2 md:p-4 rounded-xl border border-slate-200/80 shadow-inner overflow-x-auto print:p-0 print:border-none print:bg-white">
            <ReportCardView
              reportData={sampleReportData}
              templateConfig={config}
              isDesignPreview={true}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
