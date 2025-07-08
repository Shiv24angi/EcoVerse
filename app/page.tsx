"use client"

import { useEffect, useState } from "react"
import LandingPage from "@/components/landing-page"
import AvatarSelectionPage from "@/components/avatar-selection-page" // adjust path if needed

export default function Home() {
  const [hasAvatar, setHasAvatar] = useState<boolean | null>(null)

  useEffect(() => {
    const storedAvatar = localStorage.getItem("user-avatar")
    setHasAvatar(!!storedAvatar) // true if avatar exists
  }, [])

  if (hasAvatar === null) return null // wait for localStorage to load

  return hasAvatar ? <LandingPage /> : <AvatarSelectionPage />
}
