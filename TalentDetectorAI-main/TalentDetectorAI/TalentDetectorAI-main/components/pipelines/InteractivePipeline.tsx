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
