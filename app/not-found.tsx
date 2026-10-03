"use client"

import React from "react"
import Link from "next/link"
import {
  FileQuestion,
  Home,
  ArrowLeft,
  Search,
  BookOpen,
  TableProperties,
  FileCheck2,
  Users,
} from "lucide-react"
import { Button } from "@/components/ui/button"

export default function NotFound() {
  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-300">
      <div className="w-full max-w-md flex flex-col items-center gap-6">
        {/* Visual 404 Badge */}
        <div className="relative">
          <div className="size-24 rounded-3xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-inner">
            <FileQuestion className="size-12" />
          </div>
          <div className="absolute -bottom-2 -right-2 px-2.5 py-0.5 rounded-full bg-primary text-primary-foreground text-xs font-mono font-bold shadow-sm">
            404
          </div>
        </div>

        {/* Heading & Explanation */}
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Page or Record Not Found
          </h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            The academic assessment, student record, or page you are trying to reach does not exist or may have been relocated.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center justify-center gap-3 w-full">
          <Button render={<Link href="/" />} className="gap-2 shadow-sm">
            <Home className="size-4" />
            Back to Dashboard
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              if (typeof window !== "undefined") window.history.back()
            }}
            className="gap-2"
          >
            <ArrowLeft className="size-4" />
            Previous Page
          </Button>
        </div>

        {/* Quick Portal Shortcuts */}
        <div className="w-full border-t pt-6 mt-2">
          <p className="text-xs font-medium text-muted-foreground mb-3 uppercase tracking-wider">
            Quick Navigation Links
          </p>
          <div className="grid grid-cols-3 gap-2">
            <Link
              href="/mark-entry"
              className="p-3 rounded-xl border bg-card/60 hover:bg-accent hover:text-accent-foreground text-xs font-medium flex flex-col items-center gap-1.5 transition-colors"
            >
              <TableProperties className="size-4 text-primary" />
              <span>Mark Entry</span>
            </Link>
            <Link
              href="/students"
              className="p-3 rounded-xl border bg-card/60 hover:bg-accent hover:text-accent-foreground text-xs font-medium flex flex-col items-center gap-1.5 transition-colors"
            >
              <Users className="size-4 text-primary" />
              <span>Students</span>
            </Link>
            <Link
              href="/reports"
              className="p-3 rounded-xl border bg-card/60 hover:bg-accent hover:text-accent-foreground text-xs font-medium flex flex-col items-center gap-1.5 transition-colors"
            >
              <FileCheck2 className="size-4 text-primary" />
              <span>Reports</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
