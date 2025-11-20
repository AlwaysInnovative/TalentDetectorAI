'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { 
  Bell, X, Check, AlertCircle, Sparkles, 
  Download, FileText, ArrowRight, Zap, Award, Loader2,
  Eye, CheckCircle, Send
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'

export default function SmartNotificationPanel() {
  const [notifications, setNotifications] = useState<any[]>([])
  const [showPanel, setShowPanel] = useState(false)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  useEffect(() => {
    loadNotifications()
    
    const supabase = createClient()
    const channel = supabase
      .channel('notifications-realtime')
      .on('postgres_changes', 
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'notifications',
          filter: `user_id=eq.${localStorage.getItem('userId')}`
        },
        (payload) => {
          console.log('New notification:', payload.new)
          loadNotifications()
          showToastNotification(payload.new)
        }
      )
      .subscribe()

    return () => {
      channel.unsubscribe()
    }
  }, [])

  async function loadNotifications() {
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) return

      // Store user ID for real-time filter
      localStorage.setItem('userId', user.id)

      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .eq('read', false)
        .order('created_at', { ascending: false })
        .limit(20)

      if (error) throw error

      console.log('Loaded notifications:', data)
      setNotifications(data || [])
    } catch (error) {
      console.error('Load notifications error:', error)
    }
  }

  function showToastNotification(notification: any) {
    const icon = getPriorityIcon(notification.ai_priority || 'normal')
    
    toast.custom((t) => (
      <motion.div
        initial={{ opacity: 0, y: -50, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className={`max-w-md w-full bg-white shadow-2xl rounded-2xl p-4 border-2 cursor-pointer ${
          notification.ai_priority === 'urgent' ? 'border-red-500' :
          notification.ai_priority === 'high' ? 'border-orange-500' :
          'border-blue-500'
        }`}
        onClick={() => {
          toast.dismiss(t.id)
          handleNotificationClick(notification)
        }}>
        <div className="flex items-start gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
            notification.ai_priority === 'urgent' ? 'bg-red-500' :
            notification.ai_priority === 'high' ? 'bg-orange-500' :
            'bg-blue-500'
          }`}>
            {icon}
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="font-bold text-gray-900 text-sm">{notification.title}</h4>
            <p className="text-xs text-gray-600 mt-1">{notification.message}</p>
            <p className="text-xs text-blue-600 font-bold mt-2">Click to view →</p>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation()
              toast.dismiss(t.id)
            }}
            className="text-gray-400 hover:text-gray-600">
            <X className="w-4 h-4" />
          </button>
        </div>
      </motion.div>
    ), {
      duration: notification.ai_priority === 'urgent' ? 10000 : 5000,
      position: 'top-right'
    })
  }

  async function handleNotificationClick(notification: any) {
    console.log('Notification clicked:', notification)
    
    try {
      const supabase = createClient()
      
      // Mark as read
      await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', notification.id)

      loadNotifications()
      setShowPanel(false)

      // Navigate based on notification type and link
      if (notification.link) {
        console.log('Navigating to:', notification.link)
        router.push(notification.link)
      } else if (notification.type === 'cv_uploaded_ai_analysis' || 
                 notification.type === 'rtr_auto_generated' ||
                 notification.type === 'interest_viewed') {
        // Agency notifications - go to interests page
        router.push('/dashboard/agency/interests')
      } else if (notification.type === 'interest_received' || 
                 notification.type === 'rtr_ready_signature') {
        // Candidate notifications - go to specific interest
        const interestId = notification.metadata?.interest_id
        if (interestId) {
          router.push(`/dashboard/candidate/interests/${interestId}`)
        } else {
          router.push('/dashboard/candidate/interests')
        }
      }
    } catch (error) {
      console.error('Handle notification error:', error)
      toast.error('Failed to open notification')
    }
  }

  async function markAllRead() {
    setLoading(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      await supabase
        .from('notifications')
        .update({ read: true })
        .eq('user_id', user?.id)
        .eq('read', false)

      loadNotifications()
      toast.success('All notifications marked as read')
    } catch (error) {
      console.error('Mark all read error:', error)
      toast.error('Failed to mark as read')
    } finally {
      setLoading(false)
    }
  }

  function getPriorityIcon(priority: string) {
    switch (priority) {
      case 'urgent':
        return <Zap className="w-6 h-6 text-white" />
      case 'high':
        return <AlertCircle className="w-6 h-6 text-white" />
      default:
        return <Bell className="w-6 h-6 text-white" />
    }
  }

  function getNotificationIcon(type: string) {
    switch (type) {
      case 'cv_uploaded_ai_analysis':
        return <FileText className="w-5 h-5" />
      case 'interest_received':
        return <Send className="w-5 h-5" />
      case 'interest_viewed':
        return <Eye className="w-5 h-5" />
      case 'rtr_ready_signature':
        return <FileText className="w-5 h-5" />
      case 'rtr_signed':
        return <CheckCircle className="w-5 h-5" />
      default:
        return <Bell className="w-5 h-5" />
    }
  }

  const unreadCount = notifications.length
  const urgentCount = notifications.filter(n => n.ai_priority === 'urgent').length

  return (
    <>
      {/* Bell Icon Button */}
      <button
        onClick={() => setShowPanel(!showPanel)}
        className="relative p-3 hover:bg-gray-100 rounded-xl transition">
        <Bell className="w-6 h-6 text-gray-700" />
        {unreadCount > 0 && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className={`absolute -top-1 -right-1 min-w-[24px] h-6 px-2 rounded-full flex items-center justify-center text-xs font-bold text-white ${
              urgentCount > 0 ? 'bg-red-500 animate-pulse' : 'bg-blue-500'
            }`}>
            {unreadCount}
          </motion.span>
        )}
      </button>

      {/* Notification Panel */}
      <AnimatePresence>
        {showPanel && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/20 z-40"
              onClick={() => setShowPanel(false)}
            />

            {/* Panel */}
            <motion.div
              initial={{ opacity: 0, x: 100 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 100 }}
              className="fixed right-0 top-0 h-full w-full max-w-md bg-white shadow-2xl z-50 overflow-hidden flex flex-col">
              
              {/* Header */}
              <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <Sparkles className="w-8 h-8" />
                    <div>
                      <h2 className="text-2xl font-bold">Notifications</h2>
                      <p className="text-blue-100 text-sm">Click to view details</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowPanel(false)}
                    className="p-2 hover:bg-white/20 rounded-lg transition">
                    <X className="w-6 h-6" />
                  </button>
                </div>

                {/* Stats */}
                <div className="flex gap-3">
                  <div className="flex-1 bg-white/20 backdrop-blur rounded-xl p-3">
                    <p className="text-2xl font-bold">{unreadCount}</p>
                    <p className="text-xs text-blue-100">Unread</p>
                  </div>
                  {urgentCount > 0 && (
                    <div className="flex-1 bg-red-500/30 backdrop-blur rounded-xl p-3">
                      <p className="text-2xl font-bold">{urgentCount}</p>
                      <p className="text-xs text-red-100">Urgent</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Mark All Read Button */}
              {unreadCount > 0 && (
                <div className="p-4 border-b border-gray-200">
                  <button
                    onClick={markAllRead}
                    disabled={loading}
                    className="w-full px-4 py-2 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-xl font-bold transition flex items-center justify-center gap-2">
                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Check className="w-5 h-5" />}
                    Mark All as Read
                  </button>
                </div>
              )}

              {/* Notifications List */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                <AnimatePresence>
                  {notifications.map((notification, index) => (
                    <motion.div
                      key={notification.id}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ delay: index * 0.05 }}
                      onClick={() => handleNotificationClick(notification)}
                      className={`p-4 rounded-2xl border-2 cursor-pointer hover:shadow-lg transition ${
                        notification.ai_priority === 'urgent' 
                          ? 'bg-red-50 border-red-300 hover:border-red-500 hover:bg-red-100' :
                        notification.ai_priority === 'high'
                          ? 'bg-orange-50 border-orange-300 hover:border-orange-500 hover:bg-orange-100' :
                          'bg-blue-50 border-blue-300 hover:border-blue-500 hover:bg-blue-100'
                      }`}>
                      
                      <div className="flex items-start gap-3">
                        {/* Icon */}
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                          notification.ai_priority === 'urgent' ? 'bg-red-500' :
                          notification.ai_priority === 'high' ? 'bg-orange-500' :
                          'bg-blue-500'
                        }`}>
                          {getNotificationIcon(notification.type)}
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <h3 className="font-bold text-gray-900 mb-1">
                            {notification.title}
                          </h3>
                          <p className="text-sm text-gray-600 mb-2">
                            {notification.message}
                          </p>
                          
                          {/* Match Score Badge */}
                          {notification.metadata?.match_score && (
                            <div className="flex items-center gap-1 text-xs font-bold mb-2 bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full w-fit">
                              <Award className="w-3 h-3" />
                              {notification.metadata.match_score}% Match
                            </div>
                          )}

                          {/* Footer */}
                          <div className="flex items-center justify-between mt-3">
                            <span className="text-xs text-gray-500">
                              {new Date(notification.created_at).toLocaleString()}
                            </span>
                            <span className="text-xs font-bold text-blue-600 flex items-center gap-1 hover:gap-2 transition-all">
                              Click to view
                              <ArrowRight className="w-3 h-3" />
                            </span>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>

                {/* Empty State */}
                {notifications.length === 0 && (
                  <div className="text-center py-12">
                    <Check className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-xl font-bold text-gray-900 mb-2">All Caught Up!</h3>
                    <p className="text-gray-600">No new notifications</p>
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
