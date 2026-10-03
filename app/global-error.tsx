"use client"

import React from "react"
import { AlertTriangle, RotateCcw, RefreshCw } from "lucide-react"

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-background text-foreground flex items-center justify-center p-6 font-sans">
        <div className="w-full max-w-md p-8 rounded-2xl border bg-card shadow-xl text-center flex flex-col items-center gap-6">
          <div className="size-16 rounded-2xl bg-destructive/10 border border-destructive/20 flex items-center justify-center text-destructive shadow-inner">
            <AlertTriangle className="size-8" />
          </div>

          <div className="flex flex-col gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Critical System Error
            </h1>
            <p className="text-sm text-muted-foreground leading-relaxed">
              The application encountered a critical root exception. Please try refreshing or restarting your session.
            </p>
          </div>

          <div className="flex items-center justify-center gap-3 w-full">
            <button
              onClick={() => reset()}
              className="px-4 py-2 rounded-lg bg-primary text-primary-foreground font-medium text-sm flex items-center gap-2 hover:bg-primary/90 transition-colors shadow-sm"
            >
              <RotateCcw className="size-4" />
              Try Again
            </button>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 rounded-lg border bg-card text-foreground font-medium text-sm flex items-center gap-2 hover:bg-accent hover:text-accent-foreground transition-colors"
            >
              <RefreshCw className="size-4" />
              Reload Application
            </button>
          </div>

          {error.digest && (
            <p className="text-[11px] font-mono text-muted-foreground border-t pt-4 w-full">
              System Reference: {error.digest}
            </p>
          )}
        </div>
      </body>
    </html>
  )
}
