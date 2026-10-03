import React from "react"
import Link from "next/link"
import { redirect } from "next/navigation"
import { getSession } from "@/lib/auth/session"
import { ScopeGuard } from "@/lib/auth/scope-guard"
import { NotificationService } from "@/server/services/NotificationService"
import { prisma } from "@/lib/prisma"
import { TermStatus } from "@prisma/client"
import {
  MessageSquare,
  Send,
  RefreshCw,
  RotateCcw,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Layers,
  Calendar,
  ShieldCheck,
  Search,
} from "lucide-react"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
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
  processQueueAction,
  retryFailedJobsAction,
  queueTermSmsAction,
  sendAdHocSmsAction,
} from "@/app/actions/notifications"

export default async function NotificationsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>
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
  const activeTab = params.tab || "queue"

  const [stats, jobsData, logsData, publishedTerms] = await Promise.all([
    NotificationService.getQueueStats(),
    NotificationService.listJobs({ limit: 50 }),
    NotificationService.listSmsLogs({ limit: 50 }),
    prisma.term.findMany({
      where: {
        status: { in: [TermStatus.PUBLISHED, TermStatus.FINALIZED] },
      },
      include: { academicYear: true },
      orderBy: { createdAt: "desc" },
    }),
  ])

  return (
    <div className="p-6 md:p-8 flex flex-col gap-8 max-w-7xl mx-auto w-full">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-6">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-primary/10 text-primary rounded-xl">
              <MessageSquare className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">SMS Notifications & Queue Manager</h1>
              <p className="text-sm text-muted-foreground mt-0.5">
                Asynchronous job queue dispatcher, gateway delivery logs, and background worker triggers.
              </p>
            </div>
          </div>
        </div>

        {/* Global Worker Quick-Triggers */}
        <div className="flex items-center gap-3">
          <form action={processQueueAction}>
            <Button type="submit" className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm">
              <RefreshCw className="h-4 w-4" />
              Run Worker Now
            </Button>
          </form>

          {stats.jobs.failed > 0 && (
            <form action={retryFailedJobsAction}>
              <Button type="submit" variant="outline" className="gap-2 border-red-200 text-red-700 hover:bg-red-50">
                <RotateCcw className="h-4 w-4" />
                Retry Failed ({stats.jobs.failed})
              </Button>
            </form>
          )}
        </div>
      </div>

      {/* Overview Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-5 gap-4">
        <Card className="border shadow-none">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs uppercase tracking-wider font-semibold">Pending Jobs</CardDescription>
            <CardTitle className="text-3xl font-extrabold text-amber-600 flex items-center gap-2">
              <Clock className="h-6 w-6 opacity-75" />
              {stats.jobs.pending}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 text-xs text-muted-foreground">
            Awaiting background dispatch
          </CardContent>
        </Card>

        <Card className="border shadow-none">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs uppercase tracking-wider font-semibold">Processing</CardDescription>
            <CardTitle className="text-3xl font-extrabold text-blue-600 flex items-center gap-2">
              <RefreshCw className="h-6 w-6 opacity-75 animate-spin" />
              {stats.jobs.processing}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 text-xs text-muted-foreground">
            Currently in dispatch
          </CardContent>
        </Card>

        <Card className="border shadow-none">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs uppercase tracking-wider font-semibold">Completed</CardDescription>
            <CardTitle className="text-3xl font-extrabold text-emerald-600 flex items-center gap-2">
              <CheckCircle2 className="h-6 w-6 opacity-75" />
              {stats.jobs.completed}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 text-xs text-muted-foreground">
            Successfully sent
          </CardContent>
        </Card>

        <Card className="border shadow-none">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs uppercase tracking-wider font-semibold">Failed Jobs</CardDescription>
            <CardTitle className="text-3xl font-extrabold text-red-600 flex items-center gap-2">
              <AlertTriangle className="h-6 w-6 opacity-75" />
              {stats.jobs.failed}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 text-xs text-muted-foreground">
            Exhausted retry limit
          </CardContent>
        </Card>

        <Card className="border shadow-none col-span-2 md:col-span-1">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs uppercase tracking-wider font-semibold">Total SMS Logs</CardDescription>
            <CardTitle className="text-3xl font-extrabold text-purple-600 flex items-center gap-2">
              <MessageSquare className="h-6 w-6 opacity-75" />
              {stats.smsLogs.total}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 text-xs text-muted-foreground">
            {stats.smsLogs.delivered} delivered / {stats.smsLogs.failed} failed
          </CardContent>
        </Card>
      </div>

      {/* Control Actions Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Queue Term Notifications Form */}
        <Card className="border shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              <CardTitle className="text-base font-semibold">Queue Terminal Report SMS</CardTitle>
            </div>
            <CardDescription className="text-xs">
              Dispatches SMS notifications with student position, average score, and verification link to primary guardians.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {publishedTerms.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No finalized or published terms available to queue. Please publish a term first.
              </p>
            ) : (
              <form action={queueTermSmsAction} className="flex flex-col sm:flex-row gap-3 items-end">
                <div className="flex-1 w-full space-y-1.5">
                  <label htmlFor="termSelect" className="text-xs font-medium text-muted-foreground">Select Term</label>
                  <select
                    id="termSelect"
                    name="termId"
                    className="w-full text-sm border rounded-md px-3 py-2 bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
                    required
                  >
                    {publishedTerms.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.academicYear.name} — {t.name} ({t.status})
                      </option>
                    ))}
                  </select>
                </div>
                <Button type="submit" className="w-full sm:w-auto gap-2">
                  <Send className="h-4 w-4" />
                  Queue SMS Jobs
                </Button>
              </form>
            )}
          </CardContent>
        </Card>

        {/* Send Ad-Hoc SMS Form */}
        <Card className="border shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Send className="h-5 w-5 text-primary" />
              <CardTitle className="text-base font-semibold">Send Custom SMS Alert</CardTitle>
            </div>
            <CardDescription className="text-xs">
              Enqueues an urgent ad-hoc message directly into the notification dispatcher.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form action={sendAdHocSmsAction} className="flex flex-col gap-3">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div className="sm:col-span-1">
                  <label htmlFor="recipientPhone" className="text-xs font-medium text-muted-foreground">Phone Number</label>
                  <Input
                    id="recipientPhone"
                    name="recipientPhone"
                    placeholder="e.g. 0244123456"
                    className="h-9 text-sm mt-1"
                    required
                  />
                </div>
                <div className="sm:col-span-2">
                  <label htmlFor="messageBody" className="text-xs font-medium text-muted-foreground">Message Body</label>
                  <Input
                    id="messageBody"
                    name="messageBody"
                    placeholder="Type urgent SMS message..."
                    className="h-9 text-sm mt-1"
                    required
                  />
                </div>
              </div>
              <div className="flex justify-end">
                <Button type="submit" variant="secondary" className="gap-2 text-xs h-8">
                  <Send className="h-3.5 w-3.5" />
                  Enqueue Custom SMS
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b">
        <Link
          href="/notifications?tab=queue"
          className={`pb-2.5 px-4 text-sm font-medium border-b-2 transition-colors ${
            activeTab === "queue"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          Notification Jobs Queue ({jobsData.total})
        </Link>
        <Link
          href="/notifications?tab=logs"
          className={`pb-2.5 px-4 text-sm font-medium border-b-2 transition-colors ${
            activeTab === "logs"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          Gateway SMS Logs ({logsData.total})
        </Link>
      </div>

      {/* Tab 1: Notification Queue */}
      {activeTab === "queue" && (
        <Card className="border shadow-none">
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base font-semibold">Active Notification Queue</CardTitle>
              <CardDescription className="text-xs">
                Asynchronous jobs scheduled for gateway processing and delivery tracking.
              </CardDescription>
            </div>
            <Badge variant="outline" className="text-xs">
              Showing {jobsData.items.length} of {jobsData.total}
            </Badge>
          </CardHeader>
          <CardContent className="p-0">
            {jobsData.items.length === 0 ? (
              <div className="p-8 text-center text-sm text-muted-foreground">
                No notification jobs found in the queue.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="w-[120px] text-xs">Job ID</TableHead>
                    <TableHead className="text-xs">Recipient</TableHead>
                    <TableHead className="text-xs">Type</TableHead>
                    <TableHead className="text-xs">Status</TableHead>
                    <TableHead className="text-xs">Attempts</TableHead>
                    <TableHead className="text-xs">Available At</TableHead>
                    <TableHead className="text-xs">Processed At</TableHead>
                    <TableHead className="text-xs">Error / Diagnostic</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {jobsData.items.map((job) => {
                    return (
                      <TableRow key={job.id} className="hover:bg-muted/30">
                        <TableCell className="font-mono text-xs text-muted-foreground">
                          {job.id.substring(0, 8)}...
                        </TableCell>
                        <TableCell className="font-medium text-xs">
                          {job.recipient}
                        </TableCell>
                        <TableCell className="text-xs">
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                            {job.type}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {job.status === "PENDING" && (
                            <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100 border-amber-200 text-[10px]">
                              PENDING
                            </Badge>
                          )}
                          {job.status === "PROCESSING" && (
                            <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100 border-blue-200 text-[10px]">
                              PROCESSING
                            </Badge>
                          )}
                          {job.status === "COMPLETED" && (
                            <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100 border-emerald-200 text-[10px]">
                              COMPLETED
                            </Badge>
                          )}
                          {job.status === "FAILED" && (
                            <Badge className="bg-red-100 text-red-800 hover:bg-red-100 border-red-200 text-[10px]">
                              FAILED
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-xs">
                          {job.attempts} / 3
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {new Date(job.availableAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {job.processedAt ? (
                            new Date(job.processedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                          ) : (
                            "—"
                          )}
                        </TableCell>
                        <TableCell className="text-xs max-w-xs truncate text-red-600">
                          {job.errorMessage || "—"}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      {/* Tab 2: SMS Delivery Logs */}
      {activeTab === "logs" && (
        <Card className="border shadow-none">
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base font-semibold">Gateway SMS Delivery Logs</CardTitle>
              <CardDescription className="text-xs">
                Immutable audit logs of SMS gateway dispatches, references, and delivery confirmations.
              </CardDescription>
            </div>
            <Badge variant="outline" className="text-xs">
              Showing {logsData.items.length} of {logsData.total}
            </Badge>
          </CardHeader>
          <CardContent className="p-0">
            {logsData.items.length === 0 ? (
              <div className="p-8 text-center text-sm text-muted-foreground">
                No SMS delivery logs recorded yet.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="w-[120px] text-xs">Log ID</TableHead>
                    <TableHead className="text-xs">Recipient Phone</TableHead>
                    <TableHead className="text-xs">Gateway Reference</TableHead>
                    <TableHead className="text-xs">Message Preview</TableHead>
                    <TableHead className="text-xs">Delivery Status</TableHead>
                    <TableHead className="text-xs">Dispatched At</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logsData.items.map((log) => {
                    return (
                      <TableRow key={log.id} className="hover:bg-muted/30">
                        <TableCell className="font-mono text-xs text-muted-foreground">
                          {log.id.substring(0, 8)}...
                        </TableCell>
                        <TableCell className="font-medium text-xs">
                          {log.recipientPhone}
                        </TableCell>
                        <TableCell className="font-mono text-xs text-primary font-semibold">
                          {log.gatewayReference || "—"}
                        </TableCell>
                        <TableCell className="text-xs max-w-sm truncate text-muted-foreground" title={log.messageBody}>
                          {log.messageBody}
                        </TableCell>
                        <TableCell>
                          {log.deliveryStatus === "DELIVERED" && (
                            <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100 border-emerald-200 text-[10px]">
                              DELIVERED
                            </Badge>
                          )}
                          {log.deliveryStatus === "FAILED" && (
                            <Badge className="bg-red-100 text-red-800 hover:bg-red-100 border-red-200 text-[10px]">
                              FAILED
                            </Badge>
                          )}
                          {log.deliveryStatus === "SENT" && (
                            <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100 border-blue-200 text-[10px]">
                              SENT
                            </Badge>
                          )}
                          {log.deliveryStatus === "PENDING" && (
                            <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100 border-amber-200 text-[10px]">
                              PENDING
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {new Date(log.dispatchedAt).toLocaleString([], {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
