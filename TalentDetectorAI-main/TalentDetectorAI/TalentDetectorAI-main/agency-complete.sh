#!/bin/bash
# Agency Dashboard - Complete Production
# Run: bash agency-complete.sh

set -e

echo "🚀 Building Complete Agency Dashboard..."

mkdir -p app/dashboard/agency/{jobs,candidates,managers,placements,analytics}

cat > app/dashboard/agency/page.tsx << 'ENDFILE'
'use client'
import { motion } from 'framer-motion'
import { Briefcase, Users, TrendingUp, DollarSign, Target } from 'lucide-react'
import useSWR from 'swr'
import { createClient } from '@/lib/supabase/client'
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import Link from 'next/link'

const fetcher = async () => {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  // Fetch ALL open jobs from ALL hiring managers
  const { data: jobs } = await supabase
    .from('jobs')
    .select('*, applications(count)')
    .eq('status', 'open')
    .order('created_at', { ascending: false })
  
  // Fetch all candidates
  const { data: candidates } = await supabase
    .from('candidates')
    .select('*')
    .order('created_at', { ascending: false })
  
  // Fetch placements made by this agency
  const { data: placements } = await supabase
    .from('applications')
    .select('*, jobs(title, salary_max)')
    .eq('agency_id', user?.id || '')
    .eq('status', 'hired')
  
  // Calculate earnings (15% commission)
  const totalEarnings = (placements || []).reduce((sum, p) => {
    const salary = p.jobs?.salary_max || 0
    return sum + (salary * 0.15)
  }, 0)
  
  // Get unique hiring managers
  const uniqueManagers = new Set((jobs || []).map(j => j.manager_id))
  
  // Monthly placement trend
  const monthlyData = []
  for (let i = 5; i >= 0; i--) {
    const date = new Date()
    date.setMonth(date.getMonth() - i)
    const monthName = date.toLocaleString('default', { month: 'short' })
    
    const monthPlacements = (placements || []).filter(p => {
      const pDate = new Date(p.created_at)
      return pDate.getMonth() === date.getMonth() && pDate.getFullYear() === date.getFullYear()
    }).length
    
    monthlyData.push({ month: monthName, placements: monthPlacements })
  }
  
  return {
    openJobs: jobs?.length || 0,
    totalCandidates: candidates?.length || 0,
    totalPlacements: placements?.length || 0,
    totalEarnings,
    hiringManagers: uniqueManagers.size,
    recentJobs: (jobs || []).slice(0, 5),
    monthlyData
  }
}

