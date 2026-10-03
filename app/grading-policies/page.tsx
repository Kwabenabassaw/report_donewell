import React from "react"
import { redirect } from "next/navigation"
import { getSession } from "@/lib/auth/session"
import { ScopeGuard } from "@/lib/auth/scope-guard"
import { GradingPolicyService } from "@/server/services/GradingPolicyService"
import { AcademicYearService } from "@/server/services/AcademicYearService"
import {
  Award,
  Sliders,
  CheckCircle2,
  Layers,
  Percent,
  Calendar,
} from "lucide-react"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  CreateGradingPolicyDialog,
  EditGradingPolicyDialog,
  ActivateGradingPolicyDialog,
  DeleteGradingPolicyDialog,
} from "@/components/grading/grading-dialogs"

export default async function GradingPoliciesPage() {
  const session = await getSession()
  if (!session) {
    redirect("/login")
  }

  const isAdmin = ScopeGuard.isAdministrative({
    userId: session.userId,
    roles: session.roles,
  })

  const [policies, academicYears] = await Promise.all([
    GradingPolicyService.listPolicies(),
    AcademicYearService.listAcademicYears(),
  ])

  const activePolicy = policies.find((p) => p.status === "ACTIVE") || policies[0]

  return (
    <div className="p-6 md:p-8 flex flex-col gap-8 max-w-7xl mx-auto w-full">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex flex-col gap-1">
          <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary uppercase tracking-wider">
            <Award className="size-3.5" /> Assessment Standards
          </div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
            Grading Policies & Component Weights
          </h1>
          <p className="text-muted-foreground text-sm">
            Define institutional assessment weights (e.g. 30% Continuous Assessment, 70% Terminal Exam) and non-overlapping grade boundary scales.
          </p>
        </div>

        {isAdmin && (
          <CreateGradingPolicyDialog academicYears={academicYears} />
        )}
      </div>

      {/* Active Policy Spotlight Hero Card */}
      {activePolicy && (
        <Card className="border-primary/20 bg-gradient-to-br from-primary/5 via-card to-card">
          <CardHeader className="pb-3">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div>
                <div className="flex items-center gap-2">
                  <Badge variant="default" className="text-xs font-bold gap-1 bg-primary text-primary-foreground">
                    <CheckCircle2 className="size-3" /> Active Institutional Standard
                  </Badge>
                  <span className="text-xs text-muted-foreground font-mono">
                    Version {activePolicy.version}
                  </span>
                </div>
                <CardTitle className="text-xl mt-1.5">{activePolicy.name}</CardTitle>
                <CardDescription className="text-xs mt-0.5">
                  Ranking method: <span className="font-semibold text-foreground">{activePolicy.rankingMethod}</span>
                  {activePolicy.academicYear ? (
                    <> • Linked Session: <span className="font-semibold text-foreground">{activePolicy.academicYear.name}</span></>
                  ) : (
                    <> • Scope: <span className="font-semibold text-foreground">Institution-Wide (All Sessions)</span></>
                  )}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-3">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Configured Component Breakdown
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {activePolicy.components.map((comp) => (
                  <div
                    key={comp.id}
                    className="p-4 border rounded-lg bg-card/60 flex flex-col gap-2 shadow-xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-sm">{comp.name}</span>
                      <Badge variant="secondary" className="font-mono text-xs font-bold">
                        {comp.weight}%
                      </Badge>
                    </div>
                    <span className="text-xs text-muted-foreground font-mono">Code: {comp.code}</span>
                    {comp.categories.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {comp.categories.map((cat) => (
                          <span
                            key={cat.id}
                            className="text-[11px] bg-muted px-2 py-0.5 rounded text-muted-foreground"
                          >
                            {cat.name}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* All Policies Roster Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Layers className="size-4 text-primary" /> All Institutional Policies ({policies.length})
          </CardTitle>
          <CardDescription>
            Historical and active policy versions. Only one policy can be active per scope.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="border rounded-md overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Policy Name</TableHead>
                  <TableHead>Scope / Academic Year</TableHead>
                  <TableHead>CA / Exam Ratio</TableHead>
                  <TableHead>Ranking</TableHead>
                  <TableHead>Status</TableHead>
                  {isAdmin && <TableHead className="text-right">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {policies.map((p) => {
                  const ca = p.components.find((c) => c.code === "CA")?.weight ?? 0
                  const exam = p.components.find((c) => c.code === "EXAM")?.weight ?? 0
                  const isCurrentActive = p.status === "ACTIVE"

                  return (
                    <TableRow key={p.id} className="hover:bg-muted/20 transition-colors">
                      <TableCell className="font-semibold text-sm">
                        {p.name}
                        <span className="text-xs text-muted-foreground font-mono ml-2">
                          (v{p.version})
                        </span>
                      </TableCell>
                      <TableCell className="text-xs">
                        {p.academicYear ? (
                          <Badge variant="outline">{p.academicYear.name}</Badge>
                        ) : (
                          <span className="text-muted-foreground font-medium">Institution-Wide</span>
                        )}
                      </TableCell>
                      <TableCell className="text-xs font-mono">
                        <Badge variant="secondary" className="font-mono">
                          CA: {ca}% / Exam: {exam}%
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs font-mono text-muted-foreground">
                        {p.rankingMethod}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={isCurrentActive ? "default" : "outline"}
                          className="text-[10px] font-bold uppercase"
                        >
                          {p.status}
                        </Badge>
                      </TableCell>
                      {isAdmin && (
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <EditGradingPolicyDialog
                              policy={p}
                              academicYears={academicYears}
                            />
                            {!isCurrentActive && (
                              <ActivateGradingPolicyDialog
                                policyId={p.id}
                                policyName={p.name}
                              />
                            )}
                            {!isCurrentActive && (
                              <DeleteGradingPolicyDialog
                                policyId={p.id}
                                policyName={p.name}
                              />
                            )}
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Grade Boundaries Table (Full Width) */}
      {activePolicy && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Sliders className="size-4 text-primary" /> Grade Boundaries & GPA Points ({activePolicy.gradeBands.length} Bands)
            </CardTitle>
            <CardDescription>
              Official mark boundaries mapped to WAEC/GES letter grades and points for <span className="font-semibold text-foreground">{activePolicy.name}</span>.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="border rounded-md overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Grade</TableHead>
                    <TableHead>Score Range</TableHead>
                    <TableHead>Grade Point</TableHead>
                    <TableHead>Interpretation</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {activePolicy.gradeBands.map((band) => (
                    <TableRow key={band.id} className="hover:bg-muted/20 transition-colors">
                      <TableCell className="font-bold text-xs text-primary font-mono">
                        {band.grade}
                      </TableCell>
                      <TableCell className="text-xs font-mono">
                        {band.minimumScore.toFixed(0)}% — {band.maximumScore.toFixed(1)}%
                      </TableCell>
                      <TableCell className="text-xs font-mono font-semibold">
                        {band.gradePoint.toFixed(1)}
                      </TableCell>
                      <TableCell className="text-xs">
                        <Badge variant="outline" className="text-[11px]">
                          {band.interpretation}
                        </Badge>
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
