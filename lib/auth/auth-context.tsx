"use client"

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react"
import { useRouter } from "next/navigation"

export interface UserSession {
  id: string
  username: string
  displayName: string
  email: string | null
  phone?: string | null
  roles: string[]
  activeRole: string
  hasCompletedOnboarding?: boolean
  mustChangePassword?: boolean
  classesSupervised?: { id: string; name: string }[]
  subjectAllocations?: { id: string; class: { name: string }; subject: { name: string } }[]
}

interface AuthContextType {
  user: UserSession | null
  activeRole: string
  isLoading: boolean
  login: (username: string, password: string) => Promise<void>
  logout: () => Promise<void>
  switchRole: (role: string) => Promise<void>
  refresh: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({
  children,
  initialUser,
}: {
  children: ReactNode
  initialUser?: UserSession | null
}) {
  const [user, setUser] = useState<UserSession | null>(initialUser ?? null)
  const [isLoading, setIsLoading] = useState(!initialUser)
  const router = useRouter()

  const fetchSession = async () => {
    try {
      setIsLoading(true)
      const res = await fetch("/api/auth/me")
      if (res.ok) {
        const data = await res.json()
        setUser(data.user)
      } else {
        setUser(null)
      }
    } catch {
      setUser(null)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (!initialUser) {
      fetchSession()
    }
  }, [initialUser])

  const login = async (username: string, password: string) => {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    })

    if (!res.ok) {
      const err = await res.json()
      throw new Error(err.error || "Failed to log in.")
    }

    const data = await res.json()
    setUser(data.user)
    router.refresh()
  }

  const logout = async () => {
    try {
      setIsLoading(true)
      await fetch("/api/auth/logout", { method: "POST" })
    } catch (err) {
      console.error("Logout request error:", err)
    } finally {
      setUser(null)
      setIsLoading(false)
      window.location.href = "/login?logged_out=true"
    }
  }

  const switchRole = async (role: string) => {
    const res = await fetch("/api/auth/switch-role", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role }),
    })

    if (res.ok) {
      if (user) {
        setUser({ ...user, activeRole: role })
      }
      router.refresh()
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        activeRole: user?.activeRole || "GUEST",
        isLoading,
        login,
        logout,
        switchRole,
        refresh: fetchSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
