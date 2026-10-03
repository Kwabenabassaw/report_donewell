"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import {
  GraduationCap,
  LayoutDashboard,
  TableProperties,
  FileCheck2,
  Calendar,
  Layers,
  BookOpen,
  UserCheck,
  Users,
  ShieldAlert,
  FileSpreadsheet,
  MessageSquare,
  History,
  Sliders,
  Award,
  Upload,
  Lock,
  Search,
} from "lucide-react"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarSeparator,
} from "@/components/ui/sidebar"
import { NavUser, UserProfileProps } from "@/components/layout/nav-user"

interface NavItem {
  title: string
  url: string
  icon: React.ComponentType<{ className?: string }>
  badge?: string
  roles?: string[] // Allowed roles. If empty/omitted, allowed for all authenticated users
}

interface NavGroup {
  label: string
  items: NavItem[]
}

const NAVIGATION_GROUPS: NavGroup[] = [
  {
    label: "Main",
    items: [
      {
        title: "Overview Dashboard",
        url: "/",
        icon: LayoutDashboard,
      },
      {
        title: "Academic Analytics",
        url: "/analytics",
        icon: Award,
        roles: ["SUPER_ADMIN", "HEADMASTER", "EXAM_OFFICER", "CLASS_TEACHER", "SUBJECT_TEACHER"],
      },
    ],
  },
  {
    label: "Teaching & Marks",
    items: [
      {
        title: "Spreadsheet Mark Entry",
        url: "/mark-entry",
        icon: TableProperties,
        badge: "Live Grid",
        roles: ["SUPER_ADMIN", "HEADMASTER", "EXAM_OFFICER", "SUBJECT_TEACHER"],
      },
      {
        title: "Assessment Activities",
        url: "/assessments",
        icon: FileSpreadsheet,
        roles: ["SUPER_ADMIN", "HEADMASTER", "EXAM_OFFICER", "SUBJECT_TEACHER"],
      },
      {
        title: "Form Teacher Evaluations",
        url: "/evaluations",
        icon: UserCheck,
        roles: ["SUPER_ADMIN", "HEADMASTER", "CLASS_TEACHER"],
      },
    ],
  },
  {
    label: "Academic Management",
    items: [
      {
        title: "Academic Years & Terms",
        url: "/academic-years",
        icon: Calendar,
        roles: ["SUPER_ADMIN", "HEADMASTER", "EXAM_OFFICER"],
      },
      {
        title: "Classes & Subjects",
        url: "/classes",
        icon: Layers,
        roles: ["SUPER_ADMIN", "HEADMASTER", "EXAM_OFFICER"],
      },
      {
        title: "Teacher Allocations",
        url: "/teacher-assignments",
        icon: BookOpen,
        roles: ["SUPER_ADMIN", "HEADMASTER", "EXAM_OFFICER"],
      },
      {
        title: "Grading Policies",
        url: "/grading-policies",
        icon: Award,
        roles: ["SUPER_ADMIN", "HEADMASTER", "EXAM_OFFICER"],
      },
    ],
  },
  {
    label: "Student Records",
    items: [
      {
        title: "Student Directory",
        url: "/students",
        icon: Users,
        roles: ["SUPER_ADMIN", "HEADMASTER", "EXAM_OFFICER", "CLASS_TEACHER"],
      },
      {
        title: "CSV Student Import",
        url: "/students/import",
        icon: Upload,
        roles: ["SUPER_ADMIN", "EXAM_OFFICER"],
      },
      {
        title: "Bulk CSV Import Hub",
        url: "/csv-import",
        icon: FileSpreadsheet,
        roles: ["SUPER_ADMIN", "HEADMASTER", "EXAM_OFFICER", "CLASS_TEACHER", "SUBJECT_TEACHER"],
      },
    ],
  },
  {
    label: "Review & Official Results",
    items: [
      {
        title: "Moderation & Review",
        url: "/moderation",
        icon: ShieldAlert,
        roles: ["SUPER_ADMIN", "HEADMASTER", "EXAM_OFFICER"],
      },
      {
        title: "Finalization & Snapshots",
        url: "/finalization",
        icon: Lock,
        roles: ["SUPER_ADMIN", "HEADMASTER", "EXAM_OFFICER"],
      },
      {
        title: "Terminal Report Cards",
        url: "/reports",
        icon: FileCheck2,
        roles: ["SUPER_ADMIN", "HEADMASTER", "EXAM_OFFICER", "CLASS_TEACHER", "STUDENT", "GUARDIAN"],
      },
      {
        title: "Report Template Designer",
        url: "/reports/template-editor",
        icon: Sliders,
        roles: ["SUPER_ADMIN", "HEADMASTER", "EXAM_OFFICER"],
      },
      {
        title: "Report QR Verification",
        url: "/reports/verify",
        icon: Search,
      },
    ],
  },
  {
    label: "System & Communication",
    items: [
      {
        title: "SMS Notification Queue",
        url: "/notifications",
        icon: MessageSquare,
        roles: ["SUPER_ADMIN", "HEADMASTER", "EXAM_OFFICER"],
      },
      {
        title: "Audit Trail",
        url: "/audit-logs",
        icon: History,
        roles: ["SUPER_ADMIN", "HEADMASTER"],
      },
      {
        title: "Staff & User Accounts",
        url: "/users",
        icon: UserCheck,
        roles: ["SUPER_ADMIN", "HEADMASTER"],
      },
      {
        title: "School Settings",
        url: "/settings",
        icon: Sliders,
        roles: ["SUPER_ADMIN", "HEADMASTER"],
      },
    ],
  },
]

