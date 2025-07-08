"use client"

import {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode
} from "react"
import {
  signInWithPopup,
  createUserWithEmailAndPassword,
  User as FirebaseUser
} from "firebase/auth"
import { auth, googleProvider } from "@/lib/firebase"
import { toast } from "@/components/ui/use-toast" // ✅ Import toast
import type { AvatarId } from "./ui/avatar"

interface User {
  _id: string
  email: string
  name: string
  avatarId?: AvatarId
  monthlyCarbon: number
  totalScanned: number
  joinedAt: string
}

interface AuthContextType {
  user: User | null
  login: (email: string, password: string) => Promise<boolean>
  signup: (name: string, email: string, password: string) => Promise<boolean>
  signInWithGoogle: () => Promise<boolean>
  logout: () => void
  updateUserStats: (carbonAdded: number) => void
  updateAvatar: (avatarId: AvatarId) => void
}

const AuthContext = createContext<AuthContextType | null>(null)

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error("useAuth must be used within an AuthProvider")
  return context
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)

  useEffect(() => {
  const storedUser = localStorage.getItem("ecoverse-user")
  const avatarId = localStorage.getItem("avatarId")
  if (storedUser) {
    const parsed = JSON.parse(storedUser)
    const userWithAvatar = { ...parsed, avatarId } // ✅ merge avatarId
    setUser(userWithAvatar)
  }
}, [])


  const signup = async (name: string, email: string, password: string): Promise<boolean> => {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password)

      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          firebaseUid: userCredential.user.uid
        })
      })

      let data
      try {
        data = await response.json()
      } catch (jsonErr) {
        console.warn("⚠️ Failed to parse JSON response:", jsonErr)
        data = { error: "Invalid response from server" }
      }

      if (!response.ok) {
        console.error("❌ Signup failed:", data.error)
        return false
      }

      console.log("✅ Signup successful:", data.user)
      setUser(data.user)
      localStorage.setItem("ecoverse-user", JSON.stringify(data.user))
      return true
    } catch (err: any) {
      if (err.code === "auth/email-already-in-use") {
        console.error("⚠️ Email already in use")
        toast({
          title: "Email already registered",
          description: "Try signing in instead, or use a different email.",
          variant: "destructive"
        })
        return false
      }

      console.error("🔥 Signup error:", err)
      toast({
        title: "Signup failed",
        description: "Something went wrong. Please try again.",
        variant: "destructive"
      })
      return false
    }
  }

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      const res = await fetch("/api/auth/signin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      })

      const data = await res.json()
      if (res.ok) {
        setUser(data.user)
        localStorage.setItem("ecoverse-user", JSON.stringify(data.user))
        return true
      } else {
        console.warn("❌ Login failed:", data.error)
        return false
      }
    } catch (err) {
      console.error("🔥 Login error:", err)
      return false
    }
  }

  const signInWithGoogle = async (): Promise<boolean> => {
    try {
      if (!auth || !googleProvider) {
        console.error("❌ Firebase not available")
        return false
      }

      const result = await signInWithPopup(auth, googleProvider)
      const firebaseUser = result.user

      const response = await fetch("/api/auth/google", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || "Google User",
          email: firebaseUser.email,
          firebaseUid: firebaseUser.uid
        })
      })

      if (response.ok) {
        const data = await response.json()
        setUser(data.user)
        localStorage.setItem("ecoverse-user", JSON.stringify(data.user))
        return true
      } else {
        console.error("❌ Failed to authenticate Google user")
        return false
      }
    } catch (error) {
      console.error("🔥 Google sign-in error:", error)
      return false
    }
  }

  const logout = () => {
    setUser(null)
    localStorage.removeItem("ecoverse-user")
  }

  const updateUserStats = (carbonAdded: number) => {
    if (user) {
      const updatedUser = {
        ...user,
        monthlyCarbon: user.monthlyCarbon + carbonAdded,
        totalScanned: user.totalScanned + 1
      }
      setUser(updatedUser)
      localStorage.setItem("ecoverse-user", JSON.stringify(updatedUser))
    }
  }
  
  const updateAvatar = (avatarId: AvatarId) => {
  if (user) {
    const updatedUser = {
      ...user,
      avatarId,
    }
    setUser(updatedUser)
    localStorage.setItem("ecoverse-user", JSON.stringify(updatedUser))
  }
}


  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        signup,
        signInWithGoogle,
        logout,
        updateUserStats,
        updateAvatar,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}
