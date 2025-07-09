"use client"

import { Button } from "@/components/ui/button"
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Leaf,
  Scan,
  TrendingDown,
  Trophy,
  Users,
  BarChart3,
  Zap,
  Shield,
  Recycle,
  ArrowRight,
  Star,
  CheckCircle,
  Globe,
  Target,
  Sparkles,
  Play,
} from "lucide-react"
import Link from "next/link"
import { useState, useEffect } from "react"
import { ThemeToggle } from "./theme-toggle"
interface LandingPageProps {
  onGetStarted?: () => void
}

export default function ModernLandingPage({ onGetStarted }: LandingPageProps) {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    setIsVisible(true)
  }, [])

  // const stats = [
  //   { number: "15K+", label: "Active Users", icon: Users },
  //   { number: "2.3M", label: "Products Scanned", icon: Scan },
  //   { number: "850T", label: "CO₂ Saved", icon: Leaf },
  //   { number: "94%", label: "User Satisfaction", icon: Star },
  // ]

  const features = [
    {
      icon: Scan,
      title: "Smart Barcode Scanner",
      description: "AI-powered scanning with instant product recognition and real-time sustainability scoring",
    },
    {
      icon: TrendingDown,
      title: "Carbon Tracking",
      description: "Monitor your environmental impact with detailed analytics and personalized insights",
    },
    {
      icon: Trophy,
      title: "Global Leaderboards",
      description: "Compete with eco-warriors worldwide and unlock exclusive sustainability badges",
    },
    {
      icon: BarChart3,
      title: "Advanced Analytics",
      description: "Deep insights into your shopping patterns with predictive recommendations",
    },
    {
      icon: Recycle,
      title: "Recyclability Checker",
      description: "Check if the product is recyclable or not by assessing the packaging composition",
    },
    {
      icon: Globe,
      title: "Global Community",
      description: "Connect with worldwide environmental advocates and share your journey",
    },
  ]

