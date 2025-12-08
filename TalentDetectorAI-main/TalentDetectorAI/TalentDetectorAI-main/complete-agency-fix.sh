#!/bin/bash
# Complete Fix - All Agency Routes
# Run: bash complete-agency-fix.sh

set -e

echo "🚀 Complete Agency Fix..."

# Ensure all directories exist
mkdir -p app/dashboard/agency/{jobs/'[id]',candidates,managers,placements,analytics}
mkdir -p components/ui
mkdir -p lib/ai

# Fix the layout first
cat > app/dashboard/agency/layout.tsx << 'ENDFILE'
import DashboardLayout from '@/components/dashboard/DashboardLayout'

export default function AgencyLayout({ children }: { children: React.ReactNode }) {
  return (
    <DashboardLayout role="agency" navItems={[
      { label: 'Dashboard', href: '/dashboard/agency', iconName: 'BarChart3' },
      { label: 'Jobs', href: '/dashboard/agency/jobs', iconName: 'Briefcase' },
      { label: 'Candidates', href: '/dashboard/agency/candidates', iconName: 'Users' },
      { label: 'Managers', href: '/dashboard/agency/managers', iconName: 'Users' },
      { label: 'Placements', href: '/dashboard/agency/placements', iconName: 'Target' },
      { label: 'Analytics', href: '/dashboard/agency/analytics', iconName: 'BarChart3' },
    ]}>
      {children}
    </DashboardLayout>
  )
}
ENDFILE

# Main dashboard
cat > app/dashboard/agency/page.tsx << 'ENDFILE'
'use client'
import { Briefcase, Users, Target, DollarSign } from 'lucide-react'
import useSWR from 'swr'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

const fetcher = async () => {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  const [jobs, candidates, placements] = await Promise.all([
    supabase.from('jobs').select('*').eq('status', 'open'),
    supabase.from('candidates').select('*'),
    supabase.from('applications').select('*, jobs(salary_max)').eq('agency_id', user?.id || '')
  ])
  
  const earnings = (placements.data || []).reduce((sum, p) => sum + ((p.jobs?.salary_max || 0) * 0.15), 0)
  
  return {
    jobsCount: jobs.data?.length || 0,
    candidatesCount: candidates.data?.length || 0,
    placementsCount: placements.data?.length || 0,
    earnings
  }
}

