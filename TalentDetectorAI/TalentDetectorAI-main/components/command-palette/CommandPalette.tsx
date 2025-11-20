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
