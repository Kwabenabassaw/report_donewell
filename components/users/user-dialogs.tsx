"use client"

import React, { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { UserPlus, KeyRound, Pencil } from "lucide-react"
import {
  createUserAction,
  updateUserAction,
  resetPasswordAction,
} from "@/app/actions/users"

export interface RoleOption {
  id: string
  name: string
  description?: string | null
}

export interface UserRecord {
  id: string
  username: string
  displayName: string
  email?: string | null
  status: string
  roles: string[]
  classesSupervised?: string[]
  createdAt: Date | string
}

export function EditUserDialog({
  user,
  availableRoles,
}: {
  user: UserRecord
  availableRoles: RoleOption[]
}) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant="outline" size="xs" className="gap-1 text-xs">
            <Pencil className="size-3" /> Edit
          </Button>
        }
      />
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pencil className="size-4 text-primary" /> Edit User Account
          </DialogTitle>
          <DialogDescription>
            Update profile information, assigned system roles, and status for{" "}
            <span className="font-semibold text-foreground">@{user.username}</span>.
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="p-3 text-xs bg-destructive/10 text-destructive border border-destructive/20 rounded-md">
            {error}
          </div>
        )}

        <form
          action={async (formData) => {
            try {
              setLoading(true)
              setError(null)
              await updateUserAction(formData)
              setOpen(false)
            } catch (err: unknown) {
              setError(err instanceof Error ? err.message : "Failed to update user.")
            } finally {
              setLoading(false)
            }
          }}
          className="flex flex-col gap-4 mt-2"
        >
          <input type="hidden" name="userId" value={user.id} />

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Username
              </label>
              <Input
                value={user.username}
                disabled
                className="bg-muted/50 font-mono text-xs cursor-not-allowed opacity-80"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Account Status
              </label>
              <select
                name="status"
                defaultValue={user.status}
                className="w-full h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
              >
                <option value="ACTIVE">ACTIVE</option>
                <option value="SUSPENDED">SUSPENDED</option>
              </select>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Full Display Name *
            </label>
            <Input name="displayName" defaultValue={user.displayName} required />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Email Address
            </label>
            <Input
              name="email"
              type="email"
              defaultValue={user.email || ""}
              placeholder="e.g. staff@school.edu"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              New Password (Optional)
            </label>
            <Input
              name="password"
              type="password"
              placeholder="Leave blank to keep current password"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Assign System Roles
            </label>
            <div className="grid grid-cols-2 gap-2 border rounded-xl p-3 bg-muted/20">
              {availableRoles.map((role) => (
                <label
                  key={role.id}
                  className="flex items-center gap-2 text-xs cursor-pointer select-none"
                >
                  <input
                    type="checkbox"
                    name="roles"
                    value={role.name}
                    defaultChecked={user.roles.includes(role.name)}
                    className="size-4 rounded border-border text-primary focus:ring-primary cursor-pointer"
                  />
                  <span className="font-medium text-foreground">{role.name}</span>
                </label>
              ))}
            </div>
          </div>

          <DialogFooter className="mt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export function CreateUserDialog({ availableRoles }: { availableRoles: RoleOption[] }) {
  const [open, setOpen] = useState(false)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button className="gap-2 shadow-xs">
            <UserPlus className="size-4" /> Register New User
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="size-4 text-primary" /> Register Staff Account
          </DialogTitle>
          <DialogDescription>
            Create an academic staff account with designated system roles and permissions.
          </DialogDescription>
        </DialogHeader>

        <form
          action={async (formData) => {
            await createUserAction(formData)
            setOpen(false)
          }}
          className="flex flex-col gap-4"
        >
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Username
              </label>
              <Input name="username" placeholder="e.g. jdoe" required />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Initial Password
              </label>
              <Input
                name="password"
                type="password"
                placeholder="Min 6 characters"
                required
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Full Display Name
            </label>
            <Input name="displayName" placeholder="e.g. John Doe (Mr.)" required />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Email Address (Optional)
            </label>
            <Input name="email" type="email" placeholder="e.g. jdoe@school.edu" />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Assign System Roles
            </label>
            <div className="grid grid-cols-2 gap-2 border rounded-xl p-3 bg-muted/20">
              {availableRoles.map((role) => (
                <label
                  key={role.id}
                  className="flex items-center gap-2 text-xs cursor-pointer select-none"
                >
                  <input
                    type="checkbox"
                    name="roles"
                    value={role.name}
                    defaultChecked={role.name === "SUBJECT_TEACHER"}
                    className="size-4 rounded border-border text-primary focus:ring-primary cursor-pointer"
                  />
                  <span className="font-medium text-foreground">{role.name}</span>
                </label>
              ))}
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit">Create Account</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export function ResetPasswordDialog({
  userId,
  username,
}: {
  userId: string
  username: string
}) {
  const [open, setOpen] = useState(false)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant="outline" size="xs" className="gap-1 text-xs">
            <KeyRound className="size-3" /> Reset
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <KeyRound className="size-4 text-primary" /> Reset Password
          </DialogTitle>
          <DialogDescription>
            Enter a new password for <span className="font-semibold text-foreground">@{username}</span>.
          </DialogDescription>
        </DialogHeader>

        <form
          action={async (formData) => {
            await resetPasswordAction(userId, formData)
            setOpen(false)
          }}
          className="flex flex-col gap-4"
        >
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              New Password
            </label>
            <Input
              name="newPassword"
              type="password"
              placeholder="Min 6 characters"
              required
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit">Update Password</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
