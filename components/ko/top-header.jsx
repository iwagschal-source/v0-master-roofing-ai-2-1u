"use client"

import { Power } from "lucide-react"
import Image from "next/image"
import { useTheme } from "@/components/theme-provider"
import { useEffect, useState } from "react"

/** @typedef {Object} TopHeaderProps */

/** @param {any} props */
/** @param {any} props */
export function TopHeader({ onShutdown, isPoweredOn = true }) {
  const { resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Use dark logo
  const logoSrc = mounted && resolvedTheme === "light" ? "/images/logo-light.png" : "/images/new-logo-white.png"

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

      <div className="flex items-center">
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