return (
  <div className="min-h-screen bg-gradient-to-br from-[#fef6f4] via-[#fdf7f5] to-[#f4f4ff] dark:from-[#1f1c2e] dark:via-[#1a1b27] dark:to-[#20242f] overflow-x-hidden transition-colors duration-300">
    {/* Animated Pastel Background Elements */}
    <div className="fixed inset-0 overflow-hidden pointer-events-none">
      <div className="absolute -top-40 -right-40 w-80 h-80 bg-pink-200/30 rounded-full blur-3xl animate-pulse"></div>
      <div className="absolute top-1/2 -left-40 w-96 h-96 bg-sky-200/30 rounded-full blur-3xl animate-pulse delay-1000"></div>
      <div className="absolute bottom-0 right-1/4 w-64 h-64 bg-purple-200/30 rounded-full blur-3xl animate-pulse delay-2000"></div>
    </div>

    {/* Header */}
    <header className="sticky top-0 z-50 backdrop-blur-xl bg-green-600/70 border-b border-white/20 shadow-sm transition-colors duration-300">
      <div className="container mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
            <Link href="/" className="flex items-center gap-2">
  <img src="/logo.png" alt="EcoVerse logo" className="h-10 w-auto" />
             <span className="text-2xl font-bold text-green-900 ">
              EcoVerse
            </span></Link>
            </div>
            </div>
           
          <div className="flex items-center gap-4">
            <ThemeToggle />
            <Link href="/auth/signin">
              <Button
                variant="ghost"
                className="text-white/80 hover:text-teal-900 hover:bg-white/50"
              >
                Sign In
              </Button>
            </Link>
            <Button
              onClick={onGetStarted}
              className="bg-gradient-to-r from-teal-500 to-emerald-400 hover:from-teal-600 hover:to-emerald-500 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
            >
              Get Started
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </header>

      {/* Hero Section */}
      <section className="relative py-32 px-6">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-20">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-green-100 to-emerald-100 dark:from-green-900/50 dark:to-emerald-900/50 border border-green-200/50 dark:border-green-700/50 mb-8">
              <Sparkles className="h-4 w-4 text-green-600 dark:text-green-400" />
              <span className="text-sm font-medium text-green-700 dark:text-green-300">Your Actions, Visualized</span>
            </div>

            <h1 className="text-6xl md:text-7xl lg:text-8xl font-bold mb-8 leading-tight">
              <span className="bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 dark:from-white dark:via-gray-100 dark:to-white bg-clip-text text-transparent">
                Know What You Buy.
              </span>
              <br />
              <span className="bg-gradient-to-r from-green-600 via-emerald-600 to-green-700 dark:from-green-400 dark:via-emerald-400 dark:to-green-500 bg-clip-text text-transparent">
                Live What You Believe.
              </span>
            </h1>

            <p className="text-xl md:text-2xl text-gray-600 dark:text-gray-300 mb-16 max-w-3xl mx-auto leading-relaxed">
              Track your carbon footprint, recycle products, discover sustainable products, and compete with a global community of
              eco-conscious shoppers.
            </p>

            
            {/* Primary CTA */}
            <div className="flex flex-col items-center gap-8 mb-20">
              <div className="flex flex-col sm:flex-row gap-4 items-center">
                <div className="relative group">
                  <div className="absolute -inset-1 bg-gradient-to-r from-green-600 to-emerald-600 rounded-2xl blur opacity-25 group-hover:opacity-75 transition duration-1000 group-hover:duration-200"></div>
                  <Button className="relative px-8 py-4 text-lg font-medium bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 text-gray-900 dark:text-white">
                    Continue with Google
                  </Button>
                </div>

                <div className="flex items-center gap-4">
                  <div className="w-px h-8 bg-gray-300 dark:bg-gray-600"></div>
                  <span className="text-gray-400 dark:text-gray-500 text-sm">or</span>
                  <div className="w-px h-8 bg-gray-300 dark:bg-gray-600"></div>
                </div>

                <Link href="/auth/signup">
                  <Button
                    size="lg"
                    className="relative px-8 py-4 text-lg font-medium bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
                  >
                    <Zap className="mr-2 h-5 w-5" />
                    Sign Up Free
                  </Button>
                </Link>
              </div>

              
            </div>

            {/* Stats */}
            {/* <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
              {stats.map((stat, index) => (
                <div key={index} className="group">
                  <div className="relative p-8 rounded-2xl bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm border border-white/20 dark:border-gray-700/50 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105">
                    <div className="absolute inset-0 bg-gradient-to-br from-white/40 dark:from-gray-700/40 to-transparent rounded-2xl"></div>
                    <div className="relative">
                      <div className="flex justify-center mb-4">
                        <div className="p-3 rounded-xl bg-gradient-to-r from-green-100 to-emerald-100 dark:from-green-900/50 dark:to-emerald-900/50 group-hover:from-green-200 group-hover:to-emerald-200 dark:group-hover:from-green-800/60 dark:group-hover:to-emerald-800/60 transition-colors">
                          <stat.icon className="h-6 w-6 text-green-600 dark:text-green-400" />
                        </div>
                      </div>
                      <div className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 dark:from-white dark:to-gray-300 bg-clip-text text-transparent mb-2">
                        {stat.number}
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400 font-medium">{stat.label}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div> */}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="relative py-32 px-6">
        <div className="container mx-auto max-w-7xl">
          <div className="text-center mb-20">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-blue-100 to-cyan-100 dark:from-blue-900/50 dark:to-cyan-900/50 border border-blue-200/50 dark:border-blue-700/50 mb-8">
              <Target className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              <span className="text-sm font-medium text-blue-700 dark:text-blue-300">Features</span>
            </div>

            <h2 className="text-5xl md:text-6xl font-bold mb-8">
              <span className="bg-gradient-to-r from-gray-900 to-gray-700 dark:from-white dark:to-gray-300 bg-clip-text text-transparent">
                Everything you need for
              </span>
              <br />
              <span className="bg-gradient-to-r from-green-600 to-emerald-600 dark:from-green-400 dark:to-emerald-400 bg-clip-text text-transparent">
                sustainable living
              </span>
            </h2>

            <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto leading-relaxed">
              Powerful tools designed to make sustainable shopping effortless and rewarding.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <div key={index} className="group relative">
                <div className="absolute -inset-1 bg-gradient-to-r from-green-600/20 to-emerald-600/20 dark:from-green-400/20 dark:to-emerald-400/20 rounded-2xl blur opacity-0 group-hover:opacity-100 transition duration-1000 group-hover:duration-200"></div>
                <Card className="relative h-full border-0 bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 rounded-2xl overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-br from-white/40 dark:from-gray-700/40 to-transparent"></div>
                  <CardHeader className="relative p-8">
                    <div className="flex items-start gap-4 mb-6">
                      <div className="p-4 rounded-xl bg-gradient-to-r from-green-100 to-emerald-100 dark:from-green-900/50 dark:to-emerald-900/50 group-hover:from-green-200 group-hover:to-emerald-200 dark:group-hover:from-green-800/60 dark:group-hover:to-emerald-800/60 transition-colors">
                        <feature.icon className="h-7 w-7 text-green-600 dark:text-green-400" />
                      </div>
                    </div>
                    <CardTitle className="text-2xl font-bold text-gray-900 dark:text-white mb-4 leading-tight">
                      {feature.title}
                    </CardTitle>
                    <CardDescription className="text-gray-600 dark:text-gray-300 leading-relaxed text-lg">
                      {feature.description}
                    </CardDescription>
                  </CardHeader>
                </Card>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative py-32 px-6 bg-gradient-to-br from-green-600 via-emerald-600 to-green-700 dark:from-green-700 dark:via-emerald-700 dark:to-green-800 overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-white/10 to-transparent"></div>
          <div className="absolute top-1/4 left-1/4 w-2 h-2 bg-white/20 rounded-full"></div>
          <div className="absolute top-1/3 right-1/3 w-1 h-1 bg-white/30 rounded-full"></div>
          <div className="absolute bottom-1/4 left-1/2 w-1.5 h-1.5 bg-white/25 rounded-full"></div>
          <div className="absolute top-2/3 right-1/4 w-1 h-1 bg-white/20 rounded-full"></div>
        </div>
        <div className="container mx-auto text-center max-w-5xl relative">
          <h2 className="text-5xl md:text-6xl lg:text-7xl font-bold mb-8 text-white leading-tight">
            Ready to change
            <br />
            <span className="bg-gradient-to-r from-yellow-300 to-orange-300 bg-clip-text text-transparent">
              everything?
            </span>
          </h2>
          <p className="text-xl md:text-2xl mb-16 text-green-100 max-w-3xl mx-auto leading-relaxed">
            Start your eco-conscious sustainable journey today.
          </p>

          <div className="flex flex-col items-center gap-8">
            <div className="flex flex-col sm:flex-row gap-6 items-center">
              <div className="relative group">
                <div className="absolute -inset-1 bg-white/20 rounded-2xl blur opacity-50 group-hover:opacity-75 transition duration-1000 group-hover:duration-200"></div>
                <Button className="relative px-10 py-5 text-lg font-medium bg-white text-gray-900 rounded-xl shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105">
                  Get Started with Google
                </Button>
              </div>

              <div className="flex items-center gap-4">
                <div className="w-px h-8 bg-white/30"></div>
                <span className="text-green-100 text-sm">or</span>
                <div className="w-px h-8 bg-white/30"></div>
              </div>

              <Link href="/auth/signup">
                <Button
                  size="lg"
                  variant="outline"
                  className="px-10 py-5 text-lg font-medium border-2 border-white/30 text-white hover:bg-white hover:text-green-600 rounded-xl backdrop-blur-sm transition-all duration-300 transform hover:scale-105 bg-transparent"
                >
                  Sign Up with Email
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950 text-white py-20 px-6">
        <div className="container mx-auto max-w-7xl">
          <div className="grid md:grid-cols-4 gap-12 mb-16">
            <div className="md:col-span-2">
              <div className="flex items-center gap-3 mb-8">
                <div className="relative">
                  <Link href="/" className="flex items-center gap-2">
  <img src="/logo.png" alt="EcoVerse logo" className="h-10 w-auto" />
  </Link></div>
                <span className="text-3xl font-bold">EcoVerse</span>
              </div>
              <p className="text-gray-300 dark:text-gray-400 mb-8 text-lg leading-relaxed max-w-md">
                Making sustainable shopping accessible to everyone. Join the movement towards a greener future.
              </p>
            </div>

            <div>
              <h3 className="font-bold text-white mb-6 text-xl">Product</h3>
              <ul className="space-y-4 text-gray-300 dark:text-gray-400">
                <li>
                  <Link href="/features" className="hover:text-white transition-colors text-lg">
                    Features
                  </Link>
                </li>
                <li>
                  <Link href="/pricing" className="hover:text-white transition-colors text-lg">
                    Pricing
                  </Link>
                </li>
                <li>
                  <Link href="/api" className="hover:text-white transition-colors text-lg">
                    API
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="font-bold text-white mb-6 text-xl">Company</h3>
              <ul className="space-y-4 text-gray-300 dark:text-gray-400">
                <li>
                  <Link href="/about" className="hover:text-white transition-colors text-lg">
                    About
                  </Link>
                </li>
                <li>
                  <Link href="/contact" className="hover:text-white transition-colors text-lg">
                    Contact
                  </Link>
                </li>
                <li>
                  <Link href="/blog" className="hover:text-white transition-colors text-lg">
                    Blog
                  </Link>
                </li>
              </ul>
            </div>
          </div>

          <div className="border-t border-gray-700 dark:border-gray-800 pt-8">
            <div className="flex flex-col md:flex-row justify-between items-center">
              <p className="text-gray-400 dark:text-gray-500 mb-4 md:mb-0 text-lg">
                © 2025 EcoVerse. All rights reserved.
              </p>
              <div className="flex gap-8 text-gray-400 dark:text-gray-500">
                <Link href="/privacy" className="hover:text-white transition-colors text-lg">
                  Privacy Policy
                </Link>
                <Link href="/terms" className="hover:text-white transition-colors text-lg">
                  Terms of Service
                </Link>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
