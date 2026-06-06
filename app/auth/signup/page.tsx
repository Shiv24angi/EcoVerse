"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/components/auth-provider"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Leaf, Eye, EyeOff } from "lucide-react"
import Link from "next/link"
import { useToast } from "@/hooks/use-toast"
import GoogleSignInButton from "@/components/google-signin-button"

export default function SignUp() {
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const { signup } = useAuth()
  const router = useRouter()
  const { toast } = useToast()

  const [hasMounted, setHasMounted] = useState(false)

  useEffect(() => {
    setHasMounted(true)
  }, [])

  if (!hasMounted) return null

  const getPasswordStrength = (password: string) => {
  if (!password) return ""

  const checks = [
    /[A-Z]/.test(password),
    /[a-z]/.test(password),
    /[0-9]/.test(password),
    /[^A-Za-z0-9]/.test(password),
    password.length >= 8,
  ]

  const score = checks.filter(Boolean).length

  if (score <= 2) return "Weak"
  if (score <= 4) return "Medium"
  return "Strong"
}

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (password !== confirmPassword) {
      toast({
        title: "Passwords don't match",
        description: "Please make sure your passwords match.",
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)

    try {
      const success = await signup(name, email, password)
      console.log("Signup success status: ", success);
      
      if (success) {
        toast({
          title: "Welcome to EcoVerse!",
          description: "Your account has been created successfully.",
        })
        router.push("/dashboard")
      } else {
        toast({
          title: "Sign up failed",
          description: "Please check your information and try again.",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Something went wrong. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-teal-200 dark-gradient flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-peach-light border-none shadow-md">
        <CardHeader className="text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Link href="/" className="flex items-center gap-2">
  <img src="/logo.png" alt="EcoVerse logo" className="h-8 w-auto" />
            <span className="text-2xl font-bold text-green-800">EcoVerse</span>
            </Link>
          </div>
          <CardTitle className="text-green-900">Create Your Account</CardTitle>
          <CardDescription className="text-gray-700">Join the community of sustainable shoppers</CardDescription>
        </CardHeader>
        <CardContent>
          <GoogleSignInButton text="Sign up with Google" className="mb-6" />
          
          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-gray-600" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-gray-900 px-2 text-gray-400">Or continue with email</span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-green-900 font-medium">
  Full Name
</Label>
              <Input
                id="name"
                type="text"
                placeholder="Enter your full name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email" className="text-green-900 font-medium">
  Email
</Label>
              <Input
                id="email"
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
  <Label htmlFor="password" className="text-green-900 font-medium">
    Password
  </Label>

  <div className="relative">
    <Input
      id="password"
      type={showPassword ? "text" : "password"}
      placeholder="Create a password"
      value={password}
      onChange={(e) => setPassword(e.target.value)}
      required
    />

    <button
      type="button"
      onClick={() => setShowPassword(!showPassword)}
      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"
    >
      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
    </button>
  </div>

  {password && (
    <p className="text-sm mt-1 text-gray-700">
      Password Strength:{" "}
      <span
        className={
          getPasswordStrength(password) === "Strong"
            ? "text-green-600"
            : getPasswordStrength(password) === "Medium"
            ? "text-yellow-600"
            : "text-red-600"
        }
      >
        {getPasswordStrength(password)}
      </span>
    </p>
  )}
</div>
            <div className="space-y-2">
  <Label htmlFor="confirmPassword" className="text-green-900 font-medium">
    Confirm Password
  </Label>

  <div className="relative">
    <Input
      id="confirmPassword"
      type={showConfirmPassword ? "text" : "password"}
      placeholder="Confirm your password"
      value={confirmPassword}
      onChange={(e) => setConfirmPassword(e.target.value)}
      required
    />

    <button
      type="button"
      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"
    >
      {showConfirmPassword ? (
        <EyeOff size={18} />
      ) : (
        <Eye size={18} />
      )}
    </button>
  </div>
</div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "Creating Account..." : "Create Account"}
            </Button>
          </form>
          <div className="mt-6 text-center text-sm">
            <span className="text-gray-600">Already have an account? </span>
            <Link href="/auth/signin" className="text-green-400 hover:underline font-medium">
              Sign in
            </Link>
          </div>
          <div className="mt-4 text-center">
            <Link href="/" className="text-sm text-gray-500 hover:text-gray-400 hover:underline">
              ← Back to home
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}