export default function AgencyDashboard() {
  const { data, isLoading } = useSWR('agency-dash', fetcher, { refreshInterval: 3000 })

  if (isLoading) return <div className="p-8">Loading...</div>

  return (
    <div>
      <h1 className="text-3xl font-bold mb-8">Agency Dashboard</h1>
      <div className="grid md:grid-cols-4 gap-6">
        {[
          { label: 'Open Jobs', value: data?.jobsCount || 0, icon: Briefcase, link: '/dashboard/agency/jobs' },
          { label: 'Candidates', value: data?.candidatesCount || 0, icon: Users, link: '/dashboard/agency/candidates' },
          { label: 'Placements', value: data?.placementsCount || 0, icon: Target, link: '/dashboard/agency/placements' },
          { label: 'Earnings', value: '£' + Math.round(data?.earnings || 0).toLocaleString(), icon: DollarSign, link: '/dashboard/agency/analytics' }
        ].map((stat, i) => (
          <Link key={i} href={stat.link}>
            <div className="card cursor-pointer hover:shadow-xl transition">
              <stat.icon className="w-8 h-8 text-primary-600 mb-2" />
              <p className="text-sm text-gray-600">{stat.label}</p>
              <p className="text-2xl font-bold">{stat.value}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
ENDFILE

# Jobs page
cat > app/dashboard/agency/jobs/page.tsx << 'ENDFILE'
'use client'
import useSWR from 'swr'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

const fetcher = async () => {
  const supabase = createClient()
  const { data } = await supabase.from('jobs').select('*').eq('status', 'open')
  return data || []
}

export default function Jobs() {
  const { data: jobs } = useSWR('agency-jobs', fetcher, { refreshInterval: 3000 })

  return (
    <div>
      <h1 className="text-3xl font-bold mb-8">All Jobs</h1>
      {jobs && jobs.length > 0 ? (
        <div className="grid gap-4">
          {jobs.map((job: any) => (
            <div key={job.id} className="card">
              <h3 className="text-xl font-bold">{job.title}</h3>
              <p className="text-gray-600">{job.description?.substring(0, 150)}...</p>
              <p className="text-sm text-gray-500 mt-2">
                {job.location} • £{job.salary_min?.toLocaleString()} - £{job.salary_max?.toLocaleString()}
              </p>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-gray-500">No jobs available</p>
      )}
    </div>
  )
}
ENDFILE

# Candidates page
cat > app/dashboard/agency/candidates/page.tsx << 'ENDFILE'
'use client'
import useSWR from 'swr'
import { createClient } from '@/lib/supabase/client'

const fetcher = async () => {
  const supabase = createClient()
  const { data } = await supabase.from('candidates').select('*')
  return data || []
}

export default function Candidates() {
  const { data: candidates } = useSWR('agency-candidates', fetcher, { refreshInterval: 3000 })

  return (
    <div>
      <h1 className="text-3xl font-bold mb-8">All Candidates</h1>
      {candidates && candidates.length > 0 ? (
        <div className="grid gap-4">
          {candidates.map((c: any) => (
            <div key={c.id} className="card">
              <h3 className="text-xl font-bold">{c.name}</h3>
              <p className="text-gray-600">{c.email}</p>
              <p className="text-sm text-gray-500">Registered: {new Date(c.created_at).toLocaleDateString()}</p>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-gray-500">No candidates</p>
      )}
    </div>
  )
}
ENDFILE

# Managers page
cat > app/dashboard/agency/managers/page.tsx << 'ENDFILE'
'use client'
import useSWR from 'swr'
import { createClient } from '@/lib/supabase/client'

const fetcher = async () => {
  const supabase = createClient()
  const { data: jobs } = await supabase.from('jobs').select('manager_id')
  const uniqueIds = [...new Set((jobs || []).map(j => j.manager_id))]
  return uniqueIds.map(id => ({ id, jobCount: (jobs || []).filter(j => j.manager_id === id).length }))
}

export default function Managers() {
  const { data: managers } = useSWR('agency-managers', fetcher, { refreshInterval: 3000 })

  return (
    <div>
      <h1 className="text-3xl font-bold mb-8">Hiring Managers</h1>
      {managers && managers.length > 0 ? (
        <div className="grid gap-4">
          {managers.map((m: any) => (
            <div key={m.id} className="card">
              <h3 className="text-xl font-bold">Manager #{m.id.substring(0, 8)}</h3>
              <p className="text-gray-600">{m.jobCount} active jobs</p>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-gray-500">No managers found</p>
      )}
    </div>
  )
}
ENDFILE

# Placements page
cat > app/dashboard/agency/placements/page.tsx << 'ENDFILE'
'use client'
import useSWR from 'swr'
import { createClient } from '@/lib/supabase/client'

const fetcher = async () => {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data } = await supabase
    .from('applications')
    .select('*, jobs(title, salary_max)')
    .eq('agency_id', user?.id || '')
    .eq('status', 'hired')
  return data || []
}

export default function Placements() {
  const { data: placements } = useSWR('agency-placements', fetcher, { refreshInterval: 3000 })

  const total = (placements || []).reduce((sum, p) => sum + ((p.jobs?.salary_max || 0) * 0.15), 0)

  return (
    <div>
      <h1 className="text-3xl font-bold mb-8">Placements</h1>
      <div className="card mb-6">
        <p className="text-sm text-gray-600">Total Earnings</p>
        <p className="text-4xl font-bold text-emerald-600">£{Math.round(total).toLocaleString()}</p>
      </div>
      {placements && placements.length > 0 ? (
        <div className="grid gap-4">
          {placements.map((p: any) => (
            <div key={p.id} className="card">
              <h3 className="text-xl font-bold">{p.jobs?.title}</h3>
              <p className="text-emerald-600 font-bold">
                £{Math.round((p.jobs?.salary_max || 0) * 0.15).toLocaleString()} commission
              </p>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-gray-500">No placements yet</p>
      )}
    </div>
  )
}
ENDFILE

# Analytics page
cat > app/dashboard/agency/analytics/page.tsx << 'ENDFILE'
'use client'
import useSWR from 'swr'
import { createClient } from '@/lib/supabase/client'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

const fetcher = async () => {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data } = await supabase.from('applications').select('*').eq('agency_id', user?.id || '')
  
  const monthlyData = []
  for (let i = 5; i >= 0; i--) {
    const date = new Date()
    date.setMonth(date.getMonth() - i)
    const month = date.toLocaleString('default', { month: 'short' })
    const count = (data || []).filter(d => {
      const dDate = new Date(d.created_at)
      return dDate.getMonth() === date.getMonth()
    }).length
    monthlyData.push({ month, count })
  }
  
  return monthlyData
}

export default function Analytics() {
  const { data } = useSWR('agency-analytics', fetcher, { refreshInterval: 3000 })

  return (
    <div>
      <h1 className="text-3xl font-bold mb-8">Analytics</h1>
      <div className="card">
        <h3 className="font-bold mb-4">Monthly Placements</h3>
        {data && data.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="count" stroke="#10b981" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-gray-500">No data</p>
        )}
      </div>
    </div>
  )
}
ENDFILE

echo ""
echo "✅ All Agency Routes Created!"
echo ""
echo "Routes created:"
echo "✓ /dashboard/agency (main)"
echo "✓ /dashboard/agency/jobs"
echo "✓ /dashboard/agency/candidates"
echo "✓ /dashboard/agency/managers"
echo "✓ /dashboard/agency/placements"
echo "✓ /dashboard/agency/analytics"
echo ""
echo "Restart server: npm run dev"
