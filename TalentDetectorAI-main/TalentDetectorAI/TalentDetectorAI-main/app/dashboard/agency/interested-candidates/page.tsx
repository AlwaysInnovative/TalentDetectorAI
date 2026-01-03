'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'
import { ChevronDown, FileText, Zap, CheckCircle2, Clock } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import CandidateSummaryCard from '@/components/agency/CandidateSummaryCard'

interface Candidate {
  id: string
  name: string
  email: string
  phone?: string
  location?: string
  experience_years: number
  skills?: string[]
}

interface Job {
  id: string
  title: string
  company: string
  location: string
  salary_min?: number
  salary_max?: number
  required_skills?: string[]
}

interface Interest {
  id: string
  candidate_id: string
  job_id: string
  ai_match_score?: number
  right_to_represent_signed: boolean
  rtr_status: string
  status: string
  created_at: string
  candidate?: Candidate
  job?: Job
  analytics?: {
    summary_status: string
    ai_match_score: number
    summary?: {
      executive_summary: string
    }
    salary_band?: {
      target: number
      currency: string
    }
    commission?: {
      estimated_fee: number
      currency: string
    }
  }
}

interface ExpandedCandidate {
  candidateId: string
  jobIds: string[]
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default function InterestedCandidatesEnhanced() {
  const [interests, setInterests] = useState<Interest[]>([])
  const [expandedCandidates, setExpandedCandidates] = useState<Set<string>>(new Set())
  const [selectedInterest, setSelectedInterest] = useState<Interest | null>(null)
  const [showSummaryModal, setShowSummaryModal] = useState(false)
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Fetch interests with analytics
  const fetchInterests = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('job_interests')
        .select(
          `
          *,
          candidate:candidates(*),
          job:job_postings(*),
          analytics:interest_analytics(*)
          `
        )
        .order('created_at', { ascending: false })

      if (error) throw error

      // Ensure analytics is always an array or single object
      const formattedData = (data || []).map((interest: any) => ({
        ...interest,
        analytics: Array.isArray(interest.analytics) 
          ? interest.analytics[0] 
          : interest.analytics
      }))

      setInterests(formattedData)
      setError(null)
    } catch (err: any) {
      console.error('Error fetching interests:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchInterests()

    // Subscribe to real-time changes
    const subscription = supabase
      .channel('interests_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'job_interests' },
        () => {
          fetchInterests()
        }
      )
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  // Toggle candidate expansion
  const toggleCandidate = (candidateId: string) => {
    const newExpanded = new Set(expandedCandidates)
    if (newExpanded.has(candidateId)) {
      newExpanded.delete(candidateId)
    } else {
      newExpanded.add(candidateId)
    }
    setExpandedCandidates(newExpanded)
  }

  // Generate RTR
  const generateRTR = async (interestId: string) => {
    try {
      const response = await fetch('/api/generate-rtr-auto-enhanced', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ interestId })
      })

      if (!response.ok) throw new Error('Failed to generate RTR')
      
      await fetchInterests()
    } catch (err: any) {
      alert(`Error: ${err.message}`)
    }
  }

  // Generate Summary
  const generateSummary = async (interestId: string) => {
    try {
      setIsGeneratingSummary(true)
      const response = await fetch('/api/generate-candidate-summary-enhanced', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ interestId })
      })

      if (!response.ok) throw new Error('Failed to generate summary')

      await fetchInterests()
      alert('Summary generated successfully!')
    } catch (err: any) {
      alert(`Error: ${err.message}`)
    } finally {
      setIsGeneratingSummary(false)
    }
  }

  // Group interests by candidate
  const candidateGroups = interests.reduce((acc: Record<string, Interest[]>, interest) => {
    const candidateId = interest.candidate_id
    if (!acc[candidateId]) acc[candidateId] = []
    acc[candidateId].push(interest)
    return acc
  }, {})

  // Statistics
  const stats = {
    totalCandidates: Object.keys(candidateGroups).length,
    rtrSigned: interests.filter(i => i.right_to_represent_signed).length,
    summariesReady: interests.filter(i => i.analytics?.summary_status === 'ready').length,
    readyForSubmission: interests.filter(i => i.right_to_represent_signed && i.analytics?.summary_status === 'ready').length
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading candidates...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Interested Candidates</h1>
          <p className="text-gray-600">Manage and review candidate profiles with AI-powered summaries</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <StatCard label="Total Candidates" value={stats.totalCandidates} icon="👥" />
          <StatCard label="RTR Signed" value={stats.rtrSigned} icon="✍️" />
          <StatCard label="Summaries Ready" value={stats.summariesReady} icon="✨" />
          <StatCard label="Ready to Submit" value={stats.readyForSubmission} icon="📤" color="green" />
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-100 text-red-700 rounded-lg">
            Error: {error}
          </div>
        )}

        {/* Candidate List */}
        <div className="space-y-4">
          {Object.entries(candidateGroups).length === 0 ? (
            <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
              <p className="text-gray-500">No interested candidates yet</p>
            </div>
          ) : (
            Object.entries(candidateGroups).map(([candidateId, candidateInterests]) => {
              const candidate = candidateInterests[0]?.candidate
              const isExpanded = expandedCandidates.has(candidateId)

              return (
                <motion.div
                  key={candidateId}
                  className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow"
                  layout
                >
                  {/* Candidate Header */}
                  <button
                    onClick={() => toggleCandidate(candidateId)}
                    className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center gap-4 flex-1 text-left">
                      <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 font-semibold flex items-center justify-center flex-shrink-0">
                        {candidate?.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900">{candidate?.name}</h3>
                        <p className="text-sm text-gray-500">
                          {candidate?.experience_years || 0} years • {candidate?.location || 'Location not specified'}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        {candidateInterests.some(i => i.right_to_represent_signed) && (
                          <span className="inline-flex items-center gap-1 px-3 py-1 bg-green-100 text-green-800 text-xs font-semibold rounded-full">
                            <CheckCircle2 size={14} /> RTR Signed
                          </span>
                        )}
                        {candidateInterests.some(i => i.analytics?.summary_status === 'ready') && (
                          <span className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-800 text-xs font-semibold rounded-full">
                            <Zap size={14} /> Summary Ready
                          </span>
                        )}
                      </div>
                    </div>
                    <motion.div animate={{ rotate: isExpanded ? 180 : 0 }} transition={{ duration: 0.2 }}>
                      <ChevronDown size={20} className="text-gray-400" />
                    </motion.div>
                  </button>

                  {/* Expanded Job Details */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.3 }}
                        className="border-t border-gray-200 bg-gray-50"
                      >
                        <div className="p-6 space-y-4">
                          {candidateInterests.map((interest) => (
                            <JobCard
                              key={interest.id}
                              interest={interest}
                              onGenerateRTR={() => generateRTR(interest.id)}
                              onGenerateSummary={() => generateSummary(interest.id)}
                              onViewSummary={() => {
                                setSelectedInterest(interest)
                                setShowSummaryModal(true)
                              }}
                              isGeneratingSummary={isGeneratingSummary}
                            />
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              )
            })
          )}
        </div>
      </div>

      {/* Summary Modal */}
      {showSummaryModal && selectedInterest && (
        <Modal onClose={() => setShowSummaryModal(false)}>
          <CandidateSummaryCard
            candidateName={selectedInterest.candidate?.name || 'Candidate'}
            jobTitle={selectedInterest.job?.title || 'Position'}
            companyName={selectedInterest.job?.company}
            matchScore={selectedInterest.analytics?.ai_match_score || 0}
            executiveSummary={selectedInterest.analytics?.summary?.executive_summary || ''}
            skillsMatch={selectedInterest.analytics?.summary?.skills_match}
            keyStrengths={selectedInterest.analytics?.summary?.key_strengths}
            concerns={selectedInterest.analytics?.summary?.concerns}
            heatMap={selectedInterest.analytics?.summary?.heat_map}
            salaryBand={selectedInterest.analytics?.salary_band}
            commission={selectedInterest.analytics?.commission}
            status="ready"
          />
        </Modal>
      )}
    </div>
  )
}

interface StatCardProps {
  label: string
  value: number
  icon: string
  color?: 'blue' | 'green'
}

function StatCard({ label, value, icon, color = 'blue' }: StatCardProps) {
  const bgColor = color === 'green' ? 'bg-green-50' : 'bg-blue-50'
  const textColor = color === 'green' ? 'text-green-900' : 'text-blue-900'

  return (
    <div className={`${bgColor} rounded-lg p-6`}>
      <div className="text-3xl mb-2">{icon}</div>
      <p className={`text-sm text-gray-600 mb-1`}>{label}</p>
      <p className={`text-3xl font-bold ${textColor}`}>{value}</p>
    </div>
  )
}

interface JobCardProps {
  interest: Interest
  onGenerateRTR: () => void
  onGenerateSummary: () => void
  onViewSummary: () => void
  isGeneratingSummary: boolean
}

function JobCard({
  interest,
  onGenerateRTR,
  onGenerateSummary,
  onViewSummary,
  isGeneratingSummary
}: JobCardProps) {
  const job = interest.job
  const analytics = interest.analytics

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h4 className="font-semibold text-gray-900">{job?.title}</h4>
          <p className="text-sm text-gray-600">
            {job?.company} • {job?.location}
          </p>
        </div>
        <StatusBadge
          rtrSigned={interest.right_to_represent_signed}
          summaryStatus={analytics?.summary_status}
        />
      </div>

      {/* Summary Preview */}
      {analytics?.summary?.executive_summary && (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-gray-700 italic">
            "{analytics.summary.executive_summary.substring(0, 150)}..."
          </p>
        </div>
      )}

      {/* Quick Metrics */}
      {analytics && (
        <div className="grid grid-cols-3 gap-3 mb-4">
          <MetricChip
            label="Match"
            value={`${analytics.ai_match_score}%`}
            icon={<Zap size={16} />}
          />
          {analytics.salary_band && (
            <MetricChip
              label="Target Salary"
              value={`₹${(analytics.salary_band.target / 100000).toFixed(1)}L`}
              icon={<FileText size={16} />}
            />
          )}
          {analytics.commission && (
            <MetricChip
              label="Commission"
              value={`₹${(analytics.commission.estimated_fee / 100000).toFixed(1)}L`}
              icon={<CheckCircle2 size={16} />}
            />
          )}
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-2">
        {!interest.right_to_represent_signed && (
          <button
            onClick={onGenerateRTR}
            className="flex-1 px-3 py-2 bg-blue-100 hover:bg-blue-200 text-blue-700 font-medium rounded-lg text-sm transition-colors"
          >
            Generate RTR
          </button>
        )}

        {interest.right_to_represent_signed && !analytics?.summary && (
          <button
            onClick={onGenerateSummary}
            disabled={isGeneratingSummary}
            className="flex-1 px-3 py-2 bg-green-100 hover:bg-green-200 text-green-700 font-medium rounded-lg text-sm transition-colors disabled:opacity-50"
          >
            {isGeneratingSummary ? 'Generating...' : 'Generate Summary'}
          </button>
        )}

        {analytics?.summary && (
          <button
            onClick={onViewSummary}
            className="flex-1 px-3 py-2 bg-purple-100 hover:bg-purple-200 text-purple-700 font-medium rounded-lg text-sm transition-colors"
          >
            View Full Summary
          </button>
        )}
      </div>
    </div>
  )
}

interface StatusBadgeProps {
  rtrSigned: boolean
  summaryStatus?: string
}

function StatusBadge({ rtrSigned, summaryStatus }: StatusBadgeProps) {
  if (summaryStatus === 'ready') {
    return (
      <span className="inline-flex items-center gap-1 px-3 py-1 bg-green-100 text-green-800 text-xs font-semibold rounded-full">
        <CheckCircle2 size={14} /> Ready
      </span>
    )
  }

  if (rtrSigned && !summaryStatus) {
    return (
      <span className="inline-flex items-center gap-1 px-3 py-1 bg-yellow-100 text-yellow-800 text-xs font-semibold rounded-full">
        <Clock size={14} /> Generating
      </span>
    )
  }

  if (rtrSigned) {
    return (
      <span className="inline-flex items-center gap-1 px-3 py-1 bg-green-100 text-green-800 text-xs font-semibold rounded-full">
        <CheckCircle2 size={14} /> Signed
      </span>
    )
  }

  return (
    <span className="inline-flex items-center gap-1 px-3 py-1 bg-gray-100 text-gray-800 text-xs font-semibold rounded-full">
      <Clock size={14} /> Pending
    </span>
  )
}

interface ModalProps {
  onClose: () => void
  children: React.ReactNode
}

function Modal({ onClose, children }: ModalProps) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-lg max-h-[90vh] overflow-y-auto max-w-4xl w-full"
      >
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
          <h2 className="text-xl font-bold text-gray-900">Candidate Summary</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl"
          >
            ×
          </button>
        </div>
        <div className="p-6">{children}</div>
      </motion.div>
    </div>
  )
}

interface MetricChipProps {
  label: string
  value: string
  icon: React.ReactNode
}

function MetricChip({ label, value, icon }: MetricChipProps) {
  return (
    <div className="bg-gray-50 rounded-lg p-2 text-center">
      <div className="flex justify-center mb-1 text-gray-600">{icon}</div>
      <p className="text-xs text-gray-600">{label}</p>
      <p className="text-sm font-semibold text-gray-900">{value}</p>
    </div>
  )
}
