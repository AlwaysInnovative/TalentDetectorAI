'use client'
import { motion } from 'framer-motion'
import { CheckCircle, Clock, Calendar, FileText, UserCheck } from 'lucide-react'

interface TimelineProps {
  application: any
}

export default function ApplicationTimeline({ application }: TimelineProps) {
  const stages = [
    { id: 'submitted', label: 'Application Submitted', icon: FileText, completed: true, date: application.created_at },
    { id: 'screening', label: 'Screening', icon: Clock, completed: application.status !== 'pending', date: application.screening_date },
    { id: 'interview', label: 'Interview Scheduled', icon: Calendar, completed: ['interview', 'offer', 'hired'].includes(application.status), date: application.interview_date },
    { id: 'offer', label: 'Offer Extended', icon: UserCheck, completed: ['offer', 'hired'].includes(application.status), date: application.offer_date },
    { id: 'hired', label: 'Hired', icon: CheckCircle, completed: application.status === 'hired', date: application.hired_date }
  ]

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <h3 className="text-2xl font-bold mb-6">Application Timeline</h3>
      
      <div className="relative">
        {/* Progress Line */}
        <div className="absolute left-8 top-0 bottom-0 w-1 bg-gray-200" />
        <motion.div
          className="absolute left-8 top-0 w-1 bg-blue-600"
          initial={{ height: 0 }}
          animate={{ height: `${(stages.filter(s => s.completed).length / stages.length) * 100}%` }}
          transition={{ duration: 1, ease: 'easeOut' }}
        />

        {/* Timeline Items */}
        <div className="space-y-8">
          {stages.map((stage, i) => (
            <motion.div
              key={stage.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.2 }}
              className="relative flex items-start gap-4">
              
              {/* Icon */}
              <div className={'w-16 h-16 rounded-full flex items-center justify-center relative z-10 ' +
                (stage.completed ? 'bg-blue-600' : 'bg-gray-300')}>
                <stage.icon className="w-8 h-8 text-white" />
              </div>

              {/* Content */}
              <div className="flex-1 pt-2">
                <h4 className={'text-lg font-bold ' + (stage.completed ? 'text-gray-900' : 'text-gray-500')}>
                  {stage.label}
                </h4>
                {stage.date && (
                  <p className="text-sm text-gray-600">
                    {new Date(stage.date).toLocaleDateString('en-GB', { 
                      day: 'numeric', 
                      month: 'long', 
                      year: 'numeric' 
                    })}
                  </p>
                )}
                {stage.completed && (
                  <span className="inline-block mt-2 px-3 py-1 bg-emerald-100 text-emerald-700 text-xs font-bold rounded-full">
                    ✓ Completed
                  </span>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  )
}
