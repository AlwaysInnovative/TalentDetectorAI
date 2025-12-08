'use client'
import useSWR from 'swr'
import { createClient } from '@/lib/supabase/client'
import { Clock, Eye, CheckCircle, XCircle, FileText, Calendar, DollarSign } from 'lucide-react'
import DynamicBackground from '@/components/ui/DynamicBackground'
import { motion } from 'framer-motion'
import Link from 'next/link'

const fetcher = async () => {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  const { data: applications } = await supabase
    .from('applications')
    .select('*, jobs(*)')
    .eq('candidate_id', user?.id || '')
    .order('created_at', { ascending: false })
  
  return applications || []
}

const STATUS_CONFIG = {
  pending: { label: 'Applied', icon: Clock, color: 'yellow' },
  screening: { label: 'Screening', icon: Eye, color: 'blue' },
  interview: { label: 'Interview', icon: Calendar, color: 'purple' },
  offer: { label: 'Offer', icon: DollarSign, color: 'emerald' },
  hired: { label: 'Hired', icon: CheckCircle, color: 'green' },
  rejected: { label: 'Not Selected', icon: XCircle, color: 'red' }
}

export default function ApplicationTracking() {
  const { data: applications } = useSWR('candidate-applications', fetcher, { refreshInterval: 3000 })

  const stats = {
    total: applications?.length || 0,
    active: applications?.filter(a => ['pending', 'screening', 'interview'].includes(a.status)).length || 0,
    offers: applications?.filter(a => a.status === 'offer').length || 0,
    hired: applications?.filter(a => a.status === 'hired').length || 0
  }

  return (
    <div className="relative">
      <DynamicBackground page="applications" />
      
      <div className="mb-8">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
          My Applications
        </h1>
        <p className="text-gray-600">Track your application journey</p>
      </div>

      {/* Stats */}
      <div className="grid md:grid-cols-4 gap-6 mb-8">
        {[
          { label: 'Total', value: stats.total, color: 'blue' },
          { label: 'Active', value: stats.active, color: 'purple' },
          { label: 'Offers', value: stats.offers, color: 'emerald' },
          { label: 'Hired', value: stats.hired, color: 'green' }
        ].map((stat, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className={'card bg-gradient-to-br from-' + stat.color + '-50 to-white border-2 border-' + stat.color + '-200'}>
            <p className="text-sm text-gray-600 mb-1">{stat.label}</p>
            <p className="text-4xl font-bold">{stat.value}</p>
          </motion.div>
        ))}
      </div>

      {/* Applications List */}
      {applications && applications.length > 0 ? (
        <div className="space-y-4">
          {applications.map((app: any, i: number) => {
            const config = STATUS_CONFIG[app.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.pending
            const StatusIcon = config.icon
            
            return (
              <motion.div
                key={app.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="card">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-xl font-bold mb-1">{app.jobs.title}</h3>
                    <p className="text-sm text-gray-600">{app.jobs.location}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      Applied {new Date(app.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className={'px-4 py-2 rounded-full font-semibold flex items-center gap-2 bg-' + config.color + '-100 text-' + config.color + '-700'}>
                    <StatusIcon className="w-4 h-4" />
                    {config.label}
                  </div>
                </div>

                {/* Timeline */}
                <div className="relative">
                  <div className="flex justify-between items-center">
                    {Object.entries(STATUS_CONFIG).slice(0, 5).map(([status, cfg], idx) => {
                      const isComplete = ['pending', 'screening', 'interview', 'offer', 'hired'].indexOf(app.status) >= idx
                      const isCurrent = app.status === status
                      const StepIcon = cfg.icon
                      
                      return (
                        <div key={status} className="flex flex-col items-center flex-1 relative">
                          <div className={'w-10 h-10 rounded-full flex items-center justify-center ' +
                            (isComplete ? 'bg-' + cfg.color + '-600 text-white' : 'bg-gray-200 text-gray-400') +
                            (isCurrent ? ' ring-4 ring-' + cfg.color + '-200' : '')}>
                            <StepIcon className="w-5 h-5" />
                          </div>
                          <p className={'text-xs mt-2 font-medium ' + (isComplete ? 'text-' + cfg.color + '-700' : 'text-gray-400')}>
                            {cfg.label}
                          </p>
                          {idx < 4 && (
                            <div className={'absolute top-5 left-1/2 w-full h-0.5 ' + (isComplete ? 'bg-' + cfg.color + '-600' : 'bg-gray-200')} 
                              style={{ zIndex: -1 }} />
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Match Score */}
                {app.ai_match_score && (
                  <div className="mt-4 p-3 bg-purple-50 rounded-lg flex items-center justify-between">
                    <span className="text-sm font-semibold text-purple-900">AI Match Score</span>
                    <span className="text-2xl font-bold text-purple-600">{app.ai_match_score}%</span>
                  </div>
                )}

                {/* Feedback */}
                {app.feedback && (
                  <div className="mt-4 p-3 bg-blue-50 rounded-lg border-l-4 border-blue-500">
                    <p className="text-sm font-semibold text-blue-900 mb-1">Manager Feedback:</p>
                    <p className="text-sm text-blue-800">{app.feedback}</p>
                  </div>
                )}
              </motion.div>
            )
          })}
        </div>
      ) : (
        <div className="card text-center py-20">
          <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 text-lg mb-4">No applications yet</p>
          <Link href="/dashboard/candidate/jobs">
            <button className="btn-primary">Browse Jobs</button>
          </Link>
        </div>
      )}
    </div>
  )
}
