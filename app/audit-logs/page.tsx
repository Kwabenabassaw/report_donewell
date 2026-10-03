import React from "react"
import { redirect } from "next/navigation"
import { getSession } from "@/lib/auth/session"
import { ScopeGuard } from "@/lib/auth/scope-guard"
import { AuditService } from "@/server/services/AuditService"
import {
  History,
  ShieldAlert,
  UserCheck,
  Calendar,
  Layers,
  ArrowRight,
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

export default async function AuditLogsPage({
  searchParams,
}: {
  searchParams: Promise<{ action?: string; entityType?: string }>
}) {
  const session = await getSession()
  if (!session) {
    redirect("/login")
  }

  const isAdmin = ScopeGuard.isAdministrative({
    userId: session.userId,
    roles: session.roles,
  })

  if (!isAdmin) {
    redirect("/")
  }

  const params = await searchParams
  const logs = await AuditService.getLogs({
    action: params.action,
    entityType: params.entityType,
    limit: 100,
  })

  return (
    <div className="p-6 md:p-8 flex flex-col gap-8 max-w-7xl mx-auto w-full">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-6">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-primary/10 text-primary rounded-xl">
              <History className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">System Audit Trail</h1>
              <p className="text-sm text-muted-foreground mt-0.5">
                Append-only tamper-evident audit records of all academic, score, finalization, and security actions.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Audit Log Table */}
      <Card className="border shadow-none">
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base font-semibold">Security & Operational Activity Log</CardTitle>
            <CardDescription className="text-xs">
              Showing the latest {logs.length} system operations in reverse chronological order.
            </CardDescription>
          </div>
          <Badge variant="outline" className="text-xs">
            {logs.length} Records
          </Badge>
        </CardHeader>
        <CardContent className="p-0">
          {logs.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              No audit logs recorded yet.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="text-xs">Timestamp</TableHead>
                  <TableHead className="text-xs">Actor / User</TableHead>
                  <TableHead className="text-xs">Action</TableHead>
                  <TableHead className="text-xs">Target Entity</TableHead>
                  <TableHead className="text-xs">Changes & Context</TableHead>
                  <TableHead className="text-xs">Client IP</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log) => {
                  let formattedNewValues = log.newValues
                  if (log.newValues) {
                    try {
                      const parsed = JSON.parse(log.newValues)
                      formattedNewValues = Object.entries(parsed)
                        .map(([k, v]) => `${k}: ${typeof v === "object" ? JSON.stringify(v) : v}`)
                        .join(" | ")
                    } catch {
                      formattedNewValues = log.newValues
                    }
                  }

                  return (
                    <TableRow key={log.id} className="hover:bg-muted/30">
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                        {new Date(log.createdAt).toLocaleString([], {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                          second: "2-digit",
                        })}
                      </TableCell>
                      <TableCell className="text-xs font-medium">
                        {log.user ? (
                          <div>
                            <div>{log.user.displayName}</div>
                            <div className="text-[10px] text-muted-foreground">@{log.user.username}</div>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">System / Guest</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={`text-[10px] font-mono ${
                            log.action.includes("FAILED")
                              ? "border-red-300 text-red-700 bg-red-50"
                              : log.action.includes("FINALIZE") || log.action.includes("PUBLISH")
                              ? "border-emerald-300 text-emerald-800 bg-emerald-50"
                              : "border-blue-200 text-blue-800 bg-blue-50"
                          }`}
                        >
                          {log.action}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs font-mono text-muted-foreground">
                        {log.entityType}: {log.entityId.substring(0, 12)}
                      </TableCell>
                      <TableCell className="text-xs max-w-sm truncate text-muted-foreground" title={formattedNewValues || ""}>
                        {formattedNewValues || "—"}
                      </TableCell>
                      <TableCell className="text-xs font-mono text-muted-foreground">
                        {log.ipAddress || "::1"}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
