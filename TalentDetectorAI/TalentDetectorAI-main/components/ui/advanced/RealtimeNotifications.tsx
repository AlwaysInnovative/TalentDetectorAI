'use client'
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Bell, CheckCircle, AlertCircle, Info, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface Notification {
  id: string
  type: 'success' | 'error' | 'info' | 'warning'
  title: string
  message: string
  timestamp: Date
}

export default function RealtimeNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [isOpen, setIsOpen] = useState(false)

  const iconMap = {
    success: CheckCircle,
    error: AlertCircle,
    info: Info,
    warning: AlertCircle
  }

  const colorMap = {
    success: 'emerald',
    error: 'red',
    info: 'blue',
    warning: 'yellow'
  }

  useEffect(() => {
    const supabase = createClient()
    
    const fetchNotifications = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .eq('read', false)
        .order('created_at', { ascending: false })
        .limit(10)

      if (data) {
        setNotifications(data.map(n => ({
          id: n.id,
          type: 'info',
          title: n.title,
          message: n.message || '',
          timestamp: new Date(n.created_at)
        })))
      }
    }

    fetchNotifications()

    // Subscribe to new notifications
    const channel = supabase
      .channel('notifications')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications'
      }, (payload) => {
        const newNotif = payload.new as any
        setNotifications(prev => [{
          id: newNotif.id,
          type: 'info',
          title: newNotif.title,
          message: newNotif.message || '',
          timestamp: new Date(newNotif.created_at)
        }, ...prev].slice(0, 10))
      })
      .subscribe()

    return () => {
      channel.unsubscribe()
    }
  }, [])

  const removeNotification = async (id: string) => {
    const supabase = createClient()
    await supabase.from('notifications').update({ read: true }).eq('id', id)
    setNotifications(prev => prev.filter(n => n.id !== id))
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-lg hover:bg-gray-100 transition">
        <Bell className="w-6 h-6 text-gray-700" />
        {notifications.length > 0 && (
          <span className="absolute top-0 right-0 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
            {notifications.length}
          </span>
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -10 }}
            className="absolute right-0 top-12 w-96 bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden z-50">
            
            <div className="p-4 border-b bg-gradient-to-r from-blue-50 to-purple-50">
              <h3 className="font-bold text-lg">Notifications</h3>
              <p className="text-xs text-gray-600">{notifications.length} unread</p>
            </div>

            <div className="max-h-96 overflow-y-auto">
              {notifications.length > 0 ? (
                notifications.map(notif => {
                  const Icon = iconMap[notif.type]
                  const color = colorMap[notif.type]
                  
                  return (
                    <motion.div
                      key={notif.id}
                      initial={{ x: -20, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      className="p-4 border-b hover:bg-gray-50 transition">
                      <div className="flex items-start gap-3">
                        <div className={'w-10 h-10 rounded-full bg-' + color + '-100 flex items-center justify-center flex-shrink-0'}>
                          <Icon className={'w-5 h-5 text-' + color + '-600'} />
                        </div>
                        <div className="flex-1">
                          <p className="font-semibold text-sm">{notif.title}</p>
                          <p className="text-xs text-gray-600 mt-1">{notif.message}</p>
                          <p className="text-xs text-gray-400 mt-2">
                            {notif.timestamp.toLocaleTimeString()}
                          </p>
                        </div>
                        <button onClick={() => removeNotification(notif.id)}
                          className="text-gray-400 hover:text-gray-600">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </motion.div>
                  )
                })
              ) : (
                <div className="p-8 text-center text-gray-500">
                  <Bell className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p>No notifications</p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
