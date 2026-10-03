import React from "react"
import Link from "next/link"
import { ReportService, VerificationResult } from "@/server/services/ReportService"
import {
  ShieldCheck,
  ShieldAlert,
  Search,
  School,
  CheckCircle2,
  Calendar,
  Award,
  ArrowRight,
  TrendingUp,
} from "lucide-react"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export default async function ReportVerificationPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>
}) {
  const params = await searchParams
  const token = params.token?.trim() || ""

  let verificationResult: VerificationResult | null = null
  if (token) {
    verificationResult = await ReportService.verifyReportToken(token)
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 md:p-8">
      <div className="w-full max-w-2xl flex flex-col gap-6">
        {/* Header */}
        <div className="text-center flex flex-col items-center">
          <div className="p-3 bg-primary/10 text-primary rounded-2xl mb-3">
            <ShieldCheck className="h-8 w-8" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Official Report Verification Portal
          </h1>
          <p className="text-sm text-slate-600 mt-1 max-w-md">
            Cryptographic authenticity verification service for official terminal academic reports and transcripts
          </p>
        </div>

        {/* Verification Search Bar */}
        <Card className="shadow-xs border-slate-200">
          <CardContent className="pt-6">
            <form method="GET" className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                <Input
                  name="token"
                  defaultValue={token}
                  placeholder="Paste report verification token or scan QR code..."
                  className="pl-9 font-mono text-xs h-10"
                  required
                />
              </div>
              <Button type="submit" className="h-10">
                Verify Report
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Verification Result Display */}
        {token && verificationResult && (
          verificationResult.isValid ? (
            <Card className="shadow-md border-emerald-200 bg-white overflow-hidden">
              <div className="bg-emerald-600 text-white p-4 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 className="h-6 w-6 text-white" />
                  <div>
                    <h2 className="font-bold text-base tracking-wide">
                      AUTHENTIC & VERIFIED REPORT CARD
                    </h2>
                    <p className="text-xs text-emerald-100">
                      Officially signed off and cryptographically validated in the central registry
                    </p>
                  </div>
                </div>
                <Badge variant="secondary" className="bg-emerald-700 text-white border-none font-mono text-xs">
                  v{verificationResult.reportVersion}
                </Badge>
              </div>

              <CardContent className="p-6 flex flex-col gap-6">
                {/* School Details */}
                <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                  <div className="p-2.5 bg-slate-100 rounded-lg text-slate-700">
                    <School className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-base">
                      {verificationResult.school?.name}
                    </h3>
                    <p className="text-xs text-slate-500 font-mono">
                      School Registry Code: {verificationResult.school?.code}
                    </p>
                  </div>
                </div>

                {/* Verified Student & Session Info */}
                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div className="p-3 bg-slate-50 rounded border border-slate-100">
                    <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold block">
                      Student Full Name
                    </span>
                    <span className="font-bold text-slate-900 text-sm mt-0.5 block">
                      {verificationResult.student?.fullName}
                    </span>
                  </div>

                  <div className="p-3 bg-slate-50 rounded border border-slate-100">
                    <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold block">
                      Student ID Number
                    </span>
                    <span className="font-mono font-bold text-slate-900 text-sm mt-0.5 block">
                      {verificationResult.student?.idNumber}
                    </span>
                  </div>

                  <div className="p-3 bg-slate-50 rounded border border-slate-100">
                    <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold block">
                      Class / Grade Level
                    </span>
                    <span className="font-bold text-slate-900 mt-0.5 block">
                      {verificationResult.student?.class} ({verificationResult.student?.gradeLevel})
                    </span>
                  </div>

                  <div className="p-3 bg-slate-50 rounded border border-slate-100">
                    <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold block">
                      Academic Session
                    </span>
                    <span className="font-bold text-slate-900 mt-0.5 block">
                      {verificationResult.academicSession?.year} — {verificationResult.academicSession?.term}
                    </span>
                  </div>
                </div>

                {/* Performance Snapshot */}
                {verificationResult.performance && (
                  <div className="grid grid-cols-4 gap-2 bg-slate-900 text-white p-3 rounded text-center">
                    <div>
                      <span className="text-[9px] uppercase tracking-wider font-bold text-slate-400 block">
                        Rank
                      </span>
                      <span className="text-lg font-black font-mono">
                        #{verificationResult.performance.classPosition} / {verificationResult.performance.cohortSize}
                      </span>
                    </div>
                    <div>
                      <span className="text-[9px] uppercase tracking-wider font-bold text-slate-400 block">
                        Total
                      </span>
                      <span className="text-lg font-black font-mono">
                        {verificationResult.performance.totalScore.toFixed(1)}
                      </span>
                    </div>
                    <div>
                      <span className="text-[9px] uppercase tracking-wider font-bold text-slate-400 block">
                        Average
                      </span>
                      <span className="text-lg font-black font-mono text-emerald-400">
                        {verificationResult.performance.averageScore.toFixed(1)}%
                      </span>
                    </div>
                    <div>
                      <span className="text-[9px] uppercase tracking-wider font-bold text-slate-400 block">
                        GPA
                      </span>
                      <span className="text-lg font-black font-mono text-amber-400">
                        {verificationResult.performance.gpa !== null
                          ? verificationResult.performance.gpa.toFixed(2)
                          : "—"}
                      </span>
                    </div>
                  </div>
                )}

                {/* Audit & Cryptographic Details */}
                <div className="border-t border-slate-100 pt-4 flex flex-col gap-1 text-[11px] text-slate-500">
                  <div className="flex justify-between">
                    <span>Generated Timestamp:</span>
                    <span className="font-mono text-slate-700">
                      {verificationResult.generatedAt?.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Verification Verified At:</span>
                    <span className="font-mono text-slate-700">
                      {verificationResult.lastAccessedAt?.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Verification Query Count:</span>
                    <span className="font-mono text-slate-700">
                      {verificationResult.downloadCount} queries
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="shadow-md border-destructive/30 bg-destructive/5 overflow-hidden">
              <div className="bg-destructive text-destructive-foreground p-4 flex items-center gap-2.5">
                <ShieldAlert className="h-6 w-6 text-white" />
                <div>
                  <h2 className="font-bold text-base tracking-wide">
                    VERIFICATION FAILED: INVALID REPORT
                  </h2>
                  <p className="text-xs text-white/80">
                    The supplied token could not be verified against authentic records
                  </p>
                </div>
              </div>

              <CardContent className="p-6 flex flex-col gap-3 text-sm text-slate-700">
                <p>
                  <strong>Reason:</strong>{" "}
                  {verificationResult.reason === "TOKEN_NOT_FOUND"
                    ? "The verification token does not match any official academic report on record."
                    : verificationResult.reason === "TOKEN_REVOKED"
                    ? "This report token has been revoked by school administration due to an amendment or inquiry."
                    : verificationResult.reason === "TOKEN_SUPERSEDED"
                    ? "This report version has been superseded by a newer official revision."
                    : verificationResult.reason === "TOKEN_EXPIRED"
                    ? "This cryptographic verification token has expired."
                    : "Invalid token string."}
                </p>
                <p className="text-xs text-muted-foreground">
                  If you believe this is an error, please contact the issuing school&apos;s administration office directly.
                </p>
              </CardContent>
            </Card>
          )
        )}

        {/* Back Link */}
        <div className="text-center">
          <Link href="/" className="text-xs text-slate-500 hover:text-slate-800 underline">
            &larr; Return to School Portal Home
          </Link>
        </div>
      </div>
    </div>
  )
}
