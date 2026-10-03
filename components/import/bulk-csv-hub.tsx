"use client"

import React, { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import {
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  Download,
  RefreshCw,
  Layers,
  Award,
  Users,
  Send,
  FileText,
} from "lucide-react"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  validateStudentCsvAction,
  importStudentCsvAction,
  validateScoreCsvAction,
  importScoreCsvAction,
  generateScoreTemplateAction,
  generateStudentTemplateAction,
} from "@/app/actions/import"

interface AcademicYearOption {
  id: string
  name: string
  isCurrent: boolean
}

interface AssessmentOption {
  id: string
  title: string
  maxScore: number
  className: string
  subjectName: string
  termName: string
  status: string
}

export function BulkCsvHub({
  academicYears,
  assessments,
}: {
  academicYears: AcademicYearOption[]
  assessments: AssessmentOption[]
}) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<"students" | "scores">("students")

  // --- Student Import State ---
  const [studentYearId, setStudentYearId] = useState(
    academicYears.find((y) => y.isCurrent)?.id || academicYears[0]?.id || ""
  )
  const [studentCsv, setStudentCsv] = useState("")
  const [studentValidation, setStudentValidation] = useState<any | null>(null)
  const [studentImportResult, setStudentImportResult] = useState<any | null>(null)
  const [isValidatingStudents, startStudentValidation] = useTransition()
  const [isImportingStudents, startStudentImport] = useTransition()

  // --- Score Import State ---
  const [selectedAssessmentId, setSelectedAssessmentId] = useState(
    assessments[0]?.id || ""
  )
  const [scoreCsv, setScoreCsv] = useState("")
  const [scoreValidation, setScoreValidation] = useState<any | null>(null)
  const [scoreImportResult, setScoreImportResult] = useState<any | null>(null)
  const [isValidatingScores, startScoreValidation] = useTransition()
  const [isImportingScores, startScoreImport] = useTransition()

  // Helper to trigger browser download of text file
  const downloadFile = (content: string, filename: string) => {
    const blob = new Blob([content], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.setAttribute("download", filename)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // Handle Download Student Template
  const handleDownloadStudentTemplate = async () => {
    const csv = await generateStudentTemplateAction()
    downloadFile(csv, "student_roster_template.csv")
  }

  // Handle Download Assessment Template
  const handleDownloadScoreTemplate = async () => {
    if (!selectedAssessmentId) return
    const csv = await generateScoreTemplateAction(selectedAssessmentId)
    const target = assessments.find((a) => a.id === selectedAssessmentId)
    const safeTitle = (target?.title || "assessment").replace(/\s+/g, "_")
    downloadFile(csv, `${safeTitle}_marks_template.csv`)
  }

  // Handle Student CSV File Pick
  const handleStudentFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (event) => {
      const text = event.target?.result as string
      if (text) {
        setStudentCsv(text)
        setStudentValidation(null)
        setStudentImportResult(null)
      }
    }
    reader.readAsText(file)
  }

  // Handle Score CSV File Pick
  const handleScoreFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (event) => {
      const text = event.target?.result as string
      if (text) {
        setScoreCsv(text)
        setScoreValidation(null)
        setScoreImportResult(null)
      }
    }
    reader.readAsText(file)
  }

  // Run Student Validation
  const handleValidateStudents = () => {
    if (!studentCsv.trim() || !studentYearId) return
    setStudentImportResult(null)
    startStudentValidation(async () => {
      try {
        const result = await validateStudentCsvAction(studentCsv, studentYearId)
        setStudentValidation(result)
      } catch (err: any) {
        alert(err.message || "Failed to validate CSV.")
      }
    })
  }

  // Run Student Import
  const handleImportStudents = () => {
    if (!studentCsv.trim() || !studentYearId) return
    startStudentImport(async () => {
      try {
        const result = await importStudentCsvAction(studentCsv, studentYearId)
        setStudentImportResult({
          success: true,
          message: `Successfully imported ${result.importedStudents} students and created ${result.importedEnrollments} enrollments with core subject registrations!`,
        })
        setStudentValidation(null)
        setStudentCsv("")
        router.refresh()
      } catch (err: any) {
        setStudentImportResult({
          success: false,
          message: err.message || "Import failed.",
        })
      }
    })
  }

  // Run Score Validation
  const handleValidateScores = () => {
    if (!scoreCsv.trim() || !selectedAssessmentId) return
    setScoreImportResult(null)
    startScoreValidation(async () => {
      try {
        const result = await validateScoreCsvAction(selectedAssessmentId, scoreCsv)
        setScoreValidation(result)
      } catch (err: any) {
        alert(err.message || "Failed to validate score CSV.")
      }
    })
  }

  // Run Score Import
  const handleImportScores = () => {
    if (!scoreCsv.trim() || !selectedAssessmentId) return
    startScoreImport(async () => {
      try {
        const result = await importScoreCsvAction(selectedAssessmentId, scoreCsv)
        setScoreImportResult({
          success: true,
          message: `Successfully imported ${result.importedCount} assessment marks into the operational database!`,
        })
        setScoreValidation(null)
        setScoreCsv("")
        router.refresh()
      } catch (err: any) {
        setScoreImportResult({
          success: false,
          message: err.message || "Score import failed.",
        })
      }
    })
  }

  const selectedAssessment = assessments.find((a) => a.id === selectedAssessmentId)

  return (
    <div className="flex flex-col gap-6">
      {/* Tab Switcher */}
      <div className="flex items-center gap-2 border-b">
        <button
          type="button"
          onClick={() => setActiveTab("students")}
          className={`flex items-center gap-2 pb-3 px-4 text-sm font-semibold border-b-2 transition-colors ${
            activeTab === "students"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Users className="h-4 w-4" />
          Student Cohort & Roster Importer
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("scores")}
          className={`flex items-center gap-2 pb-3 px-4 text-sm font-semibold border-b-2 transition-colors ${
            activeTab === "scores"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Award className="h-4 w-4" />
          Assessment Marks Bulk Importer
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: STUDENT COHORT IMPORTER */}
      {/* ========================================================================= */}
      {activeTab === "students" && (
        <div className="flex flex-col gap-6">
          {studentImportResult && (
            <div
              className={`p-4 rounded-xl border text-sm flex items-center gap-3 ${
                studentImportResult.success
                  ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                  : "bg-red-50 border-red-200 text-red-800"
              }`}
            >
              {studentImportResult.success ? (
                <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
              ) : (
                <AlertTriangle className="h-5 w-5 text-red-600 shrink-0" />
              )}
              <div className="font-medium">{studentImportResult.message}</div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Input & Config Card */}
            <Card className="border shadow-sm lg:col-span-1">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold">1. Select Target & Input Data</CardTitle>
                <CardDescription className="text-xs">
                  Choose the target academic year and provide the CSV roster.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Academic Year</label>
                  <select
                    value={studentYearId}
                    onChange={(e) => {
                      setStudentYearId(e.target.value)
                      setStudentValidation(null)
                    }}
                    className="w-full text-sm border rounded-md px-3 py-2 bg-background mt-1 focus:outline-none focus:ring-2 focus:ring-primary/20"
                  >
                    {academicYears.map((y) => (
                      <option key={y.id} value={y.id}>
                        {y.name} {y.isCurrent ? "(Current)" : ""}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-medium text-muted-foreground">Upload CSV File</label>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleDownloadStudentTemplate}
                      className="h-6 text-[11px] gap-1 px-1.5 text-primary"
                    >
                      <Download className="h-3 w-3" />
                      Get Template
                    </Button>
                  </div>
                  <Input
                    type="file"
                    accept=".csv,text/csv"
                    onChange={handleStudentFileUpload}
                    className="text-xs mt-1 file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-xs file:bg-primary/10 file:text-primary"
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-muted-foreground">Or Paste CSV Text</label>
                  <textarea
                    value={studentCsv}
                    onChange={(e) => {
                      setStudentCsv(e.target.value)
                      setStudentValidation(null)
                    }}
                    placeholder={`student_id,first_name,last_name,gender,class,guardian_phone\nSTU-001,John,Doe,MALE,Basic 7A,0244111222`}
                    rows={8}
                    className="w-full text-xs font-mono border rounded-md p-2.5 bg-muted/10 mt-1 focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>

                <div className="flex flex-col gap-2 pt-2 border-t">
                  <Button
                    type="button"
                    onClick={handleValidateStudents}
                    disabled={!studentCsv.trim() || isValidatingStudents}
                    className="w-full gap-2 text-xs"
                  >
                    {isValidatingStudents ? (
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <CheckCircle2 className="h-3.5 w-3.5" />
                    )}
                    Validate Roster CSV
                  </Button>

                  {studentValidation && studentValidation.valid && (
                    <Button
                      type="button"
                      onClick={handleImportStudents}
                      disabled={isImportingStudents}
                      className="w-full gap-2 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                    >
                      {isImportingStudents ? (
                        <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Send className="h-3.5 w-3.5" />
                      )}
                      Commit {studentValidation.validRecordsCount} Records (Atomic)
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Validation Preview Card */}
            <Card className="border shadow-sm lg:col-span-2">
              <CardHeader className="pb-3 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-base font-semibold">2. Pre-Import Validation & Preview</CardTitle>
                  <CardDescription className="text-xs">
                    Row-by-row diagnostic check. All rows must be free of errors to commit.
                  </CardDescription>
                </div>
                {studentValidation && (
                  <div className="flex items-center gap-2">
                    <Badge
                      className={`text-xs ${
                        studentValidation.valid
                          ? "bg-emerald-100 text-emerald-800 border-emerald-200"
                          : "bg-red-100 text-red-800 border-red-200"
                      }`}
                    >
                      {studentValidation.valid
                        ? `Valid: ${studentValidation.validRecordsCount} Rows`
                        : `Rejected: ${studentValidation.invalidRecordsCount} Errors`}
                    </Badge>
                  </div>
                )}
              </CardHeader>
              <CardContent className="p-0">
                {!studentValidation ? (
                  <div className="p-12 text-center text-sm text-muted-foreground flex flex-col items-center gap-2">
                    <FileSpreadsheet className="h-8 w-8 opacity-40 text-muted-foreground" />
                    <div>Paste CSV text or upload a file and click "Validate Roster CSV".</div>
                  </div>
                ) : (
                  <div className="max-h-[500px] overflow-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/50">
                          <TableHead className="w-12 text-xs">Row</TableHead>
                          <TableHead className="text-xs">Student ID</TableHead>
                          <TableHead className="text-xs">Name</TableHead>
                          <TableHead className="text-xs">Class</TableHead>
                          <TableHead className="text-xs">Gender</TableHead>
                          <TableHead className="text-xs">Guardian</TableHead>
                          <TableHead className="text-xs">Status / Diagnostics</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {studentValidation.records.map((r: any) => {
                          const hasErr = r.errors.length > 0
                          return (
                            <TableRow key={r.row} className={hasErr ? "bg-red-50/40" : "hover:bg-muted/20"}>
                              <TableCell className="text-xs font-mono text-muted-foreground">{r.row}</TableCell>
                              <TableCell className="text-xs font-semibold">{r.data.studentIdNumber || "—"}</TableCell>
                              <TableCell className="text-xs">
                                {r.data.firstName} {r.data.lastName}
                              </TableCell>
                              <TableCell className="text-xs">{r.data.className || "—"}</TableCell>
                              <TableCell className="text-xs">{r.data.gender || "—"}</TableCell>
                              <TableCell className="text-xs text-muted-foreground">
                                {r.data.guardianPhone ? `${r.data.guardianName || "Parent"} (${r.data.guardianPhone})` : "—"}
                              </TableCell>
                              <TableCell className="text-xs">
                                {hasErr ? (
                                  <div className="flex flex-col gap-1">
                                    {r.errors.map((e: any, idx: number) => (
                                      <div key={idx} className="flex items-center gap-1.5 text-red-700">
                                        <Badge variant="outline" className="text-[9px] px-1 py-0 border-red-300 text-red-700 font-mono">
                                          {e.code}
                                        </Badge>
                                        <span className="text-[11px]">{e.message}</span>
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 text-[10px]">
                                    READY
                                  </Badge>
                                )}
                              </TableCell>
                            </TableRow>
                          )
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: ASSESSMENT MARKS BULK IMPORTER */}
      {/* ========================================================================= */}
      {activeTab === "scores" && (
        <div className="flex flex-col gap-6">
          {scoreImportResult && (
            <div
              className={`p-4 rounded-xl border text-sm flex items-center gap-3 ${
                scoreImportResult.success
                  ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                  : "bg-red-50 border-red-200 text-red-800"
              }`}
            >
              {scoreImportResult.success ? (
                <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
              ) : (
                <AlertTriangle className="h-5 w-5 text-red-600 shrink-0" />
              )}
              <div className="font-medium">{scoreImportResult.message}</div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Input & Target Assessment Card */}
            <Card className="border shadow-sm lg:col-span-1">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold">1. Select Assessment Activity</CardTitle>
                <CardDescription className="text-xs">
                  Choose the target assessment to populate and download a pre-filled template.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Target Assessment</label>
                  <select
                    value={selectedAssessmentId}
                    onChange={(e) => {
                      setSelectedAssessmentId(e.target.value)
                      setScoreValidation(null)
                    }}
                    className="w-full text-sm border rounded-md px-3 py-2 bg-background mt-1 focus:outline-none focus:ring-2 focus:ring-primary/20"
                  >
                    {assessments.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.className} • {a.subjectName} — {a.title} ({a.termName}) [Max: {a.maxScore}]
                      </option>
                    ))}
                  </select>
                </div>

                {selectedAssessment && (
                  <div className="p-3 bg-muted/30 rounded-lg border text-xs space-y-1">
                    <div className="font-semibold text-primary">{selectedAssessment.title}</div>
                    <div className="text-muted-foreground">
                      Class: <span className="text-foreground">{selectedAssessment.className}</span> | Subject:{" "}
                      <span className="text-foreground">{selectedAssessment.subjectName}</span>
                    </div>
                    <div className="text-muted-foreground">
                      Max Score: <span className="font-bold text-foreground">{selectedAssessment.maxScore}</span> | Status:{" "}
                      <Badge variant="outline" className="text-[10px] py-0 px-1">
                        {selectedAssessment.status}
                      </Badge>
                    </div>
                  </div>
                )}

                <div>
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-medium text-muted-foreground">Upload Marks CSV</label>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleDownloadScoreTemplate}
                      className="h-6 text-[11px] gap-1 px-1.5 text-primary"
                    >
                      <Download className="h-3 w-3" />
                      Pre-filled Class Template
                    </Button>
                  </div>
                  <Input
                    type="file"
                    accept=".csv,text/csv"
                    onChange={handleScoreFileUpload}
                    className="text-xs mt-1 file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-xs file:bg-primary/10 file:text-primary"
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-muted-foreground">Or Paste Score Rows</label>
                  <textarea
                    value={scoreCsv}
                    onChange={(e) => {
                      setScoreCsv(e.target.value)
                      setScoreValidation(null)
                    }}
                    placeholder={`student_id_number,student_name,score,status\nSTU-001,John Doe,24.5,COMPLETE`}
                    rows={8}
                    className="w-full text-xs font-mono border rounded-md p-2.5 bg-muted/10 mt-1 focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>

                <div className="flex flex-col gap-2 pt-2 border-t">
                  <Button
                    type="button"
                    onClick={handleValidateScores}
                    disabled={!scoreCsv.trim() || isValidatingScores}
                    className="w-full gap-2 text-xs"
                  >
                    {isValidatingScores ? (
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <CheckCircle2 className="h-3.5 w-3.5" />
                    )}
                    Validate Assessment Marks
                  </Button>

                  {scoreValidation && scoreValidation.valid && (
                    <Button
                      type="button"
                      onClick={handleImportScores}
                      disabled={isImportingScores}
                      className="w-full gap-2 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                    >
                      {isImportingScores ? (
                        <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Send className="h-3.5 w-3.5" />
                      )}
                      Commit {scoreValidation.validRecordsCount} Marks (Atomic)
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Score Validation Preview Card */}
            <Card className="border shadow-sm lg:col-span-2">
              <CardHeader className="pb-3 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-base font-semibold">2. Score Validation & Preview</CardTitle>
                  <CardDescription className="text-xs">
                    Verifies maximum score boundaries, subject registration, and assessment lock states.
                  </CardDescription>
                </div>
                {scoreValidation && (
                  <Badge
                    className={`text-xs ${
                      scoreValidation.valid
                        ? "bg-emerald-100 text-emerald-800 border-emerald-200"
                        : "bg-red-100 text-red-800 border-red-200"
                    }`}
                  >
                    {scoreValidation.valid
                      ? `Valid: ${scoreValidation.validRecordsCount} Rows`
                      : `Rejected: ${scoreValidation.invalidRecordsCount} Errors`}
                  </Badge>
                )}
              </CardHeader>
              <CardContent className="p-0">
                {!scoreValidation ? (
                  <div className="p-12 text-center text-sm text-muted-foreground flex flex-col items-center gap-2">
                    <FileSpreadsheet className="h-8 w-8 opacity-40 text-muted-foreground" />
                    <div>Paste marks CSV or upload file and click "Validate Assessment Marks".</div>
                  </div>
                ) : (
                  <div className="max-h-[500px] overflow-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/50">
                          <TableHead className="w-12 text-xs">Row</TableHead>
                          <TableHead className="text-xs">Student ID</TableHead>
                          <TableHead className="text-xs">Student Name</TableHead>
                          <TableHead className="text-xs">Score / Max</TableHead>
                          <TableHead className="text-xs">Status</TableHead>
                          <TableHead className="text-xs">Validation Diagnostics</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {scoreValidation.records.map((r: any) => {
                          const hasErr = r.errors.length > 0
                          return (
                            <TableRow key={r.row} className={hasErr ? "bg-red-50/40" : "hover:bg-muted/20"}>
                              <TableCell className="text-xs font-mono text-muted-foreground">{r.row}</TableCell>
                              <TableCell className="text-xs font-semibold">{r.data.studentIdNumber || "—"}</TableCell>
                              <TableCell className="text-xs">{r.studentName || "—"}</TableCell>
                              <TableCell className="text-xs font-mono">
                                <span className={hasErr && r.errors.some((e: any) => e.code.includes("SCORE")) ? "text-red-700 font-bold" : ""}>
                                  {r.data.score !== null && r.data.score !== undefined ? r.data.score : "—"}
                                </span>{" "}
                                / {scoreValidation.assessment?.maxScore}
                              </TableCell>
                              <TableCell className="text-xs">
                                <Badge variant="outline" className="text-[10px] px-1 py-0">
                                  {r.data.status || "COMPLETE"}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-xs">
                                {hasErr ? (
                                  <div className="flex flex-col gap-1">
                                    {r.errors.map((e: any, idx: number) => (
                                      <div key={idx} className="flex items-center gap-1.5 text-red-700">
                                        <Badge variant="outline" className="text-[9px] px-1 py-0 border-red-300 text-red-700 font-mono">
                                          {e.code}
                                        </Badge>
                                        <span className="text-[11px]">{e.message}</span>
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 text-[10px]">
                                    READY
                                  </Badge>
                                )}
                              </TableCell>
                            </TableRow>
                          )
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  )
}
