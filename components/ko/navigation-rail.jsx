"use client"

import * as React from "react"

import { Home, Clock, Settings, Mail, Sparkles, FolderKanban, MessageSquare, Bot, Shield, TrendingUp, Calculator } from "lucide-react"
import Image from "next/image"

/** @typedef {Object} NavigationRailProps */

/** @param {any} props */
/** @param {any} props */
export function NavigationRail({ activeMode, onModeChange, visible }) {
  const navItems = [
    { id: "home", icon: Home, label: "KO Home", type: "lucide" },
    { id: "projects", icon: FolderKanban, label: "Projects", type: "lucide" },
    { id: "estimating", icon: Calculator, label: "Estimating", type: "lucide" },
    { id: "history", icon: Clock, label: "History", type: "lucide" },
    { id: "arena", icon: Sparkles, label: "Model Arena", type: "lucide" },
    { id: "agents", icon: Bot, label: "Agent Control", type: "lucide" },
    { id: "admin", icon: Shield, label: "User Admin", type: "lucide" },
    { id: "sales", icon: TrendingUp, label: "Sales Intel", type: "lucide" },

    { id: "messages", icon: MessageSquare, label: "Messages", type: "lucide" },
    {
      id: "asana",
      icon: "/images/asana.svg",
      label: "Asana",
      type: "image",
    },
    {
      id: "hubspot",
      icon: "/images/hubspot.png",
      label: "HubSpot",
      type: "image",
    },
    { id: "email", icon: Mail, label: "Email", type: "lucide" },

    {
      id: "zoom",
      icon: "/images/zoom-2.png",
      label: "Zoom",
      type: "image",
    },
    {
      id: "whatsapp",
      icon: "/images/whatsapp.svg",
      label: "WhatsApp",
      type: "image",
    },
    {
      id: "documents",
      icon: "/images/folder-1.png",
      label: "Documents",
      type: "image",
    },
  ]

  if (!visible) return null

  return (
    <nav className="w-16 flex flex-col bg-sidebar border-r border-sidebar-border">
      {/* Top Navigation Items */}
      <div className="flex-1 flex flex-col items-center py-4 gap-2">
        {navItems.map((item) => {
          const isActive = activeMode === item.id

          return (
            <div key={item.id} className="relative flex flex-col items-center">
              <button
                onClick={() => onModeChange(item.id)}
                className="w-12 h-12 flex items-center justify-center rounded-lg transition-all duration-300 hover:bg-muted/20"
                aria-label={item.label}
              >
                {item.type === "image" && item.icon ? (
                  <Image
                    src={item.icon || "/placeholder.svg"}
                    alt={item.label}
                    width={24}
                    height={24}
                    className="object-contain opacity-60"
                  />
                ) : item.type === "lucide" && item.icon ? (
                  (() => {
                    const Icon = item.icon
                    return <Icon className="w-6 h-6 text-foreground-secondary" />
                  })()
                ) : null}
              </button>
              {isActive && <div className="absolute bottom-0 w-8 h-0.5 bg-primary rounded-full" />}
            </div>
          )
        })}
      </div>

      {/* Bottom Section - Settings */}
      <div className="flex flex-col items-center py-4 border-t border-sidebar-border">
        <div className="relative flex flex-col items-center">
          <button
            onClick={() => onModeChange("settings")}
            className="w-12 h-12 flex items-center justify-center rounded-lg transition-all duration-300 hover:bg-muted/20"
            aria-label="Settings"
          >
            <Settings className="w-6 h-6 text-foreground-secondary" />
          </button>
          {activeMode === "settings" && <div className="absolute bottom-0 w-8 h-0.5 bg-primary rounded-full" />}
        </div>
      </div>
    </nav>
  )
}