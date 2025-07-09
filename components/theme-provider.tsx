"use client"

import React, { createContext, useContext, useEffect, useState } from "react"

type Theme = "light" | "dark" | "system"

type ThemeProviderProps = {
  children: React.ReactNode
  defaultTheme?: Theme
  storageKey?: string
}

type ThemeProviderState = {
  theme: Theme
  setTheme: (theme: Theme) => void
}

const ThemeProviderContext = createContext<ThemeProviderState | undefined>(undefined)

export function ThemeProvider({
  children,
  defaultTheme = "light",
  storageKey = "vite-ui-theme",
}: ThemeProviderProps) {
  const [theme, setThemeState] = useState<Theme>(defaultTheme)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    const storedTheme = localStorage.getItem(storageKey) as Theme
    setThemeState(storedTheme || defaultTheme)
    setMounted(true)
  }, [storageKey, defaultTheme])

  useEffect(() => {
    if (!mounted) return

    const root = window.document.documentElement

    if (theme === "dark") {
      root.classList.add("dark")
      root.classList.remove("light")
    } else if (theme === "light") {
      root.classList.add("light")
      root.classList.remove("dark")
    } else if (theme === "system") {
      const isDark = window.matchMedia("(prefers-color-scheme: dark)").matches
      root.classList.add(isDark ? "dark" : "light")
      root.classList.remove(isDark ? "light" : "dark")
    }

    localStorage.setItem(storageKey, theme)
  }, [theme, mounted, storageKey])

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme)
  }

  const value = {
    theme,
    setTheme,
  }

  return (
    <ThemeProviderContext.Provider value={value}>
      {children}
    </ThemeProviderContext.Provider>
  )
}

export const useTheme = () => {
  const context = useContext(ThemeProviderContext)
  if (!context) throw new Error("useTheme must be used within a ThemeProvider")
  return context
}
