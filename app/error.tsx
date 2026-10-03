"use client"

import React, { useEffect, useState } from "react"
import Link from "next/link"
import {
  AlertTriangle,
  RotateCcw,
  Home,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  ShieldAlert,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const [showDetails, setShowDetails] = useState(false)

  useEffect(() => {
    // Log the error to console for monitoring
    console.error("[App Error Boundary Caught]:", error)
  }, [error])

  return (
    <div className="min-h-[75vh] flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-300">
      <Card className="w-full max-w-lg border-destructive/30 shadow-lg bg-card/90">
        <CardHeader className="flex flex-col items-center pb-2">
          {/* Error Icon */}
          <div className="size-16 rounded-2xl bg-destructive/10 border border-destructive/20 flex items-center justify-center text-destructive mb-3 shadow-inner">
            <AlertTriangle className="size-8" />
          </div>
          <CardTitle className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
            Something Went Wrong
          </CardTitle>
          <CardDescription className="text-sm text-muted-foreground mt-1 text-center max-w-md">
            An unexpected error interrupted this operation. The system has safely stopped the process to protect your data.
          </CardDescription>
        </CardHeader>

        <CardContent className="flex flex-col gap-5 pt-2">
          {/* Recovery Buttons */}
          <div className="flex flex-wrap items-center justify-center gap-3 w-full">
            <Button
              onClick={() => reset()}
              className="gap-2 shadow-sm bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              <RotateCcw className="size-4" />
              Try Again
            </Button>

            <Button
              variant="outline"
              onClick={() => window.location.reload()}
              className="gap-2"
            >
              <RefreshCw className="size-4" />
              Reload Page
            </Button>

            <Button
              variant="ghost"
              render={<Link href="/" />}
              className="gap-2"
            >
              <Home className="size-4" />
              Dashboard
            </Button>
          </div>

          {/* Collapsible Technical Details */}
          <div className="w-full border-t pt-4 text-left">
            <button
              type="button"
              onClick={() => setShowDetails(!showDetails)}
              className="flex items-center justify-between w-full text-xs font-mono text-muted-foreground hover:text-foreground py-1 transition-colors"
            >
              <span className="flex items-center gap-1.5 font-sans font-medium">
                <ShieldAlert className="size-3.5 text-muted-foreground" />
                Technical Error Details
              </span>
              {showDetails ? (
                <ChevronUp className="size-3.5" />
              ) : (
                <ChevronDown className="size-3.5" />
              )}
            </button>

            {showDetails && (
              <div className="mt-2.5 p-3 rounded-xl bg-muted/60 border border-border/80 font-mono text-xs text-destructive break-words space-y-1.5 animate-in fade-in duration-150">
                <p className="font-semibold text-foreground">Error Message:</p>
                <p className="text-[11px] leading-relaxed bg-background/80 p-2 rounded border border-border/50">
                  {error.message || "Unknown runtime exception"}
                </p>
                {error.digest && (
                  <p className="text-[10px] text-muted-foreground pt-1">
                    Error Digest ID: <span className="text-foreground">{error.digest}</span>
                  </p>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
