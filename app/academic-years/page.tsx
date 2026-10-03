import React from "react"
import { redirect } from "next/navigation"
import { getSession } from "@/lib/auth/session"
import { ScopeGuard } from "@/lib/auth/scope-guard"
import { AcademicYearService } from "@/server/services/AcademicYearService"
import { TermService } from "@/server/services/TermService"
import {
  Calendar,
  CheckCircle2,
  Clock,
  ArrowRight,
  ShieldAlert,
  Sliders,
  Sparkles,
} from "lucide-react"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  setCurrentAcademicYearAction,
  transitionTermStatusAction,
} from "@/app/actions/academic"
import {
  CreateAcademicYearDialog,
  EditAcademicYearDialog,
  DeleteAcademicYearDialog,
  CreateTermDialog,
  EditTermDialog,
  DeleteTermDialog,
} from "@/components/academic/academic-dialogs"
import { TermStatus } from "@prisma/client"

export default async function AcademicYearsPage() {
  const session = await getSession()
  if (!session) {
    redirect("/login")
  }

  const isAdmin = ScopeGuard.isAdministrative({
    userId: session.userId,
    roles: session.roles,
  })

  const [years, terms] = await Promise.all([
    AcademicYearService.listYears(),
    TermService.listTerms(),
  ])

  const currentYear = years.find((y) => y.isCurrent) || years[0]
  const currentTerm =
    currentYear?.terms.find((t) => t.status === "MARK_ENTRY") ||
    currentYear?.terms[0]

  return (
    <div className="p-6 md:p-8 flex flex-col gap-8 max-w-7xl mx-auto w-full">
      {/* Header with Modal Action Triggers */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b pb-6">
        <div className="flex flex-col gap-1">
          <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary uppercase tracking-wider">
            <Calendar className="size-3.5" /> Academic Structure & Lifecycle
          </div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
            Academic Years & Terms
          </h1>
          <p className="text-muted-foreground text-sm">
            Manage academic sessions, term date boundaries, and oversee the official term state machine.
          </p>
        </div>

        {isAdmin && (
          <div className="flex items-center gap-3">
            <CreateAcademicYearDialog />
            <CreateTermDialog
              years={years.map((y) => ({ id: y.id, name: y.name, isCurrent: y.isCurrent }))}
              defaultYearId={currentYear?.id}
            />
          </div>
        )}
      </div>

      {/* Hero: Active Current Session Spotlight */}
      {currentYear && (
        <div className="rounded-2xl border bg-gradient-to-br from-card via-card to-primary/5 p-6 md:p-8 shadow-xs">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="flex flex-col gap-2 max-w-2xl">
              <div className="inline-flex items-center gap-2 text-xs font-semibold text-primary uppercase tracking-wider bg-primary/10 px-3 py-1 rounded-md w-fit">
                <CheckCircle2 className="size-3.5 text-emerald-600 dark:text-emerald-400" /> Active Session Spotlight
              </div>
              <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight text-foreground">
                {currentYear.name} {currentTerm ? `— ${currentTerm.name}` : ""}
              </h2>
              <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground mt-1">
                <span>
                  Dates:{" "}
                  <strong className="text-foreground">
                    {new Date(currentYear.startDate).toLocaleDateString()}
                  </strong>{" "}
                  to{" "}
                  <strong className="text-foreground">
                    {new Date(currentYear.endDate).toLocaleDateString()}
                  </strong>
                </span>
                <span>•</span>
                <span>
                  Status:{" "}
                  <Badge variant="success" className="text-xs">
                    {currentYear.status}
                  </Badge>
                </span>
                {currentTerm && (
                  <>
                    <span>•</span>
                    <span>
                      Term State:{" "}
                      <Badge variant="default" className="text-xs">
                        {currentTerm.status}
                      </Badge>
                    </span>
                  </>
                )}
              </div>
            </div>

            {isAdmin && (
              <div className="flex items-center gap-2">
                <EditAcademicYearDialog
                  year={{
                    id: currentYear.id,
                    name: currentYear.name,
                    startDate: currentYear.startDate,
                    endDate: currentYear.endDate,
                    status: currentYear.status,
                    isCurrent: currentYear.isCurrent,
                  }}
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Academic Years List */}
      <Card>
        <CardHeader className="p-6 pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg font-bold">Academic Years</CardTitle>
              <CardDescription className="text-xs mt-0.5">
                All registered academic sessions with date ranges and session controls.
              </CardDescription>
            </div>
            <span className="text-xs font-semibold text-muted-foreground">
              {years.length} total sessions
            </span>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead className="py-3 px-6">Academic Year</TableHead>
                <TableHead className="py-3 px-4">Start Date</TableHead>
                <TableHead className="py-3 px-4">End Date</TableHead>
                <TableHead className="py-3 px-4">Status</TableHead>
                <TableHead className="py-3 px-4">Current Session</TableHead>
                <TableHead className="py-3 px-4 text-center">Terms</TableHead>
                <TableHead className="py-3 px-6 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {years.map((year) => (
                <TableRow key={year.id} className="hover:bg-muted/20 transition-colors">
                  <TableCell className="py-3.5 px-6 font-semibold text-foreground">
                    {year.name}
                  </TableCell>
                  <TableCell className="py-3.5 px-4 text-xs font-mono text-muted-foreground">
                    {new Date(year.startDate).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="py-3.5 px-4 text-xs font-mono text-muted-foreground">
                    {new Date(year.endDate).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="py-3.5 px-4">
                    <Badge variant={year.status === "ACTIVE" ? "success" : "secondary"}>
                      {year.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="py-3.5 px-4">
                    {year.isCurrent ? (
                      <Badge variant="success" className="gap-1 text-xs">
                        <CheckCircle2 className="size-3" /> Current Session
                      </Badge>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="py-3.5 px-4 text-center text-xs font-semibold">
                    {year._count.terms} terms
                  </TableCell>
                  <TableCell className="py-3.5 px-6 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {isAdmin && !year.isCurrent && (
                        <form action={setCurrentAcademicYearAction.bind(null, year.id)}>
                          <Button type="submit" variant="outline" size="xs">
                            Set as Current
                          </Button>
                        </form>
                      )}
                      {isAdmin && (
                        <>
                          <EditAcademicYearDialog
                            year={{
                              id: year.id,
                              name: year.name,
                              startDate: year.startDate,
                              endDate: year.endDate,
                              status: year.status,
                              isCurrent: year.isCurrent,
                            }}
                          />
                          <DeleteAcademicYearDialog
                            yearId={year.id}
                            yearName={year.name}
                          />
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Terms & State Machine Transitions */}
      <Card>
        <CardHeader className="p-6 pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <Sliders className="size-5 text-primary" /> Terms & State Machine Lifecycle
              </CardTitle>
              <CardDescription className="text-xs mt-0.5">
                Controlled lifecycle progression: DRAFT → MARK_ENTRY → SUBMITTED → UNDER_REVIEW → APPROVED → FINALIZED → PUBLISHED.
              </CardDescription>
            </div>
            <span className="text-xs font-semibold text-muted-foreground">
              {terms.length} total terms
            </span>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead className="py-3 px-6">Academic Year</TableHead>
                <TableHead className="py-3 px-4 text-center">Seq</TableHead>
                <TableHead className="py-3 px-4">Term Name</TableHead>
                <TableHead className="py-3 px-4">Date Boundaries</TableHead>
                <TableHead className="py-3 px-4 text-center">School Days</TableHead>
                <TableHead className="py-3 px-4">Status</TableHead>
                <TableHead className="py-3 px-6 text-right">Lifecycle Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {terms.map((term) => {
                const getStatusBadge = (status: TermStatus) => {
                  switch (status) {
                    case "MARK_ENTRY":
                      return <Badge variant="info">MARK_ENTRY</Badge>
                    case "SUBMITTED":
                      return <Badge variant="warning">SUBMITTED</Badge>
                    case "UNDER_REVIEW":
                      return <Badge variant="warning">UNDER_REVIEW</Badge>
                    case "APPROVED":
                      return <Badge variant="success">APPROVED</Badge>
                    case "FINALIZED":
                      return <Badge variant="default">FINALIZED</Badge>
                    case "PUBLISHED":
                      return <Badge variant="success">PUBLISHED</Badge>
                    case "REOPENED":
                      return <Badge variant="destructive">REOPENED</Badge>
                    default:
                      return <Badge variant="secondary">{status}</Badge>
                  }
                }

                return (
                  <TableRow key={term.id} className="hover:bg-muted/20 transition-colors">
                    <TableCell className="py-3.5 px-6 font-medium text-xs">
                      {term.academicYear.name}
                      {term.academicYear.isCurrent && (
                        <span className="ml-1.5 text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">
                          (Current)
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="py-3.5 px-4 text-center font-mono text-xs">
                      {term.termSequence}
                    </TableCell>
                    <TableCell className="py-3.5 px-4 font-semibold text-foreground">
                      {term.name}
                    </TableCell>
                    <TableCell className="py-3.5 px-4 text-xs text-muted-foreground font-mono">
                      {new Date(term.startDate).toLocaleDateString()} - {new Date(term.endDate).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="py-3.5 px-4 text-center text-xs">
                      {term.totalSchoolDays} days
                    </TableCell>
                    <TableCell className="py-3.5 px-4">{getStatusBadge(term.status)}</TableCell>
                    <TableCell className="py-3.5 px-6 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {isAdmin && (
                          <>
                            {term.status === "DRAFT" && (
                              <form action={transitionTermStatusAction.bind(null, term.id, "MARK_ENTRY", undefined)}>
                                <Button type="submit" size="xs" variant="default">
                                  Open Mark Entry
                                </Button>
                              </form>
                            )}
                            {term.status === "MARK_ENTRY" && (
                              <form action={transitionTermStatusAction.bind(null, term.id, "SUBMITTED", undefined)}>
                                <Button type="submit" size="xs" variant="outline">
                                  Submit for Review
                                </Button>
                              </form>
                            )}
                            {term.status === "SUBMITTED" && (
                              <form action={transitionTermStatusAction.bind(null, term.id, "UNDER_REVIEW", undefined)}>
                                <Button type="submit" size="xs" variant="outline">
                                  Begin Review
                                </Button>
                              </form>
                            )}
                            {term.status === "UNDER_REVIEW" && (
                              <form action={transitionTermStatusAction.bind(null, term.id, "APPROVED", undefined)}>
                                <Button type="submit" size="xs" variant="default">
                                  Approve Term
                                </Button>
                              </form>
                            )}
                            {term.status === "FINALIZED" && (
                              <form action={transitionTermStatusAction.bind(null, term.id, "PUBLISHED", undefined)}>
                                <Button type="submit" size="xs" variant="default">
                                  Publish Reports
                                </Button>
                              </form>
                            )}

                            <EditTermDialog
                              term={{
                                id: term.id,
                                name: term.name,
                                termSequence: term.termSequence,
                                startDate: term.startDate,
                                endDate: term.endDate,
                                nextTermResumption: term.nextTermResumption,
                                totalSchoolDays: term.totalSchoolDays,
                                status: term.status,
                                academicYearId: term.academicYearId,
                              }}
                            />

                            {term.status === "DRAFT" && (
                              <DeleteTermDialog
                                termId={term.id}
                                termName={term.name}
                              />
                            )}
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
