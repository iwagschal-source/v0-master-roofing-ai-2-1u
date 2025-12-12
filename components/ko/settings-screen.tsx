"use client"

import { useTheme } from "@/components/theme-provider"
import { Moon, Sun, Monitor } from "lucide-react"
import { useEffect, useState } from "react"

export function SettingsScreen() {
  const { theme, setTheme, resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    )
  }

  const themeOptions = [
    { value: "light" as const, label: "Light", icon: Sun },
    { value: "dark" as const, label: "Dark", icon: Moon },
    { value: "system" as const, label: "System", icon: Monitor },
  ]

  return (
    <div className="w-full h-full flex items-start justify-center p-8 overflow-auto">
      <div className="w-full max-w-2xl space-y-8">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage your application preferences</p>
        </div>

        <div className="space-y-6">
          {/* Theme Selection */}
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-medium">Appearance</h2>
              <p className="text-sm text-muted-foreground">Customize how KO looks on your device</p>
            </div>

            <div className="grid grid-cols-3 gap-4">
              {themeOptions.map((option) => {
                const Icon = option.icon
                const isSelected = theme === option.value

                return (
                  <button
                    key={option.value}
                    onClick={() => setTheme(option.value)}
                    className={`
                      flex flex-col items-center gap-3 p-4 rounded-lg border-2 transition-all
                      ${
                        isSelected
                          ? "border-primary bg-primary/10"
                          : "border-border hover:border-muted-foreground/50 hover:bg-muted/30"
                      }
                    `}
                  >
                    <div
                      className={`
                      w-12 h-12 rounded-full flex items-center justify-center
                      ${isSelected ? "bg-primary/20" : "bg-muted"}
                    `}
                    >
                      <Icon className={`w-6 h-6 ${isSelected ? "text-primary" : "text-muted-foreground"}`} />
                    </div>
                    <span className={`text-sm font-medium ${isSelected ? "text-foreground" : "text-muted-foreground"}`}>
                      {option.label}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Additional Settings Sections */}
          <div className="pt-6 border-t border-border space-y-4">
            <div>
              <h2 className="text-lg font-medium">General</h2>
              <p className="text-sm text-muted-foreground">General application settings</p>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between p-4 rounded-lg bg-muted/30">
                <div>
                  <p className="font-medium text-sm">Sound Effects</p>
                  <p className="text-xs text-muted-foreground">Enable startup and interaction sounds</p>
                </div>
                <div className="w-12 h-6 bg-primary rounded-full relative cursor-pointer">
                  <div className="w-5 h-5 bg-white rounded-full absolute right-0.5 top-0.5 shadow-sm" />
                </div>
              </div>

              <div className="flex items-center justify-between p-4 rounded-lg bg-muted/30">
                <div>
                  <p className="font-medium text-sm">Animations</p>
                  <p className="text-xs text-muted-foreground">Enable UI animations and transitions</p>
                </div>
                <div className="w-12 h-6 bg-primary rounded-full relative cursor-pointer">
                  <div className="w-5 h-5 bg-white rounded-full absolute right-0.5 top-0.5 shadow-sm" />
                </div>
              </div>
            </div>
          </div>

          {/* App Info */}
          <div className="pt-6 border-t border-border">
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>
                <span className="font-medium text-foreground">Version:</span> 1.0.0
              </p>
              <p>
                <span className="font-medium text-foreground">Build:</span> 2025.01.12
              </p>
              <p className="text-xs pt-2">KO - Chief Agent Officer for Master Roofing</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
