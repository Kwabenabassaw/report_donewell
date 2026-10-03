"use client"

import React, { useState, useRef } from "react"
import {
  GraduationCap,
  Award,
  FileCheck2,
  Save,
  Upload,
  Image as ImageIcon,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Trash2,
  CloudUpload,
} from "lucide-react"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { updateSchoolProfileSettingsAction } from "@/app/actions/settings"

interface SchoolProfileFormProps {
  initialProfile: {
    schoolName: string
    schoolCode: string
    motto?: string | null
    postalAddress?: string | null
    email?: string | null
    phone?: string | null
    crestUrl?: string | null
    headmasterSignatureUrl?: string | null
  }
}

export function SchoolProfileForm({ initialProfile }: SchoolProfileFormProps) {
  const [profile, setProfile] = useState(initialProfile)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)

  // Logo upload state & preview
  const [logoPreview, setLogoPreview] = useState<string | null>(initialProfile.crestUrl || null)
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const logoInputRef = useRef<HTMLInputElement>(null)

  // Signature upload state & preview
  const [signaturePreview, setSignaturePreview] = useState<string | null>(initialProfile.headmasterSignatureUrl || null)
  const [signatureFile, setSignatureFile] = useState<File | null>(null)
  const signatureInputRef = useRef<HTMLInputElement>(null)

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setMessage({ type: "error", text: "Logo image size should not exceed 5MB." })
        return
      }
      setLogoFile(file)
      const objectUrl = URL.createObjectURL(file)
      setLogoPreview(objectUrl)
      setMessage(null)
    }
  }

  const handleSignatureChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setMessage({ type: "error", text: "Signature image size should not exceed 5MB." })
        return
      }
      setSignatureFile(file)
      const objectUrl = URL.createObjectURL(file)
      setSignaturePreview(objectUrl)
      setMessage(null)
    }
  }

  const handleRemoveLogo = () => {
    setLogoFile(null)
    setLogoPreview(null)
    if (logoInputRef.current) logoInputRef.current.value = ""
  }

  const handleRemoveSignature = () => {
    setSignatureFile(null)
    setSignaturePreview(null)
    if (signatureInputRef.current) signatureInputRef.current.value = ""
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setMessage(null)

    try {
      const form = e.currentTarget
      const formData = new FormData(form)

      if (logoFile) {
        formData.set("crestFile", logoFile)
      } else if (!logoPreview) {
        formData.set("crestUrl", "")
      }

      if (signatureFile) {
        formData.set("signatureFile", signatureFile)
      } else if (!signaturePreview) {
        formData.set("headmasterSignatureUrl", "")
      }

      const res = await updateSchoolProfileSettingsAction(formData)

      if (!res.success) {
        throw new Error(res.error || "Failed to update profile settings.")
      }

      if (res.crestUrl) {
        setLogoPreview(res.crestUrl)
      }
      if (res.headmasterSignatureUrl) {
        setSignaturePreview(res.headmasterSignatureUrl)
      }

      setMessage({ type: "success", text: "School settings and branding updated successfully!" })
    } catch (err: any) {
      setMessage({ type: "error", text: err.message || "An unexpected error occurred." })
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      {message && (
        <Alert
          variant={message.type === "error" ? "destructive" : "default"}
          className={message.type === "success" ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" : ""}
        >
          {message.type === "success" ? (
            <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          ) : (
            <AlertTriangle className="h-4 w-4" />
          )}
          <AlertDescription className="text-xs font-medium">{message.text}</AlertDescription>
        </Alert>
      )}

      {/* Section 1: School Logo & Visual Assets */}
      <Card className="border shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ImageIcon className="h-5 w-5 text-primary" />
              <CardTitle className="text-base font-semibold">Official School Logo & Crest</CardTitle>
            </div>
            <Badge variant="outline" className="text-xs font-mono bg-primary/5">
              Supabase Storage
            </Badge>
          </div>
          <CardDescription className="text-xs">
            Upload your official school emblem. It will appear on report cards, transcripts, broadsheets, and portal headers.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row items-center gap-6 p-4 rounded-xl border bg-muted/20">
            {/* Logo Preview Box */}
            <div className="relative group shrink-0 size-32 rounded-xl border-2 border-dashed border-muted-foreground/30 bg-background flex flex-col items-center justify-center overflow-hidden shadow-xs">
              {logoPreview ? (
                <>
                  <img
                    src={logoPreview}
                    alt="School Logo"
                    className="w-full h-full object-contain p-2"
                  />
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <button
                      type="button"
                      onClick={() => logoInputRef.current?.click()}
                      className="p-1.5 rounded-full bg-white/20 hover:bg-white/40 text-white"
                      title="Replace Logo"
                    >
                      <Upload className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={handleRemoveLogo}
                      className="p-1.5 rounded-full bg-red-500/80 hover:bg-red-500 text-white"
                      title="Remove Logo"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center text-center p-2">
                  <CloudUpload className="h-8 w-8 text-muted-foreground/60 mb-1" />
                  <span className="text-[11px] text-muted-foreground">No Logo Uploaded</span>
                </div>
              )}
            </div>

            {/* Upload Controls */}
            <div className="space-y-2 flex-1 text-center sm:text-left">
              <div>
                <p className="text-sm font-semibold text-foreground">Upload School Emblem / Crest</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Recommended format: High-resolution PNG with transparent background, or SVG / WebP (Max 5MB).
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2 pt-1">
                <input
                  ref={logoInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/svg+xml"
                  onChange={handleLogoChange}
                  className="hidden"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => logoInputRef.current?.click()}
                  className="gap-2 text-xs"
                >
                  <Upload className="h-3.5 w-3.5" />
                  {logoPreview ? "Choose Different Image" : "Browse Image from Computer"}
                </Button>

                {logoFile && (
                  <Badge variant="secondary" className="font-mono text-xs">
                    {logoFile.name} ({(logoFile.size / 1024).toFixed(1)} KB)
                  </Badge>
                )}

                {logoPreview && !logoFile && (
                  <span className="text-xs text-emerald-600 font-medium flex items-center gap-1">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Live Logo Active
                  </span>
                )}
              </div>
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground">Or Direct Image URL (Optional)</label>
            <Input
              name="crestUrl"
              value={logoPreview || ""}
              onChange={(e) => {
                setLogoPreview(e.target.value)
                setLogoFile(null)
              }}
              placeholder="https://... or /logo.png"
              className="h-9 text-sm mt-1"
            />
          </div>
        </CardContent>
      </Card>

      {/* Section 2: School Identity */}
      <Card className="border shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5 text-primary" />
            <CardTitle className="text-base font-semibold">Institutional Identity</CardTitle>
          </div>
          <CardDescription className="text-xs">
            Displayed on terminal report cards, broadsheets, and public verification screens.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-medium text-muted-foreground">Official School Name</label>
            <Input
              name="schoolName"
              defaultValue={profile.schoolName}
              placeholder="e.g. Mountains High College and International School"
              className="h-9 text-sm mt-1"
              required
            />
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground">School Code</label>
            <Input
              name="schoolCode"
              defaultValue={profile.schoolCode}
              placeholder="e.g. MHCIS-001"
              className="h-9 text-sm mt-1"
              required
            />
          </div>

          <div className="md:col-span-2">
            <label className="text-xs font-medium text-muted-foreground">School Motto</label>
            <Input
              name="motto"
              defaultValue={profile.motto || ""}
              placeholder="e.g. Knowledge, Integrity, and Excellence"
              className="h-9 text-sm mt-1"
            />
          </div>
        </CardContent>
      </Card>

      {/* Section 3: Contact Information */}
      <Card className="border shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Award className="h-5 w-5 text-primary" />
            <CardTitle className="text-base font-semibold">Official Contact & Address</CardTitle>
          </div>
          <CardDescription className="text-xs">
            Printed on official terminal report headers and verification credentials.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="text-xs font-medium text-muted-foreground">Postal Address</label>
            <Input
              name="postalAddress"
              defaultValue={profile.postalAddress || ""}
              placeholder="e.g. P.O. Box MC 100, Accra, Ghana"
              className="h-9 text-sm mt-1"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground">Official Email</label>
            <Input
              name="email"
              type="email"
              defaultValue={profile.email || ""}
              placeholder="e.g. info@mountainshighcollege.edu"
              className="h-9 text-sm mt-1"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground">Contact Phone</label>
            <Input
              name="phone"
              defaultValue={profile.phone || ""}
              placeholder="e.g. +233 20 000 0000"
              className="h-9 text-sm mt-1"
            />
          </div>
        </CardContent>
      </Card>

      {/* Section 4: Headmaster Signature Stamp */}
      <Card className="border shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <FileCheck2 className="h-5 w-5 text-primary" />
            <CardTitle className="text-base font-semibold">Headmaster / Principal Signature Stamp</CardTitle>
          </div>
          <CardDescription className="text-xs">
            Official digital signature stamp affixed to certified PDF report cards upon final approval.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row items-center gap-6 p-4 rounded-xl border bg-muted/20">
            {/* Signature Preview */}
            <div className="relative group shrink-0 w-44 h-20 rounded-xl border-2 border-dashed border-muted-foreground/30 bg-background flex flex-col items-center justify-center overflow-hidden shadow-xs">
              {signaturePreview ? (
                <>
                  <img
                    src={signaturePreview}
                    alt="Headmaster Signature"
                    className="w-full h-full object-contain p-2"
                  />
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <button
                      type="button"
                      onClick={() => signatureInputRef.current?.click()}
                      className="p-1.5 rounded-full bg-white/20 hover:bg-white/40 text-white"
                      title="Replace Signature"
                    >
                      <Upload className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={handleRemoveSignature}
                      className="p-1.5 rounded-full bg-red-500/80 hover:bg-red-500 text-white"
                      title="Remove Signature"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center text-center p-2">
                  <FileCheck2 className="h-6 w-6 text-muted-foreground/60 mb-1" />
                  <span className="text-[11px] text-muted-foreground">No Signature Stamp</span>
                </div>
              )}
            </div>

            {/* Signature Upload Controls */}
            <div className="space-y-2 flex-1 text-center sm:text-left">
              <div>
                <p className="text-sm font-semibold text-foreground">Upload Authorized Signature</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Transparent PNG recommended. Affixed to terminal report cards automatically.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2 pt-1">
                <input
                  ref={signatureInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={handleSignatureChange}
                  className="hidden"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => signatureInputRef.current?.click()}
                  className="gap-2 text-xs"
                >
                  <Upload className="h-3.5 w-3.5" />
                  {signaturePreview ? "Change Signature" : "Upload Signature Image"}
                </Button>

                {signatureFile && (
                  <Badge variant="secondary" className="font-mono text-xs">
                    {signatureFile.name}
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Save Bar */}
      <div className="flex justify-end gap-3 pt-2">
        <Button
          type="submit"
          disabled={loading}
          className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm px-6"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Saving Changes & Uploading...
            </>
          ) : (
            <>
              <Save className="h-4 w-4" /> Save Profile & Logo
            </>
          )}
        </Button>
      </div>
    </form>
  )
}
