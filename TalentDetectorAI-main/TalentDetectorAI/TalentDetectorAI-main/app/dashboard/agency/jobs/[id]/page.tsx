'use client'
import { use, useState } from 'react'
import useSWR from 'swr'
import { createClient } from '@/lib/supabase/client'
import { matchCandidateToJob } from '@/lib/ai/matching'
import toast from 'react-hot-toast'
import { ArrowLeft, Sparkles, TrendingUp } from 'lucide-react'
import Link from 'next/link'
import AnimatedBg from '@/components/ui/AnimatedBg'

const fetcher = async (jobId: string) => {
  const supabase = createClient()
  
  const [jobRes, candidatesRes] = await Promise.all([
    supabase.from('jobs').select('*').eq('id', jobId).single(),
    supabase.from('candidates').select('*')
  ])
  
  return { job: jobRes.data, candidates: candidatesRes.data || [] }
}

export default function JobMatching({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { data } = useSWR('job-match-' + id, () => fetcher(id))
  const [matching, setMatching] = useState(false)
  const [matches, setMatches] = useState<any[]>([])

  async function runMatching() {
    if (!data?.job || !data?.candidates || data.candidates.length === 0) {
      toast.error('No candidates available to match')
      return
    }
    
    setMatching(true)
    try {
      const results = await Promise.all(
        data.candidates.map(async (candidate: any) => {
          const analysis = await matchCandidateToJob(
            candidate.cv_url || candidate.name + ' ' + candidate.email,
            data.job.description || '',
            data.job.ai_keywords || []
          )
          return { ...candidate, ...analysis }
        })
      )
      
      results.sort((a, b) => b.matchScore - a.matchScore)
      setMatches(results)
      toast.success('AI matching complete! ' + results.length + ' candidates analyzed')
    } catch (error) {
      toast.error('Matching failed')
    } finally {
      setMatching(false)
    }
  }

  if (!data) return <div className="p-8">Loading...</div>

  return (
    <div className="relative">
      <AnimatedBg />
      
      <Link href="/dashboard/agency/jobs">
        <button className="flex items-center gap-2 mb-6 hover:text-primary-600 transition">
          <ArrowLeft className="w-5 h-5" /> Back to Jobs
        </button>
      </Link>

      <div className="card mb-8">
        <h1 className="text-3xl font-bold mb-4">{data.job?.title}</h1>
        <p className="text-gray-600 mb-4">{data.job?.description}</p>
        <div className="flex gap-4 text-sm text-gray-500 mb-6">
          <span>📍 {data.job?.location || 'Not specified'}</span>
          <span>💰 £{data.job?.salary_min?.toLocaleString()} - £{data.job?.salary_max?.toLocaleString()}</span>
        </div>
        
        {data.job?.ai_keywords && data.job.ai_keywords.length > 0 && (
          <div className="mb-6">
            <p className="text-sm font-semibold mb-2">Key Skills:</p>
            <div className="flex flex-wrap gap-2">
              {data.job.ai_keywords.map((keyword: string, i: number) => (
                <span key={i} className="px-3 py-1 bg-blue-50 text-blue-700 text-sm rounded-full">
                  {keyword}
                </span>
              ))}
            </div>
          </div>
        )}
        
        <button onClick={runMatching} disabled={matching} className="btn-primary flex items-center gap-2">
          <Sparkles className="w-5 h-5" />
          {matching ? 'Analyzing ' + data.candidates.length + ' candidates...' : 'Run AI Candidate Matching'}
        </button>
      </div>

      {matches.length > 0 && (
        <div>
          <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
            <TrendingUp className="w-6 h-6 text-emerald-600" />
            AI Match Results ({matches.length} candidates analyzed)
          </h2>
          
          <div className="grid gap-6">
            {matches.map((candidate: any, index: number) => (
              <div key={candidate.id} className="card">
                <div className="flex gap-6">
                  <div className="flex-shrink-0">
                    <div className={'w-24 h-24 rounded-xl flex flex-col items-center justify-center text-white font-bold ' + 
                      (candidate.matchScore >= 80 ? 'bg-gradient-to-br from-emerald-500 to-emerald-600' :
                       candidate.matchScore >= 60 ? 'bg-gradient-to-br from-blue-500 to-blue-600' :
                       'bg-gradient-to-br from-gray-400 to-gray-500')}>
                      <span className="text-3xl">{candidate.matchScore}%</span>
                      <span className="text-xs opacity-90">Match</span>
                    </div>
                    <p className="text-center text-xs text-gray-500 mt-2">Rank #{index + 1}</p>
                  </div>
                  
                  <div className="flex-1">
                    <h3 className="text-2xl font-bold mb-1">{candidate.name}</h3>
                    <p className="text-gray-600 mb-4">{candidate.email}</p>
                    
                    <div className="grid md:grid-cols-3 gap-4 mb-4">
                      <div className="p-3 bg-blue-50 rounded-lg">
                        <p className="text-sm font-semibold text-blue-900 mb-1">Technical Fit</p>
                        <div className="h-2 bg-blue-200 rounded-full overflow-hidden">
                          <div className="h-full bg-blue-600" style={{width: candidate.heatmap.technical + '%'}} />
                        </div>
                        <p className="text-xs text-blue-700 mt-1">{candidate.heatmap.technical}%</p>
                      </div>
                      
                      <div className="p-3 bg-purple-50 rounded-lg">
                        <p className="text-sm font-semibold text-purple-900 mb-1">Experience</p>
                        <div className="h-2 bg-purple-200 rounded-full overflow-hidden">
                          <div className="h-full bg-purple-600" style={{width: candidate.heatmap.experience + '%'}} />
                        </div>
                        <p className="text-xs text-purple-700 mt-1">{candidate.heatmap.experience}%</p>
                      </div>
                      
                      <div className="p-3 bg-emerald-50 rounded-lg">
                        <p className="text-sm font-semibold text-emerald-900 mb-1">Cultural Fit</p>
                        <div className="h-2 bg-emerald-200 rounded-full overflow-hidden">
                          <div className="h-full bg-emerald-600" style={{width: candidate.heatmap.cultural + '%'}} />
                        </div>
                        <p className="text-xs text-emerald-700 mt-1">{candidate.heatmap.cultural}%</p>
                      </div>
                    </div>
                    
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <p className="font-semibold text-emerald-600 mb-2 flex items-center gap-1">
                          ✅ Strengths
                        </p>
                        <ul className="text-sm space-y-1">
                          {candidate.strengths?.map((s: string, i: number) => (
                            <li key={i} className="text-gray-700">• {s}</li>
                          ))}
                        </ul>
                      </div>
                      
                      {candidate.gaps && candidate.gaps.length > 0 && (
                        <div>
                          <p className="font-semibold text-yellow-600 mb-2 flex items-center gap-1">
                            ⚠️ Development Areas
                          </p>
                          <ul className="text-sm space-y-1">
                            {candidate.gaps.map((g: string, i: number) => (
                              <li key={i} className="text-gray-700">• {g}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                    
                    <div className="mt-4 p-4 bg-purple-50 rounded-lg border-2 border-purple-200">
                      <div className="flex items-center gap-2 mb-2">
                        <Sparkles className="w-5 h-5 text-purple-600" />
                        <p className="font-semibold text-purple-900">AI Insights:</p>
                      </div>
                      <ul className="text-sm space-y-1">
                        {candidate.insights?.map((insight: string, i: number) => (
                          <li key={i} className="text-purple-800">• {insight}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
