"use client"

import { useEffect, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { CheckCircle, Clock, Gift, Star, Trophy } from "lucide-react"
import { Button } from "@/components/ui/button"

interface RewardNotification {
  id: string
  type: 'points' | 'achievement' | 'level_up' | 'purchase'
  message: string
  points?: number
  pointsType?: 'confirmed' | 'unconfirmed'
  icon?: string
  level?: number
  timestamp: Date
}

interface RewardsNotificationProps {
  notification: RewardNotification | null
  onDismiss: () => void
}

export default function RewardsNotification({ notification, onDismiss }: RewardsNotificationProps) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (notification) {
      setVisible(true)
      // Auto-dismiss after 5 seconds
      const timer = setTimeout(() => {
        handleDismiss()
      }, 5000)
      
      return () => clearTimeout(timer)
    }
  }, [notification])

  const handleDismiss = () => {
    setVisible(false)
    setTimeout(() => {
      onDismiss()
    }, 300) // Wait for fade out animation
  }

  if (!notification || !visible) return null

  const getIcon = () => {
    switch (notification.type) {
      case 'points':
        return <Gift className="h-5 w-5" />
      case 'achievement':
        return <Trophy className="h-5 w-5" />
      case 'level_up':
        return <Star className="h-5 w-5" />
      case 'purchase':
        return <CheckCircle className="h-5 w-5" />
      default:
        return <Gift className="h-5 w-5" />
    }
  }

  const getColor = () => {
    switch (notification.type) {
      case 'points':
        return notification.pointsType === 'confirmed' ? 'bg-green-600' : 'bg-yellow-600'
      case 'achievement':
        return 'bg-purple-600'
      case 'level_up':
        return 'bg-blue-600'
      case 'purchase':
        return 'bg-green-600'
      default:
        return 'bg-gray-600'
    }
  }

  return (
    <div className={`fixed top-4 right-4 z-50 transition-all duration-300 transform ${
      visible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'
    }`}>
      <Card className={`${getColor()} border-0 text-white max-w-sm`}>
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="mt-0.5">
              {getIcon()}
            </div>
            <div className="flex-1">
              <p className="font-medium text-sm">
                {notification.message}
              </p>
              
              {notification.type === 'points' && notification.points && (
                <div className="flex items-center gap-2 mt-2">
                  <Badge variant="secondary" className="bg-white/20 text-white border-0">
                    +{notification.points} pts
                  </Badge>
                  {notification.pointsType && (
                    <Badge 
                      variant="outline" 
                      className={`border-white/30 text-white ${
                        notification.pointsType === 'confirmed' ? 'bg-green-500/20' : 'bg-yellow-500/20'
                      }`}
                    >
                      {notification.pointsType === 'confirmed' ? (
                        <>
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Confirmed
                        </>
                      ) : (
                        <>
                          <Clock className="h-3 w-3 mr-1" />
                          Pending
                        </>
                      )}
                    </Badge>
                  )}
                </div>
              )}
              
              {notification.type === 'level_up' && notification.level && (
                <div className="flex items-center gap-2 mt-2">
                  <Badge variant="secondary" className="bg-white/20 text-white border-0">
                    Level {notification.level}
                  </Badge>
                </div>
              )}
              
              {notification.type === 'achievement' && (
                <div className="flex items-center gap-2 mt-2">
                  <Badge variant="secondary" className="bg-white/20 text-white border-0">
                    Achievement Unlocked!
                  </Badge>
                </div>
              )}
            </div>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDismiss}
              className="text-white hover:bg-white/20 h-6 w-6 p-0"
            >
              ×
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// Hook for managing reward notifications
export function useRewardsNotification() {
  const [notification, setNotification] = useState<RewardNotification | null>(null)

  const showNotification = (notificationData: Omit<RewardNotification, 'id' | 'timestamp'>) => {
    const newNotification: RewardNotification = {
      ...notificationData,
      id: `${Date.now()}-${Math.random()}`,
      timestamp: new Date()
    }
    setNotification(newNotification)
  }

  const dismissNotification = () => {
    setNotification(null)
  }

  return {
    notification,
    showNotification,
    dismissNotification
  }
}
