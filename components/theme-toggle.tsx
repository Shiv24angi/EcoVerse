"use client"

import { Moon, Sun, Monitor } from "lucide-react"
import { useTheme } from "./theme-provider"
import { Button } from "@/components/ui/button"

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()

  const toggleTheme = () => {
    if (theme === "light") {
      setTheme("dark")
    } else if (theme === "dark") {
      setTheme("system")
    } else {
      setTheme("light")
    }
  }

  const getIcon = () => {
    if (theme === "light") return <Sun className="h-4 w-4" />
    if (theme === "dark") return <Moon className="h-4 w-4" />
    return <Monitor className="h-4 w-4" />
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={toggleTheme}
      className="h-10 w-10 px-0 border-2 border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm hover:bg-white/80 dark:hover:bg-gray-800/80 transition-all duration-300 transform hover:scale-105"
    >
      {getIcon()}
      <span className="sr-only">Toggle theme (current: {theme})</span>
    </Button>
  )
}