export function AppSidebar({
  user,
  school = {
    name: "Mountains High College and International School",
    code: "MHCIS-001",
    term: "First Term (2026/2027)",
  },
  ...props
}: React.ComponentProps<typeof Sidebar> & {
  user?: UserProfileProps
  school?: { name: string; code: string; term: string }
}) {
  const pathname = usePathname()
  const activeRole = user?.role || "SUPER_ADMIN"

  return (
    <Sidebar collapsible="icon" {...props}>
      {/* Sidebar Header: School Brand & Active Term */}
      <SidebarHeader className="border-b px-4 py-3">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="sm" render={<Link href="/" />}>
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm shadow-primary/20">
                <GraduationCap className="size-5 text-primary-foreground" />
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight min-w-0">
                <span className="truncate font-bold tracking-tight">{school.name}</span>
                <span className="truncate text-xs text-muted-foreground font-mono">{school.term}</span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      {/* Navigation Sections */}
      <SidebarContent className="px-2">
        {NAVIGATION_GROUPS.map((group) => {
          // Filter items based on active role
          const filteredItems = group.items.filter((item) => {
            if (!item.roles || item.roles.length === 0) return true
            return item.roles.includes(activeRole)
          })

          if (filteredItems.length === 0) return null

          return (
            <SidebarGroup key={group.label}>
              <SidebarGroupLabel className="text-[11px] font-semibold tracking-wider text-muted-foreground/80 uppercase">
                {group.label}
              </SidebarGroupLabel>
              <SidebarMenu>
                {filteredItems.map((item) => {
                  const isActive = pathname === item.url || (item.url !== "/" && pathname.startsWith(item.url))
                  return (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton
                        render={<Link href={item.url} />}
                        tooltip={item.title}
                        isActive={isActive}
                        className={cn(
                          "flex items-center gap-2.5 w-full",
                          isActive && "bg-primary text-primary-foreground font-semibold hover:bg-primary/90 hover:text-primary-foreground"
                        )}
                      >
                        <item.icon className="h-4 w-4 shrink-0" />
                        <span className="truncate flex-1">{item.title}</span>
                        {item.badge && (
                          <span className="ml-auto shrink-0 rounded-full bg-emerald-500/20 px-1.5 py-0.5 text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
                            {item.badge}
                          </span>
                        )}
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  )
                })}
              </SidebarMenu>
            </SidebarGroup>
          )
        })}
      </SidebarContent>

      <SidebarSeparator />

      {/* Sidebar Footer: User Profile with Role */}
      <SidebarFooter className="p-2">
        <NavUser user={user} />
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  )
}
