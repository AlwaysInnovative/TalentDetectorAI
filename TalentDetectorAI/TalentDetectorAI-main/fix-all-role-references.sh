#!/bin/bash
# Complete Fix - Update all references from current_role to role_title
# Run: bash fix-all-role-references.sh

set -e

echo "🔧 Fixing all current_role → role_title references..."

# ==================== UPDATE AI MATCHING ENGINE ====================

cat > lib/agency/ai-matching/matcher.ts << 'ENDFILE'
export async function calculateMatchScore(candidate: any, job: any) {
  await new Promise(resolve => setTimeout(resolve, 500))
  
  let score = 50 // Base score
  
  // Skills matching
  const candidateSkills = candidate.skills || []
  const jobSkills = job.ai_keywords || []
  const matchingSkills = candidateSkills.filter((s: string) => 
    jobSkills.some((js: string) => js.toLowerCase() === s.toLowerCase())
  )
  const skillMatchRate = jobSkills.length > 0 ? (matchingSkills.length / jobSkills.length) * 40 : 0
  score += skillMatchRate
  
  // Experience matching
  const requiredYears = 3
  if (candidate.experience_years >= requiredYears) {
    score += 10
  }
  
  return {
    score: Math.min(Math.round(score), 99),
    reasoning: [
      `Skills match: ${matchingSkills.length}/${jobSkills.length} required skills`,
      `Experience: ${candidate.experience_years} years`,
      skillMatchRate > 30 ? 'Strong technical alignment' : 'Moderate technical fit',
      candidate.profile_completeness > 80 ? 'Complete profile' : 'Profile needs enhancement'
    ],
    matchingSkills
  }
}

export async function generateBestCandidates(candidates: any[], jobs: any[], limit = 5) {
  const matches = []
  
  for (const job of jobs) {
    for (const candidate of candidates) {
      const match = await calculateMatchScore(candidate, job)
      matches.push({
        candidate,
        job,
        ...match
      })
    }
  }
  
  return matches
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
}

export async function enrichCandidateProfile(candidate: any) {
  await new Promise(resolve => setTimeout(resolve, 1000))
  
  return {
    suggestedSummary: `Experienced ${candidate.role_title || 'professional'} with ${candidate.experience_years || 0}+ years in the industry. Proficient in ${(candidate.skills || []).slice(0, 3).join(', ')}.`,
    suggestedSkills: ['Communication', 'Problem Solving', 'Team Collaboration'],
    careerLevel: candidate.experience_years > 7 ? 'Senior' : candidate.experience_years > 3 ? 'Mid-level' : 'Junior',
    recommendedRoles: [
      candidate.role_title || 'Software Engineer',
      'Team Lead',
      'Technical Consultant'
    ]
  }
}
ENDFILE

# ==================== UPDATE ANALYTICS PAGE ====================

