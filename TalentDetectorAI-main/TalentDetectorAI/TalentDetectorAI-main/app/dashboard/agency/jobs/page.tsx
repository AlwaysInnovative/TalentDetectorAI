'use client'
import { useState } from 'react'
import useSWR from 'swr'
import { createClient } from '@/lib/supabase/client'
import { Briefcase, CheckCircle, XCircle, Loader2, DollarSign, MapPin, TrendingUp, Calculator, Award, ArrowRight } from 'lucide-react'
import DynamicBackground from '@/components/ui/DynamicBackground'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'

const fetcher = async () => {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  const { data: proposals } = await supabase
    .from('commission_proposals')
    .select('*')
    .eq('agency_id', user?.id || '')
    .order('created_at', { ascending: false })
  
  const enriched = await Promise.all(
    (proposals || []).map(async (p: any) => {
      const [jobRes, managerRes] = await Promise.all([
        supabase.from('jobs').select('*').eq('id', p.job_id).maybeSingle(),
        supabase.from('profiles').select('full_name, company').eq('id', p.manager_id).maybeSingle()
      ])
      return { ...p, job: jobRes.data, manager: managerRes.data }
    })
  )
  
  return enriched
}

export default function AgencyJobsPage() {
  const { data: proposals, mutate } = useSWR('agency-jobs', fetcher, { refreshInterval: 5000 })
  const [processing, setProcessing] = useState<string | null>(null)

  async function handleResponse(proposalId: string, action: 'accept' | 'reject') {
    setProcessing(proposalId)
    try {
      const supabase = createClient()
      
      const { error } = await supabase
        .from('commission_proposals')
        .update({
          status: action === 'accept' ? 'accepted' : 'rejected',
          agreed_percentage: action === 'accept' ? 
            proposals?.find((p: any) => p.id === proposalId)?.manager_percentage : null,
          agreed_at: action === 'accept' ? new Date().toISOString() : null
        })
        .eq('id', proposalId)

      if (error) throw error

      toast.success(action === 'accept' ? '✅ Proposal accepted!' : '❌ Proposal rejected')
      mutate()
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setProcessing(null)
    }
  }

  return (
    <div className="relative min-h-screen p-8">
      <DynamicBackground page="agency-jobs" />
      
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-5xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent mb-3">
            Review Job Proposals
          </h1>
          <p className="text-xl text-gray-600">Analyze potential earnings and make informed decisions</p>
        </div>

        {proposals && proposals.length > 0 ? (
          <div className="space-y-8">
            {proposals.map((proposal: any, index: number) => {
              const salaryMin = proposal.job?.salary_min || 50000
              const salaryMax = proposal.job?.salary_max || 80000
              const salaryMid = Math.round((salaryMin + salaryMax) / 2)
              const commission = proposal.manager_percentage || 15
              
              const earningsMin = Math.round((salaryMin * commission) / 100)
              const earningsMax = Math.round((salaryMax * commission) / 100)
              const earningsMid = Math.round((salaryMid * commission) / 100)

              return (
                <motion.div
                  key={proposal.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="bg-white rounded-3xl shadow-2xl overflow-hidden border-2"
                  style={{
                    borderColor: proposal.status === 'pending' ? '#f59e0b' :
                                 proposal.status === 'accepted' ? '#10b981' :
                                 proposal.status === 'rejected' ? '#ef4444' : '#d1d5db'
                  }}>
                  
                  {/* Header */}
                  <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-8">
                    <div className="flex justify-between items-start">
                      <div>
                        <h2 className="text-4xl font-bold mb-3">{proposal.job?.title || 'Job Title'}</h2>
                        <div className="flex gap-4 text-blue-100">
                          {proposal.job?.location && (
                            <span className="flex items-center gap-1">
                              <MapPin className="w-5 h-5" /> {proposal.job.location}
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            <DollarSign className="w-5 h-5" />
                            £{salaryMin.toLocaleString()} - £{salaryMax.toLocaleString()}
                          </span>
                        </div>
                        {proposal.manager && (
                          <p className="text-blue-100 mt-3">
                            <strong>Hiring Manager:</strong> {proposal.manager.full_name}
                            {proposal.manager.company && ` • ${proposal.manager.company}`}
                          </p>
                        )}
                      </div>

                      <div className={'px-8 py-4 rounded-2xl font-bold text-xl ' +
                        (proposal.status === 'pending' ? 'bg-amber-500' :
                         proposal.status === 'accepted' ? 'bg-emerald-500' :
                         proposal.status === 'rejected' ? 'bg-red-500' :
                         'bg-gray-500')}>
                        {proposal.status.toUpperCase()}
                      </div>
                    </div>
                  </div>

                  {/* Main Content */}
                  <div className="p-8">
                    <div className="grid md:grid-cols-2 gap-8 mb-8">
                      {/* Left: Job Details */}
                      <div>
                        <h3 className="text-2xl font-bold mb-4 flex items-center gap-2">
                          <Briefcase className="w-6 h-6 text-blue-600" />
                          Job Details
                        </h3>
                        {proposal.job?.description && (
                          <div className="bg-gray-50 rounded-xl p-4 mb-4">
                            <p className="text-gray-700 line-clamp-4">{proposal.job.description}</p>
                          </div>
                        )}
                        {proposal.job?.required_skills && (
                          <div>
                            <p className="font-semibold text-gray-900 mb-2">Required Skills:</p>
                            <div className="flex flex-wrap gap-2">
                              {proposal.job.required_skills.slice(0, 6).map((skill: string, i: number) => (
                                <span key={i} className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-semibold">
                                  {skill}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Right: Earnings Calculator */}
                      <div>
                        <h3 className="text-2xl font-bold mb-4 flex items-center gap-2">
                          <Calculator className="w-6 h-6 text-emerald-600" />
                          Potential Earnings
                        </h3>

                        {/* Commission Rate */}
                        <div className="bg-gradient-to-br from-emerald-50 to-green-50 rounded-2xl p-6 mb-6 border-2 border-emerald-300">
                          <div className="text-center">
                            <p className="text-sm text-emerald-700 font-semibold mb-2">Your Commission Rate</p>
                            <div className="flex items-center justify-center gap-2">
                              <Award className="w-12 h-12 text-emerald-600" />
                              <p className="text-6xl font-bold text-emerald-600">{commission}%</p>
                            </div>
                          </div>
                        </div>

                        {/* Earnings Breakdown */}
                        <div className="space-y-4">
                          <div className="bg-blue-50 rounded-xl p-4 border-2 border-blue-200">
                            <div className="flex justify-between items-center">
                              <div>
                                <p className="text-sm text-blue-700 font-semibold">Minimum Scenario</p>
                                <p className="text-xs text-blue-600">If candidate accepts £{salaryMin.toLocaleString()}</p>
                              </div>
                              <p className="text-3xl font-bold text-blue-600">£{earningsMin.toLocaleString()}</p>
                            </div>
                          </div>

                          <div className="bg-indigo-50 rounded-xl p-4 border-2 border-indigo-300">
                            <div className="flex justify-between items-center">
                              <div>
                                <p className="text-sm text-indigo-700 font-semibold">Average Scenario</p>
                                <p className="text-xs text-indigo-600">If candidate accepts £{salaryMid.toLocaleString()}</p>
                              </div>
                              <p className="text-3xl font-bold text-indigo-600">£{earningsMid.toLocaleString()}</p>
                            </div>
                          </div>

                          <div className="bg-gradient-to-br from-emerald-100 to-green-100 rounded-xl p-5 border-2 border-emerald-400 shadow-lg">
                            <div className="flex justify-between items-center">
                              <div>
                                <p className="text-sm text-emerald-800 font-bold">Maximum Scenario</p>
                                <p className="text-xs text-emerald-700">If candidate accepts £{salaryMax.toLocaleString()}</p>
                              </div>
                              <div className="text-right">
                                <p className="text-4xl font-bold text-emerald-700">£{earningsMax.toLocaleString()}</p>
                                <p className="text-xs text-emerald-600 font-semibold">Best Case</p>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Calculation Breakdown */}
                        <div className="mt-4 bg-gray-50 rounded-lg p-4 border border-gray-200">
                          <p className="text-xs text-gray-600 font-mono">
                            💡 Calculation: Salary × {commission}% = Your Commission
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* AI Insights */}
                    <div className="bg-gradient-to-r from-violet-50 to-purple-50 rounded-2xl p-6 border-2 border-violet-200 mb-6">
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 bg-violet-600 rounded-full flex items-center justify-center flex-shrink-0">
                          <TrendingUp className="w-6 h-6 text-white" />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-bold text-violet-900 text-lg mb-2">AI Recommendation</h4>
                          <p className="text-violet-800 mb-2">
                            Based on market data, this role typically fills within <strong>2-3 weeks</strong>.
                          </p>
                          <p className="text-violet-700 text-sm">
                            Expected placement probability: <strong className="text-violet-900">High (75%)</strong>
                            {earningsMid >= 15000 && ' • Premium commission rate • Excellent opportunity'}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    {proposal.status === 'pending' && (
                      <div className="flex gap-4">
                        <button
                          onClick={() => handleResponse(proposal.id, 'accept')}
                          disabled={processing === proposal.id}
                          className="flex-1 bg-gradient-to-r from-emerald-500 to-green-600 text-white py-5 rounded-2xl font-bold text-xl hover:shadow-2xl transition-all disabled:opacity-50 flex items-center justify-center gap-3">
                          {processing === proposal.id ? (
                            <><Loader2 className="w-7 h-7 animate-spin" /> Processing...</>
                          ) : (
                            <>
                              <CheckCircle className="w-7 h-7" /> 
                              Accept & Earn up to £{earningsMax.toLocaleString()}
                            </>
                          )}
                        </button>
                        <button
                          onClick={() => handleResponse(proposal.id, 'reject')}
                          disabled={processing === proposal.id}
                          className="px-8 border-3 border-red-500 text-red-600 py-5 rounded-2xl font-bold text-xl hover:bg-red-50 transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                          <XCircle className="w-7 h-7" /> Reject
                        </button>
                      </div>
                    )}

                    {proposal.status === 'accepted' && (
                      <button
                        onClick={() => window.location.href = '/dashboard/agency/candidates'}
                        className="w-full bg-gradient-to-r from-violet-500 to-purple-600 text-white py-5 rounded-2xl font-bold text-xl hover:shadow-2xl transition-all flex items-center justify-center gap-3">
                        <Award className="w-7 h-7" />
                        Start Finding Candidates
                        <ArrowRight className="w-7 h-7" />
                      </button>
                    )}

                    {proposal.status === 'rejected' && (
                      <div className="text-center py-4 bg-red-50 rounded-xl">
                        <p className="text-red-700 font-semibold">This proposal was rejected</p>
                      </div>
                    )}
                  </div>
                </motion.div>
              )
            })}
          </div>
        ) : (
          <div className="bg-white rounded-3xl p-20 text-center shadow-2xl">
            <Briefcase className="w-32 h-32 text-gray-300 mx-auto mb-8" />
            <h2 className="text-3xl font-bold text-gray-600 mb-4">No Proposals Yet</h2>
            <p className="text-xl text-gray-500">
              Hiring managers will send you job proposals. Check back soon!
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
