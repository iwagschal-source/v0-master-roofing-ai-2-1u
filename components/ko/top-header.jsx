"use client"

import { Power, LogOut, ChevronDown } from "lucide-react"
import Image from "next/image"
import { useTheme } from "@/components/theme-provider"
import { useEffect, useState, useRef } from "react"
import { useSession, signOut } from "next-auth/react"

/** @typedef {Object} TopHeaderProps */

/** @param {any} props */
/** @param {any} props */
export function TopHeader({ onShutdown, isPoweredOn = true }) {
  const { resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const [showUserMenu, setShowUserMenu] = useState(false)
  const menuRef = useRef(null)
  const { data: session } = useSession()

  useEffect(() => {
    setMounted(true)
  }, [])

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setShowUserMenu(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  // Use dark logo
  const logoSrc = mounted && resolvedTheme === "light" ? "/images/logo-light.png" : "/images/new-logo-white.png"

  const handleLogout = () => {
    signOut({ callbackUrl: "/login" })
  }

  return (
    <header className="h-16 flex items-center justify-between px-4 border-b border-border bg-background">
      <div className="flex items-center">
        <Image
          src={logoSrc || "/placeholder.svg"}
          alt="Master Roofing"
          width={192}
          height={144}
          className="object-contain"
          priority
        />
      </div>

      <div className="flex-1" />

      <div className="flex items-center gap-3">
        {/* User Menu */}
        {session?.user && (
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-muted transition-colors"
            >
              {session.user.image ? (
                <Image
                  src={session.user.image}
                  alt={session.user.name || "User"}
                  width={28}
                  height={28}
                  className="rounded-full"
                />
              ) : (
                <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-sm font-medium">
                  {session.user.name?.[0] || session.user.email?.[0] || "U"}
                </div>
              )}
              <span className="text-sm font-medium text-foreground hidden sm:inline">
                {session.user.name?.split(" ")[0] || session.user.email?.split("@")[0]}
              </span>
              <ChevronDown className="w-4 h-4 text-muted-foreground" />
            </button>

            {/* Dropdown Menu */}
            {showUserMenu && (
              <div className="absolute right-0 top-full mt-1 w-56 bg-card border border-border rounded-lg shadow-lg py-1 z-50">
                <div className="px-4 py-2 border-b border-border">
                  <p className="text-sm font-medium text-foreground">{session.user.name}</p>
                  <p className="text-xs text-muted-foreground">{session.user.email}</p>
                </div>
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-500 hover:bg-red-500/10 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  Sign out
                </button>
              </div>
            )}
          </div>
        )}

        {/* Power Button */}
        <button
          onClick={onShutdown}
          className={`w-8 h-8 flex items-center justify-center rounded-md transition-colors ${
            isPoweredOn ? "hover:bg-muted text-muted-foreground" : "text-red-500 hover:bg-red-500/10"
          }`}
          aria-label={isPoweredOn ? "Power down" : "Power on"}
        >
          <Power className="w-4 h-4" />
        </button>
      </div>
    </header>
  )
}