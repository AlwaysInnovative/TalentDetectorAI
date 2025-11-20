'use client'
import SmartNotificationPanel from '@/components/notifications/SmartNotificationPanel'

export default function DashboardLayoutWithNotifications({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      {/* Top Navigation Bar */}
      <div className="fixed top-0 right-0 z-50 p-4">
        <SmartNotificationPanel />
      </div>
      
      {/* Main Content */}
      <div className="pt-4">
        {children}
      </div>
    </div>
  )
}
