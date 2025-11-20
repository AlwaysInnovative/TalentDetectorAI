'use client'
import useSWR from 'swr'
import { createClient } from '@/lib/supabase/client'
import { Send, Eye, Clock, CheckCircle, XCircle, MessageSquare } from 'lucide-react'
import DynamicBackground from '@/components/ui/DynamicBackground'
import { motion } from 'framer-motion'

const fetcher = async () => {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  const { data: submissions } = await supabase
    .from('agency_submissions')
    .select('*, agency_candidates(*), jobs(*)')
    .eq('agency_id', user?.id || '')
    .order('submitted_at', { ascending: false })
  
  return submissions || []
}

export default function Submissions() {
  const { data: submissions } = useSWR('agency-submissions', fetcher, { refreshInterval: 3000 })

  const stats = {
    total: submissions?.length || 0,
    pending: submissions?.filter(s => s.status === 'submitted').length || 0,
    shortlisted: submissions?.filter(s => s.status === 'shortlisted').length || 0,
    interviewed: submissions?.filter(s => s.status === 'interview').length || 0,
    hired: submissions?.filter(s => s.status === 'hired').length || 0
  }

  return (
    <div className="relative">
      <DynamicBackground page="submissions" />
      
      <div className="mb-8">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-emerald-600 bg-clip-text text-transparent mb-2">
          Submission Tracking
        </h1>
        <p className="text-gray-600">Monitor your candidate submissions in real-time</p>
      </div>

      <div className="grid md:grid-cols-5 gap-6 mb-8">
        {[
          { label: 'Total', value: stats.total, color: 'blue', icon: Send },
          { label: 'Pending', value: stats.pending, color: 'yellow', icon: Clock },
          { label: 'Shortlisted', value: stats.shortlisted, color: 'purple', icon: Eye },
          { label: 'Interview', value: stats.interviewed, color: 'emerald', icon: CheckCircle },
          { label: 'Hired', value: stats.hired, color: 'green', icon: CheckCircle }
        ].map((stat, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className={'card bg-gradient-to-br from-' + stat.color + '-50 to-white border-2 border-' + stat.color + '-200'}>
            <div className={'w-10 h-10 bg-' + stat.color + '-600 rounded-xl flex items-center justify-center mb-3'}>
              <stat.icon className="w-5 h-5 text-white" />
            </div>
            <p className="text-sm text-gray-600 mb-1">{stat.label}</p>
            <p className="text-3xl font-bold">{stat.value}</p>
          </motion.div>
        ))}
      </div>

      {submissions && submissions.length > 0 ? (
        <div className="grid gap-4">
          {submissions.map((sub: any, i: number) => (
            <motion.div
              key={sub.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="card">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-emerald-500 rounded-full flex flex-col items-center justify-center text-white">
                    <span className="text-2xl font-bold">{sub.ai_match_score}</span>
                    <span className="text-xs">%</span>
                  </div>
                  <div>
                    <p className="font-bold text-lg">{sub.agency_candidates.name}</p>
                    <p className="text-sm text-gray-600">{sub.jobs.title}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      Submitted {new Date(sub.submitted_at).toLocaleDateString()}
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      <span className={'px-3 py-1 rounded-full text-xs font-semibold ' +
                        (sub.status === 'hired' ? 'bg-green-100 text-green-700' :
                         sub.status === 'interview' ? 'bg-emerald-100 text-emerald-700' :
                         sub.status === 'shortlisted' ? 'bg-purple-100 text-purple-700' :
                         sub.status === 'rejected' ? 'bg-red-100 text-red-700' :
                         'bg-yellow-100 text-yellow-700')}>
                        {sub.status}
                      </span>
                      {sub.viewed_by_manager && (
                        <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded flex items-center gap-1">
                          <Eye className="w-3 h-3" /> Viewed
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {sub.match_reasoning && (
                <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                  <p className="text-sm font-semibold mb-1">AI Match Reasoning:</p>
                  <p className="text-sm text-gray-700">{sub.match_reasoning}</p>
                </div>
              )}

              {sub.feedback && (
                <div className="mt-4 p-3 bg-blue-50 rounded-lg border-l-4 border-blue-500">
                  <div className="flex items-start gap-2">
                    <MessageSquare className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-semibold text-blue-900">Manager Feedback:</p>
                      <p className="text-sm text-blue-800 mt-1">{sub.feedback}</p>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="card text-center py-20">
          <Send className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">No submissions yet</p>
        </div>
      )}
    </div>
  )
}
