"use client"

import React, { useEffect, useState, useTransition } from "react"
import { usePathname, useSearchParams } from "next/navigation"

export function RouteLoadingIndicator() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState(0)

  // Reset loading when route changes
  useEffect(() => {
    if (loading) {
      setProgress(100)
      const timer = setTimeout(() => {
        setLoading(false)
        setProgress(0)
      }, 300)
      return () => clearTimeout(timer)
    }
  }, [pathname, searchParams])

  // Intercept navigation link clicks to trigger instant visual feedback
  useEffect(() => {
    const handleAnchorClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      const anchor = target.closest("a")
      if (!anchor) return

      const href = anchor.getAttribute("href")
      if (!href) return

      // Ignore external links, anchors, or new tab clicks
      if (
        href.startsWith("http") ||
        href.startsWith("#") ||
        href.startsWith("mailto:") ||
        href.startsWith("tel:") ||
        anchor.target === "_blank" ||
        e.ctrlKey ||
        e.metaKey ||
        e.shiftKey
      ) {
        return
      }

      // Check if clicking the same route
      const currentUrl = window.location.pathname + window.location.search
      if (href === currentUrl) return

      // Start progress
      setLoading(true)
      setProgress(25)

      // Increment progress gradually until route lands
      const interval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 85) {
            clearInterval(interval)
            return 85
          }
          return prev + Math.random() * 15
        })
      }, 150)

      setTimeout(() => clearInterval(interval), 5000)
    }

    document.addEventListener("click", handleAnchorClick)
    return () => document.removeEventListener("click", handleAnchorClick)
  }, [])

  if (!loading && progress === 0) return null

  return (
    <div className="fixed top-0 left-0 right-0 z-[9999] pointer-events-none h-1 bg-transparent overflow-hidden">
      <div
        className="h-full bg-primary transition-all duration-200 ease-out shadow-[0_0_10px_var(--color-primary)]"
        style={{
          width: `${progress}%`,
          opacity: progress === 100 ? 0 : 1,
          transition: progress === 100 ? "width 150ms ease-out, opacity 300ms ease-in" : "width 200ms ease-out",
        }}
      />
    </div>
  )
}
