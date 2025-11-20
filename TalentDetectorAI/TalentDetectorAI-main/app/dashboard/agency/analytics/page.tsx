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
