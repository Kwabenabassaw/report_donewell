"use client"

import React from "react"
import { HeartHandshake, PhoneCall, FileText, CheckCircle2, AlertCircle, MessageSquare } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

interface GuardianOnboardingProps {
  context: {
    wards?: Array<{
      id: string
      name: string
      studentIdNumber: string
      className: string
      relationship?: string
    }>
  }
}

export function GuardianOnboardingView({ context }: GuardianOnboardingProps) {
  const wards = context.wards || []
  const hasWards = wards.length > 0

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="rounded-xl border bg-gradient-to-r from-rose-500/10 via-rose-500/5 to-transparent p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <HeartHandshake className="size-5 text-rose-600" />
              <h3 className="text-lg font-bold tracking-tight text-foreground">Parent & Guardian Portal</h3>
            </div>
            <p className="text-sm text-muted-foreground">
              Direct Access to Your Wards' Academic Progress & Instant SMS Notifications
            </p>
          </div>
          <Badge className="bg-rose-500/20 text-rose-700 dark:text-rose-300 hover:bg-rose-500/30 border-rose-500/30">
            Parent / Guardian
          </Badge>
        </div>
      </div>

      {/* Linked Wards Section */}
      <div className="space-y-3">
        <h4 className="text-sm font-semibold tracking-tight text-foreground flex items-center gap-2">
          <HeartHandshake className="size-4 text-rose-600" /> Linked Wards ({wards.length})
        </h4>

        {hasWards ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {wards.map((ward) => (
              <Card key={ward.id} className="border bg-card/60">
                <CardContent className="p-3.5 flex items-center justify-between">
                  <div className="space-y-0.5">
                    <p className="font-bold text-sm text-foreground">{ward.name}</p>
                    <p className="text-xs text-muted-foreground">
                      Class: <span className="font-medium text-foreground">{ward.className}</span>
                    </p>
                    <p className="text-[11px] font-mono text-muted-foreground">{ward.studentIdNumber}</p>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {ward.relationship || "Ward"}
                  </Badge>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="p-4 rounded-xl border border-dashed bg-muted/20 flex items-center gap-3">
            <AlertCircle className="size-5 text-amber-500 shrink-0" />
            <div className="text-xs">
              <p className="font-medium text-foreground">No Linked Student Records Found</p>
              <p className="text-muted-foreground mt-0.5">
                Please contact the school administration office to link your student index numbers to your account.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Communication & Reports Information */}
      <div className="space-y-3">
        <h4 className="text-sm font-semibold tracking-tight text-foreground flex items-center gap-2">
          <MessageSquare className="size-4 text-rose-600" /> Notifications & Terminal Reports
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
          <div className="p-3.5 rounded-lg border bg-muted/30 flex items-start gap-3">
            <PhoneCall className="size-4 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-foreground">SMS Terminal Dispatch</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Ensure your mobile phone number is verified in Step 1 to receive direct SMS alerts with report download links.
              </p>
            </div>
          </div>

          <div className="p-3.5 rounded-lg border bg-muted/30 flex items-start gap-3">
            <FileText className="size-4 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-foreground">Digital Signed Report Cards</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Download high-resolution, headmaster-signed PDF report cards for your wards anytime from the dashboard.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
