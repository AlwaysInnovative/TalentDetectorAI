#!/bin/bash
# Create All Missing Components
# Run: bash create-missing-components.sh

set -e

echo "🔧 Creating all missing components..."

# Create directories
mkdir -p components/{command-palette,ui/advanced,pipelines,insights,backgrounds}

# ==================== COMMAND PALETTE ====================

cat > components/command-palette/CommandPalette.tsx << 'ENDFILE'
'use client'
import { useState, useEffect } from 'react'
import { Search, Briefcase, Users, FileText, Calendar, Settings, Zap } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useRouter } from 'next/navigation'

interface Command {
  id: string
  label: string
  icon: any
  action: () => void
  category: string
}

export default function CommandPalette() {
  const [isOpen, setIsOpen] = useState(false)
  const [search, setSearch] = useState('')
  const router = useRouter()

  const commands: Command[] = [
    { id: 'new-job', label: 'Create New Job', icon: Briefcase, action: () => router.push('/dashboard/manager/jobs/create'), category: 'Jobs' },
    { id: 'view-candidates', label: 'View All Candidates', icon: Users, action: () => router.push('/dashboard/manager/candidates'), category: 'Candidates' },
    { id: 'view-pipeline', label: 'View Pipeline', icon: FileText, action: () => router.push('/dashboard/manager/pipeline'), category: 'Jobs' },
    { id: 'schedule-interview', label: 'Schedule Interview', icon: Calendar, action: () => router.push('/dashboard/manager/interviews'), category: 'Interviews' },
    { id: 'settings', label: 'Settings', icon: Settings, action: () => router.push('/dashboard/manager/settings'), category: 'System' },
    { id: 'ai-insights', label: 'AI Insights', icon: Zap, action: () => router.push('/dashboard/manager/insights'), category: 'AI' }
  ]

  const filteredCommands = commands.filter(cmd => 
    cmd.label.toLowerCase().includes(search.toLowerCase()) ||
    cmd.category.toLowerCase().includes(search.toLowerCase())
  )

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setIsOpen(true)
      }
      if (e.key === 'Escape') {
        setIsOpen(false)
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-start justify-center pt-32"
          onClick={() => setIsOpen(false)}>
          <motion.div
            initial={{ scale: 0.95, y: -20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.95, y: -20 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden">
            
            <div className="p-4 border-b flex items-center gap-3">
              <Search className="w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="flex-1 outline-none text-lg"
                placeholder="Search commands..."
                autoFocus
              />
              <kbd className="px-2 py-1 bg-gray-100 rounded text-xs font-mono">ESC</kbd>
            </div>

            <div className="max-h-96 overflow-y-auto">
              {filteredCommands.length > 0 ? (
                filteredCommands.map((cmd) => (
                  <button
                    key={cmd.id}
                    onClick={() => {
                      cmd.action()
                      setIsOpen(false)
                    }}
                    className="w-full px-4 py-3 flex items-center gap-3 hover:bg-gray-50 transition">
                    <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
                      <cmd.icon className="w-5 h-5 text-primary-600" />
                    </div>
                    <div className="flex-1 text-left">
                      <p className="font-semibold">{cmd.label}</p>
                      <p className="text-xs text-gray-500">{cmd.category}</p>
                    </div>
                  </button>
                ))
              ) : (
                <div className="p-8 text-center text-gray-500">
                  No commands found
                </div>
              )}
            </div>

            <div className="p-4 border-t bg-gray-50 flex items-center justify-between text-xs text-gray-600">
              <span>Press <kbd className="px-2 py-1 bg-white rounded font-mono">↑</kbd> <kbd className="px-2 py-1 bg-white rounded font-mono">↓</kbd> to navigate</span>
              <span>Press <kbd className="px-2 py-1 bg-white rounded font-mono">⌘K</kbd> to toggle</span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
ENDFILE

# ==================== REALTIME NOTIFICATIONS ====================

cat > components/ui/advanced/RealtimeNotifications.tsx << 'ENDFILE'
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
ENDFILE

# ==================== INTERACTIVE PIPELINE ====================

cat > components/pipelines/InteractivePipeline.tsx << 'ENDFILE'
'use client'
import { useState } from 'react'
import { motion } from 'framer-motion'
import { Users, Eye, Calendar, CheckCircle, TrendingUp } from 'lucide-react'

interface Candidate {
  id: string
  name: string
  role: string
  matchScore: number
  aiHint?: string
}

interface Stage {
  id: string
  name: string
  icon: any
  color: string
  candidates: Candidate[]
}

export default function InteractivePipeline() {
  const [stages] = useState<Stage[]>([
    { id: 'new', name: 'New Submissions', icon: Users, color: 'blue', candidates: [
      { id: '1', name: 'John Smith', role: 'Senior Developer', matchScore: 92, aiHint: '🔥 Strong technical match' },
      { id: '2', name: 'Jane Doe', role: 'Product Manager', matchScore: 85, aiHint: '✨ Great cultural fit' }
    ]},
    { id: 'screening', name: 'Screening', icon: Eye, color: 'purple', candidates: [
      { id: '3', name: 'Bob Wilson', role: 'DevOps Engineer', matchScore: 78 }
    ]},
    { id: 'interview', name: 'Interview', icon: Calendar, color: 'yellow', candidates: []},
    { id: 'offer', name: 'Offer', icon: TrendingUp, color: 'emerald', candidates: []},
    { id: 'hired', name: 'Hired', icon: CheckCircle, color: 'green', candidates: []}
  ])

  return (
    <div className="card p-6">
      <h2 className="text-2xl font-bold mb-6">Candidate Pipeline</h2>
      
      <div className="grid grid-cols-5 gap-4">
        {stages.map(stage => (
          <div key={stage.id} className="min-h-[400px] p-4 rounded-xl border-2 border-gray-200 bg-gray-50">
            <div className="flex items-center gap-2 mb-4">
              <div className={'w-8 h-8 bg-' + stage.color + '-500 rounded-lg flex items-center justify-center'}>
                <stage.icon className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="font-bold text-sm">{stage.name}</p>
                <p className="text-xs text-gray-600">{stage.candidates.length} candidates</p>
              </div>
            </div>

            <div className="space-y-2">
              {stage.candidates.map((candidate) => (
                <motion.div
                  key={candidate.id}
                  whileHover={{ scale: 1.02 }}
                  className="p-3 bg-white rounded-lg shadow cursor-move">
                  <div className="flex items-start justify-between mb-2">
                    <p className="font-bold text-sm">{candidate.name}</p>
                    <span className={'px-2 py-0.5 rounded text-xs font-bold ' +
                      (candidate.matchScore >= 80 ? 'bg-emerald-100 text-emerald-700' : 
                       'bg-blue-100 text-blue-700')}>
                      {candidate.matchScore}%
                    </span>
                  </div>
                  <p className="text-xs text-gray-600 mb-2">{candidate.role}</p>
                  {candidate.aiHint && (
                    <p className="text-xs text-purple-700 bg-purple-50 px-2 py-1 rounded">
                      {candidate.aiHint}
                    </p>
                  )}
                </motion.div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
ENDFILE

# ==================== ROLE INSIGHTS CARD ====================

cat > components/insights/RoleInsightsCard.tsx << 'ENDFILE'
'use client'
import { useState } from 'react'
import { motion } from 'framer-motion'
import { TrendingUp, Users, DollarSign, Clock } from 'lucide-react'

interface RoleInsightsProps {
  role: string
  data: {
    applications: number
    avgMatchScore: number
    timeToFill: number
    costPerHire: number
  }
}

export default function RoleInsightsCard({ role, data }: RoleInsightsProps) {
  const [rotateX, setRotateX] = useState(0)
  const [rotateY, setRotateY] = useState(0)

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const card = e.currentTarget
    const rect = card.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    
    const centerX = rect.width / 2
    const centerY = rect.height / 2
    
    const rotateXValue = ((y - centerY) / centerY) * -10
    const rotateYValue = ((x - centerX) / centerX) * 10
    
    setRotateX(rotateXValue)
    setRotateY(rotateYValue)
  }

  const handleMouseLeave = () => {
    setRotateX(0)
    setRotateY(0)
  }

  return (
    <motion.div
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{
        transformStyle: 'preserve-3d',
        rotateX,
        rotateY,
      }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className="relative w-full h-64 cursor-pointer">
      
      <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl shadow-2xl p-6"
        style={{ transform: 'translateZ(20px)' }}>
        
        <div style={{ transform: 'translateZ(40px)' }}>
          <h3 className="text-2xl font-bold text-white mb-4">{role}</h3>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white/20 backdrop-blur-sm rounded-xl p-3">
              <div className="flex items-center gap-2 mb-2">
                <Users className="w-5 h-5 text-white" />
                <span className="text-xs text-white/80">Applications</span>
              </div>
              <p className="text-2xl font-bold text-white">{data.applications}</p>
            </div>

            <div className="bg-white/20 backdrop-blur-sm rounded-xl p-3">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-5 h-5 text-white" />
                <span className="text-xs text-white/80">Avg Match</span>
              </div>
              <p className="text-2xl font-bold text-white">{data.avgMatchScore}%</p>
            </div>

            <div className="bg-white/20 backdrop-blur-sm rounded-xl p-3">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="w-5 h-5 text-white" />
                <span className="text-xs text-white/80">Time to Fill</span>
              </div>
              <p className="text-2xl font-bold text-white">{data.timeToFill}d</p>
            </div>

            <div className="bg-white/20 backdrop-blur-sm rounded-xl p-3">
              <div className="flex items-center gap-2 mb-2">
                <DollarSign className="w-5 h-5 text-white" />
                <span className="text-xs text-white/80">Cost/Hire</span>
              </div>
              <p className="text-2xl font-bold text-white">£{data.costPerHire}</p>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
ENDFILE

# ==================== CINEMATIC BACKGROUND ====================

cat > components/backgrounds/CinematicBackground.tsx << 'ENDFILE'
'use client'
import { motion } from 'framer-motion'

interface CinematicBackgroundProps {
  variant?: 'office' | 'tech' | 'meeting' | 'default'
}

export default function CinematicBackground({ variant = 'default' }: CinematicBackgroundProps) {
  const backgrounds = {
    office: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    tech: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
    meeting: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
    default: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
  }

  return (
    <div className="fixed inset-0 -z-10 overflow-hidden">
      <motion.div
        className="absolute inset-0"
        style={{ background: backgrounds[variant] }}
        animate={{
          backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'],
        }}
        transition={{
          duration: 20,
          repeat: Infinity,
          ease: 'linear'
        }}
      />

      {[...Array(20)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-2 h-2 bg-white/20 rounded-full"
          initial={{
            x: Math.random() * (typeof window !== 'undefined' ? window.innerWidth : 1000),
            y: Math.random() * (typeof window !== 'undefined' ? window.innerHeight : 1000),
          }}
          animate={{
            y: [0, -100, 0],
            opacity: [0.2, 0.5, 0.2],
          }}
          transition={{
            duration: Math.random() * 5 + 5,
            repeat: Infinity,
            delay: Math.random() * 5,
          }}
        />
      ))}

      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/5 to-black/10" />
    </div>
  )
}
ENDFILE

echo ""
echo "✅ All components created!"
echo ""
echo "Now restart your dev server:"
echo "npm run dev"
echo ""
echo "The build error should be fixed!"