export default function AgencyDashboard() {
  const { data, isLoading } = useSWR('agency-dashboard', fetcher, { refreshInterval: 3000 })

  if (isLoading) {
    return <div className="flex items-center justify-center h-96"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600" /></div>
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-primary-600 mb-2">Agency Dashboard</h1>
        <p className="text-gray-600">Real-time job opportunities and candidate matching</p>
      </div>

      <div className="grid md:grid-cols-4 gap-6 mb-8">
        {[
          { label: 'Open Jobs', value: data?.openJobs || 0, icon: Briefcase, color: 'from-blue-500 to-blue-600', link: '/dashboard/agency/jobs' },
          { label: 'Total Candidates', value: data?.totalCandidates || 0, icon: Users, color: 'from-emerald-500 to-emerald-600', link: '/dashboard/agency/candidates' },
          { label: 'Placements', value: data?.totalPlacements || 0, icon: Target, color: 'from-purple-500 to-purple-600', link: '/dashboard/agency/placements' },
          { label: 'Total Earnings', value: '£' + Math.round(data?.totalEarnings || 0).toLocaleString(), icon: DollarSign, color: 'from-emerald-500 to-emerald-600', link: '/dashboard/agency/analytics' }
        ].map((stat, i) => (
          <Link key={i} href={stat.link}>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              whileHover={{ y: -5 }}
              className="card cursor-pointer">
              <div className={'w-12 h-12 bg-gradient-to-br ' + stat.color + ' rounded-xl flex items-center justify-center text-white mb-4'}>
                <stat.icon className="w-6 h-6" />
              </div>
              <p className="text-sm text-gray-600 mb-1">{stat.label}</p>
              <p className="text-3xl font-bold">{stat.value}</p>
            </motion.div>
          </Link>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-6 mb-8">
        <div className="card">
          <h3 className="text-lg font-bold mb-4">Placement Trends</h3>
          {data && data.monthlyData && data.monthlyData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={data.monthlyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Area type="monotone" dataKey="placements" stroke="#10b981" fill="#10b981" fillOpacity={0.3} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-gray-500 text-center py-20">No placement data yet</p>
          )}
        </div>

        <div className="card">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-bold">Latest Job Opportunities</h3>
            <Link href="/dashboard/agency/jobs" className="text-primary-600 text-sm font-semibold">View All</Link>
          </div>
          {data && data.recentJobs && data.recentJobs.length > 0 ? (
            <div className="space-y-3">
              {data.recentJobs.map((job: any) => (
                <Link key={job.id} href={'/dashboard/agency/jobs/' + job.id}>
                  <div className="p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition cursor-pointer">
                    <p className="font-semibold">{job.title}</p>
                    <p className="text-sm text-gray-500">
                      {job.location} • £{job.salary_min?.toLocaleString()} - £{job.salary_max?.toLocaleString()}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-10">No jobs available</p>
          )}
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <Link href="/dashboard/agency/managers">
          <div className="card hover:shadow-xl transition cursor-pointer">
            <h3 className="font-bold mb-2">Active Hiring Managers</h3>
            <p className="text-3xl font-bold text-primary-600">{data?.hiringManagers || 0}</p>
          </div>
        </Link>
        <Link href="/dashboard/agency/candidates">
          <div className="card hover:shadow-xl transition cursor-pointer">
            <h3 className="font-bold mb-2">Candidate Database</h3>
            <p className="text-3xl font-bold text-emerald-600">{data?.totalCandidates || 0}</p>
          </div>
        </Link>
        <Link href="/dashboard/agency/analytics">
          <div className="card hover:shadow-xl transition cursor-pointer">
            <h3 className="font-bold mb-2">View Analytics</h3>
            <p className="text-sm text-gray-600">Detailed insights & reports</p>
          </div>
        </Link>
      </div>
    </div>
  )
}
ENDFILE

cat > app/dashboard/agency/jobs/page.tsx << 'ENDFILE'
'use client'
import useSWR from 'swr'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { Sparkles, MapPin, DollarSign } from 'lucide-react'
import { useState } from 'react'

const fetcher = async () => {
  const supabase = createClient()
  const { data } = await supabase
    .from('jobs')
    .select('*')
    .eq('status', 'open')
    .order('created_at', { ascending: false })
  return data || []
}

export default function AgencyJobs() {
  const { data: jobs, isLoading } = useSWR('agency-all-jobs', fetcher, { refreshInterval: 3000 })
  const [searchTerm, setSearchTerm] = useState('')

  const filteredJobs = jobs?.filter(job => 
    job.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    job.description?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (isLoading) return <div className="flex items-center justify-center h-96"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600" /></div>

  return (
    <div>
      <h1 className="text-4xl font-bold text-primary-600 mb-8">All Job Opportunities</h1>

      <div className="mb-6">
        <input 
          type="text" 
          value={searchTerm} 
          onChange={e => setSearchTerm(e.target.value)}
          placeholder="Search jobs by title or description..."
          className="input w-full"
        />
      </div>

      {filteredJobs && filteredJobs.length > 0 ? (
        <div className="grid gap-6">
          {filteredJobs.map((job: any) => (
            <div key={job.id} className="card">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="text-2xl font-bold">{job.title}</h3>
                    {job.ai_keywords && (
                      <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded-full flex items-center gap-1">
                        <Sparkles className="w-3 h-3" /> AI Match Available
                      </span>
                    )}
                  </div>
                  <p className="text-gray-600 mb-4">{job.description?.substring(0, 200)}...</p>
                  <div className="flex gap-4 text-sm text-gray-500">
                    <span className="flex items-center gap-1">
                      <MapPin className="w-4 h-4" /> {job.location || 'Remote'}
                    </span>
                    <span className="flex items-center gap-1">
                      <DollarSign className="w-4 h-4" /> 
                      £{job.salary_min?.toLocaleString()} - £{job.salary_max?.toLocaleString()}
                    </span>
                    <span>📅 {new Date(job.created_at).toLocaleDateString()}</span>
                  </div>
                  {job.ai_keywords && (
                    <div className="mt-3 flex gap-2">
                      {job.ai_keywords.slice(0, 5).map((keyword: string, i: number) => (
                        <span key={i} className="px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded">
                          {keyword}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <Link href={'/dashboard/agency/jobs/' + job.id}>
                  <button className="btn-primary">Match Candidates</button>
                </Link>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="card text-center py-20">
          <p className="text-gray-500">No jobs available</p>
        </div>
      )}
    </div>
  )
}
ENDFILE

cat > 'app/dashboard/agency/jobs/[id]/page.tsx' << 'ENDFILE'
'use client'
import { use } from 'react'
import useSWR from 'swr'
import { createClient } from '@/lib/supabase/client'
import { analyzeCandidate } from '@/lib/ai/openai-client'
import { useState } from 'react'
import toast from 'react-hot-toast'
import { ArrowLeft, Sparkles } from 'lucide-react'
import Link from 'next/link'

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
  const { data } = useSWR('agency-job-' + id, () => fetcher(id), { refreshInterval: 3000 })
  const [matching, setMatching] = useState(false)
  const [matches, setMatches] = useState<any[]>([])

  async function runAIMatching() {
    if (!data?.job || !data?.candidates) return
    
    setMatching(true)
    try {
      const results = await Promise.all(
        data.candidates.map(async (candidate: any) => {
          const analysis = await analyzeCandidate(
            data.job.description || '',
            candidate.cv_url || 'No CV available'
          )
          return { ...candidate, ...analysis }
        })
      )
      
      results.sort((a, b) => b.matchScore - a.matchScore)
      setMatches(results)
      toast.success('AI matching complete!')
    } catch (error) {
      toast.error('Matching failed')
    } finally {
      setMatching(false)
    }
  }

  if (!data) return <div className="flex items-center justify-center h-96"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600" /></div>

  return (
    <div>
      <Link href="/dashboard/agency/jobs">
        <button className="flex items-center gap-2 mb-6 hover:text-primary-600">
          <ArrowLeft className="w-5 h-5" /> Back to Jobs
        </button>
      </Link>

      <div className="card mb-8">
        <h1 className="text-3xl font-bold mb-4">{data.job?.title}</h1>
        <p className="text-gray-600 mb-4">{data.job?.description}</p>
        <div className="flex gap-4 text-sm text-gray-500 mb-6">
          <span>📍 {data.job?.location}</span>
          <span>💰 £{data.job?.salary_min?.toLocaleString()} - £{data.job?.salary_max?.toLocaleString()}</span>
        </div>
        
        <button onClick={runAIMatching} disabled={matching} className="btn-primary flex items-center gap-2">
          <Sparkles className="w-5 h-5" />
          {matching ? 'Analyzing...' : 'Run AI Candidate Matching'}
        </button>
      </div>

      {matches.length > 0 && (
        <div>
          <h2 className="text-2xl font-bold mb-6">AI Match Results ({matches.length} candidates)</h2>
          <div className="grid gap-6">
            {matches.map((candidate: any) => (
              <div key={candidate.id} className="card">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white text-2xl font-bold">
                        {candidate.matchScore}%
                      </div>
                      <div>
                        <h3 className="text-xl font-bold">{candidate.name}</h3>
                        <p className="text-gray-500">{candidate.email}</p>
                      </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-4 mb-4">
                      <div>
                        <p className="font-semibold text-emerald-600 mb-2">✅ Strengths:</p>
                        <ul className="text-sm space-y-1">
                          {candidate.strengths?.map((s: string, i: number) => (
                            <li key={i} className="text-gray-700">• {s}</li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <p className="font-semibold text-yellow-600 mb-2">⚠️ Gaps:</p>
                        <ul className="text-sm space-y-1">
                          {candidate.gaps?.map((g: string, i: number) => (
                            <li key={i} className="text-gray-700">• {g}</li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    <div className="p-4 bg-blue-50 rounded-lg">
                      <p className="font-semibold text-blue-900 mb-2">🤖 AI Insights:</p>
                      <ul className="text-sm space-y-1">
                        {candidate.insights?.map((insight: string, i: number) => (
                          <li key={i} className="text-blue-800">• {insight}</li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  <div className="ml-6">
                    <button className="btn-primary">Shortlist</button>
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
ENDFILE

cat > app/dashboard/agency/candidates/page.tsx << 'ENDFILE'
'use client'
import useSWR from 'swr'
import { createClient } from '@/lib/supabase/client'
import { User, Mail, Phone } from 'lucide-react'

const fetcher = async () => {
  const supabase = createClient()
  const { data } = await supabase
    .from('candidates')
    .select('*')
    .order('created_at', { ascending: false })
  return data || []
}

export default function AgencyCandidates() {
  const { data: candidates, isLoading } = useSWR('agency-candidates', fetcher, { refreshInterval: 3000 })

  if (isLoading) return <div className="flex items-center justify-center h-96"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600" /></div>

  return (
    <div>
      <h1 className="text-4xl font-bold text-primary-600 mb-8">Candidate Database</h1>

      {candidates && candidates.length > 0 ? (
        <div className="grid gap-4">
          {candidates.map((candidate: any) => (
            <div key={candidate.id} className="card">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-full flex items-center justify-center text-white">
                  <User className="w-8 h-8" />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold mb-1">{candidate.name}</h3>
                  <div className="flex gap-4 text-sm text-gray-600">
                    <span className="flex items-center gap-1">
                      <Mail className="w-4 h-4" /> {candidate.email}
                    </span>
                    {candidate.phone && (
                      <span className="flex items-center gap-1">
                        <Phone className="w-4 h-4" /> {candidate.phone}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Registered: {new Date(candidate.created_at).toLocaleDateString()}
                  </p>
                </div>
                {candidate.cv_url && (
                  <a href={candidate.cv_url} target="_blank" className="btn-primary">View CV</a>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="card text-center py-20">
          <p className="text-gray-500">No candidates registered yet</p>
        </div>
      )}
    </div>
  )
}
ENDFILE

cat > app/dashboard/agency/managers/page.tsx << 'ENDFILE'
'use client'
import useSWR from 'swr'
import { createClient } from '@/lib/supabase/client'
import { Briefcase, User } from 'lucide-react'

const fetcher = async () => {
  const supabase = createClient()
  
  // Get all jobs to find unique managers
  const { data: jobs } = await supabase
    .from('jobs')
    .select('manager_id')
  
  const uniqueManagerIds = [...new Set((jobs || []).map(j => j.manager_id))]
  
  // Get manager details from auth users (mock data for now)
  const managers = uniqueManagerIds.map(id => ({
    id,
    name: 'Hiring Manager',
    company: 'Company Name',
    jobsPosted: (jobs || []).filter(j => j.manager_id === id).length
  }))
  
  return managers
}

export default function HiringManagers() {
  const { data: managers, isLoading } = useSWR('agency-managers', fetcher, { refreshInterval: 3000 })

  if (isLoading) return <div className="flex items-center justify-center h-96"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600" /></div>

  return (
    <div>
      <h1 className="text-4xl font-bold text-primary-600 mb-8">Hiring Managers</h1>

      {managers && managers.length > 0 ? (
        <div className="grid md:grid-cols-2 gap-6">
          {managers.map((manager: any) => (
            <div key={manager.id} className="card">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white">
                  <User className="w-8 h-8" />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold mb-1">{manager.name}</h3>
                  <p className="text-gray-600">{manager.company}</p>
                  <div className="flex items-center gap-2 mt-2 text-sm text-gray-500">
                    <Briefcase className="w-4 h-4" />
                    <span>{manager.jobsPosted} active jobs</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="card text-center py-20">
          <p className="text-gray-500">No hiring managers found</p>
        </div>
      )}
    </div>
  )
}
ENDFILE

cat > app/dashboard/agency/analytics/page.tsx << 'ENDFILE'
'use client'
import useSWR from 'swr'
import { createClient } from '@/lib/supabase/client'
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { Download } from 'lucide-react'
import { exportToPDF } from '@/lib/pdf/export'

const fetcher = async () => {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  const { data: placements } = await supabase
    .from('applications')
    .select('*, jobs(salary_max)')
    .eq('agency_id', user?.id || '')
  
  const monthlyData = []
  const earningsData = []
  
  for (let i = 11; i >= 0; i--) {
    const date = new Date()
    date.setMonth(date.getMonth() - i)
    const monthName = date.toLocaleString('default', { month: 'short' })
    
    const monthPlacements = (placements || []).filter(p => {
      const pDate = new Date(p.created_at)
      return pDate.getMonth() === date.getMonth() && pDate.getFullYear() === date.getFullYear()
    })
    
    const monthEarnings = monthPlacements.reduce((sum, p) => sum + ((p.jobs?.salary_max || 0) * 0.15), 0)
    
    monthlyData.push({ month: monthName, placements: monthPlacements.length })
    earningsData.push({ month: monthName, earnings: Math.round(monthEarnings) })
  }
  
  return { monthlyData, earningsData }
}

export default function AgencyAnalytics() {
  const { data } = useSWR('agency-analytics', fetcher, { refreshInterval: 5000 })

  function handleExport() {
    if (data && data.monthlyData) {
      exportToPDF(data.monthlyData, 'Agency Analytics Report')
    }
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-4xl font-bold text-primary-600">Agency Analytics</h1>
        <button onClick={handleExport} className="btn-primary flex items-center gap-2">
          <Download className="w-5 h-5" /> Export PDF
        </button>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="card">
          <h3 className="font-bold mb-4">Placements Over Time</h3>
          {data && data.monthlyData ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={data.monthlyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="placements" stroke="#10b981" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-72 flex items-center justify-center text-gray-500">Loading...</div>
          )}
        </div>

        <div className="card">
          <h3 className="font-bold mb-4">Monthly Earnings (£)</h3>
          {data && data.earningsData ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data.earningsData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="earnings" fill="#0ea5e9" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-72 flex items-center justify-center text-gray-500">Loading...</div>
          )}
        </div>
      </div>
    </div>
  )
}
ENDFILE

echo "✅ Complete Agency Dashboard Ready!"
echo ""
echo "Features:"
echo "- View ALL jobs from hiring managers (real-time)"
echo "- AI-powered candidate matching with scorecards"
echo "- Complete candidate database with contact details"
echo "- List of all hiring managers"
echo "- Real-time analytics with charts"
echo "- PDF export functionality"
echo ""
echo "Run: npm run dev"
