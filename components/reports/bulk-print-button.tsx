"use client"

import React, { useState } from "react"
import { Archive, Loader2, CheckCircle2, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"

interface BulkPrintButtonProps {
  termId: string
  classId: string
  targetClassName?: string
  studentCount?: number
}

export function BulkPrintButton({
  termId,
  classId,
  targetClassName,
  studentCount,
}: BulkPrintButtonProps) {
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState<{ type: "success" | "error"; message: string } | null>(null)

  async function handleDownload() {
    try {
      setLoading(true)
      setStatus(null)

      const url = `/api/reports/bulk-zip?termId=${encodeURIComponent(termId)}&classId=${encodeURIComponent(classId)}`
      const res = await fetch(url)

      if (!res.ok) {
        let errMessage = "Failed to generate bulk package."
        try {
          const errData = await res.json()
          if (errData.error) errMessage = errData.error
        } catch {
          // ignore
        }
        throw new Error(errMessage)
      }

      const contentDisposition = res.headers.get("Content-Disposition")
      let filename = `ReportCards_${targetClassName || "Class"}.zip`
      if (contentDisposition) {
        const match = contentDisposition.match(/filename="?([^";]+)"?/i)
        if (match && match[1]) {
          filename = match[1]
        }
      }

      const blob = await res.blob()
      const downloadUrl = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = downloadUrl
      a.download = filename
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.URL.revokeObjectURL(downloadUrl)

      setStatus({
        type: "success",
        message: `Package downloaded! Extract and open "print_all_windows.bat" to print.`,
      })
    } catch (err: unknown) {
      setStatus({
        type: "error",
        message: err instanceof Error ? err.message : "Error generating package.",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-1 items-end">
      <Button
        variant="outline"
        size="sm"
        onClick={handleDownload}
        disabled={loading || !termId || !classId}
        className="h-9 gap-1.5 border-primary/30 hover:bg-primary/5 text-foreground shadow-xs font-semibold"
      >
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
            Compiling {studentCount ? `${studentCount} ` : ""}Reports...
          </>
        ) : (
          <>
            <Archive className="h-4 w-4 text-primary" />
            Bulk Print Package (.zip)
          </>
        )}
      </Button>

      {status && (
        <span
          className={`text-[10px] font-medium flex items-center gap-1 ${
            status.type === "success" ? "text-emerald-600 dark:text-emerald-400" : "text-destructive"
          }`}
        >
          {status.type === "success" ? (
            <CheckCircle2 className="h-3 w-3 flex-shrink-0" />
          ) : (
            <AlertCircle className="h-3 w-3 flex-shrink-0" />
          )}
          {status.message}
        </span>
      )}
    </div>
  )
}
