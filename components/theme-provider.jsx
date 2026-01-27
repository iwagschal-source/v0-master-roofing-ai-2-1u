"use client"

import * as React from "react"
import { createContext, useContext, useEffect, useState } from "react"

/** @typedef {"light"|"dark"|"system"} Theme */
/** @typedef {{ theme: string, setTheme: function, resolvedTheme: string, toggleTheme: function }} ThemeContextType */

const ThemeContext = createContext(undefined)

/**
 * Theme provider
 * @param {{children:any}} props
 */
export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState("light")
  const [resolvedTheme, setResolvedTheme] = useState("light")

  // Initialize theme from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem("ko-theme")
    if (stored && ["light", "dark", "system"].includes(stored)) {
      setThemeState(stored)
    }
  }, [])

  // Update resolved theme and document class when theme changes
  useEffect(() => {
    let resolved = "light"

    if (theme === "system") {
      resolved = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"
    } else {
      resolved = theme
    }

    setResolvedTheme(resolved)

    // Update document class
    const root = document.documentElement
    root.classList.remove("light", "dark")
    root.classList.add(resolved)

    console.log("[v0] Theme applied:", resolved, "| Document class:", root.className)
  }, [theme])

  // Listen for system theme changes
  useEffect(() => {
    if (theme !== "system") return

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)")
    const handler = (e) => {
      const resolved = e.matches ? "dark" : "light"
      setResolvedTheme(resolved)
      document.documentElement.classList.remove("light", "dark")
      document.documentElement.classList.add(resolved)
    }

    mediaQuery.addEventListener("change", handler)
    return () => mediaQuery.removeEventListener("change", handler)
  }, [theme])

  const setTheme = (newTheme) => {
    setThemeState(newTheme)
    localStorage.setItem("ko-theme", newTheme)
    console.log("[v0] Theme set to:", newTheme)
  }

  const toggleTheme = () => {
    const newTheme = resolvedTheme === "dark" ? "light" : "dark"
    setTheme(newTheme)
  }

  return <ThemeContext.Provider value={{ theme, setTheme, resolvedTheme, toggleTheme }}>{children}</ThemeContext.Provider>
}

/** @param {any} props */
export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider")
  }
  return context
}