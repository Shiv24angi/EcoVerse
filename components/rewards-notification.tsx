// 1. Wrap handleDismiss with useCallback (add import { useCallback } from "react" at the top if not there)
const handleDismiss = useCallback(() => {
  setVisible(false)
  setTimeout(() => {
    onDismiss()
  }, 300) // Wait for fade out animation
}, [onDismiss])

// 2. Update your useEffect to include handleDismiss
useEffect(() => {
  if (notification) {
    setVisible(true)
    // Auto-dismiss after 5 seconds
    const timer = setTimeout(() => {
      handleDismiss()
    }, 5000)
    
    return () => clearTimeout(timer)
  }
}, [notification, handleDismiss])

// ... down inside the notification generator function, look for cryptoId:

// 3. Make randomUUID lookups safe from crashing
const cryptoId = typeof window !== 'undefined' && window.crypto?.randomUUID?.() || String(Math.random())

const newNotification: RewardNotification = {
  ...notificationData,
  id: cryptoId,
}