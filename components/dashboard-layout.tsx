// DashboardLayout.tsx
"use client"

import { useState } from "react"
import { usePathname } from "next/navigation"
import Link from "next/link"
import { Leaf, Home, Scan, Trophy, BarChart3, Gift, TrendingDown, LogOut } from "lucide-react"

import { cn } from "@/lib/utils"
import { useAuth } from "@/components/auth-provider"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarId } from "@/components/ui/avatar"


const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: Home },
  { name: "Scan Product", href: "/scan", icon: Scan },
  { name: "Carbon Tracking", href: "/carbon-tracking", icon: TrendingDown },
  { name: "Leaderboard", href: "/leaderboard", icon: Trophy },
  { name: "Analytics", href: "/analytics", icon: BarChart3 },
  { name: "Rewards", href: "/rewards", icon: Gift },
]

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth()
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)

  if (!user) return null

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="bg-secondary border-b border-border px-6 py-4 flex justify-between items-center shadow-sm">
        <div className="flex items-center gap-2">
          <Link href="/" className="flex items-center gap-2">
  <img src="/logo.png" alt="EcoVerse logo" className="h-10 w-auto" />
  <span className="font-serif text-xl font-bold text-green-900">EcoVerse</span>
</Link>

        </div>

        <div className="flex items-center gap-4">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-10 w-10 rounded-full p-0">
                <Avatar avatarId={(user.avatarId ?? "avatar-1") as AvatarId} className="h-full w-full rounded-full" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end">
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">{user.name}</p>
                  <p className="text-xs leading-none text-muted-foreground">{user.email}</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={logout}>
                <LogOut className="mr-2 h-4 w-4" />
                Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <div className="flex min-h-screen">
        {/* Sidebar */}
        <aside
          className={cn(
            "transition-all duration-300 ease-in-out h-screen bg-sidebar text-sidebar-foreground border-r border-sidebar-border overflow-hidden",
            collapsed ? "w-16" : "w-64"
          )}
        >
          <div className="flex flex-col h-full">
            <div className="flex items-center justify-between px-4 py-3 border-b border-sidebar-border">
              {!collapsed && <span className="font-semibold text-lg">Menu</span>}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setCollapsed(!collapsed)}
                className="text-muted-foreground"
              >
                {collapsed ? ">" : "<"}
              </Button>
            </div>
            <nav className="flex-1 px-2 py-4 space-y-2">
              {navigation.map((item) => {
                const isActive = pathname === item.href
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={cn(
                      "group flex items-center gap-3 rounded-md px-3 py-2 font-medium transition-colors",
                      isActive
                        ? "bg-primary/10 text-primary"
                        : "hover:bg-muted text-muted-foreground"
                    )}
                  >
                    <item.icon className="h-5 w-5" />
                    {!collapsed && <span>{item.name}</span>}
                  </Link>
                )
              })}
            </nav>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-6 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
