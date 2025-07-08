"use client"

import { useEffect, useState } from 'react'
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { X, Trophy, Star, Gift } from 'lucide-react'

interface RewardNotification {
  type: 'points' | 'achievement' | 'level_up' | 'monthly_bonus'
  title: string
  description: string
  points?: number
  level?: number
  achievement?: {
    name: string
    icon: string
  }
}

interface RewardNotificationProps {
  notification: RewardNotification | null
  onClose: () => void
}

export default function RewardNotification({ notification, onClose }: RewardNotificationProps) {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    if (notification) {
      setIsVisible(true)
      // Auto-hide after 5 seconds
      const timer = setTimeout(() => {
        handleClose()
      }, 5000)
      return () => clearTimeout(timer)
    }
  }, [notification])

  const handleClose = () => {
    setIsVisible(false)
    setTimeout(() => {
      onClose()
    }, 300) // Wait for animation to complete
  }

  if (!notification) return null

  const getIcon = () => {
    switch (notification.type) {
      case 'achievement':
        return <Trophy className="h-6 w-6 text-yellow-400" />
      case 'level_up':
        return <Star className="h-6 w-6 text-purple-400" />
      case 'monthly_bonus':
        return <Gift className="h-6 w-6 text-green-400" />
      default:
        return <Gift className="h-6 w-6 text-blue-400" />
    }
  }

  const getBackgroundColor = () => {
    switch (notification.type) {
      case 'achievement':
        return 'from-yellow-500/10 to-orange-500/10 border-yellow-500/20'
      case 'level_up':
        return 'from-purple-500/10 to-pink-500/10 border-purple-500/20'
      case 'monthly_bonus':
        return 'from-green-500/10 to-emerald-500/10 border-green-500/20'
      default:
        return 'from-blue-500/10 to-cyan-500/10 border-blue-500/20'
    }
  }

  return (
    <div className={`fixed top-4 right-4 z-50 transition-all duration-300 ${
      isVisible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'
    }`}>
      <Card className={`w-80 bg-gradient-to-br ${getBackgroundColor()} border backdrop-blur-sm`}>
        <CardContent className="p-4">
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-3">
              <div className="mt-0.5">
                {getIcon()}
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-white text-sm">
                  {notification.title}
                </h3>
                <p className="text-gray-300 text-xs mt-1">
                  {notification.description}
                </p>
                <div className="flex items-center gap-2 mt-2">
                  {notification.points && (
                    <Badge variant="secondary" className="bg-green-100 text-green-800 text-xs">
                      +{notification.points} pts
                    </Badge>
                  )}
                  {notification.level && (
                    <Badge variant="secondary" className="bg-purple-100 text-purple-800 text-xs">
                      Level {notification.level}
                    </Badge>
                  )}
                  {notification.achievement && (
                    <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 text-xs">
                      {notification.achievement.icon} {notification.achievement.name}
                    </Badge>
                  )}
                </div>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClose}
              className="h-6 w-6 p-0 text-gray-400 hover:text-white"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