cat > app/dashboard/agency/analytics/page.tsx << 'ENDFILE'
'use client'
import useSWR from 'swr'
import { createClient } from '@/lib/supabase/client'
import { TrendingUp, DollarSign, Users, Award, Target } from 'lucide-react'
import DynamicBackground from '@/components/ui/DynamicBackground'
import { motion } from 'framer-motion'
import { LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

const COLORS = ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444']

const fetcher = async () => {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  const [submissionsRes, commissionsRes] = await Promise.all([
    supabase.from('agency_submissions')
      .select('*, jobs(salary_max)')
      .eq('agency_id', user?.id || ''),
    supabase.from('agency_commissions')
      .select('*')
      .eq('agency_id', user?.id || '')
  ])
  
  const submissions = submissionsRes.data || []
  const commissions = commissionsRes.data || []
  
  const totalSubmissions = submissions.length
  const shortlisted = submissions.filter(s => s.status === 'shortlisted').length
  const interviewed = submissions.filter(s => s.status === 'interview').length
  const hired = submissions.filter(s => s.status === 'hired').length
  
  const conversionRates = {
    submissionToShortlist: totalSubmissions > 0 ? Math.round((shortlisted / totalSubmissions) * 100) : 0,
    shortlistToInterview: shortlisted > 0 ? Math.round((interviewed / shortlisted) * 100) : 0,
    interviewToHire: interviewed > 0 ? Math.round((hired / interviewed) * 100) : 0,
    submissionToHire: totalSubmissions > 0 ? Math.round((hired / totalSubmissions) * 100) : 0
  }
  
  const totalEarnings = commissions.reduce((sum, c) => sum + parseFloat(c.total_amount || 0), 0)
  const paidEarnings = commissions.filter(c => c.status === 'paid').reduce((sum, c) => sum + parseFloat(c.total_amount || 0), 0)
  const pendingEarnings = totalEarnings - paidEarnings
  
  const statusData = [
    { name: 'Submitted', value: submissions.filter(s => s.status === 'submitted').length },
    { name: 'Shortlisted', value: shortlisted },
    { name: 'Interview', value: interviewed },
    { name: 'Hired', value: hired },
    { name: 'Rejected', value: submissions.filter(s => s.status === 'rejected').length }
  ].filter(s => s.value > 0)
  
  const monthlyData = []
  for (let i = 5; i >= 0; i--) {
    const date = new Date()
    date.setMonth(date.getMonth() - i)
    const monthName = date.toLocaleString('default', { month: 'short' })
    
    const monthSubmissions = submissions.filter(s => {
      const subDate = new Date(s.submitted_at)
      return subDate.getMonth() === date.getMonth() && subDate.getFullYear() === date.getFullYear()
    }).length
    
    const monthHires = submissions.filter(s => {
      const subDate = new Date(s.submitted_at)
      return s.status === 'hired' && subDate.getMonth() === date.getMonth() && subDate.getFullYear() === date.getFullYear()
    }).length
    
    monthlyData.push({
      month: monthName,
      submissions: monthSubmissions,
      hires: monthHires
    })
  }
  
  return {
    totalSubmissions,
    shortlisted,
    interviewed,
    hired,
    conversionRates,
    totalEarnings,
    paidEarnings,
    pendingEarnings,
    statusData,
    monthlyData
  }
}

export default function Analytics() {
  const { data } = useSWR('agency-analytics', fetcher, { refreshInterval: 5000 })

  return (
    <div className="relative">
      <DynamicBackground page="analytics" />
      
      <div className="mb-8">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-emerald-600 to-blue-600 bg-clip-text text-transparent mb-2">
          Performance Analytics
        </h1>
        <p className="text-gray-600">Track your recruitment success metrics</p>
      </div>

      <div className="grid md:grid-cols-4 gap-6 mb-8">
        {[
          { label: 'Total Submissions', value: data?.totalSubmissions || 0, icon: Users, color: 'blue' },
          { label: 'Total Earnings', value: '£' + Math.round(data?.totalEarnings || 0).toLocaleString(), icon: DollarSign, color: 'emerald' },
          { label: 'Placements', value: data?.hired || 0, icon: Award, color: 'purple' },
          { label: 'Conversion Rate', value: (data?.conversionRates.submissionToHire || 0) + '%', icon: Target, color: 'pink' }
        ].map((metric, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className={'card bg-gradient-to-br from-' + metric.color + '-50 to-white border-2 border-' + metric.color + '-200'}>
            <div className={'w-12 h-12 bg-gradient-to-br from-' + metric.color + '-500 to-' + metric.color + '-600 rounded-xl flex items-center justify-center text-white mb-3 shadow-lg'}>
              <metric.icon className="w-6 h-6" />
            </div>
            <p className="text-sm text-gray-600 mb-1">{metric.label}</p>
            <p className="text-3xl font-bold">{metric.value}</p>
          </motion.div>
        ))}
      </div>

      <div className="card mb-8">
        <h2 className="text-2xl font-bold mb-6">Conversion Funnel</h2>
        <div className="grid md:grid-cols-4 gap-4">
          {[
            { label: 'Submission → Shortlist', rate: data?.conversionRates.submissionToShortlist || 0, color: 'blue' },
            { label: 'Shortlist → Interview', rate: data?.conversionRates.shortlistToInterview || 0, color: 'purple' },
            { label: 'Interview → Hire', rate: data?.conversionRates.interviewToHire || 0, color: 'emerald' },
            { label: 'Submission → Hire', rate: data?.conversionRates.submissionToHire || 0, color: 'pink' }
          ].map((stage, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.1 }}
              className={'p-4 rounded-xl bg-' + stage.color + '-50 border-2 border-' + stage.color + '-200'}>
              <p className="text-sm font-semibold text-gray-700 mb-2">{stage.label}</p>
              <p className={'text-4xl font-bold text-' + stage.color + '-600'}>{stage.rate}%</p>
              <div className={'h-2 bg-' + stage.color + '-200 rounded-full mt-3 overflow-hidden'}>
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: stage.rate + '%' }}
                  className={'h-full bg-' + stage.color + '-600'} />
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6 mb-8">
        <div className="card">
          <h3 className="text-xl font-bold mb-4">6-Month Trend</h3>
          {data && (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={data.monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="month" stroke="#6b7280" />
                <YAxis stroke="#6b7280" />
                <Tooltip contentStyle={{ backgroundColor: '#fff', border: '2px solid #e5e7eb', borderRadius: '8px' }} />
                <Legend />
                <Line type="monotone" dataKey="submissions" stroke="#3b82f6" strokeWidth={3} name="Submissions" />
                <Line type="monotone" dataKey="hires" stroke="#10b981" strokeWidth={3} name="Hires" />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="card">
          <h3 className="text-xl font-bold mb-4">Submission Status</h3>
          {data && data.statusData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={data.statusData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={(entry) => entry.name + ': ' + entry.value}
                  outerRadius={100}
                  dataKey="value">
                  {data.statusData.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-72 flex items-center justify-center text-gray-500">No data</div>
          )}
        </div>
      </div>

      <div className="card">
        <h2 className="text-2xl font-bold mb-6">Earnings Dashboard</h2>
        <div className="grid md:grid-cols-3 gap-6">
          <div className="p-6 bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-xl border-2 border-emerald-300">
            <div className="flex items-center gap-3 mb-3">
              <DollarSign className="w-8 h-8 text-emerald-600" />
              <p className="font-bold text-emerald-900">Total Earnings</p>
            </div>
            <p className="text-4xl font-bold text-emerald-600">
              £{Math.round(data?.totalEarnings || 0).toLocaleString()}
            </p>
            <p className="text-sm text-emerald-700 mt-2">All-time commission</p>
          </div>

          <div className="p-6 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl border-2 border-blue-300">
            <div className="flex items-center gap-3 mb-3">
              <DollarSign className="w-8 h-8 text-blue-600" />
              <p className="font-bold text-blue-900">Paid Out</p>
            </div>
            <p className="text-4xl font-bold text-blue-600">
              £{Math.round(data?.paidEarnings || 0).toLocaleString()}
            </p>
            <p className="text-sm text-blue-700 mt-2">Received commission</p>
          </div>

          <div className="p-6 bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-xl border-2 border-yellow-300">
            <div className="flex items-center gap-3 mb-3">
              <DollarSign className="w-8 h-8 text-yellow-600" />
              <p className="font-bold text-yellow-900">Pending</p>
            </div>
            <p className="text-4xl font-bold text-yellow-600">
              £{Math.round(data?.pendingEarnings || 0).toLocaleString()}
            </p>
            <p className="text-sm text-yellow-700 mt-2">Awaiting payment</p>
          </div>
        </div>
      </div>
    </div>
  )
}
ENDFILE

echo ""
echo "✅ All references updated from current_role → role_title"
echo ""
echo "🚀 Now restart your dev server:"
echo "npm run dev"
