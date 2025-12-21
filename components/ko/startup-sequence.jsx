"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import { useTheme } from "@/components/theme-provider"

/** @typedef {Object} StartupSequenceProps */

/** @param {any} props */
/** @param {any} props */
export function StartupSequence({ onComplete, isShuttingDown = false }) {
  const [stage, setStage] = useState(
    "hidden",
  )
  const { resolvedTheme } = useTheme()

  const logoSrc = resolvedTheme === "light" ? "/images/logo-light.png" : "/images/new-logo-white.png"

  const bgColor = resolvedTheme === "light" ? "bg-white" : "bg-black"

  useEffect(() => {
    if (isShuttingDown) {
      setStage("stabilizing")

      setTimeout(() => {
        setStage("fading-in")
      }, 600)

      setTimeout(() => {
        setStage("hidden")
      }, 1200)

      setTimeout(() => {
        onComplete()
      }, 1800)
      return
    }

    const fadeInTimer = setTimeout(() => {
      setStage("fading-in")

      const audio = new Audio("/audio/startup-chime.mp3")
      audio.volume = 0.2
      audio.play().catch(() => {})
    }, 400)

    const stabilizeTimer = setTimeout(() => {
      setStage("stabilizing")
    }, 1800)

    const pulseTimer = setTimeout(() => {
      setStage("pulsing")
    }, 2800)

    const settleTimer = setTimeout(() => {
      setStage("settling")
    }, 3600)

    const completeTimer = setTimeout(() => {
      setStage("complete")
      onComplete()
    }, 4500)

    return () => {
      clearTimeout(fadeInTimer)
      clearTimeout(stabilizeTimer)
      clearTimeout(pulseTimer)
      clearTimeout(settleTimer)
      clearTimeout(completeTimer)
    }
  }, [isShuttingDown, onComplete])

  if (stage === "complete" && !isShuttingDown) {
    return null
  }

  const getOpacity = () => {
    if (stage === "hidden") return 0
    if (stage === "fading-in") return 0.95
    if (stage === "stabilizing") return 1
    if (stage === "pulsing") return 0.85
    if (stage === "settling") return 1
    return 1
  }

  const getScale = () => {
    if (stage === "pulsing") return 0.98
    return 1
  }

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center ${bgColor} transition-opacity`}
      style={{
        opacity: stage === "hidden" ? 0 : 1,
        transitionDuration: stage === "fading-in" ? "800ms" : "1200ms",
        transitionTimingFunction: "cubic-bezier(0.4, 0.0, 0.2, 1)",
      }}
    >
      <div className="relative w-64 h-32">
        <div
          className="absolute inset-0 transition-all"
          style={{
            opacity: getOpacity(),
            transform: `scale(${getScale()})`,
            transitionDuration: stage === "pulsing" ? "800ms" : "1200ms",
            transitionTimingFunction: "cubic-bezier(0.33, 0.0, 0.2, 1)",
          }}
        >
          <Image src={logoSrc || "/placeholder.svg"} alt="Master Roofing" fill className="object-contain" priority />
        </div>
      </div>
    </div>
  )
}