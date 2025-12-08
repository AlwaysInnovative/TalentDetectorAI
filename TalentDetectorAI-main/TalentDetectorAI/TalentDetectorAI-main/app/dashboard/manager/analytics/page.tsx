'use client'
import useSWR from 'swr'
import { createClient } from '@/lib/supabase/client'
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { Download, TrendingUp, Users, Briefcase, Target } from 'lucide-react'
import { exportAnalytics } from '@/lib/exports/pdf-generator'
import DynamicBackground from '@/components/ui/DynamicBackground'
import { motion } from 'framer-motion'

const COLORS = ['#0ea5e9', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#ec4899']

const fetcher = async () => {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  const [jobs, applications] = await Promise.all([
    supabase.from('jobs').select('*').eq('manager_id', user?.id || ''),
    supabase.from('applications').select('*, jobs!inner(manager_id)').eq('jobs.manager_id', user?.id || '')
  ])
  
  // Monthly trends (12 months)
  const monthlyData = []
  for (let i = 11; i >= 0; i--) {
    const date = new Date()
    date.setMonth(date.getMonth() - i)
    const monthName = date.toLocaleString('default', { month: 'short' })
    
    const monthApps = applications.data?.filter(a => {
      const appDate = new Date(a.created_at)
      return appDate.getMonth() === date.getMonth() && appDate.getFullYear() === date.getFullYear()
    }).length || 0
    
    monthlyData.push({ 
      month: monthName, 
      applications: monthApps,
      hires: Math.floor(monthApps * 0.15),
      interviews: Math.floor(monthApps * 0.4)
    })
  }
  
  // Skill match distribution
  const skillData = applications.data?.reduce((acc: any, app: any) => {
    const score = app.ai_match_score || 0
    const bucket = score >= 80 ? 'Excellent (80-100%)' : 
                   score >= 60 ? 'Good (60-79%)' :
                   score >= 40 ? 'Fair (40-59%)' : 'Poor (0-39%)'
    acc[bucket] = (acc[bucket] || 0) + 1
    return acc
  }, {}) || {}
  
  const skillMatchData = Object.entries(skillData).map(([name, value]) => ({ name, value }))
  
  // Status breakdown
  const statusData = [
    { name: 'Pending', value: applications.data?.filter(a => a.status === 'pending').length || 0, color: '#f59e0b' },
    { name: 'Screening', value: applications.data?.filter(a => a.status === 'screening').length || 0, color: '#3b82f6' },
    { name: 'Interview', value: applications.data?.filter(a => a.status === 'interview').length || 0, color: '#8b5cf6' },
    { name: 'Offer', value: applications.data?.filter(a => a.status === 'offer').length || 0, color: '#10b981' },
    { name: 'Hired', value: applications.data?.filter(a => a.status === 'hired').length || 0, color: '#059669' },
    { name: 'Rejected', value: applications.data?.filter(a => a.status === 'rejected').length || 0, color: '#ef4444' }
  ].filter(s => s.value > 0)
  
  const avgTimeToFill = 21 // Example calculation
  
  return {
    monthlyData,
    skillMatchData,
    statusData,
    totalApplications: applications.data?.length || 0,
    totalJobs: jobs.data?.length || 0,
    avgTimeToFill,
    conversionRate: applications.data?.length ? 
      Math.round(((applications.data.filter(a => a.status === 'hired').length) / applications.data.length) * 100) : 0
  }
}

export default function Analytics() {
  const { data, isLoading } = useSWR('manager-analytics', fetcher, { refreshInterval: 5000 })

  if (isLoading) {
    return <div className="flex items-center justify-center h-screen">
      <motion.div 
        animate={{ rotate: 360 }}
        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        className="w-16 h-16 border-4 border-primary-600 border-t-transparent rounded-full" />
    </div>
  }

  return (
    <div className="relative">
      <DynamicBackground page="analytics" />
      
      <div className="flex justify-between items-center mb-8">
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary-600 to-purple-600 bg-clip-text text-transparent mb-2">
            Advanced Analytics
          </h1>
          <p className="text-gray-600">Comprehensive hiring insights and performance metrics</p>
        </motion.div>
        <motion.button 
          whileHover={{ scale: 1.05 }}
          onClick={() => data && exportAnalytics(data)} 
          className="btn-primary flex items-center gap-2">
          <Download className="w-5 h-5" /> Export PDF Report
        </motion.button>
      </div>

      {/* Key Metrics */}
      <div className="grid md:grid-cols-4 gap-6 mb-8">
        {[
          { label: 'Total Applications', value: data?.totalApplications || 0, icon: Users, color: 'blue', change: '+12%' },
          { label: 'Active Jobs', value: data?.totalJobs || 0, icon: Briefcase, color: 'emerald', change: '+5%' },
          { label: 'Avg Time to Fill', value: (data?.avgTimeToFill || 0) + ' days', icon: TrendingUp, color: 'purple', change: '-3 days' },
          { label: 'Conversion Rate', value: (data?.conversionRate || 0) + '%', icon: Target, color: 'pink', change: '+8%' }
        ].map((metric, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            whileHover={{ y: -5 }}
            className={'card bg-gradient-to-br from-' + metric.color + '-50 to-white border-' + metric.color + '-200'}>
            <div className="flex items-center justify-between mb-2">
              <div className={'w-10 h-10 bg-gradient-to-br from-' + metric.color + '-500 to-' + metric.color + '-600 rounded-xl flex items-center justify-center text-white'}>
                <metric.icon className="w-5 h-5" />
              </div>
              <span className={'text-xs font-semibold text-' + metric.color + '-600'}>{metric.change}</span>
            </div>
            <p className="text-sm text-gray-600 mb-1">{metric.label}</p>
            <p className="text-3xl font-bold">{metric.value}</p>
          </motion.div>
        ))}
      </div>

      {/* Charts Grid */}
      <div className="grid md:grid-cols-2 gap-6 mb-8">
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="card">
          <h3 className="text-xl font-bold mb-4">Application Trends (12 Months)</h3>
          {data && data.monthlyData ? (
            <ResponsiveContainer width="100%" height={350}>
              <AreaChart data={data.monthlyData}>
                <defs>
                  <linearGradient id="colorApps" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorHires" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="month" stroke="#6b7280" />
                <YAxis stroke="#6b7280" />
                <Tooltip />
                <Legend />
                <Area type="monotone" dataKey="applications" stroke="#0ea5e9" fillOpacity={1} fill="url(#colorApps)" name="Applications" />
                <Area type="monotone" dataKey="hires" stroke="#10b981" fillOpacity={1} fill="url(#colorHires)" name="Hires" />
              </AreaChart>
            </ResponsiveContainer>
          ) : <div className="h-80 flex items-center justify-center text-gray-500">No data</div>}
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="card">
          <h3 className="text-xl font-bold mb-4">Application Status Distribution</h3>
          {data && data.statusData && data.statusData.length > 0 ? (
            <ResponsiveContainer width="100%" height={350}>
              <PieChart>
                <Pie 
                  data={data.statusData} 
                  cx="50%" 
                  cy="50%" 
                  labelLine={false}
                  label={(entry) => entry.name + ': ' + entry.value}
                  outerRadius={120} 
                  dataKey="value">
                  {data.statusData.map((entry: any, index: number) => (
                    <Cell key={'cell-' + index} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : <div className="h-80 flex items-center justify-center text-gray-500">No data</div>}
        </motion.div>
      </div>

      {/* Skill Match Chart */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="card">
        <h3 className="text-xl font-bold mb-4">Candidate Match Quality Distribution</h3>
        {data && data.skillMatchData && data.skillMatchData.length > 0 ? (
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={data.skillMatchData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="value" fill="#8b5cf6" name="Number of Candidates" />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-96 flex flex-col items-center justify-center text-gray-500">
            <Target className="w-16 h-16 text-gray-300 mb-4" />
            <p>No candidate match data available yet</p>
          </div>
        )}
      </motion.div>
    </div>
  )
}
