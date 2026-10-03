"use client"

import * as React from "react"
import {
  ChevronsUpDown,
  LogOut,
  User,
  Shield,
  Check,
  Loader2,
} from "lucide-react"

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"
import { useAuth } from "@/lib/auth/auth-context"

export interface UserProfileProps {
  name: string
  email: string
  avatar?: string
  role: string
  roles?: string[]
}

export function NavUser({
  user,
}: {
  user?: UserProfileProps
}) {
  const { isMobile } = useSidebar()
  const { logout, switchRole, user: authUser } = useAuth()
  const [isLoggingOut, setIsLoggingOut] = React.useState(false)

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true)
      await logout()
    } catch {
      setIsLoggingOut(false)
    }
  }

  const currentUser = {
    name: user?.name || authUser?.displayName || "Dr. Kwesi Appiah",
    email: user?.email || authUser?.email || "headmaster@ada-academy.edu",
    avatar: user?.avatar || "",
    role: user?.role || authUser?.activeRole || "HEADMASTER",
    roles: user?.roles || authUser?.roles || ["HEADMASTER"],
  }

  const initials = currentUser.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .substring(0, 2)
    .toUpperCase()

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <SidebarMenuButton
                size="lg"
                className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
              />
            }
          >
            <Avatar className="h-8 w-8 shrink-0 rounded-lg border">
                <AvatarImage src={currentUser.avatar} alt={currentUser.name} />
                <AvatarFallback className="rounded-lg bg-primary/10 text-primary text-xs font-bold">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight min-w-0">
                <span className="truncate font-semibold">{currentUser.name}</span>
                <span className="truncate text-xs text-muted-foreground flex items-center gap-1">
                  <Shield className="h-3 w-3 shrink-0 text-primary" /> {currentUser.role}
                </span>
              </div>
              <ChevronsUpDown className="ml-auto size-4 shrink-0" />
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-60 min-w-56 rounded-lg"
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={4}
          >
            <DropdownMenuLabel className="p-0 font-normal">
              <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                <Avatar className="h-8 w-8 rounded-lg">
                  <AvatarImage src={currentUser.avatar} alt={currentUser.name} />
                  <AvatarFallback className="rounded-lg bg-primary/10 text-primary text-xs font-bold">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">{currentUser.name}</span>
                  <span className="truncate text-xs text-muted-foreground">{currentUser.email}</span>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />

            {/* Switch Active Role if user has multiple roles */}
            {currentUser.roles.length > 1 && (
              <>
                <DropdownMenuLabel className="text-[11px] font-semibold text-muted-foreground px-2 py-1">
                  Switch Active Role
                </DropdownMenuLabel>
                <DropdownMenuGroup>
                  {currentUser.roles.map((r) => (
                    <DropdownMenuItem
                      key={r}
                      className="gap-2 cursor-pointer"
                      onClick={() => switchRole(r)}
                    >
                      <Shield className="h-3.5 w-3.5 text-primary" />
                      <span className="flex-1">{r}</span>
                      {r === currentUser.role && <Check className="h-3.5 w-3.5 text-emerald-500" />}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
              </>
            )}

            <DropdownMenuItem
              className="gap-2 text-destructive focus:bg-destructive/10 cursor-pointer font-medium"
              onClick={handleLogout}
              disabled={isLoggingOut}
            >
              {isLoggingOut ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin text-destructive shrink-0" />
                  <span>Signing out...</span>
                </>
              ) : (
                <>
                  <LogOut className="h-4 w-4 shrink-0" />
                  <span>Sign Out</span>
                </>
              )}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
