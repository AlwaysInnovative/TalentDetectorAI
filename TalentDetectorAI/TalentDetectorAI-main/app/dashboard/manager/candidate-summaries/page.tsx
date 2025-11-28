'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import {
  Loader2,
  AlertCircle,
  ArrowRight,
  CheckCircle,
  Clock,
  XCircle,
  Award
} from 'lucide-react'

export default function CandidateSummariesPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [summaries, setSummaries] = useState<any[]>([])
  const [filterStatus, setFilterStatus] = useState('all')

  useEffect(() => {
    loadSummaries()
  }, [])

  async function loadSummaries() {
    try {
      setLoading(true)
      setError(null)
      const supabase = createClient()

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setError('Not logged in')
        return
      }

      const { data, error: queryError } = await supabase
        .from('candidate_summary_cards')
        .select('*')
        .eq('hiring_manager_id', user.id)
        .order('sent_at', { ascending: false })

      if (queryError) throw queryError

      setSummaries(data || [])
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const filteredSummaries = summaries.filter(s =>
    filterStatus === 'all' ? true : s.status === filterStatus
  )

  const statusCounts = {
    sent: summaries.filter(s => s.status === 'sent').length,
    approved: summaries.filter(s => s.status === 'approved').length,
    rejected: summaries.filter(s => s.status === 'rejected').length
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50">
        <Loader2 className="w-16 h-16 text-blue-600 animate-spin" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8 bg-gradient-to-br from-slate-50 to-blue-50">
        <div className="bg-white rounded-2xl p-10 text-center shadow-lg max-w-lg">
          <AlertCircle className="mx-auto mb-4 w-14 h-14 text-red-500" />
          <h1 className="font-bold text-2xl text-red-700 mb-4">Error</h1>
          <p className="mb-6 text-gray-700">{error}</p>
          <button
            onClick={loadSummaries}
            className="px-5 py-2 bg-blue-600 text-white rounded font-bold hover:bg-blue-700"
          >
            Try Again
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Candidate Summaries</h1>
          <p className="text-gray-600">Review AI-powered candidate assessments from recruitment agencies</p>
        </div>

        {/* Status Cards */}
        <div className="grid md:grid-cols-3 gap-4 mb-8">
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Pending Review</p>
                <p className="text-3xl font-bold text-amber-600">{statusCounts.sent}</p>
              </div>
              <Clock className="w-12 h-12 text-amber-400" />
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Approved</p>
                <p className="text-3xl font-bold text-green-600">{statusCounts.approved}</p>
              </div>
              <CheckCircle className="w-12 h-12 text-green-400" />
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Rejected</p>
                <p className="text-3xl font-bold text-red-600">{statusCounts.rejected}</p>
              </div>
              <XCircle className="w-12 h-12 text-red-400" />
            </div>
          </div>
        </div>

        {/* Filter Buttons */}
        <div className="flex gap-2 mb-6">
          {['all', 'sent', 'approved', 'rejected'].map(status => (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              className={`px-4 py-2 rounded-lg font-semibold text-sm transition ${
                filterStatus === status
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
              }`}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </button>
          ))}
        </div>

        {/* Summaries List */}
        {filteredSummaries.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center shadow-sm border border-gray-200">
            <p className="text-gray-600 text-lg">No candidate summaries found</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredSummaries.map(summary => (
              <Link key={summary.id} href={`/dashboard/manager/candidate-summaries/${summary.id}`}>
                <button className="w-full bg-white rounded-2xl p-6 shadow-sm border border-gray-200 hover:shadow-md hover:border-blue-300 transition text-left">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-bold text-gray-900">
                          {summary.summary?.candidate_name || 'Candidate'}
                        </h3>
                        <span className={`px-2 py-1 rounded text-xs font-bold ${
                          summary.status === 'sent' ? 'bg-amber-100 text-amber-700' :
                          summary.status === 'approved' ? 'bg-green-100 text-green-700' :
                          'bg-red-100 text-red-700'
                        }`}>
                          {summary.status.toUpperCase()}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mb-2">{summary.summary?.job_title || 'Position'}</p>
                      <div className="flex items-center gap-4 text-sm">
                        <span className="flex items-center gap-1">
                          <Award className="w-4 h-4 text-emerald-600" />
                          <span className="font-bold text-emerald-600">{summary.summary?.aiMatchScore}% Match</span>
                        </span>
                        <span className="text-gray-500">
                          Sent: {new Date(summary.sent_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    <ArrowRight className="w-5 h-5 text-gray-400 mt-1" />
                  </div>
                </button>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
