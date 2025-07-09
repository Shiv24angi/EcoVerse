"use client"

import { useEffect, useState } from "react"
import LandingPage from "@/components/landing-page"
import AvatarSelectionPage from "@/components/avatar-selection-page"

export default function Home() {
  const [hasAvatar, setHasAvatar] = useState<boolean | null>(null)
  const [started, setStarted] = useState<boolean>(false)

  useEffect(() => {
    const storedAvatar = localStorage.getItem("user-avatar")
    setHasAvatar(!!storedAvatar)
  }, [])

  if (hasAvatar === null) return null // wait for localStorage

  return hasAvatar ? (
  <LandingPage />
) : started ? (
  <AvatarSelectionPage />
) : (
  <LandingPage onGetStarted={() => setStarted(true)} />
)

}
