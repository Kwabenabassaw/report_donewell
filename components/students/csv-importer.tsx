"use client"

import React, { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Upload, FileSpreadsheet, CheckCircle2, AlertCircle, RefreshCw, FileText, ArrowRight } from "lucide-react"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { importCsvStudentsAction } from "@/app/actions/students"

interface ClassOption {
  id: string
  name: string
  gradeLevel: string
}

interface AcademicYearOption {
  id: string
  name: string
  isCurrent: boolean
}

const SAMPLE_CSV = `student_id,first_name,middle_name,last_name,gender,dob,class,guardian_name,guardian_phone,guardian_relationship
STU-2026-101,Kwame,Kofi,Mensah,MALE,2012-05-14,Basic 7A,Emmanuel Mensah,0244111222,Father
STU-2026-102,Ama,Akua,Asantewaa,FEMALE,2012-09-21,Basic 7A,Grace Mensah,0244333444,Mother
STU-2026-103,Kojo,,Boateng,MALE,2011-11-03,Basic 8B,Yaw Boateng,0209888777,Guardian`

export function CsvImporter({
  academicYears,
  classes,
}: {
  academicYears: AcademicYearOption[]
  classes: ClassOption[]
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [selectedYearId, setSelectedYearId] = useState<string>(
    academicYears.find((y) => y.isCurrent)?.id || academicYears[0]?.id || ""
  )
  const [csvContent, setCsvContent] = useState<string>("")
  const [parsedRows, setParsedRows] = useState<Array<Record<string, string>>>([])
  const [importStatus, setImportStatus] = useState<{
    success?: boolean
    message?: string
    importedCount?: number
  } | null>(null)

  const handleParse = (content: string) => {
    setCsvContent(content)
    const lines = content.split(/\r?\n/).map((l) => l.trim()).filter((l) => l.length > 0)
    if (lines.length <= 1) {
      setParsedRows([])
      return
    }

    const header = lines[0].split(",").map((h) => h.trim().toLowerCase())
    const rows = lines.slice(1).map((line) => {
      const values = line.split(",").map((v) => v.trim())
      const map: Record<string, string> = {}
      header.forEach((h, idx) => {
        map[h] = values[idx] || ""
      })
      return map
    })
    setParsedRows(rows)
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      const text = event.target?.result as string
      if (text) {
        handleParse(text)
      }
    }
    reader.readAsText(file)
  }

  const handleImport = () => {
    if (!csvContent.trim() || !selectedYearId) return

    setImportStatus(null)
    startTransition(async () => {
      try {
        const result = await importCsvStudentsAction(csvContent, selectedYearId)
        setImportStatus({
          success: true,
          message: `Successfully imported ${result.importedStudents} students and created ${result.importedEnrollments} enrollments with core subject registrations.`,
          importedCount: result.importedStudents,
        })
        router.refresh()
      } catch (err: any) {
        setImportStatus({
          success: false,
          message: err.message || "Import failed. Please check CSV format and class names.",
        })
      }
    })
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Input Configuration & Upload */}
        <div className="lg:col-span-1 flex flex-col gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <FileSpreadsheet className="size-4 text-primary" /> Target Session & File
              </CardTitle>
              <CardDescription>
                Select academic year and provide your formatted CSV file.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Academic Year *
                </label>
                <select
                  value={selectedYearId}
                  onChange={(e) => setSelectedYearId(e.target.value)}
                  className="w-full h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                >
                  {academicYears.map((yr) => (
                    <option key={yr.id} value={yr.id}>
                      {yr.name} {yr.isCurrent ? "(Current)" : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Select CSV File
                </label>
                <input
                  type="file"
                  accept=".csv,text/csv"
                  onChange={handleFileUpload}
                  className="w-full text-xs text-muted-foreground file:mr-3 file:py-2 file:px-3 file:rounded-md file:border-0 file:font-semibold file:bg-primary/10 hover:file:bg-primary/20 cursor-pointer"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="text-xs w-full"
                  onClick={() => handleParse(SAMPLE_CSV)}
                >
                  <FileText className="size-3.5 mr-1.5" /> Load Sample Data
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">Available Classes</CardTitle>
              <CardDescription className="text-xs">
                Ensure class names in CSV match one of these exactly:
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-1.5">
                {classes.map((cls) => (
                  <Badge key={cls.id} variant="secondary" className="text-xs">
                    {cls.name}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* CSV Editor & Raw Textarea */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Upload className="size-4 text-primary" /> CSV Data Content
                  </CardTitle>
                  <CardDescription>
                    Paste raw CSV content or inspect uploaded file before committing.
                  </CardDescription>
                </div>
                {parsedRows.length > 0 && (
                  <Badge variant="outline" className="font-mono text-xs">
                    {parsedRows.length} rows parsed
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <textarea
                value={csvContent}
                onChange={(e) => handleParse(e.target.value)}
                rows={10}
                placeholder="Paste CSV here (student_id,first_name,middle_name,last_name,gender,dob,class,guardian_name,guardian_phone,guardian_relationship)..."
                className="w-full font-mono text-xs p-3 rounded-md border border-input bg-muted/20 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />

              {importStatus && (
                <div
                  className={`p-4 rounded-md border text-sm flex items-start gap-3 ${
                    importStatus.success
                      ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-800 dark:text-emerald-300"
                      : "bg-destructive/10 border-destructive/20 text-destructive"
                  }`}
                >
                  {importStatus.success ? (
                    <CheckCircle2 className="size-5 shrink-0 mt-0.5 text-emerald-600" />
                  ) : (
                    <AlertCircle className="size-5 shrink-0 mt-0.5" />
                  )}
                  <div className="flex-1 whitespace-pre-line text-xs font-mono">
                    {importStatus.message}
                  </div>
                </div>
              )}

              <div className="flex items-center justify-end gap-3">
                <Button
                  onClick={handleImport}
                  disabled={isPending || parsedRows.length === 0}
                  className="font-semibold"
                >
                  {isPending ? (
                    <>
                      <RefreshCw className="size-4 mr-2 animate-spin" /> Importing Records...
                    </>
                  ) : (
                    <>
                      <Upload className="size-4 mr-2" /> Execute Import ({parsedRows.length} rows)
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Parsed Preview Table */}
      {parsedRows.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <CheckCircle2 className="size-4 text-emerald-500" /> Parsed Preview ({parsedRows.length} Rows)
            </CardTitle>
            <CardDescription>
              Review parsed column mapping before saving to database.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="border rounded-md overflow-x-auto max-h-96">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">#</TableHead>
                    <TableHead>Student ID</TableHead>
                    <TableHead>First Name</TableHead>
                    <TableHead>Last Name</TableHead>
                    <TableHead>Gender</TableHead>
                    <TableHead>Class</TableHead>
                    <TableHead>Guardian Name</TableHead>
                    <TableHead>Guardian Phone</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {parsedRows.map((row, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="font-mono text-xs text-muted-foreground">{idx + 1}</TableCell>
                      <TableCell className="font-mono text-xs font-semibold text-primary">
                        {row["student_id"] || row["student_id_number"] || row["id"] || Object.values(row)[0]}
                      </TableCell>
                      <TableCell className="text-xs">
                        {row["first_name"] || row["firstname"] || Object.values(row)[1]}
                      </TableCell>
                      <TableCell className="text-xs">
                        {row["last_name"] || row["lastname"] || Object.values(row)[3]}
                      </TableCell>
                      <TableCell className="text-xs">
                        {row["gender"] || Object.values(row)[4] || "MALE"}
                      </TableCell>
                      <TableCell className="text-xs">
                        <Badge variant="secondary" className="text-[10px]">
                          {row["class"] || row["class_name"] || Object.values(row)[6]}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs">
                        {row["guardian_name"] || Object.values(row)[7] || "—"}
                      </TableCell>
                      <TableCell className="text-xs font-mono">
                        {row["guardian_phone"] || Object.values(row)[8] || "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
