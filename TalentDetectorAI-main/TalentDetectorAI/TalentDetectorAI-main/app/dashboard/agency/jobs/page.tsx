'use client'

import { useState } from 'react'
import useSWR from 'swr'
import { createClient } from '@/lib/supabase/client'
import {
  Briefcase,
  CheckCircle,
  XCircle,
  Loader2,
  DollarSign,
  MapPin,
  TrendingUp,
  Calculator,
  Award,
  ArrowRight,
} from 'lucide-react'
import DynamicBackground from '@/components/ui/DynamicBackground'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'

const fetcher = async () => {
  const supabase = createClient()
  const { data: { session } } = await supabase.auth.getSession()
  const agencyId = session?.user?.id

  if (!agencyId) return { proposals: [] }

  const { data, error } = await supabase
    .from('commissionproposals')
    .select(
      `
      *,
      jobs (*),
      manager:profiles!commissionproposals_managerid_fkey ( id, full_name, company )
    `,
    )
    .eq('agencyid', agencyId)
    .order('createdat', { ascending: false })

  if (error) throw error
  return { proposals: data || [] }
}

export default function AgencyJobsPage() {
  const { data, mutate } = useSWR('agency-jobs', fetcher, { refreshInterval: 5000 })
  const [processing, setProcessing] = useState<string | null>(null)

  async function handleResponse(proposalId: string, action: 'accept' | 'reject') {
    setProcessing(proposalId)
    try {
      const supabase = createClient()
      const proposal = data?.proposals.find((p: any) => p.id === proposalId)

      const { error } = await supabase
        .from('commissionproposals')
        .update({
          status: action === 'accept' ? 'accepted' : 'rejected',
          agreedpercentage: action === 'accept' ? proposal?.managerpercentage : null,
          agreedat: action === 'accept' ? new Date().toISOString() : null,
        })
        .eq('id', proposalId)

      if (error) throw error
      toast.success(action === 'accept' ? 'Proposal accepted!' : 'Proposal rejected.')
      await mutate()
    } catch (err: any) {
      toast.error(err.message || 'Action failed')
    } finally {
      setProcessing(null)
    }
  }

  const proposals = data?.proposals || []

  return (
    <div className="relative min-h-screen p-8">
      <DynamicBackground page="agency-jobs" />

      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-5xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent mb-3">
            Review Job Proposals
          </h1>
          <p className="text-xl text-gray-600">
            Analyze potential earnings and make informed decisions.
          </p>
        </div>

        {proposals.length ? (
          <div className="space-y-8">
            {proposals.map((proposal: any, index: number) => {
              const job = proposal.jobs
              const manager = proposal.manager
              const salaryMin = job?.salarymin || 50000
              const salaryMax = job?.salarymax || 80000
              const salaryMid = Math.round((salaryMin + salaryMax) / 2)
              const commission = proposal.managerpercentage || 15
              const earningsMin = Math.round((salaryMin * commission) / 100)
              const earningsMax = Math.round((salaryMax * commission) / 100)
              const earningsMid = Math.round((salaryMid * commission) / 100)

              return (
                <motion.div
                  key={proposal.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="bg-white rounded-3xl shadow-2xl overflow-hidden border-2"
                  style={{
                    borderColor:
                      proposal.status === 'pending'
                        ? '#f59e0b'
                        : proposal.status === 'accepted'
                        ? '#10b981'
                        : proposal.status === 'rejected'
                        ? '#ef4444'
                        : '#d1d5db',
                  }}
                >
                  {/* Header */}
                  <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-8">
                    <div className="flex justify-between items-start">
                      <div>
                        <h2 className="text-3xl font-bold mb-2">
                          {job?.title || 'Job Title'}
                        </h2>
                        <div className="flex gap-4 text-blue-100">
                          {job?.location && (
                            <span className="flex items-center gap-1">
                              <MapPin className="w-4 h-4" />
                              {job.location}
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            <DollarSign className="w-4 h-4" />
                            {salaryMin.toLocaleString()} – {salaryMax.toLocaleString()}
                          </span>
                        </div>
                        {manager && (
                          <p className="mt-3 text-blue-100">
                            <strong>Hiring Manager:</strong> {manager.full_name}
                            {manager.company ? ` • ${manager.company}` : ''}
                          </p>
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-3">
                        <div
                          className={`px-4 py-2 rounded-full text-sm font-bold ${
                            proposal.status === 'pending'
                              ? 'bg-amber-500'
                              : proposal.status === 'accepted'
                              ? 'bg-emerald-500'
                              : proposal.status === 'rejected'
                              ? 'bg-red-500'
                              : 'bg-gray-500'
                          }`}
                        >
                          {proposal.status?.toUpperCase()}
                        </div>
                        <div className="text-right text-sm text-blue-100">
                          {proposal.createdat &&
                            `Received: ${new Date(
                              proposal.createdat,
                            ).toLocaleDateString()}`}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Body */}
                  <div className="p-8">
                    <div className="grid md:grid-cols-2 gap-8 mb-8">
                      {/* Job details */}
                      <div>
                        <h3 className="text-2xl font-bold mb-3 flex items-center gap-2">
                          <Briefcase className="w-6 h-6 text-blue-600" />
                          Job Details
                        </h3>
                        {job?.description && (
                          <div className="bg-gray-50 rounded-xl p-4 mb-4">
                            <p className="text-gray-700 line-clamp-4">{job.description}</p>
                          </div>
                        )}
                      </div>

                      {/* Earnings calculator */}
                      <div>
                        <h3 className="text-2xl font-bold mb-3 flex items-center gap-2">
                          <Calculator className="w-6 h-6 text-emerald-600" />
                          Potential Earnings
                        </h3>
                        <div className="bg-gradient-to-br from-emerald-50 to-green-50 rounded-2xl p-4 mb-4 border-2 border-emerald-300">
                          <p className="text-sm text-emerald-700 font-semibold mb-2">
                            Your commission rate
                          </p>
                          <div className="flex items-center gap-3">
                            <Award className="w-10 h-10 text-emerald-600" />
                            <p className="text-4xl font-bold text-emerald-700">
                              {commission}%
                            </p>
                          </div>
                        </div>
                        <div className="space-y-3">
                          <div className="bg-blue-50 rounded-xl p-3 border border-blue-200 flex justify-between items-center">
                            <div>
                              <p className="text-sm text-blue-700 font-semibold">
                                Minimum scenario
                              </p>
                              <p className="text-xs text-blue-600">
                                If candidate accepts {salaryMin.toLocaleString()}
                              </p>
                            </div>
                            <p className="text-2xl font-bold text-blue-600">
                              {earningsMin.toLocaleString()}
                            </p>
                          </div>
                          <div className="bg-indigo-50 rounded-xl p-3 border border-indigo-200 flex justify-between items-center">
                            <div>
                              <p className="text-sm text-indigo-700 font-semibold">
                                Average scenario
                              </p>
                              <p className="text-xs text-indigo-600">
                                If candidate accepts {salaryMid.toLocaleString()}
                              </p>
                            </div>
                            <p className="text-2xl font-bold text-indigo-700">
                              {earningsMid.toLocaleString()}
                            </p>
                          </div>
                          <div className="bg-emerald-100 rounded-xl p-3 border border-emerald-400 flex justify-between items-center">
                            <div>
                              <p className="text-sm text-emerald-800 font-semibold">
                                Maximum scenario
                              </p>
                              <p className="text-xs text-emerald-700">
                                If candidate accepts {salaryMax.toLocaleString()}
                              </p>
                            </div>
                            <p className="text-2xl font-bold text-emerald-700">
                              {earningsMax.toLocaleString()}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    {proposal.status === 'pending' && (
                      <div className="flex flex-wrap gap-4">
                        <button
                          onClick={() => handleResponse(proposal.id, 'accept')}
                          disabled={processing === proposal.id}
                          className="flex-1 bg-gradient-to-r from-emerald-500 to-green-600 text-white py-4 rounded-2xl font-bold text-lg flex items-center justify-center gap-3 disabled:opacity-50"
                        >
                          {processing === proposal.id ? (
                            <>
                              <Loader2 className="w-6 h-6 animate-spin" />
                              Processing...
                            </>
                          ) : (
                            <>
                              <CheckCircle className="w-6 h-6" />
                              Accept (up to {earningsMax.toLocaleString()})
                            </>
                          )}
                        </button>
                        <button
                          onClick={() => handleResponse(proposal.id, 'reject')}
                          disabled={processing === proposal.id}
                          className="px-8 border-2 border-red-500 text-red-600 py-4 rounded-2xl font-bold text-lg flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                          <XCircle className="w-6 h-6" />
                          Reject
                        </button>
                      </div>
                    )}

                    {proposal.status === 'accepted' && (
                      <button
                        onClick={() => (window.location.href = '/dashboard/agency/candidates')}
                        className="w-full bg-gradient-to-r from-violet-500 to-purple-600 text-white py-4 rounded-2xl font-bold text-lg flex items-center justify-center gap-3 mt-4"
                      >
                        <Award className="w-6 h-6" />
                        Start Finding Candidates
                        <ArrowRight className="w-6 h-6" />
                      </button>
                    )}

                    {proposal.status === 'rejected' && (
                      <div className="mt-4 text-center py-3 bg-red-50 rounded-xl">
                        <p className="text-red-700 font-semibold">
                          This proposal was rejected.
                        </p>
                      </div>
                    )}
                  </div>
                </motion.div>
              )
            })}
          </div>
        ) : (
          <div className="bg-white rounded-3xl p-16 text-center shadow-2xl">
            <Briefcase className="w-24 h-24 text-gray-300 mx-auto mb-6" />
            <h2 className="text-3xl font-bold text-gray-600 mb-3">No Proposals Yet</h2>
            <p className="text-lg text-gray-500">
              Hiring managers will send you job proposals. Check back soon.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
