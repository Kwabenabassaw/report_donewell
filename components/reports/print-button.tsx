"use client"

import React from "react"
import { Printer } from "lucide-react"
import { Button } from "@/components/ui/button"

export function PrintButton() {
  return (
    <Button
      onClick={() => window.print()}
      className="bg-primary hover:bg-primary/90 shadow-sm print:hidden"
    >
      <Printer className="mr-2 h-4 w-4" />
      Print / Save as PDF
    </Button>
  )
}
