import React from "react"
import { redirect } from "next/navigation"
import { getSession } from "@/lib/auth/session"
import { ScopeGuard } from "@/lib/auth/scope-guard"
import { UserService } from "@/server/services/UserService"
import {
  Users,
  Shield,
  CheckCircle2,
  XCircle,
  Clock,
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
import { toggleUserStatusAction } from "@/app/actions/users"
import {
  CreateUserDialog,
  EditUserDialog,
  ResetPasswordDialog,
} from "@/components/users/user-dialogs"

export default async function UsersPage() {
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

  const [users, availableRoles] = await Promise.all([
    UserService.listUsers(),
    UserService.listRoles(),
  ])

  return (
    <div className="p-6 md:p-8 flex flex-col gap-8 max-w-7xl mx-auto w-full">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-6">
        <div className="flex flex-col gap-1">
          <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary uppercase tracking-wider">
            <Users className="size-3.5" /> Staff & Access Control
          </div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Staff & User Accounts</h1>
          <p className="text-sm text-muted-foreground">
            Manage academic staff, teachers, administrators, system roles, and account security.
          </p>
        </div>

        <div>
          <CreateUserDialog availableRoles={availableRoles} />
        </div>
      </div>

      {/* Full-width User Roster Card */}
      <Card>
        <CardHeader className="p-6 pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <Shield className="size-5 text-primary" /> Active Staff & Accounts
              </CardTitle>
              <CardDescription className="text-xs mt-0.5">
                Total registered user accounts: {users.length}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead className="py-3 px-6">Staff Member</TableHead>
                <TableHead className="py-3 px-4">Assigned Roles</TableHead>
                <TableHead className="py-3 px-4">Status</TableHead>
                <TableHead className="py-3 px-4">Created</TableHead>
                <TableHead className="py-3 px-6 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((u) => (
                <TableRow key={u.id} className="hover:bg-muted/20 transition-colors">
                  <TableCell className="py-3.5 px-6">
                    <div className="font-semibold text-sm text-foreground">{u.displayName}</div>
                    <div className="text-xs text-muted-foreground font-mono">
                      @{u.username} {u.email ? `• ${u.email}` : ""}
                    </div>
                  </TableCell>
                  <TableCell className="py-3.5 px-4">
                    <div className="flex flex-wrap gap-1">
                      {u.roles.map((r) => (
                        <Badge
                          key={r}
                          variant={r.includes("ADMIN") ? "default" : "secondary"}
                          className="text-[11px]"
                        >
                          {r}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell className="py-3.5 px-4">
                    {u.status === "ACTIVE" ? (
                      <Badge variant="success" className="gap-1">
                        <CheckCircle2 className="size-3" /> Active
                      </Badge>
                    ) : (
                      <Badge variant="destructive" className="gap-1">
                        <XCircle className="size-3" /> Suspended
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="py-3.5 px-4 text-xs font-mono text-muted-foreground">
                    {new Date(u.createdAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="py-3.5 px-6 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <EditUserDialog user={u} availableRoles={availableRoles} />
                      <ResetPasswordDialog userId={u.id} username={u.username} />

                      {u.username !== "admin" && (
                        <form action={toggleUserStatusAction.bind(null, u.id)}>
                          <Button
                            type="submit"
                            size="xs"
                            variant={u.status === "ACTIVE" ? "destructive" : "outline"}
                          >
                            {u.status === "ACTIVE" ? "Suspend" : "Activate"}
                          </Button>
                        </form>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
